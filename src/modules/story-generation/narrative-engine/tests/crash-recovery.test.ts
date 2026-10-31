import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { TestModelProvider } from './test-helpers/test-provider.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { PersistenceManager } from '../memory/persistence.ts';
import { WorkflowOrchestrator } from '../orchestrator/workflow-orchestrator.ts';

test('CrashRecovery: saves state to disk and resumes from committed checkpoint', async () => {
  const tempDir = path.join(os.tmpdir(), `echo-narrative-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const persistence = new PersistenceManager(tempDir);
    const mockProvider = new TestModelProvider();
    await mockProvider.initialize();

    // Run phase 1: Produce only 1 scene
    const storyGraph1 = new StoryGraph();
    const orchestrator1 = new WorkflowOrchestrator(mockProvider, storyGraph1, persistence);

    const initialRun = await orchestrator1.run(
      { rawPrompt: 'A communications officer intercepts an archaic signal.' },
      { maxScenesToProduce: 1, enableAudioPreparation: false },
    );

    const projectId = initialRun.snapshot.projectId;
    assert.ok(persistence.hasPersistedNarrative(projectId));
    assert.equal(initialRun.storyGraph.getAllScenes().length, 1);

    // Verify disk files exist
    const savedGraph = persistence.loadStoryGraph(projectId);
    const savedSnapshot = persistence.loadWorkflowSnapshot(projectId);
    assert.ok(savedGraph);
    assert.ok(savedSnapshot);
    assert.equal(savedGraph?.sceneExecutionOrder.length, 1);
    assert.equal(savedSnapshot?.completedSceneIds.length, 1);

    // Simulate process crash and recovery in a new process instance
    const restoredGraph = new StoryGraph(savedGraph!);
    assert.equal(restoredGraph.getAllScenes().length, 1);
    const firstScene = restoredGraph.getAllScenes()[0];
    assert.equal(firstScene.contract.id, 'scene-01');

    // Register second scene in blueprint
    const orchestrator2 = new WorkflowOrchestrator(mockProvider, restoredGraph, persistence);
    const resumedRun = await orchestrator2.run(
      { rawPrompt: 'A communications officer intercepts an archaic signal.' },
      { maxScenesToProduce: 2, enableAudioPreparation: false },
    );

    // Assert that scene-01 was preserved and scene-02 was executed
    assert.ok(resumedRun.storyGraph.getScene('scene-01'), 'Scene 1 must be preserved');
    assert.ok(resumedRun.storyGraph.getScene('scene-02'), 'Scene 2 must be produced');
    assert.equal(resumedRun.storyGraph.getAllScenes().length, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
