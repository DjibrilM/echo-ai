import type {
  IModelProvider,
  InferenceRequest,
  InferenceResponse,
  ModelRuntimeConfig,
} from '../../model/model-provider.interface.ts';

export type TestHandler = (request: InferenceRequest<any>) => any;

/**
 * Isolated Test Stub Provider used strictly for unit testing orchestrator invariants,
 * review limits, epistemic isolation, crash recovery, and state graph transitions.
 * Kept strictly inside tests/ and not exported in production engine code.
 */
export class TestModelProvider implements IModelProvider {
  private _isInitialized = false;
  private customHandlers: Map<string, TestHandler> = new Map();
  public callHistory: InferenceRequest<any>[] = [];

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get modelId(): string {
    return 'test-gemma4-stub';
  }

  public async initialize(_config?: ModelRuntimeConfig): Promise<void> {
    this._isInitialized = true;
  }

  public registerHandler(promptId: string, handler: TestHandler): void {
    this.customHandlers.set(promptId, handler);
  }

  public async generateCompletion<T>(request: InferenceRequest<T>): Promise<InferenceResponse<T>> {
    this.callHistory.push(request);

    if (this.customHandlers.has(request.promptId)) {
      const handler = this.customHandlers.get(request.promptId)!;
      const resultObj = handler(request);
      const rawText = JSON.stringify(resultObj, null, 2);
      return {
        rawText,
        parsed: request.responseSchema ? request.responseSchema.parse(resultObj) : resultObj,
        durationMs: 10,
        modelId: this.modelId,
      };
    }

    const defaultObj = this.getDefaultResponseForPrompt(request.promptId, request);
    const rawText = JSON.stringify(defaultObj, null, 2);
    return {
      rawText,
      parsed: request.responseSchema ? request.responseSchema.parse(defaultObj) : (defaultObj as any),
      durationMs: 10,
      modelId: this.modelId,
    };
  }

  public async unload(): Promise<void> {
    this._isInitialized = false;
  }

