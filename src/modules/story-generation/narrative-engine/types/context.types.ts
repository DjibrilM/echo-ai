import { z } from 'zod';
import {
  CharacterProfileSchema,
  CharacterEpistemicStateSchema,
  CharacterRelationshipSchema,
  WorldLocationSchema,
  WorldFactSchema,
} from './character.types.ts';
import { SceneContractSchema } from './blueprint.types.ts';
import { PlotThreadSchema } from './story-graph.types.ts';

export const ActiveCharacterContextSchema = z.object({
  profile: CharacterProfileSchema,
  state: CharacterEpistemicStateSchema,
  relationshipsWithOtherParticipants: z.array(CharacterRelationshipSchema),
});
export type ActiveCharacterContext = z.infer<typeof ActiveCharacterContextSchema>;

export const PreviousSceneBridgeSchema = z.object({
  previousSceneId: z.string().optional(),
  previousSceneTitle: z.string().optional(),
  summary: z.string().optional(),
  closingSnippet: z.string().optional().describe('Last 2-3 paragraphs of the previous scene to maintain seamless prose continuity'),
});
export type PreviousSceneBridge = z.infer<typeof PreviousSceneBridgeSchema>;

export const ContextProjectionSchema = z.object({
  sceneId: z.string(),
  sceneContract: SceneContractSchema,
  activeCharacters: z.array(ActiveCharacterContextSchema),
  currentLocation: WorldLocationSchema,
  relevantWorldFacts: z.array(WorldFactSchema),
  relevantPlotThreads: z.array(PlotThreadSchema),
  previousSceneBridge: PreviousSceneBridgeSchema,
  unresolvedMysteries: z.array(z.string()).default([]),
  narrativeConstraints: z.array(z.string()).default([]),
});
export type ContextProjection = z.infer<typeof ContextProjectionSchema>;

export const WritingTaskAssignmentSchema = z.object({
  taskId: z.string(),
  sceneContract: SceneContractSchema,
  projection: ContextProjectionSchema,
  stylistics: z.object({
    narrativePerspective: z.string(),
    overallTone: z.array(z.string()),
    sceneAtmosphere: z.string(),
    pacing: z.string(),
  }),
  revisionFeedback: z.string().optional().describe('If this is a revision pass, specific reviewer instructions to fix'),
});
export type WritingTaskAssignment = z.infer<typeof WritingTaskAssignmentSchema>;
