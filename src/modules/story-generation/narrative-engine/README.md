# Modular AI Narrative Orchestration Engine

A deterministic, multi-agent, hierarchical narrative production engine designed for local LLM inference using **Gemma 4** via the **QVAC SDK** (`@qvac/sdk`) and **CosyVoice 3** for natural voice processing.

This engine powers the **Story Generation module** (`src/modules/story-generation`) in Echo AI.

---

## 1. Core Architectural Principles

1. **Deterministic Hierarchical Orchestration**: Agents never communicate unguided or mutate narrative state directly. A central orchestrator coordinates task creation, validation, review cycles, and stage transitions.
2. **Epistemic State Partitioning**: Strictly separates objective world truth from character knowledge, beliefs (which may be distorted or false), secrets, and audience perception. Knowledge does not automatically propagate between characters.
3. **End-to-End Blueprinting**: The entire story arc (Opening → Inciting Incident → Rising Action → Midpoint → Turning Points → Climax → Resolution → Ending) and every Scene Contract must be planned before prose generation begins.
4. **Strict Maximum Two-Submission Review**: The Narrative Integrity Reviewer allows at most two submissions. If issues persist after the second pass, the engine escalates to the operator—preventing infinite autonomous loops.
5. **Purpose-Built Context Projections**: Agents receive minimal, high-salience slices (< 3,500 tokens) targeting only active characters and relevant local facts. The system does not rely on an ever-growing conversational context window.
6. **Controlled Mutations & Authoritative Story Graph**: Agents propose mutations (`ProposedMutation`); the orchestrator validates and commits them with full provenance (source scene, timestamp, justification).
7. **Natural Voice Processing with CosyVoice 3**: The Narration Director and `CosyVoiceAudioProcessor` translate dramatic subtext, character vocal quirks, and emotions (`anger`, `happy`, `sad`, `neutral`) into native CosyVoice 3 instruct tags (`<breath>`, `<strong>`), volume controls (`soft`, `loud`), and micro-acoustic room tone crossfades (-96dB dither) between speech segments.
8. **Serialized Local Inference**: Reuses a single loaded Gemma 4 instance across multiple agent personas, mediated by an `InferenceQueue` mutex to prevent GPU/CPU thrashing and out-of-memory crashes.
9. **Production QVAC Integration**: Pure, real local QVAC model inference without shipping mock classes. Models are deduplicated and loaded through `@qvac/sdk`.

---

## 2. Directory Structure

