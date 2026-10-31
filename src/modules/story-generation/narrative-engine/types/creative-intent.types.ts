import { z } from 'zod';

export const NarrativeFormatEnum = z.enum([
  'short_story',
  'novel',
  'audio_drama',
  'episodic',
  'interactive',
  'documentary',
]);
export type NarrativeFormat = z.infer<typeof NarrativeFormatEnum>;

export const PacingPreferenceEnum = z.enum(['fast', 'moderate', 'deliberate', 'variable']);
export type PacingPreference = z.infer<typeof PacingPreferenceEnum>;

export const NarrativePerspectiveEnum = z.enum([
  'first_person',
  'third_person_limited',
  'third_person_omniscient',
  'second_person',
  'multi_perspective',
]);
export type NarrativePerspective = z.infer<typeof NarrativePerspectiveEnum>;

export const CreativeIntentSchema = z.object({
  id: z.string().default(() => `intent-${Date.now()}`),
  title: z.string(),
  premise: z.string().describe('The core premise and central hook of the story'),
  primaryGenre: z.string(),
  subgenres: z.array(z.string()).default([]),
  targetAudience: z.string(),
  format: NarrativeFormatEnum.default('short_story'),
  tone: z.array(z.string()).describe('Dominant emotional and stylistic tones'),
  themes: z.array(z.string()).describe('Key underlying thematic questions or explorations'),
  explicitConstraints: z.array(z.string()).default([]).describe('Rules or limits specified by the creator'),
  impliedAssumptions: z.array(z.string()).default([]).describe('Assumptions derived from genre conventions'),
  clarifiedAmbiguities: z.array(z.string()).default([]).describe('Resolved ambiguities between contradictory requirements'),
  biasAnalysis: z.object({
    intentionalFictionalBiases: z.array(z.string()).describe('Artistic choices to preserve'),
    mitigatedUnintendedAssumptions: z.array(z.string()).describe('Avoided stereotypes or flat generalizations'),
  }).optional(),
  pacingPreference: PacingPreferenceEnum.default('moderate'),
  perspective: NarrativePerspectiveEnum.default('third_person_limited'),
});

export type CreativeIntent = z.infer<typeof CreativeIntentSchema>;

export const RawCreativePromptSchema = z.object({
  rawPrompt: z.string().min(3),
  genreHints: z.array(z.string()).optional(),
  format: NarrativeFormatEnum.optional(),
  constraints: z.array(z.string()).optional(),
});

export type RawCreativePrompt = z.infer<typeof RawCreativePromptSchema>;

