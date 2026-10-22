import { useEffect, useCallback } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type {
  VoiceModelStatusResult,
  VoiceModelInfo,
  ModelDownloadProgressPayload,
} from '@/lib/interfaces/models.interface'
import {
  getModelStatus,
  downloadModel as apiDownloadModel,
  cancelModelDownload as apiCancelModelDownload,
  deleteAllModels as apiDeleteAllModels,
  onModelDownloadProgress,
} from '../services/tts-service'

export type VoiceEngineType = 'cosyvoice3' | 'parler'

export const defaultModels: VoiceModelInfo[] = [
  {
    id: 'parler-mini-v1-q8_0',
    name: 'Parler-TTS Mini V1 (880M, Q8_0)',
    descriptorName: 'TTS_MINI_V1_EN_PARLER_TTS_Q8_0',
    sizeBytes: 1162597856,
    sizeFormatted: '1.16 GB',
    description: 'Description-conditioned neural speech transformer with 12 expressive emotions and natural prosody (fast on all hardware).',
    category: 'backbone',
    engine: 'parler',
    required: false,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-llm-q8_0',
    name: 'CosyVoice 3 Neural Speech Backbone (0.5B, Q8_0)',
    descriptorName: 'TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0',
    sizeBytes: 973496000,
    sizeFormatted: '973 MB',
    description: 'Zero-shot neural speech generator with instruct conditioning for voice design & cloning (optimized for Apple Silicon / M-series).',
    category: 'backbone',
    engine: 'cosyvoice3',
    required: false,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'lavasr-enhancer',
    name: 'Lava-SR 48kHz Neural Enhancer (FP16)',
    descriptorName: 'TTS_ENHANCER_LAVASR_FP16',
    sizeBytes: 28051008,
    sizeFormatted: '28 MB',
    description: 'Deep spectral bandwidth upsampler and harmonic clarity enhancer for studio-grade 48kHz ultra-HD audio.',
    category: 'enhancer',
    engine: 'shared',
    required: false,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-s3tok-fp16',
    name: 'CosyVoice 3 S3Tok Speech Tokenizer (FP16)',
    descriptorName: 'TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16',
    sizeBytes: 496605536,
    sizeFormatted: '496 MB',
    description: 'Neural speech tokenizer required for high-fidelity instant voice cloning in CosyVoice 3.',
    category: 'vocoder',
    engine: 'cosyvoice3',
    required: false,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-campplus-fp32',
    name: 'CosyVoice 3 CAM++ Speaker Encoder (FP32)',
    descriptorName: 'TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32',
    sizeBytes: 27530656,
    sizeFormatted: '27 MB',
    description: 'Deep acoustic timbre and speaker embedding extractor for voice cloning in CosyVoice 3.',
    category: 'multilingual',
    engine: 'cosyvoice3',
    required: false,
    downloaded: false,
    status: 'idle',
  },
]

// ============================================================================
// Jotai Atoms for Voice Engine Models State
// ============================================================================

export const selectedVoiceEngineAtom = atomWithStorage<VoiceEngineType>(
  'echo_selected_voice_engine',
  'cosyvoice3'
)
export const voiceEngineModelsStatusAtom = atom<VoiceModelStatusResult | null>(null)
export const voiceEngineIsCheckingAtom = atom<boolean>(true)
export const voiceEngineDownloadingModelsAtom = atom<Record<string, ModelDownloadProgressPayload>>({})
export const voiceEngineIsModalOpenAtom = atom<boolean>(false)

// Derived atom for resolved model definitions list
export const voiceEngineModelsAtom = atom<VoiceModelInfo[]>((get) => {
  const status = get(voiceEngineModelsStatusAtom)
  return status?.models && status.models.length > 0 ? status.models : defaultModels
})

// Derived atom indicating whether the active voice engine backbone model is ready
export const voiceEngineAllRequiredReadyAtom = atom<boolean>((get) => {
  const models = get(voiceEngineModelsAtom)
  const currentEngine = get(selectedVoiceEngineAtom)
  const backbone = models.find(
    (m) => m.category === 'backbone' && (m.engine === currentEngine || m.id.startsWith(currentEngine))
  )
  return backbone ? backbone.downloaded : false
})

