import { z } from 'zod';
import { ProposedMutationSchema } from './story-graph.types.ts';

export const SceneDraftSchema = z.object({
  sceneId: z.string(),
  title: z.string(),
  prose: z.string().min(50).describe('The full generated prose for the scene'),
  summary: z.string().describe('Concise canonical summary of what transpired'),
  wordCount: z.number().int().nonnegative(),
  proposedMutations: z.array(ProposedMutationSchema).default([]),
  craftNotes: z.object({
    focalSubtext: z.string().optional(),
    sensoryMotifsUsed: z.array(z.string()).default([]),
    pacingAssessment: z.string().optional(),
  }).optional(),
});
export type SceneDraft = z.infer<typeof SceneDraftSchema>;

export const SceneReviewCheckItemSchema = z.object({
  criterion: z.enum([
    'contract_objective_fulfilled',
    'required_events_present',
    'character_behavior_and_voice_consistent',
    'epistemic_knowledge_boundaries_respected',
    'world_rules_and_continuity_preserved',
    'no_unauthorized_major_plot_divergence',
    'style_and_tone_adherence',
  ]),
  passed: z.boolean(),
  notes: z.string(),
});
export type SceneReviewCheckItem = z.infer<typeof SceneReviewCheckItemSchema>;

export const SceneReviewResultSchema = z.object({
  sceneId: z.string(),
  isApproved: z.boolean(),
  iterationNumber: z.number().int().min(1).default(1),
  checkItems: z.array(SceneReviewCheckItemSchema),
  overallCritique: z.string(),
  requiredRevisions: z.array(z.string()).default([]),
  recommendation: z.enum(['approve', 'request_revision', 'escalate_failure']),
});
export type SceneReviewResult = z.infer<typeof SceneReviewResultSchema>;
