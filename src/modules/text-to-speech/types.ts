export type QvacEmotion =
  | 'Neutral'
  | 'Happy'
  | 'Sad'
  | 'Anger'
  | 'Narration'
  | 'Conversation'
  | 'Surprise'
  | 'Command'

export type QvacPace = 'Slow' | 'Moderate' | 'Fast'

/**
 * Official QVAC Chatterbox neural TTS standard limit per individual speaker turn.
 * Sourced from docs.qvac.tether.io maxInputChars (default: 4,096 characters).
 * Each speaker turn stays under this limit for highest acoustic fidelity and zero voice drift.
 * Multi-speaker dialogues are synthesized per-turn and concatenated with natural pauses into a master track.
 */
export const QVAC_MAX_CHARS_PER_ROUND = 4096

export interface Voice {
  id: string
  name: string
  description: string
  category: 'preset' | 'cloned'
  color: string
  avatarUrl: string
  initials: string
  gender: 'Female' | 'Male' | 'Neutral'
  tags: string[]
  referenceAudioName?: string
}

export interface SpeechRound {
  id: string
  voiceId: string
  text: string
  speed: number // WSOLA multiplier for this round (0.5 to 2.0)
  emotion?: QvacEmotion
  pace?: QvacPace
}

export interface Generation {
  id: string
  roundIndex: number
  title: string
  textSnippet: string
  speakerName: string
  speakerColor: string
  speakerAvatarUrl?: string
  duration: number // in seconds
  waveform: number[]
  timestamp: string
  rating?: 'up' | 'down'
  audioUrl?: string
}

export interface HistoryEntry {
  id: string
  text: string
  voiceName: string
  voiceColor: string
  voiceAvatarUrl?: string
  dateGroup: 'Today' | 'Yesterday' | 'August 27, 2025' | 'August 26, 2025'
  timeAgo: string
  model: string
  duration: string
  roundsData?: SpeechRound[]
}

export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag?: string
  isAuto?: boolean
}

export interface ChatterboxModel {
  id: string
  name: string
  badge: string
  description: string
  recommended: boolean
}

export interface TextToSpeechState {
  // Voice & Language selection
  language: string
  searchLangQuery: string
  isLanguageSelectorOpen: boolean
  selectedVoiceId: string
  voices: Voice[]

  // Multi-speaker dialogue rounds
  rounds: SpeechRound[]
  focusedRoundIndex: number
  shufflingRoundId: string | null

  // Generation & Active Playback
  generations: Generation[]
  activeGeneration: Generation | null
  isSynthesizing: boolean
  synthesisProgress: string
  isPlaying: boolean
  playbackProgress: number
  currentTime: number
  seekTarget: number | null
  isMuted: boolean
  volume: number
  prevVolume: number

  // Bring Your Own Voice modal
  isCloneModalOpen: boolean
  cloneVoiceName: string
  cloneVoiceGender: 'Female' | 'Male' | 'Neutral'
  cloneVoiceTags: string[]
  cloneCustomTag: string
  cloneFile: File | null
  isRecording: boolean
  recordedDuration: number
  cloneMode: 'upload' | 'record'
  recordedAudioUrl: string | null
  isPlayingRecording: boolean

  // Model parameters (Right drawer)
  stability: number
  similarity: number
  styleExaggeration: number
  speed: number
  cfgScale: number
  lavaSrEnabled: boolean

