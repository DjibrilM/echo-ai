import React from 'react'
import { Play, Pause, Download, Check, ChevronRight } from 'lucide-react'
import clsx from 'clsx/lite'
import { TrackWavePlayer } from '@/components/player/TrackWavePlayer'
import { formatDuration } from '../utils/formatDuration'

export interface MusicTrackItemData {
  id: string
  title: string
  category: string
  subCategory: string
  duration?: string | number
  durationSec?: number
  cover?: string
  waveform?: number[]
  audioUrl?: string
}

export interface MusicTrackItemProps {
  track: MusicTrackItemData
  isPlaying: boolean
  onPlay: () => void
  onDownload?: (trackId: string, audioUrl?: string, e?: React.MouseEvent) => void
  isDownloaded?: boolean
  className?: string
}

export const MusicTrackItem: React.FC<MusicTrackItemProps> = ({
  track,
  isPlaying,
  onPlay,
  onDownload,
  isDownloaded = false,
  className,
}) => {
  const formattedDuration = formatDuration(track.durationSec || track.duration)

  return (
    <div
      onClick={onPlay}
      className={clsx(
        'group flex items-center justify-between gap-3 sm:gap-4 p-2 pr-4 sm:pr-6 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer',
        isPlaying && 'bg-white/[0.08]',
        className
      )}
    >
      {/* Left: Cover thumbnail + Play button + Title + Category breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
        {track.cover && (
          <img
            src={track.cover}
            alt={track.title}
            className="size-10 sm:size-11 rounded-lg object-cover shrink-0 border border-white/10 shadow-sm"
          />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          className={clsx(
            'size-8 sm:size-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer',
            isPlaying
              ? 'bg-white text-black shadow-md scale-105'
              : 'bg-white/[0.08] group-hover:bg-white/[0.16] text-zinc-300 group-hover:text-white group-hover:scale-105 active:scale-95'
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Title and Category Breadcrumb */}
        <div className="flex flex-col min-w-0">
          <span className="text-[13.5px] font-medium text-white truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl group-hover:text-zinc-100">
            {track.title}
          </span>
          <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 mt-0.5 truncate">
            <span className="text-zinc-300 font-medium">{track.category}</span>
            <ChevronRight className="size-3 text-zinc-600 shrink-0" />
            <span className="text-zinc-400">{track.subCategory}</span>
          </div>
        </div>
      </div>

      {/* Right Side: TrackWavePlayer + Formatted Duration + Download Button */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {track.waveform && (
          <div className="hidden md:flex items-center h-6 w-32 lg:w-44 px-1 shrink-0">
            <TrackWavePlayer
              trackId={track.id}
              waveform={track.waveform}
              duration={formattedDuration}
              onPlay={onPlay}
              height={22}
              className="w-full"
            />
          </div>
        )}

        <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
          {formattedDuration}
        </span>

        {onDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(track.id, track.audioUrl, e)
            }}
            className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Download audio"
          >
            {isDownloaded ? (
              <Check className="size-3.5 text-white" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
