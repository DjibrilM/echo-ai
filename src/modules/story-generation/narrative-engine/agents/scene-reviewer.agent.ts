import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { SceneContract } from '../types/blueprint.types.ts';
import type { ContextProjection } from '../types/context.types.ts';
import { SceneReviewResultSchema } from '../types/scene.types.ts';
import type {
  SceneDraft,
  SceneReviewResult,
} from '../types/scene.types.ts';

export class SceneReviewer extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async reviewScene(
    contract: SceneContract,
    draft: SceneDraft,
    projection: ContextProjection,
    iterationNumber = 1,
  ): Promise<SceneReviewResult> {
    const systemPrompt = `You are the Scene Reviewer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Critically evaluate the generated scene draft against the SceneContract, character epistemic boundaries, and world rules before it can be committed to the canonical Story Graph.

CHECKLIST CRITERIA:
1. contract_objective_fulfilled: Did the scene achieve its core objective?
2. required_events_present: Are all mandatory events from the contract present in the prose?
3. character_behavior_and_voice_consistent: Did characters speak and act consistently with their personality flaws and dialogue styles?
4. epistemic_knowledge_boundaries_respected: Did any character act on knowledge they do not have or reveal secrets without causal justification?
5. world_rules_and_continuity_preserved: Are the fictional world rules and physical laws obeyed?
6. no_unauthorized_major_plot_divergence: Did the prose avoid introducing wild, unapproved alterations to the overarching plot?
7. style_and_tone_adherence: Does the prose honor the assigned emotional shift and tone?

REVIEW RULES:
- This is iteration #${iterationNumber} of 2.
- If all checks pass, set recommendation: "approve" and isApproved: true.
- If issues exist and iterationNumber < 2, set recommendation: "request_revision" and list clear requiredRevisions.
- If issues persist on iteration 2, set recommendation: "escalate_failure" and isApproved: false.

You must output ONLY a valid JSON object matching the SceneReviewResult schema.`;

    const userMessage = `## SCENE CONTRACT
Title: ${contract.title}
Objective: ${contract.objective}
Required Events:
${contract.requiredEvents.map((e) => `- ${e}`).join('\n')}
Emotional Shift: ${contract.emotionalShift.from} → ${contract.emotionalShift.to}

## CHARACTER EPISTEMIC BOUNDARIES
${projection.activeCharacters
  .map(
    (c) => `- ${c.profile.name}: Knows [${c.state.knownFacts.join('; ')}]. Believes [${c.state.falseBeliefs.join('; ')}]. Hiding [${c.state.hiddenSecrets.join('; ')}].`,
  )
  .join('\n')}

## WORLD RULES
${projection.relevantWorldFacts.map((f) => `- [${f.category}] ${f.statement}`).join('\n')}

## GENERATED SCENE DRAFT (ITERATION #${iterationNumber})
Summary: ${draft.summary}
Prose:
"""
${draft.prose}
"""

Evaluate this scene draft. Output ONLY JSON.`;

    const result = await this.invokeStructured<SceneReviewResult>(
      {
        promptId: `scene_reviewer_${contract.id}_iter_${iterationNumber}`,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      SceneReviewResultSchema,
    );

    result.sceneId = contract.id;
    result.iterationNumber = iterationNumber;
    return result;
  }
}
