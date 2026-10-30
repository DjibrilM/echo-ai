import { useEffect, useCallback } from 'react'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
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

export type MusicEngineType = 'minimax' | 'acestep'

// Songs feature is powered by MiniMax Music-v3 (~7.1 GB, vocal synthesis & lyrics)
export const defaultMusicModels: VoiceModelInfo[] = [
  {
    id: 'minimax-music-v3-transformer',
    name: 'MiniMax Music-v3 Global LM (Q4_K_M GGUF)',
    descriptorName: 'MINIMAX_MUSIC_V3_TRANSFORMER',
    sizeBytes: 5512456672,
    sizeFormatted: '5.13 GB',
    description: 'Qwen3-8B based global language model with extended audio vocabulary, planning semantic song structures and vocal lyrics.',
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
    description: 'Full synthesis pipeline: RVQ depth decoder, condition encoder, flow-matching DiT, and stereo vocoder for high-fidelity human vocals.',
    category: 'vocoder',
    engine: 'minimax',
    required: true,
    downloaded: false,
    status: 'idle',
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

// Unified single source of truth for music engine selection
export const selectedMusicEngineAtom = engineAtom

export const musicModelsStatusAtom = atom<VoiceModelStatusResult | null>(null)
export const isCheckingMusicModelsAtom = atom<boolean>(false)
export const downloadingMusicModelsAtom = atom<Record<string, ModelDownloadProgressPayload>>({})

// Derived atom: resolved models list (only MiniMax models for Songs)
export const musicModelsListAtom = atom<VoiceModelInfo[]>((get) => {
  const status = get(musicModelsStatusAtom)
  if (status?.models && status.models.length > 0) {
    const minimaxOnly = status.models.filter((m) => m.engine === 'minimax')
    if (minimaxOnly.length > 0) return minimaxOnly
  }
  return defaultMusicModels
})

// Derived atom: true ONLY when all required models for MiniMax (Songs) are ready
export const allRequiredMusicModelsReadyAtom = atom<boolean>((get) => {
  const models = get(musicModelsListAtom)
  const minimaxModels = models.filter((m) => m.engine === 'minimax')
  if (minimaxModels.length === 0) return false
  return minimaxModels.every((m) => m.downloaded)
})

export const totalMusicSuiteSizeBytesAtom = atom<number>((get) => {
  const models = get(musicModelsListAtom)
  const minimaxModels = models.filter((m) => m.engine === 'minimax')
  return minimaxModels.reduce((acc, m) => acc + m.sizeBytes, 0)
})

export const totalMusicRemainingSizeBytesAtom = atom<number>((get) => {
  const models = get(musicModelsListAtom)
  const minimaxModels = models.filter((m) => m.engine === 'minimax')
  return minimaxModels.reduce((acc, m) => acc + (m.downloaded ? 0 : m.sizeBytes), 0)
})

export const musicDownloadedCountAtom = atom<number>((get) => {
  const models = get(musicModelsListAtom)
  const minimaxModels = models.filter((m) => m.engine === 'minimax')
  return minimaxModels.filter((m) => m.downloaded).length
})

export function useMusicModels() {
  const [selectedEngine, setSelectedEngine] = useAtom(selectedMusicEngineAtom)
  const setModelsStatus = useSetAtom(musicModelsStatusAtom)
  const isChecking = useAtomValue(isCheckingMusicModelsAtom)
  const setIsChecking = useSetAtom(isCheckingMusicModelsAtom)
  const [downloadingModels, setDownloadingModels] = useAtom(downloadingMusicModelsAtom)
  const models = useAtomValue(musicModelsListAtom)
  const allRequiredReady = useAtomValue(allRequiredMusicModelsReadyAtom)

  const minimaxModels = models.filter((model) => model.engine === 'minimax')
  const totalSuiteSizeBytes = useAtomValue(totalMusicSuiteSizeBytesAtom)
  const remainingSizeBytes = useAtomValue(totalMusicRemainingSizeBytesAtom)
  const downloadedCount = useAtomValue(musicDownloadedCountAtom)

  const totalSuiteSizeFormatted = formatBytes(totalSuiteSizeBytes)
  const remainingSizeFormatted = formatBytes(remainingSizeBytes)
  const totalSizeGb = (remainingSizeBytes / (1024 * 1024 * 1024)).toFixed(1)

  const refreshStatus = useCallback(async (): Promise<void> => {
    setIsChecking(true)
    try {
      const res = await apiGetModelStatus('minimax')
      if (res && res.success && res.data) {
        setModelsStatus((prev) => {
          if (!res.data) return prev
          if (JSON.stringify(prev?.models) === JSON.stringify(res.data.models)) {
            return prev
          }
          return res.data
        })
        return
      }
    } catch (err) {
      console.warn('[musicModelsStore] Failed to get model status via modelsService:', err)
    } finally {
      setIsChecking(false)
    }
  }, [setModelsStatus, setIsChecking])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    const unsubscribe = onModelDownloadProgress((payload) => {
      if (!payload || !payload.modelId) return

      // Only handle progress for minimax models
      const isMiniMaxModel = defaultMusicModels.some((m) => m.id === payload.modelId && m.engine === 'minimax')
      if (!isMiniMaxModel) return

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
      if (typeof unsubscribe === 'function') unsubscribe()
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
        const res = await apiDownloadModel({ modelId, engine: 'minimax' })
        if (res && res.success) {
          if (res.data) setModelsStatus(res.data as VoiceModelStatusResult)
          return true
        }
        throw new Error(res?.error || 'Download failed')
      } catch (err) {
        setDownloadingModels((prev) => {
          const next = { ...prev }
          delete next[modelId]
          return next
        })
        return false
      }
    },
    [setDownloadingModels, setModelsStatus]
  )

  const downloadAllRequired = useCallback(async (): Promise<boolean> => {
    const unDownloaded = minimaxModels.filter((m) => !m.downloaded)
    for (const m of unDownloaded) {
      if (!downloadingModels[m.id]) {
        await downloadModel(m.id)
      }
    }
    return true
  }, [minimaxModels, downloadingModels, downloadModel])

  const cancelDownload = useCallback(
    async (modelId: string): Promise<boolean> => {
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
      return true
    },
    [setDownloadingModels]
  )

  return {
    selectedEngine,
    setSelectedEngine,
    models,
    minimaxModels,
    totalSuiteSizeBytes,
    remainingSizeBytes,
    totalSuiteSizeFormatted,
    remainingSizeFormatted,
    downloadedCount,
    totalCount: minimaxModels.length,
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
