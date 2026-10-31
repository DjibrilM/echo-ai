import { StoryGraph } from '../memory/story-graph.ts';
import { ContextBuilder } from '../memory/context-builder.ts';
import type { SceneContract, NarrativeBlueprint } from '../types/blueprint.types.ts';
import type { WritingTaskAssignment } from '../types/context.types.ts';
import type { CreativeIntent } from '../types/creative-intent.types.ts';

export class MainStoryDirector {
  private readonly storyGraph: StoryGraph;
  private readonly contextBuilder: ContextBuilder;

  constructor(
    storyGraph: StoryGraph,
    contextBuilder: ContextBuilder,
  ) {
    this.storyGraph = storyGraph;
    this.contextBuilder = contextBuilder;
  }

  /**
   * Identifies all scenes planned across the blueprint in execution order.
   */
  public extractPlannedScenes(blueprint: NarrativeBlueprint): SceneContract[] {
    const scenes: SceneContract[] = [];
    for (const act of blueprint.acts) {
      for (const chapter of act.chapters) {
        for (const scene of chapter.scenes) {
          scenes.push(scene);
        }
      }
    }
    return scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
  }

  /**
   * Determines the next uncompleted scene to produce.
   */
  public getNextSceneToProduce(blueprint: NarrativeBlueprint): SceneContract | null {
    const planned = this.extractPlannedScenes(blueprint);
    for (const scene of planned) {
      const existing = this.storyGraph.getScene(scene.id);
      if (!existing) {
        return scene;
      }
    }
    return null;
  }

  /**
   * Assembles a comprehensive, purpose-built writing task assignment for a specific scene.
   */
  public createWritingTask(
    contract: SceneContract,
    intent: CreativeIntent,
    revisionFeedback?: string,
  ): WritingTaskAssignment {
    const projection = this.contextBuilder.buildContextForScene(contract);

    return {
      taskId: `task-${contract.id}-${Date.now()}`,
      sceneContract: contract,
      projection,
      stylistics: {
        narrativePerspective: intent.perspective,
        overallTone: intent.tone,
        sceneAtmosphere: `${contract.emotionalShift.from} shifting towards ${contract.emotionalShift.to}`,
        pacing: intent.pacingPreference,
      },
      revisionFeedback,
    };
  }
}
