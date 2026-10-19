import { useState, useRef, useMemo, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export interface WavesurferAudioPlayerProps {
  url?: string
  waveform?: number[]
  defaultDuration?: number
  isCur?: boolean
  isPlaying?: boolean
  currentTime?: number
  volume?: number
  isMuted?: boolean
  seekTarget?: number | null
  waveColor?: string
  progressColor?: string
  onDownload?: () => void
  onTogglePlay?: () => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void
  onReady?: (duration: number) => void
}

export function WavesurferAudioPlayer({
  url,
  waveform,
  defaultDuration = 8,
  isCur = false,
  isPlaying: externalIsPlaying,
  currentTime: externalCurrentTime,
  volume = 1,
  isMuted = false,
  seekTarget,
  waveColor = '#52525b', // visible dark zinc for unplayed
  progressColor = '#ffffff', // bright solid white for played
  onDownload,
  onTogglePlay,
  onPlayStateChange,
  onTimeUpdate,
  onReady,
}: WavesurferAudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [internalIsPlaying, setInternalIsPlaying] = useState<boolean>(false)
  const [internalCurrentTime, setInternalCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(defaultDuration)

  const isControlled = externalIsPlaying !== undefined
  const activeIsPlaying = isControlled ? externalIsPlaying : internalIsPlaying
  const activeCurrentTime = externalCurrentTime !== undefined ? externalCurrentTime : internalCurrentTime

  // Normalize peaks for Wavesurfer from waveform data
  const peaks = useMemo(() => {
    const raw =
      waveform && waveform.length > 0
        ? waveform
        : [10, 10, 10, 25, 65, 10, 10, 10, 10, 10, 10, 10, 45, 80, 95, 45, 65, 25, 10, 10, 35, 75, 95, 60, 85, 45, 70, 25, 10, 80, 10, 10, 10, 10, 10, 10, 10, 10]
    return [raw.map((v) => Math.max(0.12, v > 1 ? v / 100 : v))]
  }, [waveform])

  // Initialize WaveSurfer stably once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 32,
      waveColor,
      progressColor,
      cursorColor: '#ffffff',
      cursorWidth: 2,
      barWidth: 2.5,
      barGap: 2,
      barRadius: 2,
      barHeight: 1.2,
      barMinHeight: 3,
      peaks: peaks,
      duration: defaultDuration,
      url: url || undefined,
      interact: true,
      dragToSeek: true,
    })

    wsRef.current = ws

    ws.on('ready', () => {
      try {
        if (volume !== undefined) ws.setVolume(Math.max(0, Math.min(1, volume)))
        ws.setMuted(!!isMuted)
      } catch {}
      const dur = ws.getDuration()
      if (dur && !isNaN(dur) && dur > 0) {
        setDuration(Math.round(dur))
        onReady?.(Math.round(dur))
      }
    })

    ws.on('play', () => {
      setInternalIsPlaying(true)
      onPlayStateChange?.(true)
    })

    ws.on('pause', () => {
      setInternalIsPlaying(false)
      onPlayStateChange?.(false)
    })

    ws.on('finish', () => {
      try {
        ws.setTime(0)
      } catch {}
      setInternalIsPlaying(false)
      setInternalCurrentTime(0)
      onPlayStateChange?.(false)
      const dur = ws.getDuration() || defaultDuration
      onTimeUpdate?.(0, dur, 0)
    })

    const handleWaveTimeUpdate = (time: number) => {
      const dur = ws.getDuration() || defaultDuration
      const roundSec = Math.round(time)
      setInternalCurrentTime(roundSec)
      const ratio = dur > 0 ? time / dur : 0
      onTimeUpdate?.(roundSec, dur, ratio)
    }

    ws.on('timeupdate', handleWaveTimeUpdate)
    ws.on('seeking', handleWaveTimeUpdate)
    ws.on('interaction', handleWaveTimeUpdate)

    const timer = setTimeout(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          ws.zoom(0)
        }
      } catch {}
    }, 50)

    return () => {
      clearTimeout(timer)
      ws.destroy()
      wsRef.current = null
    }
  }, [])

  // Sync isPlaying with WaveSurfer
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || !isControlled) return
    if (externalIsPlaying) {
      if (!ws.isPlaying()) {
        ws.play().catch((err) => console.warn('WaveSurfer play error:', err))
      }
    } else {
      if (ws.isPlaying()) {
        ws.pause()
      }
    }
  }, [externalIsPlaying, isControlled])

  // Sync seekTarget with WaveSurfer
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || seekTarget == null) return
    try {
      const dur = ws.getDuration() || defaultDuration
      if (dur > 0) {
        ws.setTime(Math.max(0, Math.min(dur, seekTarget)))
      }
    } catch {}
  }, [seekTarget, defaultDuration])

  // Sync volume with WaveSurfer
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || volume === undefined) return
    try {
      ws.setVolume(Math.max(0, Math.min(1, volume)))
    } catch (err) {
      console.warn('WaveSurfer volume error:', err)
    }
  }, [volume])

  // Sync isMuted with WaveSurfer
  useEffect(() => {
    const ws = wsRef.current
    if (!ws) return
    try {
      ws.setMuted(!!isMuted)
    } catch (err) {
      console.warn('WaveSurfer mute error:', err)
    }
  }, [isMuted])

  // Update audio URL when url changes
  useEffect(() => {
    if (wsRef.current && url) {
      wsRef.current.load(url, peaks, defaultDuration)
    }
  }, [url, peaks, defaultDuration])

  const handlePlayPause = async () => {
    if (onTogglePlay) {
      onTogglePlay()
    } else if (wsRef.current) {
      try {
        await wsRef.current.playPause()
      } catch (err) {
        console.warn('Wavesurfer play error:', err)
      }
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between h-[52px] w-[390px] max-w-full rounded-xl border border-white/[0.04] bg-white/[0.02] pl-2.5 pr-3.5 gap-3 select-none transition-all',
        isCur || activeIsPlaying ? 'border-white/[0.08] bg-white/[0.04]' : 'hover:border-white/[0.06]'
      )}
    >
      {/* Play/Pause Button: Solid white circular button with black icon */}
      <button
        type="button"
        onClick={handlePlayPause}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer shadow-xs"
        title={activeIsPlaying ? 'Pause' : 'Play'}
      >
        {activeIsPlaying ? (
          <Pause className="size-4 fill-black text-black" />
        ) : (
          <Play className="size-4 fill-black text-black ml-0.5" />
        )}
      </button>

      {/* Center: Wavesurfer Waveform */}
      <div className="flex-1 h-8 flex items-center overflow-hidden min-w-[140px] cursor-pointer">
        <div ref={containerRef} className="w-full h-8" />
      </div>

      {/* Audio Duration Display (single timer in sync) */}
      <span className="text-xs font-mono text-zinc-400 tabular-nums select-none shrink-0 min-w-[28px] text-right">
        {formatTime(activeIsPlaying ? activeCurrentTime : duration)}
      </span>

      {/* Right Action: Download audio (.wav) */}
      <button
        type="button"
        onClick={onDownload}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer shrink-0"
        title="Download Audio (.wav)"
      >
        <Download className="size-4" />
      </button>
    </div>
  )
}

export default WavesurferAudioPlayer
