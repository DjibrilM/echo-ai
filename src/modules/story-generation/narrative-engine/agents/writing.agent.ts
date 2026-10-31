import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { WritingTaskAssignment } from '../types/context.types.ts';
import { SceneDraftSchema } from '../types/scene.types.ts';
import type { SceneDraft } from '../types/scene.types.ts';

export class SpecializedWritingAgent extends BaseAgent {
  constructor(modelProvider: IModelProvider) {
    super(modelProvider);
  }

  public async draftScene(
    task: WritingTaskAssignment,
    onToken?: (token: string) => void,
  ): Promise<SceneDraft> {
    const { sceneContract, projection, stylistics, revisionFeedback } = task;

    const systemPrompt = `You are the Specialized Writing Agent in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Craft vivid, emotionally resonant, character-driven narrative prose that satisfies the SceneContract.

CRITICAL CRAFT PRINCIPLES:
1. Character-Driven Prose:
   - Dialogue, internal monologue, and actions MUST emerge from each character's specific personality, motivations, flaws, and quirks.
   - Strictly honor what each character knows vs. what they do NOT know (epistemic state). A character must never act on information they have not learned.
   - Distinguish character personality from character dialogue style, scene tone, and narrative voice.
2. Sensory & Environmental Immersion:
   - Ground the prose in the physical location, tactile sensations, sounds, and lighting.
3. Bridge Continuity:
   - If previous scene closing context is provided, ensure seamless narrative flow without abrupt leaps.
4. Proposed Mutations:
   - Accurately propose all state changes enacted by the scene (character knowledge gained, emotional state shifts, timeline events, new facts established).

You must output ONLY a valid JSON object matching the SceneDraft schema:
{
  "sceneId": "${sceneContract.id}",
  "title": "${sceneContract.title}",
  "prose": "Full, immersive prose of the scene...",
  "summary": "2-3 sentence canonical summary of what transpired...",
  "wordCount": 750,
  "proposedMutations": [
    {
      "type": "character_knowledge" | "character_state" | "character_belief" | "relationship_update" | "new_canonical_fact" | "plot_thread_update" | "location_state_change" | "timeline_event",
      "targetEntityId": "char-1",
      "action": "add" | "update" | "set",
      "payload": { ... },
      "justification": "Why this changed in the scene"
    }
  ],
  "craftNotes": {
    "focalSubtext": "...",
    "sensoryMotifsUsed": ["..."],
    "pacingAssessment": "..."
  }
}`;

    const userMessage = `## SCENE CONTRACT
Title: ${sceneContract.title} (Scene #${sceneContract.sceneIndex + 1})
Objective: ${sceneContract.objective}
Focus Character: ${sceneContract.focusCharacterId}
Participating Characters: ${sceneContract.participatingCharacterIds.join(', ')}
Location: ${projection.currentLocation.name} (${projection.currentLocation.environmentType})
Opening Conditions: ${sceneContract.openingConditions}
Required Events:
${sceneContract.requiredEvents.map((e) => `- ${e}`).join('\n')}
${sceneContract.requiredRevelations.length ? `Required Revelations:\n${sceneContract.requiredRevelations.map((r) => `- ${r}`).join('\n')}` : ''}
Emotional Shift: From "${sceneContract.emotionalShift.from}" to "${sceneContract.emotionalShift.to}"
Target Word Count: ${sceneContract.targetWordCount} words

## ACTIVE CHARACTERS & EPISTEMIC BOUNDARIES
${projection.activeCharacters
  .map(
    (c) => `### ${c.profile.name} (${c.profile.id})
Personality: ${c.profile.personality.traits.join(', ')} | Wants: ${c.profile.personality.primaryMotivation} | Flaw: ${c.profile.personality.coreFlaw}
Dialogue Cadence: ${c.profile.dialogueStyle.speechCadence} | Vocab: ${c.profile.dialogueStyle.vocabularyLevel}
Current Epistemic Knowledge:
- Known Facts: ${c.state.knownFacts.join('; ') || 'None'}
- False Beliefs: ${c.state.falseBeliefs.join('; ') || 'None'}
- Secrets Concealed: ${c.state.hiddenSecrets.join('; ') || 'None'}
- Current Goal in Scene: ${c.state.currentGoal}
- Current Emotional State: ${c.state.emotionalState}`,
  )
  .join('\n\n')}

## LOCATION SENSORY PALETTE
Sights: ${projection.currentLocation.sensoryDetails.sights.join(', ')}
Sounds: ${projection.currentLocation.sensoryDetails.sounds.join(', ')}
Atmosphere: ${projection.currentLocation.sensoryDetails.smellsOrAtmosphere.join(', ')}

${
  projection.previousSceneBridge?.closingSnippet
    ? `## PREVIOUS SCENE BRIDGE (CONTINUE DIRECTLY FROM HERE)\nSummary: ${projection.previousSceneBridge.summary}\nClosing Snippet:\n"""\n${projection.previousSceneBridge.closingSnippet}\n"""`
    : ''
}

## STYLISTICS
Perspective: ${stylistics.narrativePerspective}
Tone: ${stylistics.overallTone.join(', ')}
Atmosphere: ${stylistics.sceneAtmosphere}
Pacing: ${stylistics.pacing}

${
  revisionFeedback
    ? `## REVISION FEEDBACK FROM REVIEWER (YOU MUST ADDRESS THESE SPECIFIC FLAWS)\n${revisionFeedback}`
    : ''
}

Write the complete scene prose and declare all proposed mutations. Output ONLY JSON.`;

    return this.invokeStructured<SceneDraft>(
      {
        promptId: `writing_agent_${sceneContract.id}`,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        onToken,
      },
      SceneDraftSchema,
    );
  }
}
