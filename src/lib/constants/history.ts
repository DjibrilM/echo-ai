import { HistoryEntry } from '../interfaces/voice'

export const INITIAL_HISTORY: HistoryEntry[] = [
  {
    id: 'hist-1',
    text: 'Welcome to Echo AI. Configure speakers and compose multi-speaker dialogues.',
    voiceName: 'Sienna Ray - Playful, Bright, Warm',
    voiceColor: '#10b981',
    voiceAvatarUrl: '/voices/serena.jpg',
    dateGroup: 'Today',
    timeAgo: '33 minutes ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:10',
  },
  {
    id: 'hist-2',
    text: 'When we designed this neural speech engine, we obsessed over every breath...',
    voiceName: 'Sterling Rhodes - Laid-Back, Classy',
    voiceColor: '#38bdf8',
    voiceAvatarUrl: '/voices/sterling.jpg',
    dateGroup: 'Today',
    timeAgo: '1 hour ago',
    model: 'Chatterbox T3 Turbo',
    duration: '0:08',
  },
  {
    id: 'hist-3',
    text: 'In the realm of Aethel, once ruled by the iron fist of Kael...',
    voiceName: 'Alistair Finch',
    voiceColor: '#d97706',
    voiceAvatarUrl: '/voices/alistair.jpg',
    dateGroup: 'August 27, 2025',
    timeAgo: 'last year',
    model: 'Chatterbox Expressive',
    duration: '0:14',
  },
]
