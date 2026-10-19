import { useReducer } from 'react'
import { TextToSpeechState, ALL_VOICES, INITIAL_HISTORY } from '../types'

export const initialTextToSpeechState: TextToSpeechState = {
  // Voice & Language selection
  language: 'English (US)',
  searchLangQuery: '',
  isLanguageSelectorOpen: false,
  selectedVoiceId: 'voice-sterling',
  voices: ALL_VOICES,

  // Multi-speaker dialogue rounds
  rounds: [
    {
      id: 'round-1',
      voiceId: 'voice-sterling',
      text: 'I trusted you with everything. Every secret, every fear. And you used it against me.',
      speed: 1.0,
      emotion: 'Neutral',
      pace: 'Moderate',
    },
  ],
  focusedRoundIndex: 0,
  shufflingRoundId: null,

  // Generation & Active Playback (only populated after generating speech)
  generations: [],
  activeGeneration: null,
  isSynthesizing: false,
  synthesisProgress: '',
  isPlaying: false,
  playbackProgress: 0,
  currentTime: 0,
  seekTarget: null,
  isMuted: false,
  volume: 0.85,
  prevVolume: 0.85,

  // Bring Your Own Voice modal
  isCloneModalOpen: false,
  cloneVoiceName: '',
  cloneVoiceGender: 'Female',
  cloneVoiceTags: [],
  cloneCustomTag: '',
  cloneFile: null,
  isRecording: false,
  recordedDuration: 0,
  cloneMode: 'upload',
  recordedAudioUrl: null,
  isPlayingRecording: false,

  // Model parameters (Right drawer)
  stability: 0.5,
  similarity: 0.75,
  styleExaggeration: 0.0,
  speed: 1.0,
  cfgScale: 2.0,
  lavaSrEnabled: true,

  // Right Drawer Tab & History
  rightPanelTab: 'settings',
  history: INITIAL_HISTORY,
  historySearch: '',
  playingHistoryId: null,
}

export function useTextToSpeechState() {
  const [state, updateState] = useReducer(
    (prev: TextToSpeechState, next: Partial<TextToSpeechState>) => ({ ...prev, ...next }),
    {
      ...initialTextToSpeechState,
      activeGeneration: initialTextToSpeechState.generations[0] || null,
    }
  )

  return [state, updateState] as const
}