// Backward-compatibility aliases
export const shatterBoxModelsStatusAtom = voiceEngineModelsStatusAtom
export const shatterBoxIsCheckingAtom = voiceEngineIsCheckingAtom
export const shatterBoxDownloadingModelsAtom = voiceEngineDownloadingModelsAtom
export const shatterBoxIsModalOpenAtom = voiceEngineIsModalOpenAtom
export const shatterBoxModelsAtom = voiceEngineModelsAtom
export const shatterBoxAllRequiredReadyAtom = voiceEngineAllRequiredReadyAtom

// ============================================================================
// Custom Hook providing clean reactive state & operations via Jotai
// ============================================================================

export function useVoiceEngineModels() {
  const [modelsStatus, setModelsStatus] = useAtom(voiceEngineModelsStatusAtom)
  const [isChecking, setIsChecking] = useAtom(voiceEngineIsCheckingAtom)
  const [downloadingModels, setDownloadingModels] = useAtom(voiceEngineDownloadingModelsAtom)
  const [isModalOpen, setIsModalOpen] = useAtom(voiceEngineIsModalOpenAtom)
  const models = useAtomValue(voiceEngineModelsAtom)
  const allRequiredReady = useAtomValue(voiceEngineAllRequiredReadyAtom)

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await getModelStatus()
      if (res && res.success && res.data) {
        setModelsStatus(res.data)
        return
      }
    } catch (err) {
      console.warn('[voiceEngineStore] Failed to get model status via ttsService:', err)
    }

    const fallbackStatus: VoiceModelStatusResult = {
      ready: false,
      allRequiredDownloaded: false,
      models: defaultModels,
      cacheDirectory: '~/.qvac/models',
    }
    setModelsStatus(fallbackStatus)
  }, [setModelsStatus])

  // Lifecycle check on mount and live download progress event subscription
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

    // Listen to real-time model download progress via ttsService
    const unsubscribe = onModelDownloadProgress((payload) => {
      if (!payload || !payload.modelId) return

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
      mounted = false
      unsubscribe()
    }
  }, [refreshStatus, setIsChecking, setDownloadingModels])

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
        const res = await apiDownloadModel({ modelId })
        if (res && res.success) {
          if (res.data) setModelsStatus(res.data as VoiceModelStatusResult)
          else await refreshStatus()
          return true
        } else {
          console.error(`[voiceEngineStore] Download failed for ${modelId}:`, res?.error)
          return false
        }
      } catch (err) {
        console.error(`[voiceEngineStore] Download error for ${modelId}:`, err)
        return false
      } finally {
        setDownloadingModels((prev) => {
          const next = { ...prev }
          delete next[modelId]
          return next
        })
      }
    },
    [refreshStatus, setDownloadingModels, setModelsStatus]
  )

  const [selectedEngine, setSelectedEngine] = useAtom(selectedVoiceEngineAtom)

  const downloadAllRequired = useCallback(async (): Promise<boolean> => {
    const current = modelsStatus?.models || defaultModels
    // Download models required for the currently active engine
    const required = current.filter(
      (m) =>
        !m.downloaded &&
        ((m.category === 'backbone' && (m.engine === selectedEngine || m.id.startsWith(selectedEngine))) ||
          m.required)
    )

    for (const model of required) {
      const ok = await downloadModel(model.id)
      if (!ok) return false
    }

    await refreshStatus()
    return true
  }, [modelsStatus, selectedEngine, downloadModel, refreshStatus])

  const cancelDownload = useCallback(
    async (modelId: string): Promise<boolean> => {
      try {
        await apiCancelModelDownload(modelId)
      } catch (err) {
        console.error(`[voiceEngineStore] Cancel download error:`, err)
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

  const deleteAllModels = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiDeleteAllModels()
      if (res.success) {
        setDownloadingModels({})
        await refreshStatus()
        return true
      } else {
        console.error(`[voiceEngineStore] Delete all models failed:`, res?.error)
        return false
      }
    } catch (err) {
      console.error(`[voiceEngineStore] Delete all models error:`, err)
      return false
    }
  }, [refreshStatus])

  const markAllReady = useCallback(async (): Promise<void> => {
    await refreshStatus()
  }, [refreshStatus])

  return {
    selectedEngine,
    setSelectedEngine,
    modelsStatus,
    models,
    allRequiredReady,
    isChecking,
    downloadingModels,
    isModalOpen,
    setIsModalOpen,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
    deleteAllModels,
    refreshStatus,
    markAllReady,
  }
}

// Backward-compatibility alias
export const useShatterBoxModels = useVoiceEngineModels
