import { useEffect, useCallback } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import type {
  VoiceModelInfo,
  VoiceModelStatusResult,
  ModelDownloadProgressPayload,
} from '@/modules/models/types'
import {
  getModelStatus as apiGetModelStatus,
  downloadModel as apiDownloadModel,
  cancelModelDownload as apiCancelModelDownload,
  onModelDownloadProgress,
} from '@/modules/models/services/models-service'

import { engineAtom } from './musicStore'

export type MusicEngineType = 'acestep' | 'minimax'

export const defaultMusicModels: VoiceModelInfo[] = [
  {
    id: 'audiogen-qwen3-embedding',
    name: 'Qwen3 Embedding Text Encoder (0.6B Q8_0)',
    descriptorName: 'AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0',
    sizeBytes: 784144960,
    sizeFormatted: '784 MB',
    description: 'Encodes captions, prompts, and vocal lyrics into continuous musical semantic space.',
    category: 'text-encoder',
    engine: 'acestep',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'audiogen-acestep-5hz-lm',
    name: 'ACE-Step 5Hz Language Model (0.6B Q8_0)',
    descriptorName: 'AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0',
    sizeBytes: 709846656,
    sizeFormatted: '710 MB',
    description: 'Plans song structure, tempo, arrangement, and section transitions at 5 Hz.',
    category: 'lm',
    engine: 'acestep',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'audiogen-acestep-turbo-dit',
    name: 'ACE-Step v1.5 Turbo DiT (Q4_K_M)',
    descriptorName: 'AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M',
    sizeBytes: 1445710272,
    sizeFormatted: '1.45 GB',
    description: 'Fast 8-step Diffusion Transformer with Haar DCW for expressive music audio latents.',
    category: 'dit',
    engine: 'acestep',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'audiogen-vae-bf16',
    name: 'ACE-Step Audio VAE (BF16)',
    descriptorName: 'AUDIOGEN_VAE_BF16',
    sizeBytes: 337420928,
    sizeFormatted: '337 MB',
    description: 'Acoustic decoder rendering pristine 48 kHz stereo PCM audio waveforms.',
    category: 'vae',
    engine: 'acestep',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'minimax-music-v3-transformer',
    name: 'MiniMax Music-v3 Global LM (Q4_K_M GGUF)',
    descriptorName: 'MINIMAX_MUSIC_V3_TRANSFORMER',
    sizeBytes: 5512456672,
    sizeFormatted: '5.13 GB',
    description: 'Qwen3-8B based global language model with extended audio vocabulary, planning semantic music structures.',
    category: 'lm',
    engine: 'minimax',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'minimax-music-vocoder',
    name: 'MiniMax Music-v3 Synth Stack (Q4_K_M GGUF)',
    descriptorName: 'MINIMAX_MUSIC_VOCODER',
    sizeBytes: 2131105508,
    sizeFormatted: '1.98 GB',
    description: 'Full synthesis pipeline: RVQ depth decoder, condition encoder, flow-matching DiT, and stereo vocoder.',
    category: 'vocoder',
    engine: 'minimax',
    required: true,
    downloaded: false,
    status: 'idle',
  },
]

// ============================================================================
// Jotai Atoms for Music Models Management
// ============================================================================

// Unified single source of truth for music engine selection
export const selectedMusicEngineAtom = engineAtom

export const musicModelsStatusAtom = atom<VoiceModelStatusResult | null>(null)
export const isCheckingMusicModelsAtom = atom<boolean>(true)
export const downloadingMusicModelsAtom = atom<Record<string, ModelDownloadProgressPayload>>({})

// Derived atom: resolved models list
export const musicModelsListAtom = atom<VoiceModelInfo[]>((get) => {
  const status = get(musicModelsStatusAtom)
  if (status?.models && status.models.length > 0) {
    const musicOnly = status.models.filter(
      (m) => m.engine === 'acestep' || m.engine === 'minimax'
    )
    if (musicOnly.length > 0) return musicOnly
  }
  return defaultMusicModels
})

// Derived atom: true ONLY when all required models for the selected music engine are ready
export const allRequiredMusicModelsReadyAtom = atom<boolean>((get) => {
  const models = get(musicModelsListAtom)
  const currentEngine = get(selectedMusicEngineAtom)

  const requiredModels = models.filter((m) => m.engine === currentEngine)
  if (requiredModels.length === 0) return false
  return requiredModels.every((m) => m.downloaded)
})

