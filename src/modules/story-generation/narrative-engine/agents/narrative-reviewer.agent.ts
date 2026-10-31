import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { WorldBuildingManifest } from '../types/character.types.ts';
import { BlueprintReviewResultSchema } from '../types/blueprint.types.ts';
import type {
  NarrativeBlueprint,
  BlueprintReviewResult,
} from '../types/blueprint.types.ts';

export class NarrativeIntegrityReviewer extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async reviewBlueprint(
    blueprint: NarrativeBlueprint,
    manifest: WorldBuildingManifest,
  ): Promise<BlueprintReviewResult> {
    const submissionNumber = Math.min(2, Math.max(1, blueprint.submissionCount || 1));

    const systemPrompt = `You are the Narrative Integrity Reviewer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Independently evaluate the complete narrative blueprint before it is approved for prose generation.

REVIEW PROTOCOL & CONSTRAINTS:
1. Strict 2-Submission Limit: This is submission #${submissionNumber} of 2.
   - If submissionNumber == 1 and issues exist, set recommendation: "request_revision" and isApproved: false.
   - If submissionNumber == 2 and critical issues remain unresolved, set recommendation: "escalate_to_human" and isApproved: false.
   - If the blueprint is solid, set recommendation: "approve" and isApproved: true.
2. Review Checklist:
   - Causal consistency (do later events logically follow from prior causes?).
   - Character motivations (do actions stem from established psychologies rather than plot convenience?).
   - Timeline and location consistency.
   - World-rule adherence (does the plan violate established technological or physical rules?).
   - Setup and payoff integrity (are setups paid off, and payoffs earned?).
   - Beginning-to-ending coherence (does the ending resolve core conflicts established at the start?).
   - Narrative justification (do catastrophic or miraculous turns have proper setup?).

You must output ONLY a valid JSON object matching the BlueprintReviewResult schema:
{
  "isApproved": boolean,
  "submissionNumber": ${submissionNumber},
  "overallAssessment": "Summary assessment",
  "findings": [
    {
      "category": "causal_inconsistency" | "character_motivation_mismatch" | "timeline_contradiction" | "world_rule_violation" | "unresolved_setup" | "insufficient_justification" | "pacing_or_structure_flaw",
      "severity": "minor" | "major" | "critical",
      "affectedSceneIds": ["scene-1"],
      "description": "...",
      "requiredCorrection": "..."
    }
  ],
  "strengths": ["..."],
  "recommendation": "approve" | "request_revision" | "escalate_to_human"
}`;

    const userMessage = `## WORLD RULES AND CHARACTERS
Rules:
${manifest.rulesAndConstraints.map((r) => `- [${r.category}] ${r.statement}`).join('\n')}

Characters:
${manifest.characters.map((c) => `- ${c.name} (${c.id}): Wants "${c.personality.primaryMotivation}". Flaw: "${c.personality.coreFlaw}". Backstory: ${c.backstorySummary}`).join('\n')}

## NARRATIVE BLUEPRINT TO EVALUATE (SUBMISSION #${submissionNumber})
${JSON.stringify(blueprint, null, 2)}

Perform a rigorous narrative integrity review. Output ONLY JSON.`;

    const result = await this.invokeStructured<BlueprintReviewResult>(
      {
        promptId: `narrative_reviewer_pass_${submissionNumber}`,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      BlueprintReviewResultSchema,
    );

    result.submissionNumber = submissionNumber;
    return result;
  }
}
