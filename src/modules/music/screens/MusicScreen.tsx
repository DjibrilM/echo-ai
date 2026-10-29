import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { MusicTopSubHeader, type MusicTab } from '../components/MusicTopSubHeader'
import { MusicActivitiesView } from '../components/MusicActivitiesView'
import { MusicStudioView } from '../components/MusicStudioView'
import { InstallRequiredMusicModelsView } from '../components/InstallRequiredMusicModelsView'
import { AudioEditModal } from '../components/AudioEditModal'
import { ModelStatusModal } from '../components/ModelStatusModal'
import { useMusicGeneration } from '../hooks/useMusicGeneration'
import { useMusicModels } from '../store/musicModelsStore'
import { audioEditModalOpenAtom } from '../store/musicStore'
import type { MusicGenerationOutput } from '../types'

export const MusicScreen: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<MusicTab>('activities')
  const [isModelsSkipped, setIsModelsSkipped] = useState(false)
  const [, setAudioEditModalOpen] = useAtom(audioEditModalOpenAtom)

  const {
    caption,
    setCaption,
    lyrics,
    setLyrics,
    isInstrumental,
    setIsInstrumental,
    vocalMode,
    setVocalMode,
    duration,
    setDuration,
    setEngine,
    isGenerating,
    generationProgress,
    generationError,
    dismissError,
    historyList,
    studioSessionTracks,
    setStudioSessionTracks,
    activeTrack,
    isPlaying,
    selectTrack,
    startGeneration,
    cancelActiveTask,
    deleteTrack,
  } = useMusicGeneration()

  const {
    selectedEngine,
    setSelectedEngine,
    allRequiredReady,
  } = useMusicModels()

  const handleEngineToggle = () => {
    const next = selectedEngine === 'acestep' ? 'minimax' : 'acestep'
    setSelectedEngine(next)
    setEngine(next)
    setIsModelsSkipped(false)
  }

  // Whenever the active engine changes and its required models are not yet downloaded,
  // ensure the models setup UI is presented instead of being suppressed by a stale skipped flag
  useEffect(() => {
    if (!allRequiredReady) {
      setIsModelsSkipped(false)
    }
  }, [selectedEngine, allRequiredReady])

  const showModelsView = activeTab === 'models' || (!allRequiredReady && !isModelsSkipped)

  const handleSelectTab = (tab: MusicTab) => {
    if (tab === 'models') {
      setIsModelsSkipped(false)
      setActiveTab('models')
    } else {
      if (tab === 'generations' && activeTab !== 'generations') {
        setStudioSessionTracks([])
      }
      setIsModelsSkipped(true)
      setActiveTab(tab)
    }
  }

  // Navigate to the previous screen in application history
  const handleReturnToPreviousScreen = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  // Continue to music activities or studio once models are ready
  const handleContinueAfterModels = () => {
    setIsModelsSkipped(true)
    if (activeTab === 'models') {
      setActiveTab('activities')
    }
  }

  // Skip or go back from models view without quitting the music screen
  const handleModelsBack = () => {
    setIsModelsSkipped(true)
    if (activeTab === 'models') {
      setActiveTab('activities')
    }
  }

  // Only navigate to the generation studio view after clicking generate
  const handleGenerate = () => {
    setIsModelsSkipped(true)
    startGeneration()
    setActiveTab('generations')
  }

  const handlePlayActivityTrack = (
    track: {
      id: string
      title?: string
      caption?: string
      audioUrl?: string
      bpm?: number
      keyscale?: string
      waveform?: number[]
      durationSec?: number
      durationMs?: number
    }
  ) => {
    if ('durationMs' in track && track.durationMs) {
      selectTrack(track as MusicGenerationOutput, false)
      return
    }

    const output: MusicGenerationOutput = {
      id: track.id,
      taskId: track.id,
      caption: track.title || track.caption || 'Activity Track',
      audioUrl: track.audioUrl || '',
      durationMs: (track.durationSec || 60) * 1000,
      sampleRate: 48000,
      channels: 2,
      bitsPerSample: 16,
      waveform: track.waveform || [25, 45, 60, 75, 50, 40],
      bpm: track.bpm,
      keyscale: track.keyscale,
      createdAt: new Date().toISOString(),
    }
    selectTrack(output, false)
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#0e0e11] text-foreground select-none relative">
      {/* 1. Minimalistic Top SubHeader (Pinned - Learns from TTS module, never scrolls) */}
      <MusicTopSubHeader
        activeTab={showModelsView ? 'models' : activeTab}
        onSelectTab={handleSelectTab}
        onBack={showModelsView ? handleModelsBack : handleReturnToPreviousScreen}
        engine={selectedEngine}
        onEngineToggle={handleEngineToggle}
        generationsCount={historyList.length}
        tracksCount={historyList.length}
      />

      {/* 2. Main View Screens (Scrolls at page level under the pinned subheader) */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 sidebar-scrollbar">
        {showModelsView ? (
          <InstallRequiredMusicModelsView
            onBack={handleModelsBack}
            onContinue={handleContinueAfterModels}
          />
        ) : activeTab === 'activities' ? (
          <MusicActivitiesView
            prompt={caption}
            onChangePrompt={setCaption}
            lyrics={lyrics}
            onChangeLyrics={setLyrics}
            isInstrumental={isInstrumental}
            onChangeInstrumental={setIsInstrumental}
            vocalMode={vocalMode}
            onChangeVocalMode={setVocalMode}
            duration={duration}
            onChangeDuration={setDuration}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            activeTrack={activeTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayActivityTrack}
            historyTracks={historyList}
          />
        ) : (
          <MusicStudioView
            prompt={caption}
            onChangePrompt={setCaption}
            lyrics={lyrics}
            onChangeLyrics={setLyrics}
            isInstrumental={isInstrumental}
            onChangeInstrumental={setIsInstrumental}
            vocalMode={vocalMode}
            onChangeVocalMode={setVocalMode}
            duration={duration}
            onChangeDuration={setDuration}
            engine={selectedEngine}
            onChangeEngine={(eng) => {
              setSelectedEngine(eng)
              setEngine(eng)
              setIsModelsSkipped(false)
            }}
            onGenerate={startGeneration}
            onCancelGeneration={cancelActiveTask}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            generationError={generationError}
            onDismissError={dismissError}
            history={studioSessionTracks}
            activeTrack={activeTrack}
            isPlaying={isPlaying}
            onPlayTrack={(t) => selectTrack(t, false)}
            onDeleteTrack={deleteTrack}
            onOpenEditModal={() => setAudioEditModalOpen(true)}
          />
        )}
      </div>

      {/* 3. Sub-tool Modals */}
      <AudioEditModal />
      <ModelStatusModal />
    </div>
  )
}
