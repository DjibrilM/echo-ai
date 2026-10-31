import { z } from 'zod';
import { CreativeIntentSchema } from './creative-intent.types.ts';
import { NarrativeBlueprintSchema, BlueprintReviewResultSchema } from './blueprint.types.ts';
import { SceneReviewResultSchema } from './scene.types.ts';

export const WorkflowStageEnum = z.enum([
  'INITIALIZED',
  'NORMALIZING_INTENT',
  'DESIGNING_WORLD_AND_CHARACTERS',
  'ARCHITECTING_BLUEPRINT',
  'REVIEWING_BLUEPRINT_PASS_1',
  'REVISING_BLUEPRINT',
  'REVIEWING_BLUEPRINT_PASS_2',
  'BLUEPRINT_APPROVED',
  'EXECUTING_SCENE',
  'REVIEWING_SCENE',
  'COMMITTING_SCENE',
  'PREPARING_AUDIO',
  'COMPLETED',
  'ESCALATED_NEEDS_INTERVENTION',
  'FAILED',
]);
export type WorkflowStage = z.infer<typeof WorkflowStageEnum>;

export const TaskExecutionRecordSchema = z.object({
  taskId: z.string(),
  stage: WorkflowStageEnum,
  targetEntityId: z.string().optional(),
  attemptNumber: z.number().int().min(1).default(1),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed', 'rejected']),
  errorDetails: z.string().optional(),
});
export type TaskExecutionRecord = z.infer<typeof TaskExecutionRecordSchema>;

export const WorkflowExecutionSnapshotSchema = z.object({
  workflowId: z.string(),
  projectId: z.string(),
  currentStage: WorkflowStageEnum,
  intent: CreativeIntentSchema.optional(),
  blueprint: NarrativeBlueprintSchema.optional(),
  blueprintReviews: z.array(BlueprintReviewResultSchema).default([]),
  currentSceneId: z.string().optional(),
  sceneRetryCounts: z.record(z.string(), z.number()).default({}),
  sceneReviews: z.record(z.string(), z.array(SceneReviewResultSchema)).default({}),
  completedSceneIds: z.array(z.string()).default([]),
  taskHistory: z.array(TaskExecutionRecordSchema).default([]),
  resumptionPoint: z.string().optional(),
  escalationReason: z.string().optional(),
  lastUpdated: z.string(),
});
export type WorkflowExecutionSnapshot = z.infer<typeof WorkflowExecutionSnapshotSchema>;
