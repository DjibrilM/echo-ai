import { z } from 'zod';

export const SceneContractStatusEnum = z.enum([
  'planned',
  'in_progress',
  'drafted',
  'approved',
  'revision_required',
  'rejected',
]);
export type SceneContractStatus = z.infer<typeof SceneContractStatusEnum>;

export const NarrativeBeatSchema = z.object({
  beatNumber: z.number().int().positive(),
  description: z.string(),
  characterActions: z.record(z.string(), z.string()).optional(),
  microConflict: z.string().optional(),
});
export type NarrativeBeat = z.infer<typeof NarrativeBeatSchema>;

export const SceneContractSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  sceneIndex: z.number().int().nonnegative(),
  title: z.string(),
  objective: z.string().describe('The primary dramatic or narrative purpose of this scene'),
  participatingCharacterIds: z.array(z.string()).min(1),
  focusCharacterId: z.string().describe('The point of view or focal character for the scene'),
  locationId: z.string(),
  openingConditions: z.string().describe('What physical and emotional state the scene opens in'),
  requiredEvents: z.array(z.string()).min(1).describe('Crucial plot beats that must occur'),
  requiredRevelations: z.array(z.string()).default([]).describe('Information revealed to specific characters or reader'),
  characterMotivationsInScene: z.record(z.string(), z.string()).describe('What each character is pursuing in this scene'),
  emotionalShift: z.object({
    from: z.string(),
    to: z.string(),
  }),
  continuityConstraints: z.array(z.string()).default([]).describe('Continuity requirements from previous scenes'),
  expectedClosingConditions: z.string().describe('Final state of scene, establishing the bridge to next scenes'),
  dependencies: z.array(z.string()).default([]).describe('IDs of scenes that must occur prior'),
  targetWordCount: z.number().int().min(100).default(800),
  beats: z.array(NarrativeBeatSchema).default([]),
  status: SceneContractStatusEnum.default('planned'),
});
export type SceneContract = z.infer<typeof SceneContractSchema>;

export const ChapterBlueprintSchema = z.object({
  id: z.string(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  scenes: z.array(SceneContractSchema),
});
export type ChapterBlueprint = z.infer<typeof ChapterBlueprintSchema>;

export const ActBlueprintSchema = z.object({
  actNumber: z.number().int().positive(),
  title: z.string(),
  dramaticFunction: z.string().describe('e.g., Setup, Confrontation, Crisis, Climax, Resolution'),
  chapters: z.array(ChapterBlueprintSchema),
});
export type ActBlueprint = z.infer<typeof ActBlueprintSchema>;

export const SetupPayoffPairSchema = z.object({
  id: z.string(),
  setupDescription: z.string(),
  setupSceneId: z.string(),
  payoffDescription: z.string(),
  payoffSceneId: z.string(),
  isPayoffResolved: z.boolean().default(false),
});
export type SetupPayoffPair = z.infer<typeof SetupPayoffPairSchema>;

export const NarrativeArcSchema = z.object({
  arcName: z.string(),
  openingSituation: z.string(),
  incitingIncident: z.string(),
  mainConflict: z.string(),
  majorPlotDevelopments: z.array(z.string()),
  subplots: z.array(z.string()).default([]),
  turningPoints: z.array(z.string()),
  climax: z.string(),
  resolution: z.string(),
  ending: z.string(),
});
export type NarrativeArc = z.infer<typeof NarrativeArcSchema>;

export const BlueprintReviewStatusEnum = z.enum([
  'pending_review',
  'approved',
  'revisions_requested',
  'escalated',
]);
export type BlueprintReviewStatus = z.infer<typeof BlueprintReviewStatusEnum>;

export const NarrativeBlueprintSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  logline: z.string(),
  arc: NarrativeArcSchema,
  acts: z.array(ActBlueprintSchema),
  setupPayoffs: z.array(SetupPayoffPairSchema).default([]),
  reviewStatus: BlueprintReviewStatusEnum.default('pending_review'),
  submissionCount: z.number().int().min(0).max(2).default(0),
  integrityReviewNotes: z.array(z.string()).default([]),
});
export type NarrativeBlueprint = z.infer<typeof NarrativeBlueprintSchema>;

export const IntegrityIssueSeverityEnum = z.enum(['minor', 'major', 'critical']);
export type IntegrityIssueSeverity = z.infer<typeof IntegrityIssueSeverityEnum>;

export const IntegrityIssueCategoryEnum = z.enum([
  'causal_inconsistency',
  'character_motivation_mismatch',
  'timeline_contradiction',
  'world_rule_violation',
  'unresolved_setup',
  'insufficient_justification',
  'pacing_or_structure_flaw',
]);
export type IntegrityIssueCategory = z.infer<typeof IntegrityIssueCategoryEnum>;

export const IntegrityFindingSchema = z.object({
  category: IntegrityIssueCategoryEnum,
  severity: IntegrityIssueSeverityEnum,
  affectedSceneIds: z.array(z.string()),
  description: z.string(),
  requiredCorrection: z.string(),
});
export type IntegrityFinding = z.infer<typeof IntegrityFindingSchema>;

export const BlueprintReviewResultSchema = z.object({
  isApproved: z.boolean(),
  submissionNumber: z.number().int().min(1).max(2),
  overallAssessment: z.string(),
  findings: z.array(IntegrityFindingSchema).default([]),
  strengths: z.array(z.string()).default([]),
  recommendation: z.enum(['approve', 'request_revision', 'escalate_to_human']),
});
export type BlueprintReviewResult = z.infer<typeof BlueprintReviewResultSchema>;

