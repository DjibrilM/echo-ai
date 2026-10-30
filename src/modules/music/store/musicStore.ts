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

export const SONG_PRESETS: MusicPromptPreset[] = [
  {
    id: 'pop-anthem',
    title: 'Upbeat Pop Anthem',
    genre: 'Pop / Modern',
    caption: 'Upbeat modern pop anthem with bright vocal harmonies, energetic synth pads, infectious rhythm and hook',
    bpm: 124,
    keyscale: 'C major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'piano-ballad',
    title: 'Emotional Piano Ballad',
    genre: 'Ballad / Acoustic',
    caption: 'Emotional soul ballad with expressive lead vocals, warm grand piano, subtle cello harmonies, and passionate climax',
    bpm: 76,
    keyscale: 'Eb major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'rnb-slow-jam',
    title: 'R&B Soul Slow Jam',
    genre: 'R&B / Soul',
    caption: 'Sensual contemporary R&B song with silky smooth falsetto vocals, rhodes chords, deep sub bass, and crisp snap beat',
    bpm: 85,
    keyscale: 'Ab minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'indie-rock',
    title: 'Indie Rock Song',
    genre: 'Rock / Indie',
    caption: 'Driving indie rock song with raw emotive vocals, overdriven electric guitars, punchy live drums, and anthemic chorus',
    bpm: 128,
    keyscale: 'D major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'future-bass-vocal',
    title: 'Future Bass Vocal Anthem',
    genre: 'EDM / Dance',
    caption: 'Euphoric EDM vocal track with catchy vocal chops, sparkling arpeggios, massive supersaw chord drops, and energetic beat',
    bpm: 140,
    keyscale: 'F# minor',
    timesignature: '4/4',
    duration: 30,
  },
];

export const BEAT_PRESETS: MusicPromptPreset[] = [
  {
    id: 'trap-808-heat',
    title: 'Hard 808 Trap Beat',
    genre: 'Trap / Hip-Hop',
    caption: 'Dark energetic trap beat with heavy distorted 808 glides, rapid hi-hat rolls, crisp clap, and eerie bell melody',
    bpm: 140,
    keyscale: 'F minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'lofi-chill',
    title: 'Lo-Fi Chillhop Beat',
    genre: 'Lo-Fi / Hip-Hop',
    caption: 'Dusty lo-fi hip hop beat with warm rhodes keys, vinyl crackle, mellow bassline, and laid-back boom bap drum pattern',
    bpm: 82,
    keyscale: 'Eb major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'synthwave-drive',
    title: 'Neon Synthwave Beat',
    genre: 'Synthwave / Retro',
    caption: 'Pulsing 80s outrun synthwave beat with analog arpeggios, punchy gated snare, driving bassline, and vintage drum machine',
    bpm: 120,
    keyscale: 'D minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'boom-bap-90s',
    title: '90s Boom Bap Beat',
    genre: 'Hip-Hop / Classic',
    caption: 'Raw 90s East Coast boom bap beat with soulful jazz horn samples, heavy acoustic kick and snare, and upright bass groove',
    bpm: 90,
    keyscale: 'C minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'drill-uk',
    title: 'UK Drill Beat',
    genre: 'Drill / Urban',
    caption: 'Dark atmospheric UK drill beat with sliding 808s, haunting piano loop, syncopated snare bounces, and intense percussion',
    bpm: 142,
    keyscale: 'E minor',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'neo-soul-groove',
    title: 'Neo-Soul Groove Beat',
    genre: 'R&B / Groove',
    caption: 'Tight neo-soul groove with syncopated live drums, warm walking bass, subtle brass stabs, and jazz guitar licks',
    bpm: 88,
    keyscale: 'Ab minor',
    timesignature: '4/4',
    duration: 30,
  },
];

export const MUSIC_PRESETS: MusicPromptPreset[] = [
  ...BEAT_PRESETS,
  ...SONG_PRESETS,
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
export const engineAtom = atomWithStorage<MusicEngine>('echo_music_engine', 'minimax');
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
