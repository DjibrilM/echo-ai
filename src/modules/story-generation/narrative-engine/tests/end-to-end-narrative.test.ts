import test from 'node:test';
import assert from 'node:assert/strict';
import { TestModelProvider } from './test-helpers/test-provider.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { WorkflowOrchestrator } from '../orchestrator/workflow-orchestrator.ts';
import { CosyVoiceAudioProducer } from '../audio/cosyvoice-producer.ts';
import type { RawCreativePrompt } from '../types/creative-intent.types.ts';

test('End-to-End Pipeline: produces coherent multi-scene narrative with audio performance scripts', async () => {
  const mockProvider = new TestModelProvider();
  await mockProvider.initialize();

  const storyGraph = new StoryGraph();
  const orchestrator = new WorkflowOrchestrator(mockProvider, storyGraph);
  const audioProducer = new CosyVoiceAudioProducer();

  const rawPrompt: RawCreativePrompt = {
    rawPrompt: 'A veteran naval communications officer on an isolated deep space relay outpost intercepts an analog distress signal from a colony ship thought lost a century ago.',
    genreHints: ['Hard Sci-Fi', 'Mystery', 'Psychological Thriller'],
    format: 'short_story',
    constraints: ['No FTL radio', 'Strict signal delay physics'],
  };

  const progressLog: Array<{ stage: string; message: string }> = [];

  const runResult = await orchestrator.run(rawPrompt, {
    maxScenesToProduce: 2,
    enableAudioPreparation: true,
    onProgress: (stage, message) => {
      progressLog.push({ stage, message });
    },
  });

  // 1. Verify Pipeline Completion
  assert.equal(runResult.snapshot.currentStage, 'COMPLETED');
  assert.ok(progressLog.some((p) => p.stage === 'NORMALIZING_INTENT'));
  assert.ok(progressLog.some((p) => p.stage === 'DESIGNING_WORLD_AND_CHARACTERS'));
  assert.ok(progressLog.some((p) => p.stage === 'ARCHITECTING_BLUEPRINT'));
  assert.ok(progressLog.some((p) => p.stage === 'BLUEPRINT_APPROVED'));
  assert.ok(progressLog.some((p) => p.stage === 'EXECUTING_SCENE'));
  assert.ok(progressLog.some((p) => p.stage === 'PREPARING_AUDIO'));

  // 2. Verify Normalized Creative Intent
  const intent = runResult.snapshot.intent;
  assert.ok(intent);
  assert.equal(intent?.title, 'The Silent Signal');
  assert.equal(intent?.primaryGenre, 'Science Fiction');
  assert.ok(intent?.explicitConstraints.includes('No faster-than-light radio'));

  // 3. Verify Story Graph Authoritative State
  const graphState = runResult.storyGraph.getState();
  assert.ok(graphState.characters['char-01']);
  assert.ok(graphState.characters['char-02']);
  assert.equal(graphState.characters['char-01'].name, 'Warrant Officer Sean Doyle');
  assert.equal(graphState.characters['char-02'].name, 'Director Martha Chen');

  // Verify Epistemic Isolation
  const doyleEpistemic = graphState.epistemicStates['char-01'];
  const chenEpistemic = graphState.epistemicStates['char-02'];
  assert.ok(doyleEpistemic.knownFacts.some((f) => f.includes('Hyperion')));
  assert.ok(!chenEpistemic.knownFacts.some((f) => f.includes('Hyperion')), 'Chen must not magically acquire Doyle private knowledge');

  // 4. Verify Scene Production & Continuity
  const scenes = runResult.storyGraph.getAllScenes();
  assert.ok(scenes.length >= 1);
  const scene1 = scenes[0];
  assert.equal(scene1.contract.id, 'scene-01');
  assert.ok(scene1.prose.length > 200);
  assert.ok(scene1.prose.includes('cryo-lines'));
  assert.ok(scene1.prose.includes('Hyperion'));
  assert.equal(scene1.mutationsApplied.length, 3);

  // 5. Verify Narration & Audio Performance Preparation
  assert.ok(runResult.performanceScripts);
  assert.ok(runResult.performanceScripts.length >= 1);
  const perfScript = runResult.performanceScripts[0];
  assert.equal(perfScript.sceneId, 'scene-01');
  assert.ok(perfScript.voiceCast['char-01']);
  assert.ok(perfScript.voiceCast['NARRATOR']);
  assert.ok(perfScript.segments.length >= 3);

  // Test Audio Production Backend Execution
  const sceneAudio = await audioProducer.assembleSceneAudio(perfScript);
  assert.equal(sceneAudio.sceneId, 'scene-01');
  assert.ok(sceneAudio.totalDurationMs > 0);
  assert.ok(sceneAudio.segments.length >= 3);
  assert.equal(sceneAudio.ambienceApplied, true);
  assert.equal(sceneAudio.musicApplied, true);
  assert.ok(sceneAudio.soundEffectsApplied >= 1);
});

