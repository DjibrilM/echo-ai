import { QvacEmotion, QvacPace } from '../interfaces/voice'

export const QVAC_MAX_CHARS_PER_ROUND = 4096

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
