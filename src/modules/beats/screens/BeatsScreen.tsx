import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeatsTopSubHeader, type BeatsTab } from '../components/BeatsTopSubHeader'
import { BeatsActivitiesView } from '../components/BeatsActivitiesView'
import { BeatsStudioView } from '../components/BeatsStudioView'
import { InstallRequiredBeatsModelsView } from '../components/InstallRequiredBeatsModelsView'
import { useBeatsGeneration } from '../hooks/useBeatsGeneration'
import { useBeatsModels } from '../store/beatsModelsStore'
import type { BeatGenerationOutput } from '../types'

export const BeatsScreen: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<BeatsTab>('activities')

  const {
    caption,
    setCaption,
    duration,
    setDuration,
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
  } = useBeatsGeneration()

  const { allRequiredReady } = useBeatsModels()

  // Navigate to previous screen in application history
  const handleReturnToPreviousScreen = () => {
    navigate(-1)
  }

  // STRICT REQUIREMENT: User must NEVER see the creation interfaces before having all models in place
  if (!allRequiredReady) {
    return (
      <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#0e0e11] text-foreground select-none relative">
        <BeatsTopSubHeader
          activeTab="models"
          onSelectTab={() => {}}
          onBack={handleReturnToPreviousScreen}
          engine="acestep"
          generationsCount={0}
          tracksCount={0}
        />
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 sidebar-scrollbar">
          <InstallRequiredBeatsModelsView
            onBack={handleReturnToPreviousScreen}
            onContinue={() => setActiveTab('activities')}
          />
        </div>
      </div>
    )
  }

  const showModelsView = activeTab === 'models'

  const handleSelectTab = (tab: BeatsTab) => {
    if (tab === 'generations' && activeTab !== 'generations') {
      setStudioSessionTracks([])
    }
    setActiveTab(tab)
  }

  const handleGenerate = () => {
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
      selectTrack(track as BeatGenerationOutput, false)
      return
    }

    const output: BeatGenerationOutput = {
      id: track.id,
      taskId: track.id,
      caption: track.title || track.caption || 'Beat Track',
      audioUrl: track.audioUrl || '',
      durationMs: (track.durationSec || 30) * 1000,
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
      {/* 1. Minimalistic Top SubHeader */}
      <BeatsTopSubHeader
        activeTab={showModelsView ? 'models' : activeTab}
        onSelectTab={handleSelectTab}
        onBack={handleReturnToPreviousScreen}
        engine="acestep"
        generationsCount={historyList.length}
        tracksCount={historyList.length}
      />

      {/* 2. Main View Screens */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 sidebar-scrollbar">
        {showModelsView ? (
          <InstallRequiredBeatsModelsView
            onBack={handleReturnToPreviousScreen}
            onContinue={() => setActiveTab('activities')}
          />
        ) : activeTab === 'activities' ? (
          <BeatsActivitiesView
            prompt={caption}
            onChangePrompt={setCaption}
            duration={duration}
            onChangeDuration={setDuration}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            activeTrack={activeTrack}
            onPlayTrack={handlePlayActivityTrack}
            historyTracks={historyList}
          />
        ) : (
          <BeatsStudioView
            prompt={caption}
            onChangePrompt={setCaption}
            duration={duration}
            onChangeDuration={setDuration}
            onGenerate={startGeneration}
            onCancelGeneration={cancelActiveTask}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            generationError={generationError}
            onDismissError={dismissError}
            history={studioSessionTracks.length > 0 ? studioSessionTracks : historyList}
            activeTrack={activeTrack}
            isPlaying={isPlaying}
            onPlayTrack={(t) => selectTrack(t, false)}
            onDeleteTrack={deleteTrack}
          />
        )}
      </div>
    </div>
  )
}
