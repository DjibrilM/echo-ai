import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import { CreativeIntentSchema } from '../types/creative-intent.types.ts';
import type {
  CreativeIntent,
  RawCreativePrompt,
} from '../types/creative-intent.types.ts';

export class CreativeIntentNormalizer extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async normalize(input: RawCreativePrompt): Promise<CreativeIntent> {
    const systemPrompt = `You are the Creative Intent Normalizer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Transform the raw creative prompt into a normalized, structured creative specification (CreativeIntent).

Analysis Guidelines:
1. Identify the core premise, primary genre, subgenres, target audience, and emotional tone.
2. Distinguish intentional artistic choices and fictional biases from unintended cultural stereotypes or flat generalizations.
3. Clarify ambiguities and resolve contradictory user requirements while preserving the author's core creative voice.
4. Establish explicit constraints and implied genre conventions.
5. Choose appropriate narrative perspective and pacing preference.

You must output ONLY a valid JSON object matching the CreativeIntent schema:
{
  "id": "intent-...",
  "title": "Working Title",
  "premise": "Core dramatic hook and premise",
  "primaryGenre": "Genre",
  "subgenres": ["Subgenre1", "Subgenre2"],
  "targetAudience": "Audience",
  "format": "short_story" | "novel" | "audio_drama" | "episodic" | "interactive",
  "tone": ["Tone1", "Tone2"],
  "themes": ["Theme1", "Theme2"],
  "explicitConstraints": ["Constraint1"],
  "impliedAssumptions": ["Assumption1"],
  "clarifiedAmbiguities": ["Resolved ambiguity"],
  "biasAnalysis": {
    "intentionalFictionalBiases": ["Artistic perspectives preserved"],
    "mitigatedUnintendedAssumptions": ["Flat stereotypes avoided"]
  },
  "pacingPreference": "fast" | "moderate" | "deliberate",
  "perspective": "first_person" | "third_person_limited" | "third_person_omniscient"
}`;

    const userMessage = `## RAW USER PROMPT
${input.rawPrompt}

${input.genreHints?.length ? `Genre Hints: ${input.genreHints.join(', ')}` : ''}
${input.format ? `Requested Format: ${input.format}` : ''}
${input.constraints?.length ? `Constraints: ${input.constraints.join(', ')}` : ''}

Normalize this into a structured CreativeIntent specification. Output ONLY JSON.`;

    return this.invokeStructured<CreativeIntent>(
      {
        promptId: 'normalize_intent',
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      CreativeIntentSchema,
    );
  }
}
