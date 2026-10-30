import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { BeatGenerationOutput, BeatProgressState, BeatPromptPreset, BeatDitVariant } from '../types';

export const BEAT_PRESETS: BeatPromptPreset[] = [
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
    id: 'afrobeat-groove',
    title: 'Afrobeats Rhythmic Groove',
    genre: 'Afrobeat / Club',
    caption: 'Bouncy energetic afrobeat instrumental with syncopated log drums, warm bass guitar, airy guitar riffs, and shaker polyrhythms',
    bpm: 104,
    keyscale: 'G major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'neo-soul-groove',
    title: 'Neo-Soul Dilla Groove',
    genre: 'Neo-Soul / R&B',
    caption: 'Laid back neo-soul beat with unquantized swing drums, lush jazz 7th chords, deep Moog bass, and subtle vinyl hiss',
    bpm: 88,
    keyscale: 'Ab major',
    timesignature: '4/4',
    duration: 30,
  },
  {
    id: 'cyberpunk-midtempo',
    title: 'Cyberpunk Industrial Beat',
    genre: 'Electronic / Industrial',
    caption: 'Heavy industrial cyber beat with crushing distorted kick drums, metallic glitch percussion, growling neuro bass, and dark synth atmosphere',
    bpm: 105,
    keyscale: 'D minor',
    timesignature: '4/4',
    duration: 30,
  },
];

export const BEAT_GENRES = [
  'Trap',
  'Lo-Fi',
  'Boom Bap',
  'UK Drill',
  'Synthwave',
  'Afrobeat',
  'Neo-Soul',
  'Cyberpunk',
  'House / EDM',
] as const;

export const BEAT_TEMPO_OPTIONS = [80, 90, 105, 120, 140, 142] as const;

export const BEAT_KEY_OPTIONS = [
  'C major', 'C minor',
  'D major', 'D minor',
  'Eb major', 'Eb minor',
  'E major', 'E minor',
  'F major', 'F minor',
  'F# minor',
  'G major', 'G minor',
  'Ab major', 'Ab minor',
  'A major', 'A minor',
  'Bb major', 'Bb minor',
  'B minor',
] as const;

// Atoms
export const beatCaptionAtom = atom<string>('');
export const beatBpmAtom = atom<number>(140);
export const beatKeyScaleAtom = atom<string>('F minor');
export const beatTimeSignatureAtom = atom<string>('4/4');
export const beatDurationAtom = atom<number>(30);
export const beatSeedAtom = atom<number>(-1);
export const beatDitVariantAtom = atom<BeatDitVariant>('turbo-q4');
export const beatGuidanceScaleAtom = atom<number>(1.0); // 1.0 for distilled turbo DiT (prevents CFG distortion)
export const beatInferenceStepsAtom = atom<number>(10); // 10 steps provides crisp transient definition
export const beatShiftAtom = atom<number>(3.0); // 3.0 is official turbo DiT timestep shift for crisp highs
export const beatDcwEnabledAtom = atom<boolean>(true);
export const beatDcwScalerAtom = atom<number>(0.05);
export const beatDcwHighScalerAtom = atom<number>(0.02);

export const isBeatGeneratingAtom = atom<boolean>(false);
export const beatGenerationProgressAtom = atom<BeatProgressState | null>(null);
export const beatGenerationErrorAtom = atom<string | null>(null);

export const beatActiveTrackAtom = atom<BeatGenerationOutput | null>(null);
export const isBeatPlayingAtom = atom<boolean>(false);

export const beatHistoryAtom = atomWithStorage<BeatGenerationOutput[]>('echo_beats_history', []);
export const beatStudioSessionTracksAtom = atom<BeatGenerationOutput[]>([]);

export const beatControlsDrawerOpenAtom = atom<boolean>(false);
export const beatModelStatusModalOpenAtom = atom<boolean>(false);

