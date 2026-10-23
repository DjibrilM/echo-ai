import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
  Download,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import type { Generation } from '@/modules/text-to-speech'
import { formatTime } from '@/modules/text-to-speech'

export interface SpeechPlayerBarProps {
  activeGeneration: Generation | null
  isPlaying: boolean
  currentTime: number
  playbackProgress: number
  isMuted: boolean
  volume: number
  onTogglePlay: () => void
  onSeek: (newProgress: number) => void
  onSkip: (seconds: number) => void
  onToggleMute: () => void
  onVolumeChange: (newVol: number) => void
  onDownload?: () => void
}

export function SpeechPlayerBar({
  activeGeneration,
  isPlaying,
  currentTime,
  playbackProgress,
  isMuted,
  volume,
  onTogglePlay,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onDownload,
}: SpeechPlayerBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[60px] border-t border-[#1f1f23] bg-[#0c0c0e] px-6 flex items-center justify-between z-20">
      {/* Left: Active snippet info */}
      <div className="flex flex-col min-w-[200px] max-w-[280px]">
        <span className="text-xs font-medium text-zinc-200 truncate">
          {activeGeneration ? activeGeneration.textSnippet : 'Ready For Synthesis'}
        </span>
        <span className="text-[11px] text-zinc-500">
          {activeGeneration
            ? `${activeGeneration.title} • ${activeGeneration.speakerName}`
            : 'No Recording'}
        </span>
      </div>

      {/* Center: Controls & Scrubber */}
      <div className="flex flex-1 max-w-xl items-center gap-4 px-4">
        <span className="text-[11px] font-mono text-zinc-500 w-8 text-right">
          {formatTime(currentTime)}
        </span>

        {/* Skip back 5s */}
        <button
          type="button"
          disabled={!activeGeneration}
          onClick={() => onSkip(-5)}
          className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Rewind 5s"
        >
          <RotateCcw className="size-4" />
        </button>

        {/* Play/Pause Button */}
        <button
          type="button"
          disabled={!activeGeneration}
          onClick={onTogglePlay}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Skip forward 5s */}
        <button
          type="button"
          disabled={!activeGeneration}
          onClick={() => onSkip(5)}
          className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Fast Forward 5s"
        >
          <RotateCw className="size-4" />
        </button>

        {/* Scrubber slider */}
        <div className="flex-1">
          <Slider
            value={[playbackProgress * 100]}
            min={0}
            max={100}
            step={0.5}
            disabled={!activeGeneration}
            onValueChange={(val) => onSeek((val[0] || 0) / 100)}
          />
        </div>

        <span className="text-[11px] font-mono text-zinc-500 w-8">
          {activeGeneration ? formatTime(activeGeneration.duration) : '0:00'}
        </span>
      </div>

      {/* Right: Volume Control & Download */}
      <div className="flex items-center gap-3.5">
        {/* Interactive Volume Control: Icon + Continuous Slider + Percentage Indicator */}
        <div className="flex items-center gap-2 group/volume">
          <button
            type="button"
            disabled={!activeGeneration}
            onClick={onToggleMute}
            className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer p-1 rounded-md hover:bg-white/[0.06]"
            title={isMuted || volume === 0 ? 'Unmute' : `Mute (Current: ${Math.round(volume * 100)}%)`}
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
              disabled={!activeGeneration}
              onValueChange={(val) => onVolumeChange((val[0] ?? 0) / 100)}
              className="cursor-pointer"
              title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
            />
          </div>

          <span className="text-[10px] font-mono text-zinc-400 w-7 tabular-nums select-none text-right">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          disabled={!activeGeneration}
          onClick={onDownload}
          className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors p-1 rounded-md hover:bg-white/[0.06] cursor-pointer"
          title="Download Generation (.wav)"
        >
          <Download className="size-4" />
        </button>
      </div>
    </div>
  )
}
