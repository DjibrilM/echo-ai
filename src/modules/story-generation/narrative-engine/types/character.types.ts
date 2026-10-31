import { z } from 'zod';

export const CharacterRoleEnum = z.enum([
  'protagonist',
  'antagonist',
  'deuteragonist',
  'supporting',
  'mentor',
  'catalyst',
  'minor',
]);
export type CharacterRole = z.infer<typeof CharacterRoleEnum>;

export const CharacterRelationshipSchema = z.object({
  targetCharacterId: z.string(),
  relationshipType: z.string().describe('e.g., rival, mentor, estranged sibling, ally'),
  dynamic: z.string().describe('Nuance of how they interact and emotional tension'),
  trustScore: z.number().min(-1.0).max(1.0).default(0.0).describe('From -1 (hostile) to 1 (absolute trust)'),
  sharedSecret: z.string().optional(),
});
export type CharacterRelationship = z.infer<typeof CharacterRelationshipSchema>;

export const CharacterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  role: CharacterRoleEnum,
  archetype: z.string().optional(),
  personality: z.object({
    traits: z.array(z.string()),
    primaryMotivation: z.string().describe('Core driving want or need'),
    secondaryMotivations: z.array(z.string()).default([]),
    coreFlaw: z.string(),
    fears: z.array(z.string()),
    weaknesses: z.array(z.string()),
    internalContradictions: z.array(z.string()).describe('Psychological paradoxes within the character'),
  }),
  dialogueStyle: z.object({
    vocabularyLevel: z.string().describe('e.g., colloquial, academic, terse, poetic'),
    speechCadence: z.string().describe('e.g., rapid-fire, measured, fragmented, staccato'),
    catchphrasesOrQuirks: z.array(z.string()).default([]),
    subtextTendency: z.string().describe('How they disguise or convey their true intentions'),
  }),
  backstorySummary: z.string(),
  definingPastEvents: z.array(z.string()).default([]).optional(),
  relationships: z.array(CharacterRelationshipSchema).default([]).optional(),
});
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

export const CharacterEpistemicStateSchema = z.object({
  characterId: z.string(),
  knownFacts: z.array(z.string()).describe('Verified objective facts this character is aware of'),
  falseBeliefs: z.array(z.string()).describe('Untrue or distorted beliefs this character holds'),
  hiddenSecrets: z.array(z.string()).describe('Facts this character actively conceals from others'),
  currentGoal: z.string().describe('Immediate objective in the current scene or act'),
  emotionalState: z.string().describe('Current baseline emotional disposition'),
  physicalLocationId: z.string(),
});
export type CharacterEpistemicState = z.infer<typeof CharacterEpistemicStateSchema>;

export const WorldLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  environmentType: z.string().describe('e.g., urban underbelly, orbital station, ancient forest'),
  description: z.string(),
  sensoryDetails: z.object({
    sights: z.array(z.string()),
    sounds: z.array(z.string()),
    smellsOrAtmosphere: z.array(z.string()),
  }),
  culturalSignificance: z.string().optional(),
  currentCondition: z.string().describe('Current state of the location'),
});
export type WorldLocation = z.infer<typeof WorldLocationSchema>;

export const WorldFactSchema = z.object({
  id: z.string(),
  category: z.enum(['physical_law', 'magic_system', 'technology', 'history', 'society', 'politics']),
  statement: z.string().describe('Objective truth about the fictional universe'),
  isImmutable: z.boolean().default(true),
  establishedInSceneId: z.string().optional(),
});
export type WorldFact = z.infer<typeof WorldFactSchema>;

export const WorldBuildingManifestSchema = z.object({
  worldName: z.string(),
  overview: z.string(),
  technologyOrMagicLevel: z.string(),
  societalStructures: z.array(z.string()).default([]),
  rulesAndConstraints: z.array(WorldFactSchema),
  locations: z.array(WorldLocationSchema),
  characters: z.array(CharacterProfileSchema),
  initialEpistemicStates: z.record(z.string(), CharacterEpistemicStateSchema),
});
export type WorldBuildingManifest = z.infer<typeof WorldBuildingManifestSchema>;