// ============================================================================
// Hook: useMusicModels
// ============================================================================

export function useMusicModels() {
  const [selectedEngine, setSelectedEngine] = useAtom(selectedMusicEngineAtom)
  const [modelsStatus, setModelsStatus] = useAtom(musicModelsStatusAtom)
  const [isChecking, setIsChecking] = useAtom(isCheckingMusicModelsAtom)
  const [downloadingModels, setDownloadingModels] = useAtom(downloadingMusicModelsAtom)
  const models = useAtomValue(musicModelsListAtom)
  const allRequiredReady = useAtomValue(allRequiredMusicModelsReadyAtom)

  // Active models scoped to the current engine
  const activeEngineModels = models.filter((model) => model.engine === selectedEngine)

  // All defined models for the selected music engine are required
  const requiredModels = activeEngineModels.filter(
    (model) => model.required || model.engine === selectedEngine
  )

  const totalRequiredSizeBytes = requiredModels.reduce(
    (total, model) => total + model.sizeBytes,
    0
  )
  const totalSizeGb = (totalRequiredSizeBytes / (1024 * 1024 * 1024)).toFixed(1)

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await apiGetModelStatus(selectedEngine)
      if (res && res.success && res.data) {
        setModelsStatus(res.data)
        return
      }
    } catch (err) {
      console.warn('[musicModelsStore] Failed to get model status via modelsService:', err)
    }

    const fallbackStatus: VoiceModelStatusResult = {
      ready: false,
      allRequiredDownloaded: false,
      models: defaultMusicModels,
      cacheDirectory: '~/.qvac/models',
    }
    setModelsStatus(fallbackStatus)
  }, [selectedEngine, setModelsStatus])

  // Lifecycle status check on mount and whenever selectedEngine changes
  useEffect(() => {
    let mounted = true

    const initCheck = async () => {
      setIsChecking(true)
      await refreshStatus()
      if (mounted) {
        setIsChecking(false)
      }
    }

    initCheck()

    return () => {
      mounted = false
    }
  }, [selectedEngine, refreshStatus, setIsChecking])

  // Subscribe to live model download progress events
  useEffect(() => {
    const unsubscribe = onModelDownloadProgress((payload) => {
      if (!payload || !payload.modelId) return

      // Only handle progress for music models
      const isMusicModel = defaultMusicModels.some((m) => m.id === payload.modelId)
      if (!isMusicModel) return

      setDownloadingModels((prev) => {
        if (payload.percentage >= 100) {
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
      unsubscribe()
    }
  }, [refreshStatus, setDownloadingModels])

  const downloadModel = useCallback(
    async (modelId: string): Promise<boolean> => {
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

      try {
        const res = await apiDownloadModel({ modelId, engine: selectedEngine })
        if (res && res.success) {
          if (res.data) setModelsStatus(res.data as VoiceModelStatusResult)
          else await refreshStatus()
          return true
        } else {
          console.error(`[musicModelsStore] Download failed for ${modelId}:`, res?.error)
          return false
        }
      } catch (err) {
        console.error(`[musicModelsStore] Download error for ${modelId}:`, err)
        return false
      } finally {
        setDownloadingModels((prev) => {
          const next = { ...prev }
          delete next[modelId]
          return next
        })
      }
    },
    [selectedEngine, refreshStatus, setDownloadingModels, setModelsStatus]
  )

  const downloadAllRequired = useCallback(async (): Promise<boolean> => {
    const needed = requiredModels.filter((m) => !m.downloaded)

    for (const model of needed) {
      const ok = await downloadModel(model.id)
      if (!ok) return false
    }

    await refreshStatus()
    return true
  }, [requiredModels, downloadModel, refreshStatus])

  const cancelDownload = useCallback(
    async (modelId: string): Promise<boolean> => {
      try {
        await apiCancelModelDownload(modelId)
      } catch (err) {
        console.error(`[musicModelsStore] Cancel download error:`, err)
      }

      setDownloadingModels((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
      await refreshStatus()
      return true
    },
    [refreshStatus, setDownloadingModels]
  )

  return {
    selectedEngine,
    setSelectedEngine,
    modelsStatus,
    models,
    activeEngineModels,
    requiredModels,
    totalSizeGb,
    allRequiredReady,
    isChecking,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
    refreshStatus,
  }
}
