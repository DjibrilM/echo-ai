import type {
  PerformanceScript,
  AudioUtteranceSegment,
} from '../types/narration.types.ts';

export interface ProducedAudioSegment {
  utteranceId: string;
  speakerId: string;
  audioFilePath: string;
  durationMs: number;
  sampleRate: number;
  waveformSnippet?: number[];
  cached: boolean;
}

export interface ProducedSceneAudio {
  sceneId: string;
  sceneTitle: string;
  masterAudioFilePath: string;
  totalDurationMs: number;
  segments: ProducedAudioSegment[];
  soundEffectsApplied: number;
  ambienceApplied: boolean;
  musicApplied: boolean;
  exportedAt: string;
}

export interface IAudioProducer {
  readonly supportedEngines: string[];
  produceSegment(segment: AudioUtteranceSegment): Promise<ProducedAudioSegment>;
  assembleSceneAudio(script: PerformanceScript): Promise<ProducedSceneAudio>;
  clearCache(): Promise<void>;
}
