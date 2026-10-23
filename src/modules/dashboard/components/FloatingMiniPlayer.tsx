import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Music2,
  Sparkles,
  Download,
  Check,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { AudioScrubber } from '@/components/ui/waveform'
import { ActiveMedia } from '../types'

export interface FloatingMiniPlayerProps {
  activeMedia: ActiveMedia | null
  isPlaying: boolean
  isMuted: boolean
  volume: number
  downloadedId: string | null
  onTogglePlay: () => void
  onToggleMute: () => void
  onVolumeChange: (newVol: number) => void
  onDownload: (id: string, e: React.MouseEvent) => void
  onClose: () => void
}

export function FloatingMiniPlayer({
  activeMedia,
  isPlaying,
  isMuted,
  volume,
  downloadedId,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onDownload,
  onClose,
}: FloatingMiniPlayerProps) {
  if (!activeMedia) return null

  return (
    <div className="fixed bottom-4 left-6 right-6 md:left-[270px] z-50 rounded-2xl bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.12] p-3 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Left: Thumbnail & Details */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={activeMedia.cover}
          alt={activeMedia.title}
          className="size-12 rounded-xl object-cover shrink-0 border border-white/10"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate tracking-tight">
            {activeMedia.title}
          </span>
          <span className="text-xs text-zinc-400 truncate flex items-center gap-1.5">
            <span>{activeMedia.subtitle}</span>
            <span className="size-1 rounded-full bg-zinc-600 inline-block" />
            <span className="text-zinc-500">{activeMedia.duration}</span>
          </span>
        </div>
      </div>

      {/* Center: Controls & Simulated Progress */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-md hidden sm:flex">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onTogglePlay}
            className="size-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="size-4 fill-black" />
            ) : (
              <Play className="size-4 fill-black ml-0.5" />
            )}
          </button>
        </div>
        {/* Scrubber bar with AudioScrubber */}
        <div className="w-full flex items-center gap-2.5 text-[11px] text-zinc-400 tabular-nums">
          <span>01:14</span>
          <div className="flex-1">
            <AudioScrubber
              data={[
                0.3, 0.45, 0.7, 0.85, 0.6, 0.4, 0.65, 0.9, 0.75, 0.5, 0.35, 0.6, 0.8, 0.95, 0.7,
                0.45, 0.6, 0.8, 0.55, 0.4, 0.65, 0.85, 0.5, 0.3, 0.55, 0.75, 0.6, 0.4, 0.5, 0.7,
                0.85, 0.6, 0.35, 0.5, 0.7, 0.9, 0.65, 0.4,
              ]}
              currentTime={35}
              duration={100}
              barWidth={2.5}
              barGap={1.5}
              barRadius={1}
              height={20}
              barColor="rgba(255, 255, 255, 0.65)"
              showHandle={false}
              className="w-full"
            />
          </div>
          <span>{activeMedia.duration}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Download active media */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(activeMedia.id, e)
          }}
          className="size-8 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Download audio"
        >
          {downloadedId === activeMedia.id ? (
            <Check className="size-4 text-emerald-400" />
          ) : (
            <Download className="size-4" />
          )}
        </button>

        {/* Interactive Volume Control: Icon + Continuous Slider + Percentage Indicator */}
        <div className="flex items-center gap-2 group/volume pl-1">
          <button
            type="button"
            onClick={onToggleMute}
            className="size-8 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={
              isMuted || volume === 0
                ? 'Unmute'
                : `Mute (Current: ${Math.round(volume * 100)}%)`
            }
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="size-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>

          <div className="w-20 sm:w-24 flex items-center">
            <Slider
              value={[isMuted ? 0 : Math.round(volume * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) => onVolumeChange((val[0] ?? 0) / 100)}
              className="cursor-pointer"
              title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
            />
          </div>

          <span className="text-[10px] font-mono text-zinc-400 w-7 tabular-nums select-none text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        {activeMedia.type === 'story' && (
          <Link
            to="/stories-generation"
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors hidden lg:flex items-center gap-1.5"
          >
            <BookOpen className="size-3.5 text-zinc-400" />
            Open Story
          </Link>
        )}

        {activeMedia.type === 'music' && (
          <Link
            to="/music"
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors hidden lg:flex items-center gap-1.5"
          >
            <Music2 className="size-3.5 text-zinc-400" />
            Open Music
          </Link>
        )}

        {activeMedia.type === 'activity' && (
          <Link
            to="/text-to-speech"
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors hidden lg:flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5 text-zinc-400" />
            Activity Studio
          </Link>
        )}

        <button
          type="button"
          onClick={onClose}
          className="size-8 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Close player"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
