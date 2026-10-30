import {
  sendMusicGenerate,
  sendCancelMusic,
  musicProgressListeners,
  musicCompleteListeners,
  musicErrorListeners,
} from '@/components/providers/IpcProvider';
import type { BeatGenerationOutput, BeatProgressState, BeatDitVariant } from '../types';

export interface GenerateBeatParams {
  taskId: string;
  caption: string;
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  duration?: number;
  ditVariant?: BeatDitVariant;
  guidanceScale?: number;
  inferenceSteps?: number;
  shift?: number;
  seed?: number;
  dcwEnabled?: boolean;
  dcwScaler?: number;
  dcwHighScaler?: number;
}

export async function generateBeat(params: GenerateBeatParams) {
  return sendMusicGenerate({
    ...params,
    engine: 'acestep',
    isInstrumental: true,
    vocalMode: 'instrumental',
    normalizeLoudness: true,
    guidanceScale: params.guidanceScale ?? 1.0,
    shift: params.shift ?? 3.0,
    inferenceSteps: params.inferenceSteps ?? 10,
    dcwEnabled: params.dcwEnabled ?? true,
    dcwScaler: params.dcwScaler ?? 0.05,
    dcwHighScaler: params.dcwHighScaler ?? 0.02,
  });
}

export async function cancelBeat(taskId: string) {
  return sendCancelMusic(taskId);
}

export function subscribeBeatProgress(
  taskId: string,
  onProgress: (p: BeatProgressState) => void,
  onComplete: (output: BeatGenerationOutput) => void,
  onError: (err: string) => void
): () => void {
  const progKey = `beat_prog_${taskId}`;
  const compKey = `beat_comp_${taskId}`;
  const errKey = `beat_err_${taskId}`;

  const progressHandler = (data: { taskId: string } & BeatProgressState) => {
    if (data.taskId === taskId) {
      onProgress(data);
    }
  };

  const completeHandler = (data: { taskId: string; generation?: BeatGenerationOutput }) => {
    if (data.taskId === taskId && data.generation) {
      onComplete(data.generation);
    }
  };

  const errorHandler = (data: { taskId: string; error?: string }) => {
    if (data.taskId === taskId) {
      onError(data.error || 'Beat generation failed');
    }
  };

  musicProgressListeners.set(progKey, progressHandler);
  musicCompleteListeners.set(compKey, completeHandler);
  musicErrorListeners.set(errKey, errorHandler);

  return () => {
    musicProgressListeners.delete(progKey);
    musicCompleteListeners.delete(compKey);
    musicErrorListeners.delete(errKey);
  };
}
