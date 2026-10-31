import { z } from 'zod';
import {
  CharacterProfileSchema,
  CharacterEpistemicStateSchema,
  WorldLocationSchema,
  WorldFactSchema,
} from './character.types.ts';
import { SceneContractSchema } from './blueprint.types.ts';

export const MutationTypeEnum = z.enum([
  'character_state',
  'character_knowledge',
  'character_belief',
  'relationship_update',
  'new_canonical_fact',
  'plot_thread_update',
  'location_state_change',
  'timeline_event',
]);
export type MutationType = z.infer<typeof MutationTypeEnum>;

export const ProposedMutationSchema = z.object({
  id: z.string().default(() => `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  type: MutationTypeEnum,
  targetEntityId: z.string().describe('ID of character, location, or plot thread'),
  action: z.enum(['set', 'add', 'update', 'resolve']),
  payload: z.record(z.string(), z.any()),
  justification: z.string().describe('Dramatic or causal justification for why this mutation occurred in the scene'),
});
export type ProposedMutation = z.infer<typeof ProposedMutationSchema>;

export const CommittedMutationSchema = ProposedMutationSchema.extend({
  committedAt: z.string(),
  sourceSceneId: z.string(),
  appliedSuccessfully: z.boolean().default(true),
});
export type CommittedMutation = z.infer<typeof CommittedMutationSchema>;

export const PlotThreadStatusEnum = z.enum(['introduced', 'escalating', 'resolved', 'abandoned']);
export type PlotThreadStatus = z.infer<typeof PlotThreadStatusEnum>;

export const PlotThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  involvedCharacterIds: z.array(z.string()),
  status: PlotThreadStatusEnum.default('introduced'),
  introducedInSceneId: z.string(),
  resolvedInSceneId: z.string().optional(),
});
export type PlotThread = z.infer<typeof PlotThreadSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  chronologicalIndex: z.number().int().nonnegative(),
  timestampOrPhase: z.string().describe('e.g., Day 1: Dusk, or Chapter 2: The Ambush'),
  summary: z.string(),
  impactedCharacterIds: z.array(z.string()),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const CanonicalSceneRecordSchema = z.object({
  contract: SceneContractSchema,
  prose: z.string(),
  summary: z.string().describe('Condensed 2-3 sentence summary of what canonically occurred'),
  wordCount: z.number().int().nonnegative(),
  generatedAt: z.string(),
  approvedAt: z.string(),
  mutationsApplied: z.array(CommittedMutationSchema).default([]),
});
export type CanonicalSceneRecord = z.infer<typeof CanonicalSceneRecordSchema>;

export const StoryGraphStateSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  characters: z.record(z.string(), CharacterProfileSchema),
  epistemicStates: z.record(z.string(), CharacterEpistemicStateSchema),
  locations: z.record(z.string(), WorldLocationSchema),
  worldFacts: z.array(WorldFactSchema),
  plotThreads: z.record(z.string(), PlotThreadSchema),
  scenes: z.record(z.string(), CanonicalSceneRecordSchema),
  sceneExecutionOrder: z.array(z.string()),
  timeline: z.array(TimelineEventSchema),
  unresolvedMysteries: z.array(z.string()).default([]),
  establishedRevelations: z.array(z.string()).default([]),
  version: z.number().int().default(1),
  updatedAt: z.string(),
});
export type StoryGraphState = z.infer<typeof StoryGraphStateSchema>;
