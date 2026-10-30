import { useEffect, useCallback } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import type {
  VoiceModelInfo,
  ModelStatus,
  ModelDownloadProgressPayload,
} from '@/modules/models/types'
import {
  getModelStatus as apiGetModelStatus,
  downloadModel as apiDownloadModel,
  cancelModelDownload as apiCancelModelDownload,
  onModelDownloadProgress,
} from '@/modules/models/services/models-service'

// Beats is powered by ACE-Step v1.5 (~3.3 GB: Embedding, 5Hz LM, Turbo DiT, Audio VAE)
export const defaultBeatsModels: VoiceModelInfo[] = [
  {
    id: 'audiogen-qwen3-embedding',
    name: 'Qwen3 Embedding Text Encoder (0.6B Q8_0)',
    descriptorName: 'AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0',
    sizeBytes: 784144960,
    sizeFormatted: '784 MB',
    description: 'Encodes rhythm prompts, percussion styles, and beat descriptions into continuous musical semantic space.',
    category: 'text-encoder',
    engine: 'acestep',
    required: true,
    downloaded: true,
    status: 'ready',
  },
  {
    id: 'audiogen-acestep-5hz-lm',
    name: 'ACE-Step 5Hz Language Model (0.6B Q8_0)',
    descriptorName: 'AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0',
    sizeBytes: 709846656,
    sizeFormatted: '710 MB',
    description: 'Plans rhythmic groove, drum patterns, tempo variations, and beat progression at 5 Hz.',
    category: 'lm',
    engine: 'acestep',
    required: true,
    downloaded: true,
    status: 'ready',
  },
  {
    id: 'audiogen-acestep-turbo-dit',
    name: 'ACE-Step v1.5 Turbo DiT (Q4_K_M)',
    descriptorName: 'AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M',
    sizeBytes: 1445710272,
    sizeFormatted: '1.45 GB',
    description: 'Fast 8-step Diffusion Transformer with Haar DCW synthesizing punchy 808s and crisp drum transients.',
    category: 'dit',
    engine: 'acestep',
    required: true,
    downloaded: true,
    status: 'ready',
  },
  {
    id: 'audiogen-vae-bf16',
    name: 'ACE-Step Audio VAE (BF16)',
    descriptorName: 'AUDIOGEN_VAE_BF16',
    sizeBytes: 337420928,
    sizeFormatted: '337 MB',
    description: 'Acoustic decoder rendering pristine 48 kHz stereo PCM audio waveforms for studio-grade beats.',
    category: 'vae',
    engine: 'acestep',
    required: true,
    downloaded: true,
    status: 'ready',
  },
]

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1.0) {
    return `${gb.toFixed(1)} GB`
  }
  const mb = bytes / (1024 * 1024)
  return `${Math.round(mb)} MB`
}

export const beatsModelsAtom = atom<VoiceModelInfo[]>(defaultBeatsModels)
export const isCheckingBeatsModelsAtom = atom<boolean>(false)
export const downloadingBeatsModelsAtom = atom<Record<string, ModelDownloadProgressPayload>>({})

export const allBeatsModelsReadyAtom = atom<boolean>((get) => {
  const models = get(beatsModelsAtom)
  return models.length > 0 && models.every((m) => m.downloaded)
})

export const totalBeatsSuiteSizeBytesAtom = atom<number>((get) => {
  const models = get(beatsModelsAtom)
  return models.reduce((acc, m) => acc + m.sizeBytes, 0)
})

export const totalBeatsRemainingSizeBytesAtom = atom<number>((get) => {
  const models = get(beatsModelsAtom)
  return models.reduce((acc, m) => acc + (m.downloaded ? 0 : m.sizeBytes), 0)
})

export const beatsDownloadedCountAtom = atom<number>((get) => {
  const models = get(beatsModelsAtom)
  return models.filter((m) => m.downloaded).length
})

