import test from 'node:test';
import assert from 'node:assert/strict';
import { TestModelProvider } from './test-helpers/test-provider.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { WorkflowOrchestrator } from '../orchestrator/workflow-orchestrator.ts';
import type { RawCreativePrompt } from '../types/creative-intent.types.ts';

test('NarrativeIntegrityReview: handles 2-submission cycle with revision on pass 1', async () => {
  const mockProvider = new TestModelProvider();
  await mockProvider.initialize();

  let reviewCount = 0;
  mockProvider.registerHandler('narrative_reviewer_pass_1', () => {
    reviewCount++;
    return {
      isApproved: false,
      submissionNumber: 1,
      overallAssessment: 'Scene 2 lacks dramatic justification for Chen knowing the frequency.',
      findings: [
        {
          category: 'causal_inconsistency',
          severity: 'major',
          affectedSceneIds: ['scene-02'],
          description: 'Chen knows the exact harmonic frequency without explanation.',
          requiredCorrection: 'Establish that station telemetry flagged power spikes in sector four.',
        },
      ],
      strengths: ['Strong opening scene'],
      recommendation: 'request_revision',
    };
  });

  mockProvider.registerHandler('narrative_reviewer_pass_2', () => {
    reviewCount++;
    return {
      isApproved: true,
      submissionNumber: 2,
      overallAssessment: 'Revisions in Scene 2 successfully resolve the telemetry justification issue.',
      findings: [],
      strengths: ['All causal inconsistencies resolved'],
      recommendation: 'approve',
    };
  });

  const storyGraph = new StoryGraph();
  const orchestrator = new WorkflowOrchestrator(mockProvider, storyGraph);

  const prompt: RawCreativePrompt = {
    rawPrompt: 'A communications officer intercepts an archaic signal.',
  };

  const stagesVisited: string[] = [];
  const result = await orchestrator.run(prompt, {
    maxScenesToProduce: 1,
    onProgress: (stage) => stagesVisited.push(stage),
  });

  assert.equal(reviewCount, 2, 'Should have conducted exactly two review passes');
  assert.ok(stagesVisited.includes('REVIEWING_BLUEPRINT_PASS_1'));
  assert.ok(stagesVisited.includes('REVISING_BLUEPRINT'));
  assert.ok(stagesVisited.includes('REVIEWING_BLUEPRINT_PASS_2'));
  assert.ok(stagesVisited.includes('BLUEPRINT_APPROVED'));
  assert.equal(result.snapshot.currentStage, 'COMPLETED');
});

test('NarrativeIntegrityReview: strictly escalates and HALTS after 2 rejected passes (no infinite loop)', async () => {
  const mockProvider = new TestModelProvider();
  await mockProvider.initialize();

  // Both passes reject
  mockProvider.registerHandler('narrative_reviewer_pass_1', () => ({
    isApproved: false,
    submissionNumber: 1,
    overallAssessment: 'Causal flaw in climax.',
    findings: [
      {
        category: 'causal_inconsistency',
        severity: 'critical',
        affectedSceneIds: ['scene-02'],
        description: 'Unresolvable contradiction.',
        requiredCorrection: 'Rethink the climax.',
      },
    ],
    strengths: [],
    recommendation: 'request_revision',
  }));

  mockProvider.registerHandler('narrative_reviewer_pass_2', () => ({
    isApproved: false,
    submissionNumber: 2,
    overallAssessment: 'Climax remains causally unearned after revision.',
    findings: [
      {
        category: 'causal_inconsistency',
        severity: 'critical',
        affectedSceneIds: ['scene-02'],
        description: 'Still flawed.',
        requiredCorrection: 'Escalate to author.',
      },
    ],
    strengths: [],
    recommendation: 'escalate_to_human',
  }));

  const storyGraph = new StoryGraph();
  const orchestrator = new WorkflowOrchestrator(mockProvider, storyGraph);

  const stagesVisited: string[] = [];
  const result = await orchestrator.run(
    { rawPrompt: 'A doomed mission' },
    {
      onProgress: (stage) => stagesVisited.push(stage),
    },
  );

  // Must stop at ESCALATED_NEEDS_INTERVENTION without advancing to scene generation
  assert.equal(result.snapshot.currentStage, 'ESCALATED_NEEDS_INTERVENTION');
  assert.ok(!stagesVisited.includes('EXECUTING_SCENE'), 'Must never execute scenes if blueprint is not approved');
  assert.ok(result.snapshot.escalationReason?.includes('Blueprint rejected after 2 review passes'));
});