```
src/modules/story-generation/
├── engine/                            # Re-exports the core narrative orchestration engine
├── screens/
│   └── StoryGenerationScreen.tsx      # Comprehensive React UI for Story Generation
├── components/
│   ├── StoryTopSubHeader.tsx          # Navigation, tabs, and model status
│   ├── StoryPromptForm.tsx            # Premise, genre hints, format, constraints
│   ├── BlueprintInspectorView.tsx     # Act/chapter/scene contracts and integrity status
│   ├── WorldAndCharactersView.tsx     # Epistemic isolation inspector & universe rules
│   ├── ProseReaderView.tsx            # Formatted scene reader & word counter
│   └── StoryAudioStudioView.tsx       # Multi-character CosyVoice 3 audio player
├── store/
│   └── storyGenerationStore.ts        # Jotai state management
├── services/
│   └── story-generation.service.ts    # Pipeline execution & audio assembly
├── hooks/
│   └── useStoryGeneration.ts          # Story generation hook
├── types.ts                           # View state types & engine re-exports
└── index.ts

src/modules/story-generation/narrative-engine/
├── index.ts                           # Root narrative engine exports
├── demo.ts                            # Standalone end-to-end executable demo
├── README.md                          # Comprehensive documentation
├── types/                             # Strongly typed contracts & Zod schemas
│   ├── creative-intent.types.ts       # CreativeIntent, formats, perspectives
│   ├── character.types.ts             # CharacterProfile, EpistemicState, WorldRules
│   ├── blueprint.types.ts             # NarrativeBlueprint, SceneContract, Beats
│   ├── story-graph.types.ts           # StoryGraphState, ProposedMutation, Timeline
│   ├── context.types.ts               # ContextProjection, WritingTaskAssignment
│   ├── scene.types.ts                 # SceneDraft, SceneReviewResult
│   ├── narration.types.ts             # PerformanceScript, AudioUtteranceSegment
│   ├── workflow.types.ts              # WorkflowExecutionSnapshot, WorkflowStage
│   └── index.ts
├── model/                             # Model provider abstraction & QVAC integration
│   ├── model-provider.interface.ts    # IModelProvider abstraction
│   ├── json-extractor.ts              # Brace-safe, markdown-aware JSON parser
│   ├── inference-queue.ts             # Serialized local inference mutex
│   └── qvac-adapter.ts                # Real @qvac/sdk Gemma 4 adapter
├── memory/                            # Authoritative external narrative memory
│   ├── story-graph.ts                 # Authoritative state outside context
│   ├── context-builder.ts             # Purpose-specific context projection generator
│   ├── mutation-manager.ts            # Controlled mutation validator & committer
│   ├── persistence.ts                 # Atomic file-based disk persistence
│   └── index.ts
├── agents/                            # Specialized narrative agents
│   ├── base.agent.ts                  # Structured invocation & retry foundation
│   ├── intent-normalizer.agent.ts     # Layer 1: Prompt normalization
│   ├── world-designer.agent.ts        # Layer 2: World & character designer
│   ├── story-architect.agent.ts       # Layer 2: End-to-end blueprint architect
│   ├── narrative-reviewer.agent.ts    # Layer 2.1: Integrity reviewer (max 2 passes)
│   ├── story-director.agent.ts        # Layer 3: Scene sequence director
│   ├── writing.agent.ts               # Layer 3: Character-driven prose generator
│   ├── scene-reviewer.agent.ts        # Layer 3: Scene contract validator
│   ├── narration-director.agent.ts    # Layer 5: Performance script director
│   └── index.ts
├── orchestrator/                      # State machine & workflow coordination
│   ├── workflow-orchestrator.ts       # Master deterministic orchestrator
│   ├── workflow-state-store.ts        # Resumable snapshot state manager
│   ├── failure-policy.ts              # Bounded retry limits & escalation
│   └── index.ts
├── audio/                             # CosyVoice 3 natural audio synthesis
│   ├── audio-producer.interface.ts    # IAudioProducer interface
│   ├── cosyvoice-producer.ts          # CosyVoice 3 natural audio producer & processor
│   └── index.ts
└── tests/                             # Comprehensive test suite (26 passing tests)
    └── test-helpers/
        └── test-provider.ts           # Isolated test-only stub for orchestrator invariants

---

## 3. Agent & Service Responsibilities

| Component | Layer | Primary Responsibility |
| :--- | :--- | :--- |
| **`CreativeIntentNormalizer`** | Layer 1 | Analyzes raw prompt; extracts premise, genres, constraints; resolves ambiguities; prevents flat stereotypes while preserving intentional fictional perspectives. |
| **`WorldAndCharacterDesigner`** | Layer 2 | Constructs physical laws, technological limits, sensory locations, and multidimensional characters. Partitions epistemic knowledge states (known vs. believed vs. hidden). |
| **`StoryArchitect`** | Layer 2 | Builds complete end-to-end blueprint (Project → Arc → Act → Chapter → Scene → Beat). Specifies strict `SceneContract`s and setup/payoff linkages. |
| **`NarrativeIntegrityReviewer`** | Layer 2.1 | Independently checks causal logic, timeline coherence, setup/payoff, and character motivation. Enforces strict maximum of 2 review passes before escalation. |
| **`MainStoryDirector`** | Layer 3 | Determines the next scene to execute; assembles structured writing assignments using `ContextBuilder`. |
| **`SpecializedWritingAgent`** | Layer 3 | Writes immersive prose adhering to scene contracts; embodies character dialogue cadences and psychological flaws; proposes state mutations. |
| **`SceneReviewer`** | Layer 3 | Validates drafted scenes against contracts, character knowledge boundaries, and world rules with bounded retries (max 2 iterations). |
| **`MutationManager`** | Layer 4 | Validates proposed mutations; updates the authoritative `StoryGraph` with full provenance tracking. |
| **`ContextBuilder`** | Layer 4 | Queries `StoryGraph` to generate minimal (< 3500 tokens) context projections containing only active characters and relevant local facts. |
| **`NarrationDirector`** | Layer 5 | Converts approved prose into utterance-level `PerformanceScript`s, assigning voice IDs, delivery emotions, pacing multipliers, pauses, ambience, and SFX cues. |
| **`WorkflowOrchestrator`** | Core | Owns the deterministic state machine, checkpoint persistence, crash recovery, and execution flow. |

---

## 4. Extension Guides

### 4.1. How to Add a New Agent Role

1. **Define the Typed Contract**:
   Create a Zod schema in `src/modules/story-generation/narrative-engine/types/` representing the agent's structured output.
   ```typescript
   export const FactCheckerOutputSchema = z.object({
     isFactuallyConsistent: z.boolean(),
     discrepancies: z.array(z.string()),
   });
   export type FactCheckerOutput = z.infer<typeof FactCheckerOutputSchema>;
   ```

2. **Implement the Agent Class**:
   Extend `BaseAgent` in `src/modules/story-generation/narrative-engine/agents/`:
   ```typescript
   import { BaseAgent } from './base.agent.ts';
   import type { IModelProvider } from '../model/model-provider.interface.ts';
   import { FactCheckerOutput, FactCheckerOutputSchema } from '../types/my-agent.types.ts';

   export class HistoricalFactChecker extends BaseAgent {
     constructor(modelProvider: IModelProvider) {
       super(modelProvider);
     }

     public async verifyHistory(context: string): Promise<FactCheckerOutput> {
       return this.invokeStructured<FactCheckerOutput>(
         {
           promptId: 'historical_fact_checker',
           systemPrompt: 'You are an exacting historical continuity checker...',
           messages: [{ role: 'user', content: context }],
         },
         FactCheckerOutputSchema,
       );
     }
   }
   ```

3. **Wire into the Orchestrator**:
   Instantiate the agent in `WorkflowOrchestrator` and invoke it at the desired stage transition.

---

### 4.2. How to Add a New Model Provider

1. Implement `IModelProvider` from `model-provider.interface.ts`:
   ```typescript
   import type {
     IModelProvider,
     InferenceRequest,
     InferenceResponse,
     ModelRuntimeConfig,
   } from './model-provider.interface.ts';

   export class RemoteCloudProvider implements IModelProvider {
     public isInitialized = false;
     public modelId = 'gemini-1.5-pro';

     public async initialize(config?: ModelRuntimeConfig): Promise<void> {
       this.isInitialized = true;
     }

     public async generateCompletion<T>(request: InferenceRequest<T>): Promise<InferenceResponse<T>> {
       // Call cloud API, format prompt, extract JSON, validate with request.responseSchema
       return {
         rawText: '...',
         parsed: validatedObject,
         durationMs: 120,
         modelId: this.modelId,
       };
     }

     public async unload(): Promise<void> {
       this.isInitialized = false;
     }
   }
   ```

2. Pass the new provider into `new WorkflowOrchestrator(new RemoteCloudProvider(), storyGraph)`.

---

### 4.3. How to Add a New Narrative Profile

Narrative profiles define genres, conventions, and style constraints.

1. In `CreativeIntentNormalizer`, register or inject preset templates:
   ```typescript
   export const NOIR_DETECTIVE_PROFILE: Partial<CreativeIntent> = {
     primaryGenre: 'Mystery / Noir',
     subgenres: ['Crime Fiction', 'Psychological Thriller'],
     tone: ['Cynical', 'Hardboiled', 'Atmospheric', 'Melancholic'],
     perspective: 'first_person',
     pacingPreference: 'deliberate',
     explicitConstraints: [
       'Protagonist narrates with cynical metaphors',
       'Rain-soaked urban environment',
       'No unearned happy endings',
     ],
   };
   ```

2. When invoking `orchestrator.run()`, supply the profile hints in `RawCreativePrompt`.

---

### 4.4. CosyVoice 3 Natural Voice Processing (Layer 5)

The engine features a production-ready **`CosyVoiceAudioProducer`** and **`CosyVoiceAudioProcessor`** located at [`src/modules/story-generation/narrative-engine/audio/cosyvoice-producer.ts`](file:///Users/jibm/Desktop/projects/echo-ai/src/modules/story-generation/narrative-engine/audio/cosyvoice-producer.ts):

1. **Conversational Cues & Instruct Tagging**:
   - Automatically translates dramatic directions and acting cues into native FunAudioLLM / CosyVoice 3 instruct tags:
     - `<breath>`: Injected before tense, whispered, or dramatic utterances to model human respiration.
     - `<strong>...</strong>`: Wraps emphatic phrases, commands, or dramatic peaks.
     - `[whisper]`: Configures native `volume: "soft"` and `pace: "slow"` with breath padding.
     - `[yell]` / `[furious]`: Configures native `volume: "loud"` and `emotion: "anger"`.
     - `[sigh]` / `[gasp]`: Converted seamlessly to natural breath intakes (`<breath>`).
2. **Dynamic Emotion & Prosody Mapping**:
   - Maps 12 high-level narrative performance emotions (`neutral`, `whispering`, `intense`, `urgent`, `fearful`, `furious`, `mournful`, `joyful`, `ironic`, `menacing`, `hesitant`, `tender`) into CosyVoice 3 native dimensions (`anger`, `happy`, `neutral`, `sad`) with corresponding volume and pace parameters.
3. **Acoustic Room Tone & Crossfading**:
   - Inter-utterance pauses are generated with micro-silence acoustic room tone (`generateAcousticRoomPause`) rather than harsh digital zero.
   - Smooth 15ms equal-power sinusoidal crossfades eliminate pops, clicks, and phase discontinuities across chunk boundaries.
4. **Master Scene Assembly**:
   - Assembles multi-character dialogues into master 24kHz/48kHz WAV audio files with background ambience and sound-effect cues.

---

## 5. Running the Test Suite & Executable Demo

### Run all Unit and Integration Tests:
```bash
node --test src/modules/story-generation/narrative-engine/tests/*.test.ts
```

### Run the Standalone End-to-End Demo:
```bash
# Deterministic simulated inference:
node src/modules/story-generation/narrative-engine/demo.ts

# Live local inference using loaded Gemma 4 model via QVAC:
node src/modules/story-generation/narrative-engine/demo.ts --live-qvac
```