export function useBeatsModels() {
  const [models, setModels] = useAtom(beatsModelsAtom)
  const [isChecking, setIsChecking] = useAtom(isCheckingBeatsModelsAtom)
  const [downloadingModels, setDownloadingModels] = useAtom(downloadingBeatsModelsAtom)
  const allRequiredReady = useAtomValue(allBeatsModelsReadyAtom)
  const totalSuiteSizeBytes = useAtomValue(totalBeatsSuiteSizeBytesAtom)
  const remainingSizeBytes = useAtomValue(totalBeatsRemainingSizeBytesAtom)
  const downloadedCount = useAtomValue(beatsDownloadedCountAtom)

  const totalSuiteSizeFormatted = formatBytes(totalSuiteSizeBytes)
  const remainingSizeFormatted = formatBytes(remainingSizeBytes)
  const totalSizeGb = (remainingSizeBytes / (1024 * 1024 * 1024)).toFixed(1)

  const refreshStatus = useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await apiGetModelStatus('acestep')
      if (res && res.success && res.data?.models) {
        const statuses = res.data.models
        setModels((prev) => {
          let changed = false
          const next: VoiceModelInfo[] = prev.map((m) => {
            const match = statuses.find((s) => s.id === m.id)
            if (!match) return m
            const isDownloaded = !!match.downloaded
            const status: ModelStatus = isDownloaded ? 'ready' : m.status === 'downloading' ? 'downloading' : 'idle'
            if (m.downloaded !== isDownloaded || m.status !== status) {
              changed = true
              return { ...m, downloaded: isDownloaded, status }
            }
            return m
          })
          return changed ? next : prev
        })
      }
    } catch {
      // ignore
    } finally {
      setIsChecking(false)
    }
  }, [setModels, setIsChecking])

  const downloadModel = useCallback(
    async (modelId: string) => {
      setDownloadingModels((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          percentage: 0,
          downloaded: 0,
          total: 100,
          speed: 'Connecting...',
        },
      }))

      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId ? { ...m, status: 'downloading', downloadProgress: 0 } : m
        )
      )

      try {
        const res = await apiDownloadModel({ modelId, engine: 'acestep' })
        if (!res?.success) {
          throw new Error(res?.error || 'Download failed')
        }
        await refreshStatus()
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setDownloadingModels((prev) => {
          const next = { ...prev }
          delete next[modelId]
          return next
        })
        setModels((prev) =>
          prev.map((m) =>
            m.id === modelId ? { ...m, status: 'error', error: errorMsg } : m
          )
        )
      }
    },
    [setModels, setDownloadingModels, refreshStatus]
  )

  const cancelDownload = useCallback(
    async (modelId: string) => {
      try {
        await apiCancelModelDownload(modelId)
      } catch {
        // ignore
      }
      setDownloadingModels((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId ? { ...m, status: 'idle', downloadProgress: 0 } : m
        )
      )
    },
    [setModels, setDownloadingModels]
  )

  const downloadAllRequired = useCallback(async () => {
    for (const model of models) {
      if (!model.downloaded && !downloadingModels[model.id]) {
        await downloadModel(model.id)
      }
    }
  }, [models, downloadingModels, downloadModel])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    const unsub = onModelDownloadProgress((payload) => {
      if (!payload?.modelId) return
      if (!defaultBeatsModels.some((m) => m.id === payload.modelId)) return

      setDownloadingModels((prev) => {
        if (payload.percentage >= 100) {
          if (!prev[payload.modelId]) return prev
          const next = { ...prev }
          delete next[payload.modelId]
          return next
        }
        return {
          ...prev,
          [payload.modelId]: payload,
        }
      })

      if (payload.percentage >= 100) {
        refreshStatus()
      }
    })

    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [refreshStatus, setDownloadingModels])

  return {
    models,
    totalSizeGb,
    totalSuiteSizeBytes,
    remainingSizeBytes,
    totalSuiteSizeFormatted,
    remainingSizeFormatted,
    downloadedCount,
    totalCount: models.length,
    allRequiredReady,
    isChecking,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
    refreshStatus,
  }
}

// Backward-compatibility alias
export const useAceStepModels = useBeatsModels
