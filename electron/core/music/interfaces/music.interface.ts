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

export type MusicRepaintMode = 'conservative' | 'balanced' | 'aggressive';

export interface FlowEditOperation {
  type: 'flow-edit';
  from: { caption: string; lyrics?: string };
  to: { caption: string; lyrics?: string };
  nMin?: number;
  nMax?: number;
  nAvg?: number;
}

export interface RepaintOperation {
  type: 'repaint';
  caption: string;
  lyrics?: string;
  start: number;
  end?: number;
  mode?: MusicRepaintMode;
  strength?: number;
}

export type MusicEditOperation = FlowEditOperation | RepaintOperation;

export interface MusicGenerateOptions {
  taskId: string;
  caption: string;
  engine?: MusicEngine;
  ditVariant?: MusicDitVariant;
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
  useGPU?: boolean;
  // Cover & Timbre Reference
  referenceAudio?: string;
  taskType?: MusicTaskType;
  sourceAudio?: string;
  audioCoverStrength?: number;
  coverNoiseStrength?: number;
  track?: MusicInstrumentTrack;
  // MiniMax-specific
  cfgScale?: number;
  maxFrames?: number;
  lmModelSrc?: string;
  synthModelSrc?: string;
  threads?: number;
}

export interface MusicEditOptions {
  taskId: string;
  sourceAudio: string;
  operations: MusicEditOperation[];
  seed?: number;
  referenceAudio?: string;
  vocalLanguage?: string;
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  augmentCaptionWithMetadata?: boolean;
  dcwEnabled?: boolean;
  dcwScaler?: number;
  dcwHighScaler?: number;
  inferenceSteps?: number;
  shift?: number;
  useGPU?: boolean;
}

export interface MusicUnderstandOptions {
  taskId: string;
  sourceAudio: string;
  vocalLanguage?: string;
  seed?: number;
  lmTemperature?: number;
  lmTopP?: number;
  lmTopK?: number;
}

export interface MusicUnderstandResult {
  caption: string;
  bpm: number;
  keyscale: string;
  timesignature: string;
  vocalLanguage: string;
  duration: number;
  audioCodes: number[];
  seed: number;
}

export interface MusicProgressPayload {
  taskId: string;
  stage: string;
  step: number;
  total: number;
  percentage: number;
  message?: string;
  etaFormatted?: string;
  etaSeconds?: number;
}

export interface MusicGenerationOutput {
  id: string;
  taskId: string;
  caption: string;
  lyrics?: string;
  isInstrumental?: boolean;
  audioUrl: string;
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
  qualityReport?: any;
  stats?: any;
  metadata?: any;
  createdAt: string;
}

export interface MusicGenerateResult {
  success: boolean;
  data?: MusicGenerationOutput;
  error?: string;
  errorDetails?: any;
  details?: any;
}

export interface MusicModelItem {
  id: string;
  name: string;
  descriptorName: string;
  sizeBytes: number;
  sizeFormatted: string;
  stage: 'text-encoder' | 'lm' | 'dit' | 'vae';
  downloaded: boolean;
  status: 'idle' | 'downloading' | 'ready' | 'error';
  downloadProgress?: number;
  error?: string;
}

export interface MusicModelStatusResult {
  ready: boolean;
  activeModelId?: string;
  engine: MusicEngine;
  models: MusicModelItem[];
  gpuAvailable: boolean;
}
