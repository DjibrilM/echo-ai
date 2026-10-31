import type {
  RawCreativePrompt,
  NarrativeProjectSnapshot,
  StoryGraphState,
  ProducedSceneAudio,
  StoryGenerationProgress,
  PerformanceScript,
} from '../types.ts';

export interface GenerateStoryOptions {
  maxScenesToProduce?: number;
  enableAudioPreparation?: boolean;
  cfgScale?: number;
  stability?: number;
  similarity?: number;
  lavaSrEnabled?: boolean;
  voicePrompt?: string;
  onProgress?: (progress: StoryGenerationProgress) => void;
}

export interface StoryGenerationResult {
  snapshot: NarrativeProjectSnapshot;
  graphState: StoryGraphState;
  performanceScripts: PerformanceScript[];
  audioResults: Record<string, ProducedSceneAudio>;
}

export class StoryGenerationService {
  private static instance: StoryGenerationService | null = null;

  private constructor() {}

  public static getInstance(): StoryGenerationService {
    if (!StoryGenerationService.instance) {
      StoryGenerationService.instance = new StoryGenerationService();
    }
    return StoryGenerationService.instance;
  }

  public async runStoryGeneration(
    prompt: RawCreativePrompt,
    options: GenerateStoryOptions = {},
  ): Promise<StoryGenerationResult> {
    if (typeof window !== 'undefined' && window.ipcRenderer) {
      const progressListener = (_event: any, p: any) => {
        options.onProgress?.({
          stage: p.stage || 'PROGRESS',
          stageName: p.stageName || 'Generating Story',
          progressPercent: p.progressPercent || 50,
          message: p.message || '',
          timestamp: p.timestamp || new Date().toLocaleTimeString(),
        });
      };

      window.ipcRenderer.on('story:progress', progressListener);

      try {
        const res = (await window.ipcRenderer.invoke('story:generate', {
          prompt,
          options: {
            maxScenesToProduce: options.maxScenesToProduce ?? 2,
            enableAudioPreparation: options.enableAudioPreparation !== false,
            cfgScale: options.cfgScale,
            stability: options.stability,
            similarity: options.similarity,
            lavaSrEnabled: options.lavaSrEnabled,
            voicePrompt: options.voicePrompt,
          },
        })) as { success: boolean; data?: StoryGenerationResult; error?: string };

        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to generate narrative story');
        }

        return res.data;
      } finally {
        window.ipcRenderer.off('story:progress', progressListener);
      }
    }

    throw new Error('IPC renderer is unavailable in current runtime');
  }
}

export const storyGenerationService = StoryGenerationService.getInstance();
