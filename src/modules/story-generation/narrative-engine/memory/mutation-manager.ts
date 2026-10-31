import { StoryGraph } from './story-graph.ts';
import type { ProposedMutation, CommittedMutation } from '../types/story-graph.types.ts';

export interface MutationValidationResult {
  isValid: boolean;
  errors: string[];
}

export class MutationManager {
  private readonly storyGraph: StoryGraph;

  constructor(storyGraph: StoryGraph) {
    this.storyGraph = storyGraph;
  }

  public validateMutation(mutation: ProposedMutation): MutationValidationResult {
    const errors: string[] = [];

    if (!mutation.targetEntityId) {
      errors.push('Mutation missing targetEntityId');
    }
    if (!mutation.justification || mutation.justification.trim().length === 0) {
      errors.push('Mutation missing required dramatic justification');
    }

    switch (mutation.type) {
      case 'character_knowledge':
      case 'character_state':
      case 'character_belief': {
        const char = this.storyGraph.getCharacter(mutation.targetEntityId);
        if (!char) {
          errors.push(`Target character "${mutation.targetEntityId}" does not exist in Story Graph`);
        }
        break;
      }

      case 'location_state_change': {
        const loc = this.storyGraph.getLocation(mutation.targetEntityId);
        if (!loc) {
          errors.push(`Target location "${mutation.targetEntityId}" does not exist in Story Graph`);
        }
        break;
      }

      case 'new_canonical_fact': {
        if (!mutation.payload.fact || typeof mutation.payload.fact !== 'string') {
          errors.push('new_canonical_fact payload must include a non-empty string "fact"');
        }
        break;
      }

      case 'relationship_update': {
        const charA = this.storyGraph.getCharacter(mutation.targetEntityId);
        const charBId = mutation.payload.targetCharacterId;
        if (!charA) {
          errors.push(`Source character "${mutation.targetEntityId}" does not exist`);
        }
        if (!charBId || !this.storyGraph.getCharacter(charBId)) {
          errors.push(`Target relationship character "${charBId}" does not exist`);
        }
        break;
      }

      default:
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public applyMutation(mutation: ProposedMutation, sourceSceneId: string): CommittedMutation {
    const validation = this.validateMutation(mutation);
    if (!validation.isValid) {
      throw new Error(`Invalid mutation rejected: ${validation.errors.join('; ')}`);
    }

    const state = (this.storyGraph as any).state;
    const committed: CommittedMutation = {
      ...mutation,
      committedAt: new Date().toISOString(),
      sourceSceneId,
      appliedSuccessfully: true,
    };

    switch (mutation.type) {
      case 'character_knowledge': {
        const epistemic = state.epistemicStates[mutation.targetEntityId];
        if (epistemic && mutation.payload.newFact) {
          const factStr = String(mutation.payload.newFact);
          if (!epistemic.knownFacts.includes(factStr)) {
            epistemic.knownFacts.push(factStr);
          }
        }
        break;
      }

      case 'character_belief': {
        const epistemic = state.epistemicStates[mutation.targetEntityId];
        if (epistemic) {
          if (mutation.payload.newFalseBelief) {
            epistemic.falseBeliefs.push(String(mutation.payload.newFalseBelief));
          }
          if (mutation.payload.shatteredBelief) {
            epistemic.falseBeliefs = epistemic.falseBeliefs.filter(
              (b: string) => b !== mutation.payload.shatteredBelief,
            );
          }
        }
        break;
      }

      case 'character_state': {
        const epistemic = state.epistemicStates[mutation.targetEntityId];
        if (epistemic) {
          if (mutation.payload.emotionalState) {
            epistemic.emotionalState = String(mutation.payload.emotionalState);
          }
          if (mutation.payload.currentGoal) {
            epistemic.currentGoal = String(mutation.payload.currentGoal);
          }
          if (mutation.payload.physicalLocationId) {
            epistemic.physicalLocationId = String(mutation.payload.physicalLocationId);
          }
          if (mutation.payload.revealedSecret) {
            epistemic.hiddenSecrets = epistemic.hiddenSecrets.filter(
              (s: string) => s !== mutation.payload.revealedSecret,
            );
          }
        }
        break;
      }

      case 'relationship_update': {
        const char = state.characters[mutation.targetEntityId];
        const targetId = mutation.payload.targetCharacterId;
        if (char && targetId) {
          const rel = char.relationships.find((r: any) => r.targetCharacterId === targetId);
          if (rel) {
            if (mutation.payload.dynamic) rel.dynamic = String(mutation.payload.dynamic);
            if (mutation.payload.trustScore !== undefined) rel.trustScore = Number(mutation.payload.trustScore);
            if (mutation.payload.relationshipType) rel.relationshipType = String(mutation.payload.relationshipType);
          } else {
            char.relationships.push({
              targetCharacterId: targetId,
              relationshipType: String(mutation.payload.relationshipType || 'associated'),
              dynamic: String(mutation.payload.dynamic || 'evolving'),
              trustScore: Number(mutation.payload.trustScore ?? 0.0),
            });
          }
        }
        break;
      }

      case 'new_canonical_fact': {
        this.storyGraph.addWorldFact({
          id: `fact-${Date.now()}`,
          category: mutation.payload.category || 'history',
          statement: String(mutation.payload.fact),
          isImmutable: mutation.payload.isImmutable !== false,
          establishedInSceneId: sourceSceneId,
        });
        break;
      }

      case 'location_state_change': {
        const loc = state.locations[mutation.targetEntityId];
        if (loc && mutation.payload.currentCondition) {
          loc.currentCondition = String(mutation.payload.currentCondition);
        }
        break;
      }

      case 'plot_thread_update': {
        if (mutation.payload.threadId && mutation.payload.status) {
          this.storyGraph.updatePlotThread(
            mutation.payload.threadId,
            mutation.payload.status,
            sourceSceneId,
          );
        }
        break;
      }

      case 'timeline_event': {
        this.storyGraph.addTimelineEvent({
          id: `evt-${Date.now()}`,
          sceneId: sourceSceneId,
          chronologicalIndex: state.timeline.length,
          timestampOrPhase: String(mutation.payload.timestampOrPhase || `Scene ${sourceSceneId}`),
          summary: String(mutation.payload.summary || mutation.justification),
          impactedCharacterIds: mutation.payload.impactedCharacterIds || [],
        });
        break;
      }

      default:
        break;
    }

    state.updatedAt = new Date().toISOString();
    state.version++;
    return committed;
  }
}
