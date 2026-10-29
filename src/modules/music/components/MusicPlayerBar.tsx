import React from 'react'
import { useAtom } from 'jotai'
import {
  activeTrackAtom,
  isPlayingAtom,
  playbackCurrentTimeAtom,
  playbackDurationAtom,
} from '../store/musicStore'
import { useMusicGeneration } from '../hooks/useMusicGeneration'
import { usePlayer } from '@/hooks/usePlayer'
import { BottomPlayerBar } from '@/components/BottomPlayerBar'

export const MusicPlayerBar: React.FC = () => {
  const [activeTrack] = useAtom(activeTrackAtom)
  const [isPlaying] = useAtom(isPlayingAtom)
  const [currentTime] = useAtom(playbackCurrentTimeAtom)
  const [duration] = useAtom(playbackDurationAtom)
  const { volume, isMuted, setVolume, toggleMute } = usePlayer()

  const { playPause, seek } = useMusicGeneration()

  if (!activeTrack) return null

  const handleDownloadWav = () => {
    if (!activeTrack.audioUrl) return
    const a = document.createElement('a')
    a.href = activeTrack.audioUrl
    a.download = `${activeTrack.caption || 'generated-track'}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSkip = (seconds: number) => {
    const next = Math.max(0, Math.min(duration || 60, currentTime + seconds))
    seek(next)
  }

  return (
    <BottomPlayerBar
      title={activeTrack.caption || 'Active Audio Generation'}
      subtitle={
        activeTrack.bpm
          ? `${activeTrack.bpm} BPM${activeTrack.keyscale ? ` • ${activeTrack.keyscale}` : ''}`
          : '120 BPM'
      }
      cover={activeTrack.cover || '/covers/stardust_visitor.jpg'}
      audioUrl={activeTrack.audioUrl}
      videoUrl={activeTrack.videoUrl}
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration || 60}
      volume={volume}
      isMuted={isMuted}
      onTogglePlay={playPause}
      onSeek={seek}
      onSkip={handleSkip}
      onToggleMute={toggleMute}
      onVolumeChange={setVolume}
      onDownload={handleDownloadWav}
      isAbsolute={true}
    />
  )
}

