import { StoryGraph } from './story-graph.ts';
import type { SceneContract } from '../types/blueprint.types.ts';
import type {
  ContextProjection,
  ActiveCharacterContext,
  PreviousSceneBridge,
} from '../types/context.types.ts';

export class ContextBuilder {
  private readonly storyGraph: StoryGraph;

  constructor(storyGraph: StoryGraph) {
    this.storyGraph = storyGraph;
  }

  /**
   * Constructs a lightweight, high-salience context projection specifically
   * targeted to the given scene contract. Never loads the whole story history.
   */
  public buildContextForScene(contract: SceneContract): ContextProjection {
    const state = this.storyGraph.getState();

    // 1. Resolve participating characters and their isolated epistemic states
    const activeCharacters: ActiveCharacterContext[] = [];

    for (const charId of contract.participatingCharacterIds) {
      const profile = state.characters[charId];
      const epistemic = state.epistemicStates[charId];

      if (profile && epistemic) {
        // Filter relationships to only those participating in this scene
        const relevantRels = (profile.relationships || []).filter((r) =>
          contract.participatingCharacterIds.includes(r.targetCharacterId),
        );

        activeCharacters.push({
          profile,
          state: epistemic,
          relationshipsWithOtherParticipants: relevantRels,
        });
      }
    }

    // 2. Resolve current physical location
    const location = state.locations[contract.locationId] || {
      id: contract.locationId,
      name: 'Unspecified Location',
      environmentType: 'Neutral Environment',
      description: 'An unmapped area within the setting.',
      sensoryDetails: { sights: [], sounds: [], smellsOrAtmosphere: [] },
      currentCondition: 'Standard',
    };

    // 3. Resolve relevant world facts (filter by category or direct relevance)
    const relevantWorldFacts = state.worldFacts.slice(0, 8);

    // 4. Resolve relevant plot threads involving these characters
    const relevantPlotThreads = Object.values(state.plotThreads).filter((thread) =>
      thread.involvedCharacterIds.some((id) => contract.participatingCharacterIds.includes(id)),
    );

    // 5. Construct previous scene bridge (summary + last 2 paragraphs)
    const previousScene = this.storyGraph.getPreviousScene(contract.id);
    let previousSceneBridge: PreviousSceneBridge = {};

    if (previousScene) {
      const proseParagraphs = previousScene.prose.split('\n\n').filter((p) => p.trim().length > 0);
      const closingSnippet = proseParagraphs.slice(-2).join('\n\n');

      previousSceneBridge = {
        previousSceneId: previousScene.contract.id,
        previousSceneTitle: previousScene.contract.title,
        summary: previousScene.summary,
        closingSnippet: closingSnippet.length > 0 ? closingSnippet : undefined,
      };
    }

    return {
      sceneId: contract.id,
      sceneContract: contract,
      activeCharacters,
      currentLocation: location,
      relevantWorldFacts,
      relevantPlotThreads,
      previousSceneBridge,
      unresolvedMysteries: state.unresolvedMysteries.slice(0, 5),
      narrativeConstraints: contract.continuityConstraints,
    };
  }

  /**
   * Estimates token consumption of the context projection to ensure it stays well within budget.
   */
  public estimateProjectionTokens(projection: ContextProjection): number {
    const serialized = JSON.stringify(projection);
    return Math.ceil(serialized.length / 4);
  }
}
