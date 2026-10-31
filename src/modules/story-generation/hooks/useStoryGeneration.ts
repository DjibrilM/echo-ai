import { useCallback } from 'react';
import { useStoryGenerationStore } from '../store/storyGenerationStore.ts';
import { storyGenerationService } from '../services/story-generation.service.ts';
import type { RawCreativePrompt, StoryProjectSummary } from '../types.ts';

export function useStoryGeneration() {
  const store = useStoryGenerationStore();

  const startStoryGeneration = useCallback(
    async (overridePrompt?: RawCreativePrompt, maxScenes = 2) => {
      const promptToUse = overridePrompt || store.promptInput;
      store.setIsGenerating(true);
      store.setError(null);
      store.setActiveTab('studio');

      try {
        const result = await storyGenerationService.runStoryGeneration(promptToUse, {
          maxScenesToProduce: maxScenes,
          enableAudioPreparation: true,
          cfgScale: store.cfgScale,
          stability: store.stability,
          similarity: store.similarity,
          lavaSrEnabled: store.lavaSrEnabled,
          voicePrompt: store.voicePrompt,
          onProgress: (prog) => {
            store.setProgress(prog);
          },
        });

        store.setActiveProject(result.snapshot);
        store.setGraphState(result.graphState);
        store.setPerformanceScripts(result.performanceScripts);
        store.setAudioResults(result.audioResults);

        const scenesCount = Object.keys(result.graphState.scenes || {}).length || maxScenes;
        const totalWords = Object.values(result.graphState.scenes || {}).reduce(
          (acc, s) => acc + (s.wordCount || 0),
          0,
        );
        const audioDuration = Object.values(result.audioResults || {}).reduce(
          (acc, a) => acc + Math.round((a.totalDurationMs || 0) / 1000),
          0,
        );

        const newSummary: StoryProjectSummary = {
          id: result.snapshot.projectId || `story-${Date.now()}`,
          title: result.snapshot.intent?.title || 'Untitled Narrative',
          primaryGenre: result.snapshot.intent?.primaryGenre || 'Speculative Fiction',
          subgenres: result.snapshot.intent?.subgenres || [],
          premise: result.snapshot.intent?.premise || promptToUse.rawPrompt,
          format: result.snapshot.intent?.format || promptToUse.format || 'short_story',
          totalScenes: scenesCount,
          completedScenes: scenesCount,
          totalWords: totalWords || 1400,
          audioDurationSeconds: audioDuration || 180,
          status: 'completed',
          lastUpdated: 'Just now',
        };

        store.setSavedStories((prev) => [newSummary, ...prev]);
        store.setActiveTab('studio');
      } catch (err: any) {
        store.setError(err.message || String(err));
      } finally {
        store.setIsGenerating(false);
      }
    },
    [store],
  );

  return {
    ...store,
    startStoryGeneration,
  };
}
