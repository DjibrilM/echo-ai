import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type {
  MusicEngine,
  MusicDitVariant,
  MusicTaskType,
  MusicInstrumentTrack,
  MusicGenerationOutput,
  MusicProgressState,
  MusicPromptPreset,
} from '../types';

export const MUSIC_PRESETS: MusicPromptPreset[] = [
  {
    id: 'lofi-chill',
    title: 'Lo-Fi Chillhop',
    genre: 'Lo-Fi / Hip-Hop',
    caption: 'Lo-fi hip hop with mellow rhodes piano, soft dusty vinyl crackle, warm bassline and laid-back beat',
    bpm: 82,
    keyscale: 'Eb major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'synthwave-drive',
    title: 'Neon Synthwave',
    genre: 'Synthwave / Retro',
    caption: 'Energetic 80s synthwave with analog synthesizer arpeggios, punchy gated reverb snare, and driving bassline',
    bpm: 120,
    keyscale: 'D minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'cinematic-orchestra',
    title: 'Epic Cinematic',
    genre: 'Cinematic / Orchestral',
    caption: 'Dramatic cinematic orchestral piece with soaring legato strings, thunderous taiko drums, brass stabs, and emotional climax',
    bpm: 96,
    keyscale: 'C minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'acoustic-folk',
    title: 'Acoustic Sunrise',
    genre: 'Acoustic / Folk',
    caption: 'Gentle acoustic folk guitar fingerpicking with warm upright bass, subtle mandolin harmonies, and peaceful morning vibe',
    bpm: 104,
    keyscale: 'G major',
    timesignature: '4/4',
    duration: 25,
  },
  {
    id: 'neo-soul-groove',
    title: 'Neo-Soul Groove',
    genre: 'R&B / Neo-Soul',
    caption: 'Smooth neo-soul groove with lush jazz chords on Wurlitzer, tight syncopated drums, and melodic walking bass',
    bpm: 88,
    keyscale: 'Ab minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'cyberpunk-dark',
    title: 'Cyberpunk Industrial',
    genre: 'Industrial / Electro',
    caption: 'Dark gritty cyberpunk mid-tempo electro with distorted saw leads, heavy sub bass hits, and futuristic sound design',
    bpm: 110,
    keyscale: 'F minor',
    timesignature: '4/4',
    duration: 30,
  },
];

// Prompt & Content Atoms
export const captionAtom = atomWithStorage<string>(
  'echo_music_caption',
  'Lo-fi hip hop with mellow rhodes piano, soft dusty vinyl crackle, warm bassline and laid-back beat'
);

export const lyricsAtom = atomWithStorage<string>('echo_music_lyrics', '');
export const isInstrumentalAtom = atomWithStorage<boolean>('echo_music_instrumental', false);

export type MusicVocalMode = 'instrumental' | 'manual' | 'auto';
export const vocalModeAtom = atomWithStorage<MusicVocalMode>('echo_music_vocal_mode', 'auto');

// Engine & Model Variants
export const engineAtom = atomWithStorage<MusicEngine>('echo_music_engine', 'acestep');
export const ditVariantAtom = atomWithStorage<MusicDitVariant>('echo_music_dit_variant', 'turbo-q4');

// Musical Steering Controls
export const bpmAtom = atomWithStorage<number>('echo_music_bpm', 82);
export const keyscaleAtom = atomWithStorage<string>('echo_music_keyscale', 'Eb major');
export const timesignatureAtom = atomWithStorage<string>('echo_music_timesignature', '4/4');
export const vocalLanguageAtom = atomWithStorage<string>('echo_music_vocal_language', 'en');
export const durationAtom = atomWithStorage<number>('echo_music_duration', 30);
export const seedAtom = atom<number>(-1); // -1 = random

// LM-assisted generation controls (ACE-Step text2music)
export const simpleModeAtom = atom<boolean>(false);
export const rewriteQueryAtom = atom<boolean>(false);
export const generateLrcAtom = atom<boolean>(false);
export const computeQualityScoreAtom = atom<boolean>(false);
export const augmentCaptionAtom = atom<boolean>(false);

// Advanced Output & Sampler Controls
export const normalizeLoudnessAtom = atom<boolean>(true);
export const guidanceScaleAtom = atom<number>(0); // 0 = automatic
export const dcwEnabledAtom = atom<boolean>(true);
export const dcwScalerAtom = atom<number>(0.05);
export const dcwHighScalerAtom = atom<number>(0.02);
export const inferenceStepsAtom = atom<number>(8); // default for turbo is 8
export const shiftAtom = atom<number>(3.0); // default for turbo is 3.0

// Cover & Stem (Lego) Controls
export const taskTypeAtom = atom<MusicTaskType>('text2music');
export const sourceAudioAtom = atom<string>('');
export const referenceAudioAtom = atom<string>('');
export const coverNoiseStrengthAtom = atom<number>(0.75);
export const trackAtom = atom<MusicInstrumentTrack>('drums');

// Runtime & Player Atoms
export const isGeneratingAtom = atom<boolean>(false);
export const activeTaskIdAtom = atom<string | null>(null);
export const generationProgressAtom = atom<MusicProgressState | null>(null);
export const generationErrorAtom = atom<{ taskId: string; message: string; details?: any; timestamp: string } | null>(null);
export const activeTrackAtom = atom<MusicGenerationOutput | null>(null);
export const isPlayingAtom = atom<boolean>(false);
export const playbackCurrentTimeAtom = atom<number>(0);
export const playbackDurationAtom = atom<number>(0);
export const historyListAtom = atom<MusicGenerationOutput[]>([]);
export const studioSessionTracksAtom = atom<MusicGenerationOutput[]>([]);

// Drawers & Modals
export const activeDrawerTabAtom = atom<'controls' | 'history' | 'lyrics' | 'cover' | null>(null);
export const audioEditModalOpenAtom = atom<boolean>(false);
export const audioUnderstandModalOpenAtom = atom<boolean>(false);
export const modelStatusModalOpenAtom = atom<boolean>(false);
