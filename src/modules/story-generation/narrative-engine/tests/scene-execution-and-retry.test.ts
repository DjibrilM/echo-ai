import test from 'node:test';
import assert from 'node:assert/strict';
import { TestModelProvider } from './test-helpers/test-provider.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { WorkflowOrchestrator } from '../orchestrator/workflow-orchestrator.ts';

test('SceneExecution: handles scene rejection, feedback injection, and approval on retry', async () => {
  const mockProvider = new TestModelProvider();
  await mockProvider.initialize();

  let sceneReviewAttempts = 0;
  mockProvider.registerHandler('scene_reviewer_scene-01_iter_1', () => {
    sceneReviewAttempts++;
    return {
      sceneId: 'scene-01',
      isApproved: false,
      iterationNumber: 1,
      checkItems: [
        {
          criterion: 'epistemic_knowledge_boundaries_respected',
          passed: false,
          notes: 'Doyle mentions the Hyperion scuttling before he actually listens to the tape.',
        },
      ],
      overallCritique: 'Anachronistic knowledge leak in opening paragraph.',
      requiredRevisions: ['Ensure Doyle only learns of the scuttled reactor after the filter peels away the hiss.'],
      recommendation: 'request_revision',
    };
  });

  mockProvider.registerHandler('scene_reviewer_scene-01_iter_2', () => {
    sceneReviewAttempts++;
    return {
      sceneId: 'scene-01',
      isApproved: true,
      iterationNumber: 2,
      checkItems: [
        {
          criterion: 'epistemic_knowledge_boundaries_respected',
          passed: true,
          notes: 'Knowledge sequence properly ordered.',
        },
      ],
      overallCritique: 'Revision resolves the knowledge sequence.',
      requiredRevisions: [],
      recommendation: 'approve',
    };
  });

  const storyGraph = new StoryGraph();
  const orchestrator = new WorkflowOrchestrator(mockProvider, storyGraph);

  const result = await orchestrator.run(
    { rawPrompt: 'A communications officer intercepts a distress call.' },
    { maxScenesToProduce: 1 },
  );

  assert.equal(sceneReviewAttempts, 2);
  assert.equal(result.snapshot.currentStage, 'COMPLETED');
  assert.equal(storyGraph.getAllScenes().length, 1);
});

test('SceneExecution: escalates to operator when scene revision limit is exhausted', async () => {
  const mockProvider = new TestModelProvider();
  await mockProvider.initialize();

  // Both attempts fail
  mockProvider.registerHandler('scene_reviewer_scene-01_iter_1', () => ({
    sceneId: 'scene-01',
    isApproved: false,
    iterationNumber: 1,
    checkItems: [],
    overallCritique: 'Prose tone is too cheerful.',
    requiredRevisions: ['Darken tone.'],
    recommendation: 'request_revision',
  }));

  mockProvider.registerHandler('scene_reviewer_scene-01_iter_2', () => ({
    sceneId: 'scene-01',
    isApproved: false,
    iterationNumber: 2,
    checkItems: [],
    overallCritique: 'Still excessively upbeat.',
    requiredRevisions: [],
    recommendation: 'escalate_failure',
  }));

  const storyGraph = new StoryGraph();
  const orchestrator = new WorkflowOrchestrator(mockProvider, storyGraph);

  const result = await orchestrator.run(
    { rawPrompt: 'A communications officer intercepts a distress call.' },
    { maxScenesToProduce: 1 },
  );

  assert.equal(result.snapshot.currentStage, 'ESCALATED_NEEDS_INTERVENTION');
  assert.equal(storyGraph.getAllScenes().length, 0, 'Rejected scene must never enter canonical Story Graph');
});

