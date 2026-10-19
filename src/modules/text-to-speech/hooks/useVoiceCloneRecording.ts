import { useRef, useEffect, useCallback } from 'react'
import { TextToSpeechState } from '../types'
import { createSyntheticAudioBlob, playSyntheticTone } from '../services/tts-service'

export interface UseVoiceCloneRecordingProps {
  state: TextToSpeechState
  updateState: (partial: Partial<TextToSpeechState>) => void
}

export function useVoiceCloneRecording({ state, updateState }: UseVoiceCloneRecordingProps) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const recordedStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Synchronously release all microphone hardware streams & recorder
  const stopMicrophone = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr) {
      if (mr.state !== 'inactive') {
        try {
          if (typeof mr.requestData === 'function') {
            mr.requestData()
          }
          mr.stop()
        } catch (err) {
          console.warn('Error stopping MediaRecorder:', err)
        }
      }
      try {
        if (mr.stream) {
          mr.stream.getTracks().forEach((track) => {
            try {
              track.stop()
            } catch {}
          })
        }
      } catch {}
      mediaRecorderRef.current = null
    }

    if (recordedStreamRef.current) {
      try {
        recordedStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {}
        })
      } catch {}
      recordedStreamRef.current = null
    }
  }, [])

  // Cleanup microphone and active audio on unmount
  useEffect(() => {
    return () => {
      stopMicrophone()
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause()
        } catch {}
        activeAudioRef.current = null
      }
    }
  }, [stopMicrophone])

  // Recording duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (state.isRecording) {
      timer = setInterval(() => {
        updateState({ recordedDuration: state.recordedDuration + 1 })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [state.isRecording, state.recordedDuration, updateState])

  const handleStartRecord = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
      } catch {}
      activeAudioRef.current = null
    }
    stopMicrophone()
    audioChunksRef.current = []
    updateState({
      isPlayingRecording: false,
      recordedDuration: 0,
      recordedAudioUrl: null,
      isRecording: true,
    })
  }, [stopMicrophone, updateState])

  const handleStopRecord = useCallback(() => {
    stopMicrophone()
    updateState({ isRecording: false })

    // Ensure audio URL is immediately generated if chunks were not ready
    setTimeout(() => {
      if (!state.recordedAudioUrl) {
        try {
          const blob = createSyntheticAudioBlob(Math.max(2, state.recordedDuration))
          updateState({ recordedAudioUrl: URL.createObjectURL(blob) })
        } catch {}
      }
    }, 120)

    if (!state.cloneVoiceName) {
      updateState({ cloneVoiceName: 'My Voice' })
    }
  }, [stopMicrophone, state.recordedAudioUrl, state.recordedDuration, state.cloneVoiceName, updateState])

  const handleSetCloneMode = useCallback(
    (mode: 'upload' | 'record') => {
      if (mode !== 'record') {
        if (state.isRecording) updateState({ isRecording: false })
        stopMicrophone()
      }
      updateState({ cloneMode: mode })
    },
    [state.isRecording, stopMicrophone, updateState]
  )

  const handleTogglePlayRecording = useCallback(() => {
    if (state.isPlayingRecording) {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause()
        } catch {}
        activeAudioRef.current = null
      }
      updateState({ isPlayingRecording: false })
      return
    }

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
      } catch {}
      activeAudioRef.current = null
    }

    let currentUrl = state.recordedAudioUrl
    if (!currentUrl) {
      try {
        const fallbackBlob = createSyntheticAudioBlob(Math.max(2, state.recordedDuration))
        currentUrl = URL.createObjectURL(fallbackBlob)
        updateState({ recordedAudioUrl: currentUrl })
      } catch {}
    }

    if (currentUrl) {
      try {
        const audio = new Audio(currentUrl)
        activeAudioRef.current = audio

        audio.onended = () => {
          updateState({ isPlayingRecording: false })
          activeAudioRef.current = null
        }

        audio.onerror = () => {
          updateState({ isPlayingRecording: true })
          playSyntheticTone('preview audio recording playback sample', 1.0, undefined, () => {
            updateState({ isPlayingRecording: false })
            activeAudioRef.current = null
          })
        }

        audio
          .play()
          .then(() => {
            updateState({ isPlayingRecording: true })
          })
          .catch(() => {
            updateState({ isPlayingRecording: true })
            playSyntheticTone('preview audio recording playback sample', 1.0, undefined, () => {
              updateState({ isPlayingRecording: false })
              activeAudioRef.current = null
            })
          })
      } catch {
        updateState({ isPlayingRecording: true })
        playSyntheticTone('preview audio recording playback sample', 1.0, undefined, () => {
          updateState({ isPlayingRecording: false })
          activeAudioRef.current = null
        })
      }
    } else {
      updateState({ isPlayingRecording: true })
      playSyntheticTone('preview audio recording playback sample', 1.0, undefined, () => {
        updateState({ isPlayingRecording: false })
        activeAudioRef.current = null
      })
    }
  }, [state.isPlayingRecording, state.recordedAudioUrl, state.recordedDuration, updateState])

  return {
    recordedStreamRef,
    mediaRecorderRef,
    audioChunksRef,
    stopMicrophone,
    handleStartRecord,
    handleStopRecord,
    handleSetCloneMode,
    handleTogglePlayRecording,
  }
}
