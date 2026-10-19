import { useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup, Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { WavesurferAudioPlayer } from '@/components/wavesurfer-audio-player'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import { cn } from '@/lib/utils'

import { Voice, SpeechRound, Generation, HistoryEntry, LANGUAGES } from '../types'
import {
  autoTagSpeechRounds,
  synthesizeRoundSpeech,
  synthesizeAndMergeDialogueRounds,
  formatTime,
  playSyntheticTone,
} from '../services/tts-service'
import { useTextToSpeechState } from '../hooks/useTextToSpeechState'
import { useSpeechPlayback } from '../hooks/useSpeechPlayback'
import { useVoiceCloneRecording } from '../hooks/useVoiceCloneRecording'

import { TopSubHeader } from '../components/TopSubHeader'
import { DialogueRoundCard } from '../components/DialogueRoundCard'
import { SpeechEditorActionBar } from '../components/SpeechEditorActionBar'
import { SpeechPlayerBar } from '../components/SpeechPlayerBar'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { HistoryDrawer } from '../components/HistoryDrawer'
import { VoiceCloneModal } from '../components/VoiceCloneModal'

export function TextToSpeechScreen() {
  const [state, updateState] = useTextToSpeechState()
  const playback = useSpeechPlayback({ state, updateState })
  const recording = useVoiceCloneRecording({ state, updateState })

  // Total character counter
  const totalCharacters = useMemo(() => {
    return state.rounds.reduce((sum, r) => sum + r.text.length, 0)
  }, [state.rounds])

  // Get voice helper
  const getVoice = useCallback(
    (id: string): Voice => {
      return (
        state.voices.find((v) => v.id === id) || {
          id: 'voice-custom',
          name: 'Speaker',
          description: 'Custom Voice',
          category: 'preset',
          color: '#a855f7',
          avatarUrl: '/voices/jessica.jpg',
          initials: 'S',
          gender: 'Neutral',
          tags: [],
        }
      )
    },
    [state.voices]
  )

  const activeVoice = useMemo(
    () => getVoice(state.selectedVoiceId),
    [state.selectedVoiceId, getVoice]
  )

  const activeLanguage = useMemo(
    () => LANGUAGES.find((l) => l.name === state.language) || LANGUAGES[0],
    [state.language]
  )

  // Add a new speaker dialogue round
  const handleAddSpeakerRound = () => {
    const currentVoiceIndex = state.voices.findIndex(
      (v) => v.id === state.rounds[state.rounds.length - 1]?.voiceId
    )
    const nextVoice = state.voices[(currentVoiceIndex + 1) % state.voices.length] || state.voices[0]

    const newRound: SpeechRound = {
      id: `round-${Date.now()}`,
      voiceId: nextVoice.id,
      text: '',
      speed: 1.0,
      emotion: 'Neutral',
      pace: 'Moderate',
    }

    updateState({
      rounds: [...state.rounds, newRound],
      focusedRoundIndex: state.rounds.length,
    })
  }

  // Remove a speech round
  const handleRemoveRound = (roundId: string) => {
    if (state.rounds.length <= 1) return
    updateState({
      rounds: state.rounds.filter((r) => r.id !== roundId),
      focusedRoundIndex: 0,
    })
  }

  // Insert pause tag
  const handleInsertPauseTag = (tag: string, roundIdx: number) => {
    updateState({
      rounds: state.rounds.map((r, i) => {
        if (i !== roundIdx) return r
        const trimmed = r.text.trimEnd()
        const newText = trimmed ? `${trimmed} ${tag} ` : `${tag} `
        return { ...r, text: newText }
      }),
    })
  }

  // Auto-tag function
  const handleAutoTag = () => {
    updateState({ rounds: autoTagSpeechRounds(state.rounds) })
  }

  // Generate speech handler
  const handleGenerateSpeech = async () => {
    if (state.isSynthesizing || totalCharacters === 0) return

    // Immediately clear previous recordings & wave player so multiple players never stack
    playback.stopActiveAudio()
    updateState({
      generations: [],
      activeGeneration: null,
      isPlaying: false,
      currentTime: 0,
      playbackProgress: 0,
      seekTarget: null,
      isSynthesizing: true,
      synthesisProgress: 'connecting to voice engine...',
    })

    await new Promise((r) => setTimeout(r, 400))
    updateState({ synthesisProgress: 'loading speaker acoustic latents...' })

    await new Promise((r) => setTimeout(r, 600))
    updateState({
      synthesisProgress: `autoregressive token generation (temperature ${state.stability.toFixed(2)}, cfg ${state.cfgScale.toFixed(1)})...`,
    })

    await new Promise((r) => setTimeout(r, 800))
    if (state.lavaSrEnabled) {
      updateState({ synthesisProgress: 'applying 48khz audio clarity...' })
      await new Promise((r) => setTimeout(r, 600))
    }

    // Filter active speech rounds that have text to synthesize
    const activeRounds = state.rounds.filter((r) => r.text.trim().length > 0)
    let newGen: Generation

    // If multi-speaker dialogue turns exist, synthesize each turn and merge into a single master audio
    if (activeRounds.length > 1) {
      updateState({ synthesisProgress: `synthesizing & stitching ${activeRounds.length} dialogue turns...` })
      newGen = await synthesizeAndMergeDialogueRounds(
        activeRounds,
        state.voices,
        state.history.length,
        state.speed,
        (phase) => updateState({ synthesisProgress: phase.toLowerCase() })
      )
    } else {
      const singleRound = activeRounds[0] || state.rounds[0]
      const speaker = getVoice(singleRound.voiceId)
      newGen = await synthesizeRoundSpeech(
        singleRound,
        speaker,
        state.focusedRoundIndex,
        state.history.length,
        state.speed
      )
    }

    const firstSpeaker = getVoice(activeRounds[0]?.voiceId || state.rounds[0].voiceId)
    const newHist: HistoryEntry = {
      id: `hist-${Date.now()}`,
      text: newGen.textSnippet,
      voiceName:
        activeRounds.length > 1
          ? `${activeRounds.length} Speakers`
          : `${firstSpeaker.name} - ${firstSpeaker.description}`,
      voiceColor: activeRounds.length > 1 ? '#10b981' : firstSpeaker.color,
      voiceAvatarUrl: firstSpeaker.avatarUrl || '/voices/jessica.jpg',
      dateGroup: 'Today',
      timeAgo: 'Just now',
      model: 'Chatterbox T3 Turbo',
      duration: formatTime(newGen.duration),
      roundsData: [...state.rounds],
    }

    // Replace with ONLY the latest recording (single wave player, in sync with main player)
    updateState({
      generations: [newGen],
      activeGeneration: newGen,
      history: [newHist, ...state.history],
      isSynthesizing: false,
      synthesisProgress: '',
    })
  }

  return (
    <div className="flex h-full w-full select-none overflow-hidden bg-[#0f0f10] text-[#f4f4f5]">
      {/* ======================================================== */}
      {/* MAIN STAGE (Center/Left Editor Area & Bottom Bar)       */}
      {/* ======================================================== */}
      <div className="relative flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-[#0f0f10]">
        <TopSubHeader totalRounds={state.rounds.length} />

        {/* Scrollable Dialogue / Speech Rounds Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 pb-60 sidebar-scrollbar">
          <div className="w-full flex flex-col gap-6">
            <Reorder.Group
              axis="y"
              values={state.rounds}
              onReorder={(newRounds) => updateState({ rounds: newRounds })}
              className="w-full flex flex-col gap-6"
              as="div"
            >
              {state.rounds.map((round, index) => {
                const speaker = getVoice(round.voiceId)
                const isFocused = state.focusedRoundIndex === index
                const isShuffling = state.shufflingRoundId === round.id

                return (
                  <DialogueRoundCard
                    key={round.id}
                    round={round}
                    index={index}
                    totalRounds={state.rounds.length}
                    speaker={speaker}
                    voices={state.voices}
                    isFocused={isFocused}
                    isShuffling={isShuffling}
                    onFocus={() => updateState({ focusedRoundIndex: index })}
                    onUpdateRound={(updated) => {
                      updateState({
                        rounds: state.rounds.map((r, i) =>
                          i === index ? { ...r, ...updated } : r
                        ),
                      })
                      if (updated.voiceId) {
                        updateState({ selectedVoiceId: updated.voiceId })
                      }
                    }}
                    onRemoveRound={() => handleRemoveRound(round.id)}
                    onOpenCloneModal={() => updateState({ isCloneModalOpen: true })}
                    onInsertPauseTag={(tag) => handleInsertPauseTag(tag, index)}
                  />
                )
              })}
            </Reorder.Group>

            {/* Add Speaker Round button */}
            <div className="flex justify-start mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSpeakerRound}
                className="border-dashed border-[#2b2b30] hover:border-zinc-500 bg-[#141416]/40 hover:bg-white/[0.04] text-zinc-400 hover:text-white cursor-pointer shadow-xs gap-2 text-xs font-medium"
              >
                <Plus className="size-3.5 text-zinc-400" />
                <span>Add Speaker Round</span>
              </Button>
            </div>

            {/* Latest Generation Wave Player (only single latest recording, in sync with main player) */}
            {state.generations.length > 0 && state.generations[0] && (
              <div className="mt-4 flex flex-col items-start gap-3 w-fit max-w-full">
                <WavesurferAudioPlayer
                  key={state.generations[0].id}
                  url={state.generations[0].audioUrl}
                  waveform={state.generations[0].waveform}
                  defaultDuration={state.generations[0].duration}
                  isCur={true}
                  isPlaying={state.isPlaying}
                  currentTime={state.currentTime}
                  volume={state.isMuted ? 0 : state.volume}
                  isMuted={state.isMuted}
                  seekTarget={state.seekTarget}
                  onTogglePlay={playback.togglePlayPause}
                  onPlayStateChange={(playing) => updateState({ isPlaying: playing })}
                  onTimeUpdate={(time, _dur, ratio) => {
                    updateState({
                      currentTime: time,
                      playbackProgress: ratio,
                    })
                  }}
                  onDownload={() => {
                    if (state.generations[0].audioUrl) {
                      const a = document.createElement('a')
                      a.href = state.generations[0].audioUrl
                      a.download = `${state.generations[0].title.replace(/\s+/g, '_')}-${state.generations[0].speakerName}.wav`
                      a.click()
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM EDITOR ACTION BAR */}
        <SpeechEditorActionBar
          totalCharacters={totalCharacters}
          totalRounds={state.rounds.length}
          isSynthesizing={state.isSynthesizing}
          onAutoTag={handleAutoTag}
          onGenerate={handleGenerateSpeech}
        />

        {/* Synthesizing toast notification with ShimmeringText */}
        <AnimatePresence>
          {state.isSynthesizing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-xl border border-[#27272a] bg-[#18181b]/95 px-4 py-2.5 text-xs font-medium text-white shadow-2xl backdrop-blur-md"
            >
              <div className="size-2 rounded-full bg-white animate-ping shrink-0" />
              <ShimmeringText
                key={state.synthesisProgress}
                text={state.synthesisProgress || 'Generating audio...'}
                startOnView={false}
                duration={1.8}
                color="#71717a"
                shimmerColor="#ffffff"
                className="font-medium text-xs tracking-wide"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PERSISTENT BOTTOM AUDIO PLAYER */}
        <SpeechPlayerBar
          activeGeneration={state.activeGeneration}
          isPlaying={state.isPlaying}
          currentTime={state.currentTime}
          playbackProgress={state.playbackProgress}
          isMuted={state.isMuted}
          volume={state.volume}
          onTogglePlay={playback.togglePlayPause}
          onSeek={playback.handleSeek}
          onSkip={playback.handleSkip}
          onToggleMute={playback.toggleMute}
          onVolumeChange={playback.handleVolumeChange}
          onDownload={() => {
            if (state.activeGeneration?.audioUrl) {
              const a = document.createElement('a')
              a.href = state.activeGeneration.audioUrl
              a.download = `${state.activeGeneration.title.replace(/\s+/g, '_')}-${state.activeGeneration.speakerName}.wav`
              a.click()
            }
          }}
        />
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDE DRAWER: MODEL CONFIGURATIONS & HISTORY       */}
      {/* ======================================================== */}
      <div className="flex flex-col w-[420px] shrink-0 border-l border-[#1f1f23] bg-[#111113] h-full overflow-hidden">
        {/* Dual Tab Header: [Settings] [History] */}
        <LayoutGroup id="rightPanelTabs">
          <div className="flex h-10 shrink-0 items-center gap-1 px-3.5 select-none border-b border-[#1f1f23]">
            <button
              type="button"
              onClick={() => updateState({ rightPanelTab: 'settings' })}
              className={cn(
                'relative px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-md select-none',
                state.rightPanelTab === 'settings'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {state.rightPanelTab === 'settings' && (
                <motion.div
                  layoutId="activeRightTabPill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 bg-white/[0.10] rounded-md"
                />
              )}
              <span className="relative z-10">Settings</span>
            </button>

            <button
              type="button"
              onClick={() => updateState({ rightPanelTab: 'history' })}
              className={cn(
                'relative px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer rounded-md select-none',
                state.rightPanelTab === 'history'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {state.rightPanelTab === 'history' && (
                <motion.div
                  layoutId="activeRightTabPill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 bg-white/[0.10] rounded-md"
                />
              )}
              <span className="relative z-10">History</span>
            </button>
          </div>
        </LayoutGroup>

        {/* Panel Content with Horizontal Translation */}
        <div className="flex-1 overflow-hidden relative w-full h-full">
          <motion.div
            className="flex w-full h-full items-start"
            animate={{ x: `-${state.rightPanelTab === 'settings' ? 0 : 100}%` }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
          >
            <SettingsDrawer
              activeVoice={activeVoice}
              voices={state.voices}
              selectedVoiceId={state.selectedVoiceId}
              stability={state.stability}
              similarity={state.similarity}
              cfgScale={state.cfgScale}
              lavaSrEnabled={state.lavaSrEnabled}
              activeLanguage={activeLanguage}
              onSelectVoice={(id) => updateState({ selectedVoiceId: id })}
              onOpenCloneModal={() => updateState({ isCloneModalOpen: true })}
              onStabilityChange={(val) => updateState({ stability: val })}
              onSimilarityChange={(val) => updateState({ similarity: val })}
              onCfgScaleChange={(val) => updateState({ cfgScale: val })}
              onToggleLavaSr={() => updateState({ lavaSrEnabled: !state.lavaSrEnabled })}
              onSelectLanguage={(lang) => updateState({ language: lang })}
            />

            <HistoryDrawer
              history={state.history}
              historySearch={state.historySearch}
              playingHistoryId={state.playingHistoryId}
              onSearchChange={(q) => updateState({ historySearch: q })}
              onClearSearch={() => updateState({ historySearch: '' })}
              onSelectHistoryItem={(text) => {
                updateState({
                  rounds: state.rounds.map((r, i) =>
                    i === state.focusedRoundIndex ? { ...r, text } : r
                  ),
                })
              }}
              onTogglePlayHistory={(item) => {
                if (state.playingHistoryId === item.id) {
                  playback.stopActiveAudio()
                  updateState({ playingHistoryId: null, isPlaying: false })
                } else {
                  playback.stopActiveAudio()
                  updateState({ playingHistoryId: item.id, isPlaying: true })
                  const stop = playSyntheticTone(
                    item.text,
                    state.speed,
                    undefined,
                    () => {
                      updateState({ playingHistoryId: null, isPlaying: false })
                    },
                    state.volume
                  )
                  playback.stopAudioRef.current = stop
                }
              }}
              onDeleteHistoryItem={(id) => {
                updateState({
                  history: state.history.filter((h) => h.id !== id),
                })
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* BRING YOUR OWN VOICE MODAL */}
      <VoiceCloneModal
        isOpen={state.isCloneModalOpen}
        cloneMode={state.cloneMode}
        isRecording={state.isRecording}
        recordedDuration={state.recordedDuration}
        isPlayingRecording={state.isPlayingRecording}
        cloneVoiceName={state.cloneVoiceName}
        onClose={() => {
          recording.stopMicrophone()
          updateState({ isCloneModalOpen: false })
        }}
        onSetCloneMode={recording.handleSetCloneMode}
        onStartRecord={recording.handleStartRecord}
        onStopRecord={recording.handleStopRecord}
        onTogglePlayRecording={recording.handleTogglePlayRecording}
        onStreamReady={(stream) => {
          try {
            recording.recordedStreamRef.current = stream
            recording.audioChunksRef.current = []
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : ''
            const mr = mimeType
              ? new MediaRecorder(stream, { mimeType })
              : new MediaRecorder(stream)
            mr.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                recording.audioChunksRef.current.push(e.data)
              }
            }
            mr.onstop = () => {
              if (recording.audioChunksRef.current.length > 0) {
                const blob = new Blob(recording.audioChunksRef.current, {
                  type: mr.mimeType || 'audio/webm',
                })
                updateState({ recordedAudioUrl: URL.createObjectURL(blob) })
              }
            }
            mr.start(100)
            recording.mediaRecorderRef.current = mr
          } catch (err) {
            console.warn('MediaRecorder error:', err)
          }
        }}
        onStreamEnd={recording.stopMicrophone}
        onSaveVoice={(newVoice) => {
          updateState({
            voices: [newVoice, ...state.voices],
            selectedVoiceId: newVoice.id,
          })
        }}
      />
    </div>
  )
}
