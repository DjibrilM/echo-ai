import { z } from 'zod';

export const VoiceGenderEnum = z.enum(['male', 'female', 'neutral', 'other']);
export type VoiceGender = z.infer<typeof VoiceGenderEnum>;

export const PerformanceEmotionEnum = z.enum([
  'neutral',
  'whispering',
  'intense',
  'urgent',
  'fearful',
  'furious',
  'mournful',
  'joyful',
  'ironic',
  'menacing',
  'hesitant',
  'tender',
]);
export type PerformanceEmotion = z.infer<typeof PerformanceEmotionEnum>;

export const CharacterVoiceProfileSchema = z.object({
  characterId: z.string(), // or 'NARRATOR'
  characterName: z.string(),
  assignedVoiceId: z.string().describe('Identifier in TTS model voice catalog'),
  engine: z.enum(['cosyvoice3', 'chatterbox', 'moss', 'mock']).default('cosyvoice3'),
  gender: VoiceGenderEnum,
  pitchOffset: z.number().min(-1.0).max(1.0).default(0.0),
  naturalSpeed: z.number().min(0.5).max(2.0).default(1.0),
  baselineStylePrompt: z.string().optional().describe('Voice prompt description for zero-shot TTS conditioning'),
});
export type CharacterVoiceProfile = z.infer<typeof CharacterVoiceProfileSchema>;

export const AudioUtteranceSegmentSchema = z.object({
  id: z.string(),
  utteranceIndex: z.number().int().nonnegative(),
  sceneId: z.string(),
  speakerId: z.string().describe("Character ID or 'NARRATOR'"),
  speakerName: z.string(),
  isDialogue: z.boolean(),
  spokenText: z.string().min(1),
  voiceProfile: CharacterVoiceProfileSchema,
  performance: z.object({
    emotion: PerformanceEmotionEnum.default('neutral'),
    deliveryIntensity: z.number().min(0.1).max(1.0).default(0.5),
    speedMultiplier: z.number().min(0.7).max(1.4).default(1.0),
    prePauseMs: z.number().int().nonnegative().default(100),
    postPauseMs: z.number().int().nonnegative().default(250),
    actingNotes: z.string().optional(),
  }),
  soundDesignCue: z.object({
    soundEffectId: z.string().optional(),
    sfxVolume: z.number().min(0.0).max(1.0).default(0.5),
    sfxTriggerPoint: z.enum(['start', 'during', 'end']).default('start'),
  }).optional(),
});
export type AudioUtteranceSegment = z.infer<typeof AudioUtteranceSegmentSchema>;

export const SceneAudioAmbienceCueSchema = z.object({
  ambienceId: z.string(),
  description: z.string(),
  category: z.enum(['indoor', 'outdoor', 'sci_fi', 'weather', 'tense_silence', 'crowd']),
  loop: z.boolean().default(true),
  volume: z.number().min(0.0).max(1.0).default(0.3),
  fadeInMs: z.number().int().default(1500),
  fadeOutMs: z.number().int().default(2000),
});
export type SceneAudioAmbienceCue = z.infer<typeof SceneAudioAmbienceCueSchema>;

export const SceneAudioMusicCueSchema = z.object({
  trackTheme: z.string(),
  mood: z.string(),
  intensityLevel: z.number().min(1).max(5).default(2),
  volume: z.number().min(0.0).max(1.0).default(0.25),
  startAtUtteranceIndex: z.number().int().default(0),
});
export type SceneAudioMusicCue = z.infer<typeof SceneAudioMusicCueSchema>;

export const PerformanceScriptSchema = z.object({
  sceneId: z.string(),
  sceneTitle: z.string(),
  voiceCast: z.record(z.string(), CharacterVoiceProfileSchema),
  ambienceTrack: SceneAudioAmbienceCueSchema.optional(),
  musicTrack: SceneAudioMusicCueSchema.optional(),
  segments: z.array(AudioUtteranceSegmentSchema),
  estimatedDurationSeconds: z.number().nonnegative(),
});
export type PerformanceScript = z.infer<typeof PerformanceScriptSchema>;