  // Right Drawer Tab & History
  rightPanelTab: 'settings' | 'history'
  history: HistoryEntry[]
  historySearch: string
  playingHistoryId: string | null
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto (Detect)', nativeName: 'Automatic language detection', isAuto: true },
  { code: 'en-us', name: 'English (US)', nativeName: 'American English', flag: '🇺🇸' },
  { code: 'en-gb', name: 'English (UK)', nativeName: 'British English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
]

export const INITIAL_VOICES: Voice[] = [
  {
    id: 'voice-jessica',
    name: 'Jessica',
    description: 'Playful, Bright, Warm',
    category: 'preset',
    color: '#10b981',
    avatarUrl: '/voices/jessica.jpg',
    initials: 'J',
    gender: 'Female',
    tags: ['Conversational', 'Warm', 'Young Adult'],
  },
  {
    id: 'voice-roger',
    name: 'Roger',
    description: 'Resolute, Grounded, Deep',
    category: 'preset',
    color: '#38bdf8',
    avatarUrl: '/voices/roger.jpg',
    initials: 'R',
    gender: 'Male',
    tags: ['Narration', 'Deep', 'Authoritative'],
  },
  {
    id: 'voice-george',
    name: 'George',
    description: 'Warm, Storyteller, Resonant',
    category: 'preset',
    color: '#f97316',
    avatarUrl: '/voices/george.jpg',
    initials: 'G',
    gender: 'Male',
    tags: ['Storytelling', 'Deep', 'Warm'],
  },
  {
    id: 'voice-aria',
    name: 'Aria',
    description: 'Expressive, Velvet, Dynamic',
    category: 'preset',
    color: '#c084fc',
    avatarUrl: '/voices/aria.jpg',
    initials: 'A',
    gender: 'Female',
    tags: ['Cinematic', 'Emotional', 'Poetic'],
  },
  {
    id: 'voice-marcus',
    name: 'Marcus',
    description: 'Confident, Crisp, Commercial',
    category: 'preset',
    color: '#f59e0b',
    avatarUrl: '/voices/marcus.jpg',
    initials: 'M',
    gender: 'Male',
    tags: ['Broadcast', 'Energetic', 'Crisp'],
  },
  {
    id: 'voice-sarah',
    name: 'Sarah',
    description: 'Calm, Intimate, Whisper',
    category: 'preset',
    color: '#ec4899',
    avatarUrl: '/voices/sarah.jpg',
    initials: 'S',
    gender: 'Female',
    tags: ['Soft', 'ASMR', 'Gentle'],
  },
]

export const PRESET_AVATARS = [
  { name: 'Jessica', url: '/voices/jessica.jpg' },
  { name: 'Roger', url: '/voices/roger.jpg' },
  { name: 'George', url: '/voices/george.jpg' },
  { name: 'Aria', url: '/voices/aria.jpg' },
  { name: 'Marcus', url: '/voices/marcus.jpg' },
  { name: 'Sarah', url: '/voices/sarah.jpg' },
]

export const CHATTERBOX_MODELS: ChatterboxModel[] = [
  {
    id: 'cb-t3-turbo',
    name: 'Chatterbox T3 Turbo (GGUF)',
    badge: 'V4 Q8',
    description: 'Ultra-low latency zero-shot neural synthesis, optimized for WSOLA motion and fast turnaround.',
    recommended: true,
  },
  {
    id: 'cb-expressive-v12',
    name: 'Chatterbox Expressive v1.2',
    badge: 'FP16',
    description: 'Highest dynamic prosody range for dramatic scripts, multi-turn character dialogues, and acting.',
    recommended: false,
  },
  {
    id: 'cb-mtl-05b',
    name: 'Chatterbox MTL 0.5B Multilingual',
    badge: 'MTL',
    description: 'Cross-lingual zero-shot voice transfer supporting 23 international languages.',
    recommended: false,
  },
]

export const QVAC_EMOTIONS: { label: QvacEmotion; description: string }[] = [
  { label: 'Neutral', description: 'Natural, balanced default vocal delivery' },
  { label: 'Happy', description: 'Upbeat, warm, and cheerful intonation' },
  { label: 'Sad', description: 'Subdued, somber, and reflective cadence' },
  { label: 'Anger', description: 'Assertive, intense, and emphatic projection' },
  { label: 'Narration', description: 'Measured, articulate storytelling pace' },
  { label: 'Conversation', description: 'Spontaneous, informal conversational flow' },
  { label: 'Surprise', description: 'Elevated pitch with expressive dynamic range' },
  { label: 'Command', description: 'Authoritative, firm directive timbre' },
]

export const QVAC_PACES: { label: QvacPace; rate: string; multiplier: number }[] = [
  { label: 'Slow', rate: '0.8x', multiplier: 0.8 },
  { label: 'Moderate', rate: '1.0x', multiplier: 1.0 },
  { label: 'Fast', rate: '1.25x', multiplier: 1.25 },
]

export const QVAC_PAUSES = [
  { tag: '[pause 0.5s]', label: '0.5s' },
  { tag: '[pause 1.0s]', label: '1.0s' },
  { tag: '[pause 2.0s]', label: '2.0s' },
]

export const INITIAL_HISTORY: HistoryEntry[] = [
  {
    id: 'hist-1',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '33 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-2',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '33 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-3',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '35 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-4',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '35 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-5',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '36 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-6',
    text: 'I trusted you with everything. Every secret, every fear...',
    voiceName: 'Jessica - Playful, Bright, Warm',
    voiceColor: '#84cc16',
    voiceAvatarUrl: '/voices/jessica.jpg',
    dateGroup: 'Today',
    timeAgo: '36 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-7',
    text: 'In the realm of Aethel, once ruled by the iron fist of Kael, the G...',
    voiceName: 'Roger',
    voiceColor: '#b45309',
    voiceAvatarUrl: '/voices/roger.jpg',
    dateGroup: 'August 27, 2025',
    timeAgo: 'last year',
    model: 'Chatterbox Expressive',
    duration: '0:14',
  },
  {
    id: 'hist-8',
    text: "Here's a story about Kratos, following the \"normal\" category: T...",
    voiceName: 'Roger',
    voiceColor: '#b45309',
    voiceAvatarUrl: '/voices/roger.jpg',
    dateGroup: 'August 27, 2025',
    timeAgo: 'last year',
    model: 'Chatterbox T3 Turbo',
    duration: '0:08',
  },
  {
    id: 'hist-9',
    text: 'The first move is what sets everything in motion.',
    voiceName: 'Roger',
    voiceColor: '#b45309',
    voiceAvatarUrl: '/voices/roger.jpg',
    dateGroup: 'August 27, 2025',
    timeAgo: 'last year',
    model: 'Chatterbox T3 Turbo',
    duration: '0:04',
  },
  {
    id: 'hist-10',
    text: 'The first move is what sets everything in motion.',
    voiceName: 'George',
    voiceColor: '#818cf8',
    voiceAvatarUrl: '/voices/george.jpg',
    dateGroup: 'August 26, 2025',
    timeAgo: 'last year',
    model: 'Chatterbox T3 Turbo',
    duration: '0:04',
  },
]
