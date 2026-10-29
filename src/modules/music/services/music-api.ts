import {
  sendMusicGenerate,
  sendCancelMusic,
  sendMusicEdit,
  sendMusicUnderstand,
  sendGetMusicModelStatus,
  sendAssessMusicFit,
  sendUnloadMusicModel,
  sendGetMusicHistory,
  sendSaveMusicHistory,
  sendDeleteMusicHistory,
  sendClearMusicHistory,
  sendGetMusicLogs,
  sendClearMusicLogs,
  musicProgressListeners,
  musicCompleteListeners,
  musicErrorListeners,
  sendGenerateLyrics,
  musicLyricTokenListeners,
} from '@/components/providers/IpcProvider';
import type { MusicGenerationOutput, MusicProgressState } from '../types';

export interface GenerateMusicParams {
  taskId: string;
  caption: string;
  engine?: 'acestep' | 'minimax';
  useGPU?: boolean;
  ditVariant?: 'turbo-q4' | 'turbo-q8' | 'sft-q8' | 'base-q4';
  lyrics?: string;
  isInstrumental?: boolean;
  vocalMode?: 'instrumental' | 'manual' | 'auto';
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  vocalLanguage?: string;
  duration?: number;
  seed?: number;
  simpleMode?: boolean;
  rewriteQuery?: boolean;
  generateLrc?: boolean;
  computeQualityScore?: boolean;
  augmentCaptionWithMetadata?: boolean;
  normalizeLoudness?: boolean;
  guidanceScale?: number;
  dcwEnabled?: boolean;
  dcwScaler?: number;
  dcwHighScaler?: number;
  inferenceSteps?: number;
  shift?: number;
  referenceAudio?: string;
  taskType?: 'text2music' | 'cover-nofsq' | 'lego';
  sourceAudio?: string;
  audioCoverStrength?: number;
  coverNoiseStrength?: number;
  track?: string;
  cfgScale?: number;
  maxFrames?: number;
}

export async function generateMusic(params: GenerateMusicParams) {
  return sendMusicGenerate(params);
}

export async function cancelMusic(taskId: string) {
  return sendCancelMusic(taskId);
}

export async function editMusic(params: Record<string, unknown>) {
  return sendMusicEdit(params);
}

export async function understandMusic(params: Record<string, unknown>) {
  return sendMusicUnderstand(params);
}

export async function getMusicModelStatus() {
  return sendGetMusicModelStatus();
}

export async function assessMusicFit(options?: Record<string, unknown>) {
  return sendAssessMusicFit(options);
}

export async function unloadMusicModel() {
  return sendUnloadMusicModel();
}

export async function getMusicHistory(): Promise<{ success: boolean; data?: MusicGenerationOutput[] }> {
  return sendGetMusicHistory();
}

export async function saveMusicHistory(item: MusicGenerationOutput) {
  return sendSaveMusicHistory(item);
}

export async function deleteMusicHistory(id: string) {
  return sendDeleteMusicHistory(id);
}

export async function clearMusicHistory() {
  return sendClearMusicHistory();
}

export async function getMusicGenerationLogs(limitLines?: number) {
  return sendGetMusicLogs(limitLines);
}

export async function clearMusicGenerationLogs() {
  return sendClearMusicLogs();
}

export function subscribeMusicProgress(
  taskId: string,
  onProgress: (p: MusicProgressState) => void,
  onComplete: (g: MusicGenerationOutput) => void,
  onError: (err: string, details?: any) => void
): () => void {
  const progressHandler = (data: { taskId: string } & MusicProgressState) => {
    if (data.taskId === taskId) {
      onProgress(data);
    }
  };

  const completeHandler = (data: { taskId: string; generation?: MusicGenerationOutput }) => {
    if (data.taskId === taskId && data.generation) {
      onComplete(data.generation);
    }
  };

  const errorHandler = (data: { taskId: string; error?: string; details?: any }) => {
    if (data.taskId === taskId) {
      onError(data.error || 'Generation failed', data.details);
    }
  };

  musicProgressListeners.set(`prog_${taskId}`, progressHandler);
  musicCompleteListeners.set(`comp_${taskId}`, completeHandler);
  musicErrorListeners.set(`err_${taskId}`, errorHandler);

  return () => {
    musicProgressListeners.delete(`prog_${taskId}`);
    musicCompleteListeners.delete(`comp_${taskId}`);
    musicErrorListeners.delete(`err_${taskId}`);
  };
}

/**
 * Streams AI-composed song lyrics using local Qwen3-1.7B Instruct LLM,
 * conditioned directly on the song description prompt.
 */
export async function generateLyricsStream(
  prompt: string,
  onToken?: (token: string) => void
): Promise<{ success: boolean; lyrics?: string; error?: string; engine?: string }> {
  const taskId = `lyric_${Date.now()}`;
  const tokenListenerKey = `token_${taskId}`;

  if (onToken) {
    musicLyricTokenListeners.set(tokenListenerKey, (data) => {
      if (data.taskId === taskId) {
        onToken(data.token);
      }
    });
  }

  try {
    const result = await sendGenerateLyrics({ prompt, taskId });
    return result;
  } finally {
    musicLyricTokenListeners.delete(tokenListenerKey);
  }
}
