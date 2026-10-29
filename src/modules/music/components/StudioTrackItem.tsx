import React from 'react'
import {
  Play,
  Pause,
  Star,
  Download,
  Trash2,
  ArrowUpRight,
} from 'lucide-react'
import { TrackWavePlayer } from '@/components/player/TrackWavePlayer'
import { formatDuration } from '../utils/formatDuration'
import type { MusicGenerationOutput } from '../types'

export interface StudioTrackItemProps {
  item: MusicGenerationOutput
  isThisPlaying: boolean
  isFav: boolean
  onPlay: () => void
  onOpenEditModal?: () => void
  onToggleFavorite: (id: string, e: React.MouseEvent) => void
  onDeleteTrack?: (id: string) => void
}

export const StudioTrackItem: React.FC<StudioTrackItemProps> = ({
  item,
  isThisPlaying,
  isFav,
  onPlay,
  onOpenEditModal,
  onToggleFavorite,
  onDeleteTrack,
}) => {
  const formattedDuration = formatDuration(item.durationMs ? item.durationMs / 1000 : 60)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.audioUrl) {
      const a = document.createElement('a')
      a.href = item.audioUrl
      a.download = `${(item.caption || 'track').replace(/\s+/g, '_')}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <div
      onClick={onPlay}
      className={`group bg-[#161619] border rounded-xl p-4 transition-all flex flex-col gap-3 cursor-pointer min-w-0 w-full ${
        isThisPlaying
          ? 'border-white/30 bg-[#1c1c21]'
          : 'border-[#27272a] hover:border-zinc-700'
      }`}
    >
      {/* Header of Item: Title, Badge, Tags & Edit Song Button */}
      <div className="flex items-center justify-between gap-3 min-w-0 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
            {item.caption || 'Generated Track'}
          </h4>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-zinc-300 shrink-0">
            Music v2
          </span>
          {item.keyscale && (
            <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">
              · {item.keyscale}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenEditModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
                onOpenEditModal()
              }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer select-none px-2 py-1 rounded hover:bg-white/5"
            >
              <span>Edit Song</span>
              <ArrowUpRight className="size-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Media Row: Play button + Waveform/Wavesurfer + Duration + Actions */}
      <div className="flex items-center gap-4 min-w-0 w-full">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          className={`size-9 rounded-full shrink-0 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm ${
            isThisPlaying
              ? 'bg-white text-black'
              : 'bg-[#222227] hover:bg-[#2d2d34] text-zinc-200 hover:text-white'
          }`}
          title={isThisPlaying ? 'Pause' : 'Play'}
        >
          {isThisPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Unified interactive TrackWavePlayer inside constrained flex-1 container */}
        <div className="flex-1 min-w-0 overflow-hidden px-1">
          <TrackWavePlayer
            trackId={item.id}
            waveform={item.waveform}
            duration={formattedDuration}
            onPlay={onPlay}
            height={24}
            className="w-full min-w-0"
          />
        </div>

        {/* Duration */}
        <span className="text-xs font-mono text-zinc-400 shrink-0 tabular-nums">
          {formattedDuration}
        </span>

        {/* Favorite / Star */}
        <button
          type="button"
          onClick={(e) => onToggleFavorite(item.id, e)}
          className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
            isFav
              ? 'text-white'
              : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`size-3.5 ${isFav ? 'fill-current text-white' : 'text-zinc-400'}`} />
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
          title="Download WAV"
        >
          <Download className="size-3.5" />
        </button>

        {/* Delete */}
        {onDeleteTrack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteTrack(item.id)
            }}
            className="p-1.5 rounded text-zinc-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
            title="Delete generation"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
