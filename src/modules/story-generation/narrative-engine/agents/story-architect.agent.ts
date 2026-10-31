import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { CreativeIntent } from '../types/creative-intent.types.ts';
import type { WorldBuildingManifest } from '../types/character.types.ts';
import { NarrativeBlueprintSchema } from '../types/blueprint.types.ts';
import type {
  NarrativeBlueprint,
  BlueprintReviewResult,
} from '../types/blueprint.types.ts';

export class StoryArchitect extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async createBlueprint(
    intent: CreativeIntent,
    manifest: WorldBuildingManifest,
  ): Promise<NarrativeBlueprint> {
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = `## CREATIVE INTENT
Title: ${intent.title}
Premise: ${intent.premise}
Genre: ${intent.primaryGenre} (${intent.subgenres.join(', ')})
Format: ${intent.format}
Tone: ${intent.tone.join(', ')}
Themes: ${intent.themes.join(', ')}
Constraints: ${intent.explicitConstraints.join('; ')}

## WORLD AND CHARACTERS
World: ${manifest.worldName} (${manifest.technologyOrMagicLevel})
Rules:
${manifest.rulesAndConstraints.map((r) => `- [${r.category}] ${r.statement}`).join('\n')}

Locations:
${manifest.locations.map((l) => `- ${l.name} (${l.id}): ${l.environmentType}`).join('\n')}

Characters:
${manifest.characters.map((c) => `- ${c.name} (${c.id}, ${c.role}): Wants "${c.personality.primaryMotivation}". Flaw: "${c.personality.coreFlaw}"`).join('\n')}

Create a complete, end-to-end Narrative Blueprint. Every scene must have a fully specified SceneContract. Output ONLY JSON.`;

    const blueprint = await this.invokeStructured<NarrativeBlueprint>(
      {
        promptId: 'story_architect_create',
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      NarrativeBlueprintSchema,
    );

    blueprint.submissionCount = 1;
    blueprint.reviewStatus = 'pending_review';
    return blueprint;
  }

  public async reviseBlueprint(
    currentBlueprint: NarrativeBlueprint,
    reviewFindings: BlueprintReviewResult,
  ): Promise<NarrativeBlueprint> {
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = `## CURRENT BLUEPRINT (SUBMISSION #${currentBlueprint.submissionCount})
${JSON.stringify(currentBlueprint, null, 2)}

## REVIEWER FINDINGS (REJECTION REASONS)
Assessment: ${reviewFindings.overallAssessment}
Specific Findings:
${reviewFindings.findings.map((f, i) => `${i + 1}. [${f.category}] (${f.severity}) in scenes [${f.affectedSceneIds.join(', ')}]: ${f.description}\nRequired Correction: ${f.requiredCorrection}`).join('\n\n')}

Revise the blueprint to resolve EVERY finding listed above while preserving the core premise and characters. Output ONLY the revised JSON blueprint.`;

    const revised = await this.invokeStructured<NarrativeBlueprint>(
      {
        promptId: 'story_architect_revise',
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      NarrativeBlueprintSchema,
    );

    revised.submissionCount = currentBlueprint.submissionCount + 1;
    revised.reviewStatus = 'pending_review';
    revised.integrityReviewNotes = [
      ...currentBlueprint.integrityReviewNotes,
      `Revision #${revised.submissionCount} addressing: ${reviewFindings.overallAssessment}`,
    ];
    return revised;
  }

  private buildSystemPrompt(): string {
    return `You are the Story Architect in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Construct a complete narrative blueprint from beginning to end before prose generation starts.

Architectural Rules:
1. End-to-End Planning: The narrative destination must be defined in advance (Opening → Inciting Incident → Rising Action → Midpoint → Turning Points → Climax → Resolution → Ending).
2. Hierarchical Structure: Project → Arc → Act → Chapter → Scene → Beat.
3. Scene Contracts: Every single scene MUST have an explicit SceneContract detailing:
   - scene objective
   - focusCharacterId and participatingCharacterIds
   - locationId
   - opening conditions
   - required events and required revelations
   - character motivations in the scene
   - emotional shift (from → to)
   - continuity constraints and dependencies
   - expected closing conditions
   - target word count (default 800)
   - dramatic beats
4. Setup & Payoff: Formulate explicit pairs connecting earlier setups to later payoffs.

You must output ONLY a valid JSON object matching the NarrativeBlueprint schema.`;
  }
}
