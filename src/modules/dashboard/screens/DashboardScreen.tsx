import React from 'react'
import { useDashboardState } from '../hooks/useDashboardState'
import { Story, MusicTrack, ActivityItem } from '../types'
import { AudioStoriesCarousel } from '../components/AudioStoriesCarousel'
import { MusicGenerationCarousel } from '../components/MusicGenerationCarousel'
import { RecentActivities } from '../components/RecentActivities'
import { FloatingMiniPlayer } from '../components/FloatingMiniPlayer'

export function DashboardScreen() {
  const [state, updateState] = useDashboardState()

  const handlePlayStory = (story: Story) => {
    if (state.activeMedia?.id === story.id) {
      updateState({ isPlaying: !state.isPlaying })
    } else {
      updateState({
        activeMedia: {
          id: story.id,
          title: story.title,
          subtitle: story.narrator,
          cover: story.cover,
          duration: story.duration,
          type: 'story',
        },
        isPlaying: true,
      })
    }
  }

  const handlePlayTrack = (track: MusicTrack) => {
    if (state.activeMedia?.id === track.id) {
      updateState({ isPlaying: !state.isPlaying })
    } else {
      updateState({
        activeMedia: {
          id: track.id,
          title: track.title,
          subtitle: `${track.genre} • ${track.bpm} BPM • ${track.model}`,
          cover: track.cover,
          duration: track.duration,
          type: 'music',
        },
        isPlaying: true,
      })
    }
  }

  const handlePlayActivity = (activity: ActivityItem) => {
    if (activity.type === 'texts') return

    if (state.activeMedia?.id === activity.id) {
      updateState({ isPlaying: !state.isPlaying })
    } else {
      updateState({
        activeMedia: {
          id: activity.id,
          title: activity.title,
          subtitle: `${activity.category} › ${activity.subCategory}`,
          cover: activity.cover,
          duration: activity.duration,
          type: activity.type === 'stories' ? 'story' : 'activity',
        },
        isPlaying: true,
      })
    }
  }

  const toggleMute = () => {
    if (state.isMuted || state.volume === 0) {
      updateState({
        isMuted: false,
        volume: state.prevVolume > 0 ? state.prevVolume : 0.85,
      })
    } else {
      updateState({
        prevVolume: state.volume > 0 ? state.volume : 0.85,
        isMuted: true,
      })
    }
  }

  const handleVolumeChange = (newVol: number) => {
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
  }

  const handleDownload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    updateState({ downloadedId: id })
    setTimeout(() => updateState({ downloadedId: null }), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-full pb-32 pt-4 px-6 md:px-8 select-none">
      {/* SECTION 1: LATEST STORIES */}
      <AudioStoriesCarousel
        activeMedia={state.activeMedia}
        isPlaying={state.isPlaying}
        onPlayStory={handlePlayStory}
      />

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent my-1" />

      {/* SECTION 2: MY LATEST MUSIC */}
      <MusicGenerationCarousel
        activeMedia={state.activeMedia}
        isPlaying={state.isPlaying}
        onPlayTrack={handlePlayTrack}
      />

      {/* SECTION 3: RECENT ACTIVITIES */}
      <RecentActivities
        activeActivityTab={state.activeActivityTab}
        onSelectTab={(tabId) => updateState({ activeActivityTab: tabId })}
        activeMediaId={state.activeMedia?.id ?? null}
        isPlaying={state.isPlaying}
        downloadedId={state.downloadedId}
        onPlayActivity={handlePlayActivity}
        onDownload={handleDownload}
      />

      {/* FLOATING MINI PLAYER */}
      <FloatingMiniPlayer
        activeMedia={state.activeMedia}
        isPlaying={state.isPlaying}
        isMuted={state.isMuted}
        volume={state.volume}
        downloadedId={state.downloadedId}
        onTogglePlay={() => updateState({ isPlaying: !state.isPlaying })}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onDownload={handleDownload}
        onClose={() => updateState({ activeMedia: null })}
      />
    </div>
  )
}