  private getDefaultResponseForPrompt(promptId: string, _req: InferenceRequest<any>): any {
    if (promptId === 'normalize_intent') {
      return {
        id: 'intent-01',
        title: 'The Silent Signal',
        premise: 'A deep space communications officer receives a classified distress beacon from a colony ship thought lost a century ago.',
        primaryGenre: 'Science Fiction',
        subgenres: ['Mystery', 'Psychological Thriller'],
        targetAudience: 'Adult fiction readers',
        format: 'short_story',
        tone: ['tense', 'claustrophobic', 'analytical'],
        themes: ['Isolation', 'Institutional Silence', 'Technological Haunting'],
        explicitConstraints: ['No faster-than-light radio', 'Strict signal delay physics'],
        impliedAssumptions: ['Orbital isolation impairs crew morale'],
        clarifiedAmbiguities: ['Resolved speed of sound transmission vs electromagnetic waves'],
        biasAnalysis: {
          intentionalFictionalBiases: ['Cold War-like fleet operational paranoia'],
          mitigatedUnintendedAssumptions: ['Avoiding single-note military stereotypes'],
        },
        pacingPreference: 'moderate',
        perspective: 'third_person_limited',
      };
    }

    if (promptId === 'world_designer') {
      return {
        worldName: 'Epsilon Relay System',
        overview: 'An isolated communications relay station in high retrograde orbit above a gas giant.',
        technologyOrMagicLevel: 'Hard Sci-Fi, light-speed-limited communications, nuclear thermal rockets.',
        societalStructures: ['Sol Defense Logistics Fleet', 'Relay Operations Directorate'],
        rulesAndConstraints: [
          {
            id: 'rule-01',
            category: 'physical_law',
            statement: 'Electromagnetic signals travel strictly at c.',
            isImmutable: true,
          },
          {
            id: 'rule-02',
            category: 'technology',
            statement: 'Hardware crypto keys are required to decrypt classified military bands.',
            isImmutable: true,
          },
        ],
        locations: [
          {
            id: 'loc-01',
            name: 'Relay Station Epsilon-9 Comms Bay',
            environmentType: 'Orbital Module',
            description: 'A pressurized spherical module humming with cooled mainframe banks and amber cathode monitors.',
            sensoryDetails: {
              sights: ['Amber glow of CRT vectors', 'Flashing green diode matrices', 'Frost on coolant lines'],
              sounds: ['Hum of glycol coolant pumps', 'Occasional magnetic latch thuds'],
              smellsOrAtmosphere: ['Ozone and stale recycled chicory', 'Chilled dry air'],
            },
            currentCondition: 'Functional but aging and under-maintained',
          },
        ],
        characters: [
          {
            id: 'char-01',
            name: 'Warrant Officer Sean Doyle',
            aliases: ['Doyle'],
            role: 'protagonist',
            archetype: 'The Reluctant Watcher',
            personality: {
              traits: ['Methodical', 'Cautious', 'Observant'],
              primaryMotivation: 'Uncover the origin of the anomalous telemetry without alerting station command.',
              secondaryMotivations: ['Survive his deployment cycle'],
              coreFlaw: 'Distrustful',
              fears: ['Losing his sanity in orbital silence'],
              weaknesses: ['Obsessive attention to detail'],
              internalContradictions: ['Loyal naval serviceman who reflexively hoards unauthorized data'],
            },
            dialogueStyle: {
              vocabularyLevel: 'Technical naval vernacular',
              speechCadence: 'Measured, clipped syllables, quiet baritone',
              catchphrasesOrQuirks: ['Clearing throat before contradicting an officer'],
              subtextTendency: 'Masks anxiety with technical jargon',
            },
            backstorySummary: 'Surface communications technician reassigned after an unexplained telemetry anomaly on Titan.',
            definingPastEvents: ['The Titan Blackout incident'],
            relationships: [
              {
                targetCharacterId: 'char-02',
                relationshipType: 'Subordinate / Superior',
                dynamic: 'Tense institutional deference with mutual suspicion',
                trustScore: -0.4,
              },
            ],
          },
          {
            id: 'char-02',
            name: 'Director Martha Chen',
            aliases: ['Director Chen', 'Maam'],
            role: 'antagonist',
            archetype: 'The System Enforcer',
            personality: {
              traits: ['Pragmatic', 'Commanding', 'Secretive'],
              primaryMotivation: 'Maintain operational silence and prevent panic across the fleet.',
              secondaryMotivations: ['Execute classified contingency orders without incident'],
              coreFlaw: 'Authoritarian ruthlessness',
              fears: ['Loss of organizational containment'],
              weaknesses: ['Underestimates individual human curiosity'],
              internalContradictions: ['Believes she is protecting people by systematically lying to them'],
            },
            dialogueStyle: {
              vocabularyLevel: 'Bureaucratic-military precision',
              speechCadence: 'Deliberate, slow, unwavering mezzo-soprano',
              catchphrasesOrQuirks: ['Pauses three beats before answering difficult questions'],
              subtextTendency: 'Issues veiled ultimatums framed as procedural reminders',
            },
            backstorySummary: 'Veteran fleet intelligence liaison assigned to oversee deep space relay security.',
            definingPastEvents: ['Sealed orders regarding the colony transport program'],
            relationships: [
              {
                targetCharacterId: 'char-01',
                relationshipType: 'Superior / Subordinate',
                dynamic: 'Patronizing oversight with underlying threat of disciplinary action',
                trustScore: -0.3,
              },
            ],
          },
        ],
        initialEpistemicStates: {
          'char-01': {
            characterId: 'char-01',
            knownFacts: ['The distress wave is broadcasting the callsign of the SS Hyperion.'],
            falseBeliefs: ['Command is completely unaware of the broadcast.'],
            hiddenSecrets: ['He tapped the classified relay line directly.'],
            currentGoal: 'Archive the audio before Chen enters the comms module.',
            emotionalState: 'High anxiety with focused determination',
            physicalLocationId: 'loc-01',
          },
          'char-02': {
            characterId: 'char-02',
            knownFacts: ['Station Epsilon-9 operates under classified fleet directive 44-Omega.'],
            falseBeliefs: [],
            hiddenSecrets: ['She holds protocol orders to scuttle Epsilon-9 if an anomaly is confirmed.'],
            currentGoal: 'Confiscate the buffer drive and enforce quarantine.',
            emotionalState: 'Controlled cold vigilance',
            physicalLocationId: 'loc-01',
          },
        },
      };
    }

    if (promptId.startsWith('story_architect')) {
      return {
        projectId: 'project-test-01',
        title: 'The Silent Signal',
        logline: 'An isolated communications officer intercepts a century-old colony ship distress signal.',
        arc: {
          arcName: 'The Epsilon Isolation',
          openingSituation: 'Sean Doyle is working the graveyard shift at Relay Station Epsilon-9.',
          incitingIncident: 'An analog distress call breaks through on a decommissioned frequency.',
          mainConflict: 'Doyle seeks the truth while Director Chen moves to suppress the signal.',
          majorPlotDevelopments: [
            'Doyle saves the audio to his private datapad.',
            'Chen confronts Doyle and confiscates the primary drive.',
          ],
          subplots: ['The mystery of the Hyperion abandonment'],
          turningPoints: ['The realization that Chen already knew about the signal'],
          climax: 'Doyle plays the decrypt key in secret.',
          resolution: 'The truth cannot be contained.',
          ending: 'Doyle transmits the signal beyond fleet relays.',
        },
        acts: [
          {
            actNumber: 1,
            title: 'Act I: The Transmission',
            dramaticFunction: 'Setup & Inciting Incident',
            chapters: [
              {
                id: 'chap-01',
                chapterNumber: 1,
                title: 'Static & Silence',
                summary: 'The anomalous signal is received and contested.',
                scenes: [
                  {
                    id: 'scene-01',
                    chapterId: 'chap-01',
                    sceneIndex: 0,
                    title: 'Whispers in the Glycol',
                    objective: 'Doyle detects the unauthorized analog signal during watch rotation.',
                    participatingCharacterIds: ['char-01'],
                    focusCharacterId: 'char-01',
                    locationId: 'loc-01',
                    openingConditions: 'Doyle is alone in the comms module at the end of a 14-hour monitoring cycle.',
                    requiredEvents: [
                      'The auxiliary receiver triggers an analog frequency alert.',
                      'Doyle isolates the signal and recognizes the century-old callsign.',
                      'Doyle saves the raw audio stream to a private datapad before log sync.',
                    ],
                    requiredRevelations: ['The caller identifies as SS Hyperion.'],
                    characterMotivationsInScene: {
                      'char-01': 'Investigate the anomaly before the automatic log synchronizes with central command.',
                    },
                    emotionalShift: { from: 'weary boredom', to: 'chilling dread' },
                    continuityConstraints: ['Doyle must not yet know Director Chen is monitoring his console telemetry.'],
                    expectedClosingConditions: 'The signal waveform is locked and archived on Doyle private datapad.',
                    dependencies: [],
                    targetWordCount: 800,
                    beats: [{ beatNumber: 1, description: 'Alarm sounds on panel 7' }],
                    status: 'planned',
                  },
                  {
                    id: 'scene-02',
                    chapterId: 'chap-01',
                    sceneIndex: 1,
                    title: 'The Director Intervention',
                    objective: 'Director Chen confronts Doyle regarding anomalous buffer spikes.',
                    participatingCharacterIds: ['char-01', 'char-02'],
                    focusCharacterId: 'char-01',
                    locationId: 'loc-01',
                    openingConditions: 'Director Chen enters the comms module unannounced while Doyle is replaying the signal.',
                    requiredEvents: [
                      'Chen questions Doyle about the bandwidth spike on band 442.',
                      'Doyle attempts to minimize the occurrence as cosmic static.',
                      'Chen issues a classified silence order and confiscates the buffer drive.',
                    ],
                    requiredRevelations: ['Chen already suspected the signal might occur.'],
                    characterMotivationsInScene: {
                      'char-01': 'Protect his private copy of the audio without provoking formal insubordination charges.',
                      'char-02': 'Contain knowledge of the Hyperion signal immediately.',
                    },
                    emotionalShift: { from: 'covert guilt', to: 'defiant compliance' },
                    continuityConstraints: ['Chen does not know Doyle already duplicated the file.'],
                    expectedClosingConditions: 'Chen departs with the buffer drive, believing the anomaly is contained.',
                    dependencies: ['scene-01'],
                    targetWordCount: 950,
                    beats: [{ beatNumber: 1, description: 'Hatch opens and Chen enters' }],
                    status: 'planned',
                  },
                ],
              },
            ],
          },
        ],
        setupPayoffs: [
          {
            id: 'sp-01',
            setupDescription: 'Doyle copies the audio to private datapad.',
            setupSceneId: 'scene-01',
            payoffDescription: 'Chen confiscates the primary drive leaving Doyle holding the real copy.',
            payoffSceneId: 'scene-02',
            isPayoffResolved: true,
          },
        ],
        reviewStatus: 'approved',
        submissionCount: 1,
        integrityReviewNotes: ['Blueprint approved with high causal coherence.'],
      };
    }

    if (promptId.startsWith('narrative_reviewer')) {
      return {
        isApproved: true,
        submissionNumber: 1,
        overallAssessment: 'Blueprint exhibits exceptional causal consistency and adheres to all hard sci-fi constraints.',
        findings: [],
        strengths: ['Epistemic isolation strictly preserved', 'Setup and payoff pair tightly linked'],
        recommendation: 'approve',
      };
    }

    if (promptId.startsWith('writing_agent')) {
      return {
        sceneId: 'scene-01',
        title: 'Whispers in the Glycol',
        prose:
          'The comms bay of Relay Station Epsilon-9 tasted of bitter ozone and burnt chicory, while frost rimmed the vibrating cryo-lines along the bulkhead. Sean Doyle rubbed his burning eyes against the pale amber glare of the cathode monitor. For fourteen hours, the deep-space void had whispered nothing but predictable background microwave hum.\n\nThen the analog needle on rack seven jumped.\n\nIt was not a digital packet. There was no handshake protocol, no military encryption preamble. Just raw, jagged sinusoidal voltage sweeping across 442 megahertz—a frequency abandoned before his grandfather was born.\n\nSean reached for the analog demodulator, his thumb slick with cold sweat. Through his headphone cans came a sound that froze the breath in his chest: the raspy, dry rhythm of human lungs drawing air, followed by four words spoken into the dark a hundred years ago.\n\n"Hyperion calling. Anyone copy?"',
        summary: 'Sean Doyle detects an unauthorized analog signal on decommissioned band 442 MHz and confirms the callsign of the century-lost SS Hyperion.',
        wordCount: 135,
        proposedMutations: [
          {
            type: 'character_knowledge',
            targetEntityId: 'char-01',
            action: 'add',
            payload: { fact: 'Confirmed analog distress carrier is broadcasting the Hyperion callsign.' },
            justification: 'Doyle heard the voice transmission directly through the audio console.',
          },
          {
            type: 'character_state',
            targetEntityId: 'char-01',
            action: 'update',
            payload: { emotionalState: 'anxious_vigilance' },
            justification: 'Intercepting century-old lost ship spikes Doyle adrenaline.',
          },
          {
            type: 'timeline_event',
            targetEntityId: 'timeline',
            action: 'add',
            payload: { timestamp: '03:14:00 GST', event: 'Analog carrier wave intercepted on 442 MHz' },
            justification: 'Crucial event in relay history.',
          },
        ],
        craftNotes: {
          focalSubtext: 'Institutional dread vs raw human curiosity',
          sensoryMotifsUsed: ['Ozone', 'Amber CRT glare', 'Chilled air'],
          pacingAssessment: 'Slow burn, mounting claustrophobia',
        },
      };
    }

    if (promptId.startsWith('scene_reviewer')) {
      return {
        sceneId: 'scene-01',
        isApproved: true,
        iterationNumber: 1,
        checkItems: [
          {
            criterion: 'required_events_present',
            passed: true,
            notes: 'Needle jump, demodulation, and voice copy all present.',
          },
          {
            criterion: 'epistemic_knowledge_boundaries_respected',
            passed: true,
            notes: 'Doyle acts only on facts available at his console.',
          },
        ],
        overallCritique: 'Prose captures atmosphere, pacing is deliberate, sensory details ground the scene.',
        requiredRevisions: [],
        recommendation: 'approve',
      };
    }

    if (promptId.startsWith('narration_director')) {
      return {
        sceneId: 'scene-01',
        sceneTitle: 'Whispers in the Glycol',
        voiceCast: {
          'char-01': {
            characterId: 'char-01',
            characterName: 'Sean Doyle',
            assignedVoiceId: 'voice-doyle-01',
            engine: 'cosyvoice3',
            gender: 'male',
            pitchOffset: 0,
            naturalSpeed: 1.0,
          },
          NARRATOR: {
            characterId: 'NARRATOR',
            characterName: 'Narrator',
            assignedVoiceId: 'voice-narrator-01',
            engine: 'cosyvoice3',
            gender: 'neutral',
            pitchOffset: 0,
            naturalSpeed: 1.0,
          },
        },
        ambienceTrack: {
          ambienceId: 'amb_relay_module',
          description: 'Low hum of glycol pumps with gentle metallic creaks',
          category: 'sci_fi',
          loop: true,
          volume: 0.25,
          fadeInMs: 1500,
          fadeOutMs: 2000,
        },
        musicTrack: {
          trackTheme: 'Isolated Tension',
          mood: 'eerie, minimal synth pulses',
          intensityLevel: 2,
          volume: 0.2,
          startAtUtteranceIndex: 0,
        },
        segments: [
          {
            id: 'seg-01',
            utteranceIndex: 0,
            sceneId: 'scene-01',
            speakerId: 'NARRATOR',
            speakerName: 'Narrator',
            isDialogue: false,
            spokenText: 'The comms bay of Relay Station Epsilon-9 tasted of bitter ozone and burnt chicory.',
            voiceProfile: {
              characterId: 'NARRATOR',
              characterName: 'Narrator',
              assignedVoiceId: 'voice-narrator-01',
              engine: 'cosyvoice3',
              gender: 'neutral',
              pitchOffset: 0,
              naturalSpeed: 1.0,
            },
            performance: {
              emotion: 'neutral',
              deliveryIntensity: 0.5,
              speedMultiplier: 1.0,
              prePauseMs: 200,
              postPauseMs: 250,
            },
            soundDesignCue: {
              soundEffectId: 'sfx_relay_hum',
              sfxVolume: 0.4,
              sfxTriggerPoint: 'start',
            },
          },
          {
            id: 'seg-02',
            utteranceIndex: 1,
            sceneId: 'scene-01',
            speakerId: 'char-01',
            speakerName: 'Sean Doyle',
            isDialogue: true,
            spokenText: '[whisper] Hyperion calling. Anyone copy? [/whisper]',
            voiceProfile: {
              characterId: 'char-01',
              characterName: 'Sean Doyle',
              assignedVoiceId: 'voice-doyle-01',
              engine: 'cosyvoice3',
              gender: 'male',
              pitchOffset: 0,
              naturalSpeed: 1.0,
            },
            performance: {
              emotion: 'whispering',
              deliveryIntensity: 0.8,
              speedMultiplier: 0.9,
              prePauseMs: 350,
              postPauseMs: 400,
            },
          },
          {
            id: 'seg-03',
            utteranceIndex: 2,
            sceneId: 'scene-01',
            speakerId: 'NARRATOR',
            speakerName: 'Narrator',
            isDialogue: false,
            spokenText: 'Only the low hum of the coolant lines answered him into the black.',
            voiceProfile: {
              characterId: 'NARRATOR',
              characterName: 'Narrator',
              assignedVoiceId: 'voice-narrator-01',
              engine: 'cosyvoice3',
              gender: 'neutral',
              pitchOffset: 0,
              naturalSpeed: 1.0,
            },
            performance: {
              emotion: 'neutral',
              deliveryIntensity: 0.6,
              speedMultiplier: 1.0,
              prePauseMs: 200,
              postPauseMs: 300,
            },
          },
        ],
        estimatedDurationSeconds: 15,
      };
    }

    return {};
  }
}
