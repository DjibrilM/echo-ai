import { BaseAgent } from './base.agent.ts';
import type { IModelProvider } from '../model/model-provider.interface.ts';
import type { CanonicalSceneRecord } from '../types/story-graph.types.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { PerformanceScriptSchema } from '../types/narration.types.ts';
import type { PerformanceScript } from '../types/narration.types.ts';

export class NarrationDirector extends BaseAgent {
  private readonly storyGraph: StoryGraph;

  constructor(
    modelProvider: IModelProvider,
    storyGraph: StoryGraph,
  ) {
    super(modelProvider);
    this.storyGraph = storyGraph;
  }

  public async preparePerformance(scene: CanonicalSceneRecord): Promise<PerformanceScript> {
    const characters = scene.contract.participatingCharacterIds
      .map((id) => this.storyGraph.getCharacter(id))
      .filter(Boolean);

    const systemPrompt = `You are the Narration Director in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Transform the canonical narrative scene prose into an utterance-level PerformanceScript tailored for natural neural speech synthesis with CosyVoice 3.

COSYVOICE 3 NATURAL VOICE DIRECTING GUIDELINES:
1. Utterance Segmentation:
   - Break down the prose into utterance-sized segments (individual sentences or natural speech turns).
   - Label each segment with the correct speakerId (character ID or "NARRATOR") and isDialogue (true/false).
2. CosyVoice 3 Voice Casting:
   - Use engine: "cosyvoice3" for all character voice profiles and narrator.
   - Establish stable CharacterVoiceProfile with appropriate pitchOffset (-0.2 to +0.2) and naturalSpeed (0.9 to 1.1).
3. Natural Conversational Tags & Cues:
   - In spokenText, you may insert native CosyVoice 3 instruct tags:
     * <breath> for natural intake of breath before tense, whispered, or dramatic sentences.
     * <strong>...</strong> for emphasized phrases, shouted commands, or dramatic peaks.
     * [whisper], [sigh], [gasp], [hmm] for expressive natural vocalizations.
4. Dynamic Emotional Performance:
   - Emotion (neutral, whispering, intense, urgent, fearful, furious, mournful, joyful, ironic, menacing, hesitant, tender).
   - Delivery intensity (0.1 to 1.0) and speed multiplier (0.8 to 1.3).
   - Expressive prePauseMs (100-300ms) and postPauseMs (200-600ms) for natural room tone pacing.
5. Sound Design & Score:
   - Ambience track (indoor, outdoor, sci_fi, weather, tense_silence, crowd).
   - Minimalist score theme and intensity.
   - Punctual sound design cues (e.g. sfx-radio-burst, airlock-seal, gun-cock, footsteps) triggered on specific utterances.

You must output ONLY a valid JSON object matching the PerformanceScript schema.`;

    const userMessage = `## SCENE METADATA
Scene ID: ${scene.contract.id}
Scene Title: ${scene.contract.title}
Location: ${scene.contract.locationId}
Emotional Shift: ${scene.contract.emotionalShift.from} → ${scene.contract.emotionalShift.to}

## PARTICIPATING CHARACTERS
${characters
  .map(
    (c) => `- ${c!.name} (${c!.id}): Dialogue Cadence: "${c!.dialogueStyle.speechCadence}", Subtext: "${c!.dialogueStyle.subtextTendency}"`,
  )
  .join('\n')}

## CANONICAL SCENE PROSE TO DIRECT
"""
${scene.prose}
"""

Create the complete, production-ready PerformanceScript. Output ONLY JSON.`;

    return this.invokeStructured<PerformanceScript>(
      {
        promptId: `narration_director_${scene.contract.id}`,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      PerformanceScriptSchema,
    );
  }
}
