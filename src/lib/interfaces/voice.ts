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
  sampleUrl?: string
  elevenLabsVoiceId?: string
  languageCode?: string
  languageName?: string
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
