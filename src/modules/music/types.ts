export type MusicEngine = 'acestep' | 'minimax';

export type MusicDitVariant = 'turbo-q4' | 'turbo-q8' | 'sft-q8' | 'base-q4';

export type MusicTaskType = 'text2music' | 'cover-nofsq' | 'lego';

export type MusicInstrumentTrack =
  | 'vocals'
  | 'backing_vocals'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'keyboard'
  | 'percussion'
  | 'strings'
  | 'synth'
  | 'fx'
  | 'brass'
  | 'woodwinds';

export interface MusicGenerationOutput {
  id: string;
  taskId: string;
  caption: string;
  lyrics?: string;
  isInstrumental?: boolean;
  audioUrl: string;
  cover?: string;
  videoUrl?: string;
  wavFilePath?: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  waveform: number[];
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  vocalLanguage?: string;
  seed?: number;
  taskType?: MusicTaskType;
  lrc?: string;
  lyricsScore?: number;
  qualityScore?: number;
  qualityReport?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MusicProgressState {
  stage: string;
  step: number;
  total: number;
  percentage: number;
  message?: string;
  etaFormatted?: string;
  etaSeconds?: number;
}

export interface MusicPromptPreset {
  id: string;
  title: string;
  genre: string;
  caption: string;
  lyrics?: string;
  bpm: number;
  keyscale: string;
  timesignature: string;
  duration: number;
}
