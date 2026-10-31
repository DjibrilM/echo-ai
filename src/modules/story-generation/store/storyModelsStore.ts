import { useEffect, useCallback } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import type {
  VoiceModelInfo,
  VoiceModelStatusResult,
  ModelDownloadProgressPayload,
} from '@/modules/models/types';
import {
  getModelStatus as apiGetModelStatus,
  downloadModel as apiDownloadModel,
  cancelModelDownload as apiCancelModelDownload,
  onModelDownloadProgress,
} from '@/modules/models/services/models-service';

export const defaultStoryModels: VoiceModelInfo[] = [
  {
    id: 'gemma-4-4b-multimodal-q6_k',
    name: 'Gemma 4 Multimodal 4B (Q6_K GGUF)',
    descriptorName: 'GEMMA4_4B_MULTIMODAL_Q6_K',
    sizeBytes: 3410000000,
    sizeFormatted: '3.41 GB',
    description:
      'Deterministic multi-agent narrative orchestration model for premise normalization, world-building, epistemic state management, and character dialogue prose.',
    category: 'lm',
    engine: 'story',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-llm-q8_0',
    name: 'CosyVoice 3 Neural Speech Backbone (0.5B, Q8_0)',
    descriptorName: 'TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0',
    sizeBytes: 973496000,
    sizeFormatted: '973 MB',
    description:
      'Zero-shot neural speech generator with instruct conditioning for voice design & multi-character dialogue performance.',
    category: 'backbone',
    engine: 'cosyvoice3',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-s3tok-fp16',
    name: 'CosyVoice 3 S3Tok Speech Tokenizer (FP16)',
    descriptorName: 'TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16',
    sizeBytes: 496605536,
    sizeFormatted: '496 MB',
    description:
      'Neural speech tokenizer required for high-fidelity instant voice cloning and emotional cadence in CosyVoice 3.',
    category: 'vocoder',
    engine: 'cosyvoice3',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'cosyvoice3-campplus-fp32',
    name: 'CosyVoice 3 CAM++ Speaker Encoder (FP32)',
    descriptorName: 'TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32',
    sizeBytes: 27530656,
    sizeFormatted: '27 MB',
    description:
      'Deep acoustic timbre and speaker embedding extractor for multi-character cast voice matching.',
    category: 'multilingual',
    engine: 'cosyvoice3',
    required: true,
    downloaded: false,
    status: 'idle',
  },
  {
    id: 'lavasr-enhancer',
    name: 'Lava-SR 48kHz Neural Enhancer (FP16)',
    descriptorName: 'TTS_ENHANCER_LAVASR_FP16',
    sizeBytes: 28051008,
    sizeFormatted: '28 MB',
    description:
      'Deep spectral bandwidth upsampler and harmonic clarity enhancer for studio-grade 48kHz ultra-HD narrative audio.',
    category: 'enhancer',
    engine: 'shared',
    required: true,
    downloaded: false,
    status: 'idle',
  },
];

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1.0) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

export const storyModelsStatusAtom = atom<VoiceModelStatusResult | null>(null);
export const isCheckingStoryModelsAtom = atom<boolean>(false);
export const downloadingStoryModelsAtom = atom<Record<string, ModelDownloadProgressPayload>>({});

export const storyModelsListAtom = atom<VoiceModelInfo[]>((get) => {
  const status = get(storyModelsStatusAtom);
  if (status?.models && status.models.length > 0) {
    const orderMap: Record<string, number> = {
      'gemma-4-4b-multimodal-q6_k': 1,
      'cosyvoice3-llm-q8_0': 2,
      'cosyvoice3-s3tok-fp16': 3,
      'cosyvoice3-campplus-fp32': 4,
      'lavasr-enhancer': 5,
    };
    const storyOnly = status.models.filter(
      (m) =>
        m.engine === 'story' ||
        (m.engine === 'cosyvoice3' && m.id !== 'cosyvoice3-flow-fp16') ||
        m.id === 'lavasr-enhancer',
    );
    if (storyOnly.length > 0) {
      return [...storyOnly].sort(
        (a, b) => (orderMap[a.id] || 99) - (orderMap[b.id] || 99),
      );
    }
  }
  return defaultStoryModels;
});

