import path from 'node:path';
import { app } from 'electron';
import {
  WorkflowOrchestrator,
  StoryGraph,
  PersistenceManager,
  QvacAdapter,
  CosyVoiceAudioProducer,
} from '../../../../src/modules/story-generation/narrative-engine/index.ts';
import type {
  RawCreativePrompt,
  WorkflowExecutionSnapshot,
  StoryGraphState,
  PerformanceScript,
  ProducedSceneAudio,
} from '../../../../src/modules/story-generation/narrative-engine/index.ts';

export interface StoryGenerateOptions {
  maxScenesToProduce?: number;
  enableAudioPreparation?: boolean;
  cfgScale?: number;
  stability?: number;
  similarity?: number;
  lavaSrEnabled?: boolean;
  voicePrompt?: string;
}

export interface StoryGenerateResult {
  snapshot: WorkflowExecutionSnapshot;
  graphState: StoryGraphState;
  performanceScripts: PerformanceScript[];
  audioResults: Record<string, ProducedSceneAudio>;
}

export interface StoryProgressPayload {
  stage: string;
  stageName: string;
  progressPercent: number;
  message: string;
  timestamp: string;
}

export class StoryService {
  private orchestrator: WorkflowOrchestrator | null = null;
  private modelProvider: QvacAdapter | null = null;
  private audioProducer: CosyVoiceAudioProducer | null = null;
  private persistence: PersistenceManager;

  constructor() {
    let persistDir = path.join(process.cwd(), 'data', 'narratives');
    try {
      if (app?.getPath) {
        persistDir = path.join(app.getPath('userData'), 'narratives');
      }
    } catch {
      // Use fallback directory
    }
    this.persistence = new PersistenceManager(persistDir);
  }

  public async getModelProvider(): Promise<QvacAdapter> {
    if (!this.modelProvider) {
      this.modelProvider = new QvacAdapter();
      await this.modelProvider.initialize();
    }
    return this.modelProvider;
  }

  public getAudioProducer(options?: StoryGenerateOptions): CosyVoiceAudioProducer {
    if (!this.audioProducer || options) {
      this.audioProducer = new CosyVoiceAudioProducer({
        useLiveQvacEngine: true,
        lavaSrEnabled: options?.lavaSrEnabled !== false,
        cfgScale: options?.cfgScale ?? 1.5,
        stability: options?.stability ?? 0.7,
        similarity: options?.similarity ?? 0.85,
        voicePrompt: options?.voicePrompt,
      });
    }
    return this.audioProducer;
  }

  public async generateStory(
    prompt: RawCreativePrompt,
    options?: StoryGenerateOptions,
    onProgress?: (progress: StoryProgressPayload) => void,
  ): Promise<{ success: boolean; data?: StoryGenerateResult; error?: string }> {
    try {
      const model = await this.getModelProvider();
      const audio = this.getAudioProducer(options);
      const storyGraph = new StoryGraph();
      this.orchestrator = new WorkflowOrchestrator(model, storyGraph, this.persistence);

      const stageLabels: Record<string, { name: string; pct: number }> = {
        NORMALIZING_INTENT: { name: 'Normalizing Creative Intent', pct: 15 },
        DESIGNING_WORLD_AND_CHARACTERS: { name: 'Synthesizing World & Character Profiles', pct: 30 },
        ARCHITECTING_BLUEPRINT: { name: 'Architecting End-to-End Blueprint', pct: 45 },
        REVIEWING_BLUEPRINT: { name: 'Reviewing Narrative Integrity', pct: 60 },
        BLUEPRINT_APPROVED: { name: 'Narrative Blueprint Approved', pct: 65 },
        EXECUTING_SCENE: { name: 'Directing Scene Production', pct: 75 },
        REVIEWING_SCENE: { name: 'Reviewing Scene Contract Adherence', pct: 85 },
        PREPARING_AUDIO: { name: 'Preparing CosyVoice 3 Audio Scripts', pct: 92 },
        COMPLETED: { name: 'Narrative Production Completed', pct: 100 },
      };

      const runResult = await this.orchestrator.run(prompt, {
        maxScenesToProduce: options?.maxScenesToProduce ?? 2,
        enableAudioPreparation: options?.enableAudioPreparation !== false,
        onProgress: (stage, message) => {
          const info = stageLabels[stage] || { name: stage, pct: 50 };
          onProgress?.({
            stage,
            stageName: info.name,
            progressPercent: info.pct,
            message,
            timestamp: new Date().toLocaleTimeString(),
          });
        },
      });

      const audioResults: Record<string, ProducedSceneAudio> = {};
      if (options?.enableAudioPreparation !== false && runResult.performanceScripts?.length) {
        for (const script of runResult.performanceScripts) {
          try {
            onProgress?.({
              stage: 'SYNTHESIZING_AUDIO',
              stageName: 'Synthesizing CosyVoice 3 Audio',
              progressPercent: 96,
              message: `Assembling acoustic dialogue for scene: ${script.sceneTitle}`,
              timestamp: new Date().toLocaleTimeString(),
            });

            const producedAudio = await audio.assembleSceneAudio(script);
            audioResults[script.sceneId] = producedAudio;
          } catch (audioErr) {
            console.warn(`[StoryService] Failed to synthesize audio for scene ${script.sceneId}:`, audioErr);
          }
        }
      }

      return {
        success: true,
        data: {
          snapshot: runResult.snapshot,
          graphState: runResult.storyGraph.getState(),
          performanceScripts: runResult.performanceScripts || [],
          audioResults,
        },
      };
    } catch (err) {
      console.error('[StoryService] Generation failed:', err);
      return { success: false, error: String(err) };
    }
  }
}
