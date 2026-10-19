import { useRef, useEffect, useCallback } from 'react'
import { Generation, TextToSpeechState } from '../types'

export interface UseSpeechPlaybackProps {
  state: TextToSpeechState
  updateState: (partial: Partial<TextToSpeechState>) => void
}

export function useSpeechPlayback({ state, updateState }: UseSpeechPlaybackProps) {
  const stopAudioRef = useRef<(() => void) | null>(null)

  const stopActiveAudio = useCallback(() => {
    if (stopAudioRef.current) {
      try {
        stopAudioRef.current()
      } catch {}
      stopAudioRef.current = null
    }
  }, [])

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopActiveAudio()
    }
  }, [stopActiveAudio])

  const handlePlayGeneration = useCallback(
    (gen: Generation) => {
      stopActiveAudio()
      updateState({
        activeGeneration: gen,
        isPlaying: true,
        currentTime: 0,
        playbackProgress: 0,
        seekTarget: 0,
      })
    },
    [stopActiveAudio, updateState]
  )

  const togglePlayPause = useCallback(() => {
    if (!state.activeGeneration && state.generations.length > 0) {
      handlePlayGeneration(state.generations[0])
      return
    }
    if (!state.activeGeneration) return

    updateState({ isPlaying: !state.isPlaying })
  }, [state.activeGeneration, state.generations, state.isPlaying, handlePlayGeneration, updateState])

  const handleSeek = useCallback(
    (newProgress: number) => {
      updateState({ playbackProgress: newProgress })
      if (state.activeGeneration) {
        const dur = state.activeGeneration.duration || 8
        const targetTime = Math.max(0, Math.min(dur, newProgress * dur))
        updateState({
          currentTime: Math.round(targetTime),
          seekTarget: targetTime,
        })
      }
    },
    [state.activeGeneration, updateState]
  )

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!state.activeGeneration) return
      const dur = state.activeGeneration.duration || 8
      const newTime = Math.max(0, Math.min(dur, state.currentTime + seconds))
      updateState({
        currentTime: Math.round(newTime),
        playbackProgress: dur > 0 ? newTime / dur : 0,
        seekTarget: newTime,
      })
    },
    [state.activeGeneration, state.currentTime, updateState]
  )

  const toggleMute = useCallback(() => {
    if (state.isMuted || state.volume === 0) {
      const restored = state.prevVolume > 0 ? state.prevVolume : 0.85
      updateState({ isMuted: false, volume: restored })
    } else {
      updateState({
        prevVolume: state.volume > 0 ? state.volume : 0.85,
        isMuted: true,
      })
    }
  }, [state.isMuted, state.volume, state.prevVolume, updateState])

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, newVol))
      if (clamped === 0) {
        updateState({ isMuted: true, volume: 0 })
      } else {
        updateState({
          isMuted: false,
          volume: clamped,
          prevVolume: clamped,
        })
      }
    },
    [updateState]
  )

  return {
    stopAudioRef,
    stopActiveAudio,
    handlePlayGeneration,
    togglePlayPause,
    handleSeek,
    handleSkip,
    toggleMute,
    handleVolumeChange,
  }
}
