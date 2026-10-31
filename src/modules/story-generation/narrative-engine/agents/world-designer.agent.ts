import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { CreativeIntent } from '../types/creative-intent.types.ts';
import { WorldBuildingManifestSchema } from '../types/character.types.ts';
import type { WorldBuildingManifest } from '../types/character.types.ts';

export class WorldAndCharacterDesigner extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async design(intent: CreativeIntent): Promise<WorldBuildingManifest> {
    const systemPrompt = `You are the World and Character Designer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Establish the complete fictional universe, physical/cultural rules, sensory locations, and rich multidimensional characters.

CRITICAL EPISTEMIC DIRECTIVE:
You MUST rigorously distinguish between:
1. Objective world facts (what is physically true in the universe).
2. What an individual character knows.
3. What an individual character falsely believes or assumes.
4. What an individual character is hiding or lying about.
5. What the audience/reader knows.

Knowledge must NEVER automatically propagate between characters.
Each character must have an isolated initialEpistemicState.

Character Craft Requirements:
- Personalities with distinct motivations, fears, flaws, and internal contradictions.
- Distinct dialogue style (vocabulary level, speech cadence, catchphrases/quirks, subtext tendency).
- Grounded relationships with nuanced tension and trust scores.

Locations:
- Provide concrete sensory details (sights, sounds, smells, atmosphere).

You must output ONLY a valid JSON object matching the WorldBuildingManifest schema:
{
  "worldName": "Name",
  "overview": "Overview of the setting",
  "technologyOrMagicLevel": "Description of tech/magic constraints",
  "societalStructures": ["Structure1", "Structure2"],
  "rulesAndConstraints": [
    { "id": "rule-1", "category": "technology" | "physical_law" | "society", "statement": "...", "isImmutable": true }
  ],
  "locations": [
    {
      "id": "loc-1",
      "name": "...",
      "environmentType": "...",
      "description": "...",
      "sensoryDetails": { "sights": [...], "sounds": [...], "smellsOrAtmosphere": [...] },
      "currentCondition": "..."
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "name": "...",
      "aliases": [...],
      "role": "protagonist" | "antagonist" | "supporting",
      "personality": {
        "traits": [...],
        "primaryMotivation": "...",
        "secondaryMotivations": [...],
        "coreFlaw": "...",
        "fears": [...],
        "weaknesses": [...],
        "internalContradictions": [...]
      },
      "dialogueStyle": {
        "vocabularyLevel": "...",
        "speechCadence": "...",
        "catchphrasesOrQuirks": [...],
        "subtextTendency": "..."
      },
      "backstorySummary": "...",
      "definingPastEvents": [...],
      "relationships": [
        { "targetCharacterId": "char-2", "relationshipType": "...", "dynamic": "...", "trustScore": 0.2 }
      ]
    }
  ],
  "initialEpistemicStates": {
    "char-1": {
      "characterId": "char-1",
      "knownFacts": [...],
      "falseBeliefs": [...],
      "hiddenSecrets": [...],
      "currentGoal": "...",
      "emotionalState": "...",
      "physicalLocationId": "loc-1"
    }
  }
}`;

    const userMessage = `## CREATIVE INTENT SPECIFICATION
Title: ${intent.title}
Premise: ${intent.premise}
Primary Genre: ${intent.primaryGenre}
Subgenres: ${intent.subgenres.join(', ')}
Target Audience: ${intent.targetAudience}
Tone: ${intent.tone.join(', ')}
Themes: ${intent.themes.join(', ')}
Explicit Constraints: ${intent.explicitConstraints.join('; ')}

Design the complete fictional world, characters, locations, and epistemic states. Output ONLY JSON.`;

    return this.invokeStructured<WorldBuildingManifest>(
      {
        promptId: 'world_designer',
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      WorldBuildingManifestSchema,
    );
  }
}
