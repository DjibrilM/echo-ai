import React, { useMemo } from 'react'
import { useDashboardState } from '../hooks/useDashboardState'
import { Story, MusicTrack, ActivityItem } from '../types'
import { AudioStoriesCarousel } from '../components/AudioStoriesCarousel'
import { MusicGenerationCarousel } from '../components/MusicGenerationCarousel'
import { RecentActivities } from '../components/RecentActivities'
import { STORIES, MUSIC_TRACKS } from '../services/dashboard-service'
import { usePlayer } from '@/hooks/usePlayer'

export function DashboardScreen() {
  const [state, updateState] = useDashboardState()
  const player = usePlayer()

  const activeMedia = useMemo(() => {
    if (!player.currentTrack) return null
    return {
      id: player.currentTrack.id,
      title: player.currentTrack.title,
      subtitle: player.currentTrack.artist || '',
      cover: player.currentTrack.cover || player.currentTrack.coverUrl || '',
      duration: `${player.currentTrack.duration || 60}s`,
      type: 'music' as const,
    }
  }, [player.currentTrack])

  const handlePlayStory = (story: Story) => {
    if (player.currentTrack?.id === story.id) {
      player.togglePlay()
    } else {
      const playlist = STORIES.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.narrator,
        cover: s.cover,
        coverUrl: s.cover,
        audioUrl: '',
        duration: 90,
      }))
      const idx = playlist.findIndex((s) => s.id === story.id)
      player.playList(playlist, Math.max(0, idx), 'Audio Stories')
    }
  }

  const handlePlayTrack = (track: MusicTrack) => {
    if (player.currentTrack?.id === track.id) {
      player.togglePlay()
    } else {
      const playlist = MUSIC_TRACKS.map((t) => ({
        id: t.id,
        title: t.title,
        artist: `${t.genre} • ${t.bpm} BPM • ${t.model}`,
        cover: t.cover,
        coverUrl: t.cover,
        audioUrl: '',
        duration: 120,
      }))
      const idx = playlist.findIndex((t) => t.id === track.id)
      player.playList(playlist, Math.max(0, idx), 'Latest Music')
    }
  }

  const handlePlayActivity = (activity: ActivityItem) => {
    if (activity.type === 'texts') return
    if (player.currentTrack?.id === activity.id) {
      player.togglePlay()
    } else {
      player.play({
        id: activity.id,
        title: activity.title,
        artist: `${activity.category} › ${activity.subCategory}`,
        cover: activity.cover,
        coverUrl: activity.cover,
        waveform: activity.waveform,
        audioUrl: activity.audioUrl || '',
        duration: 60,
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
        activeMedia={activeMedia}
        isPlaying={player.isPlaying}
        onPlayStory={handlePlayStory}
      />

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent my-1" />

      {/* SECTION 2: MY LATEST MUSIC */}
      <MusicGenerationCarousel
        activeMedia={activeMedia}
        isPlaying={player.isPlaying}
        onPlayTrack={handlePlayTrack}
      />

      {/* SECTION 3: RECENT ACTIVITIES */}
      <RecentActivities
        activeActivityTab={state.activeActivityTab}
        onSelectTab={(tabId) => updateState({ activeActivityTab: tabId })}
        activeMediaId={player.currentTrack?.id ?? null}
        isPlaying={player.isPlaying}
        downloadedId={state.downloadedId}
        onPlayActivity={handlePlayActivity}
        onDownload={handleDownload}
      />
    </div>
  )
}