export const allRequiredStoryModelsReadyAtom = atom<boolean>((get) => {
  const models = get(storyModelsListAtom);
  if (models.length === 0) return false;
  return models.every((m) => m.downloaded);
});

export const totalStorySuiteSizeBytesAtom = atom<number>((get) => {
  const models = get(storyModelsListAtom);
  return models.reduce((acc, m) => acc + m.sizeBytes, 0);
});

export const totalStoryRemainingSizeBytesAtom = atom<number>((get) => {
  const models = get(storyModelsListAtom);
  return models.reduce((acc, m) => acc + (m.downloaded ? 0 : m.sizeBytes), 0);
});

export const storyDownloadedCountAtom = atom<number>((get) => {
  const models = get(storyModelsListAtom);
  return models.filter((m) => m.downloaded).length;
});

export function useStoryModels() {
  const setModelsStatus = useSetAtom(storyModelsStatusAtom);
  const isChecking = useAtomValue(isCheckingStoryModelsAtom);
  const setIsChecking = useSetAtom(isCheckingStoryModelsAtom);
  const [downloadingModels, setDownloadingModels] = useAtom(downloadingStoryModelsAtom);
  const models = useAtomValue(storyModelsListAtom);
  const allRequiredReady = useAtomValue(allRequiredStoryModelsReadyAtom);

  const totalSuiteSizeBytes = useAtomValue(totalStorySuiteSizeBytesAtom);
  const remainingSizeBytes = useAtomValue(totalStoryRemainingSizeBytesAtom);
  const downloadedCount = useAtomValue(storyDownloadedCountAtom);

  const totalSuiteSizeFormatted = formatBytes(totalSuiteSizeBytes);
  const remainingSizeFormatted = formatBytes(remainingSizeBytes);
  const totalCount = models.length;

  const refreshStatus = useCallback(async (): Promise<void> => {
    setIsChecking(true);
    try {
      const res = await apiGetModelStatus('story');
      if (res && res.success && res.data) {
        setModelsStatus(res.data);
      }
    } catch (err) {
      console.warn('[useStoryModels] Failed to query status via IPC:', err);
    } finally {
      setIsChecking(false);
    }
  }, [setModelsStatus, setIsChecking]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const unsub = onModelDownloadProgress((payload) => {
      setDownloadingModels((prev) => {
        if (payload.percentage >= 100) {
          const next = { ...prev };
          delete next[payload.modelId];
          refreshStatus();
          return next;
        }
        return { ...prev, [payload.modelId]: payload };
      });
    });
    return unsub;
  }, [setDownloadingModels, refreshStatus]);

  const downloadModel = useCallback(
    async (modelId: string) => {
      setDownloadingModels((prev) => ({
        ...prev,
        [modelId]: { modelId, percentage: 0, downloaded: 0, total: 0 },
      }));
      try {
        await apiDownloadModel({ engine: 'story', modelId });
      } catch (err) {
        console.error('[useStoryModels] Download failed:', err);
      } finally {
        refreshStatus();
      }
    },
    [setDownloadingModels, refreshStatus],
  );

  const downloadAllRequired = useCallback(async () => {
    const missing = models.filter((m) => !m.downloaded);
    for (const m of missing) {
      setDownloadingModels((prev) => ({
        ...prev,
        [m.id]: { modelId: m.id, percentage: 0, downloaded: 0, total: m.sizeBytes },
      }));
    }
    try {
      await apiDownloadModel({ engine: 'story', allRequired: true });
    } catch (err) {
      console.error('[useStoryModels] Download all failed:', err);
    } finally {
      refreshStatus();
    }
  }, [models, setDownloadingModels, refreshStatus]);

  const cancelDownload = useCallback(
    async (modelId: string) => {
      try {
        await apiCancelModelDownload(modelId);
        setDownloadingModels((prev) => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });
      } catch (err) {
        console.error('[useStoryModels] Cancel download failed:', err);
      }
    },
    [setDownloadingModels],
  );

  return {
    models,
    totalSuiteSizeFormatted,
    remainingSizeFormatted,
    downloadedCount,
    totalCount,
    allRequiredReady,
    isChecking,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
    refreshStatus,
  };
}
