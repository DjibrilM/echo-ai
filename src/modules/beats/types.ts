export type BeatDitVariant = 'turbo-q4' | 'turbo-q8' | 'sft-q8' | 'base-q4';

export interface BeatPromptPreset {
  id: string;
  title: string;
  genre: string;
  caption: string;
  bpm: number;
  keyscale: string;
  timesignature: string;
  duration: number;
}

export interface BeatGenerationOutput {
  id: string;
  taskId: string;
  caption: string;
  audioUrl: string;
  cover?: string;
  wavFilePath?: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  waveform: number[];
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  seed?: number;
  qualityScore?: number;
  stats?: Record<string, unknown>;
  createdAt: string;
}

export interface BeatProgressState {
  stage: string;
  step: number;
  total: number;
  percentage: number;
  message?: string;
}

