export type * from './narrative-engine/types/index.ts';
export type { ProducedAudioSegment, ProducedSceneAudio } from './narrative-engine/audio/audio-producer.interface.ts';
import type { WorkflowExecutionSnapshot } from './narrative-engine/types/index.ts';

export type NarrativeProjectSnapshot = WorkflowExecutionSnapshot;

export type StoryTab = 'stories' | 'studio' | 'models' | 'blueprint' | 'world' | 'prose' | 'audio';

export interface StoryGenerationProgress {
  stage: string;
  stageName: string;
  progressPercent: number;
  message: string;
  timestamp: string;
}

export interface StoryProjectSummary {
  id: string;
  title: string;
  primaryGenre: string;
  subgenres: string[];
  premise: string;
  format: string;
  totalScenes: number;
  completedScenes: number;
  totalWords: number;
  audioDurationSeconds: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  lastUpdated: string;
}
