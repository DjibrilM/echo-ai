import React, { useState } from 'react'
import {
  FileMusic,
  ArrowRight,
  Disc3,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { StudioTrackItem } from '@/modules/music/components/StudioTrackItem'
import { usePlayer } from '@/hooks/usePlayer'
import type { BeatGenerationOutput, BeatProgressState } from '../types'

interface BeatsStudioViewProps {
  prompt: string
  onChangePrompt: (val: string) => void
  duration: number
  onChangeDuration: (val: number) => void
  onGenerate: () => void
  onCancelGeneration?: () => void
  isGenerating: boolean
  generationProgress?: BeatProgressState | null
  generationError?: string | null
  onDismissError?: () => void
  history: BeatGenerationOutput[]
  activeTrack: BeatGenerationOutput | null
  isPlaying: boolean
  onPlayTrack: (track: BeatGenerationOutput) => void
  onDeleteTrack?: (id: string) => void
}

export const BeatsStudioView: React.FC<BeatsStudioViewProps> = ({
  prompt,
  onChangePrompt,
  duration,
  onChangeDuration,
  onGenerate,
  onCancelGeneration,
  isGenerating,
  generationProgress,
  generationError,
  onDismissError,
  history,
  activeTrack,
  onPlayTrack,
  onDeleteTrack,
}) => {
  const [favorites, setFavorites] = useState<string[]>([])
  const player = usePlayer()

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 bg-[#0e0e11] overflow-hidden">
      {/* LEFT COLUMN: Beat Generation Console */}
      <div className="w-full md:w-[460px] lg:w-[500px] shrink-0 border-r border-[#1f1f23] p-5 sm:p-6 overflow-y-auto sidebar-scrollbar flex flex-col gap-5 bg-[#111114]">
        {/* Model Engine Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#161619] text-zinc-200 border border-[#27272a] select-none">
            <FileMusic className="size-3.5 text-zinc-400" />
            <span>ACE-Step v1.5 (Beats)</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Clock className="size-3 text-zinc-500" />
            <span>{duration}s</span>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="bg-[#161619] border border-[#27272a] rounded-2xl p-4 flex flex-col gap-3 shadow-sm focus-within:border-zinc-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-400" />
              Beat Description
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            rows={5}
            placeholder="Describe your beat: 808s, tempo, drum grooves, rhythm, instruments, vibe..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none resize-none leading-relaxed font-normal"
            disabled={isGenerating}
          />

          {/* Instrumental Pill */}
          <div className="flex items-center justify-between pt-2 border-t border-[#232328] text-xs">
            <span className="text-zinc-400 font-medium">Mode:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
              Instrumental Beat
            </span>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-[#232328] text-xs">
            <span className="text-zinc-400 font-medium">Duration:</span>
            <div className="flex items-center gap-1">
              {[15, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onChangeDuration(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    duration === d
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#212126] hover:bg-[#2c2c33] text-zinc-400'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Generate Button */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {isGenerating ? (
            <button
              type="button"
              onClick={onCancelGeneration}
              className="w-full py-3 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-all font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Loader2 className="size-4 animate-spin" />
              <span>Cancel Beat Generation</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!prompt.trim()}
              onClick={onGenerate}
              className="w-full py-3 rounded-xl bg-white text-black hover:bg-zinc-200 active:scale-98 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 font-medium text-xs sm:text-sm shadow-xl cursor-pointer"
            >
              <Sparkles className="size-4" />
              <span>Generate Beat</span>
              <ArrowRight className="size-4 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Live Progress Banner */}
        {isGenerating && generationProgress && (
          <div className="p-3.5 rounded-xl bg-[#161619] border border-[#27272a] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-amber-400" />
                {generationProgress.stage || 'Synthesizing Beat...'}
              </span>
              <span className="font-mono text-zinc-400">
                {Math.round(generationProgress.percentage)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#24242a] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${generationProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Banner */}
        {generationError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="size-4 text-red-400 shrink-0" />
              <span className="truncate">{generationError}</span>
            </div>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="text-[11px] underline text-red-400 ml-2"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Studio Generations & Active Track List */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scrollbar flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">
            Beat Session History
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {history.length} {history.length === 1 ? 'Track' : 'Tracks'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500 rounded-2xl border border-dashed border-[#232328] bg-[#121215]">
            <Disc3 className="size-10 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-400">No beats generated in this session</p>
            <p className="text-xs text-zinc-600 max-w-sm mt-1">
              Enter a beat prompt on the left and click Generate Beat to start producing.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((track) => {
              const isThisPlaying =
                (player.currentTrack?.id === track.id || activeTrack?.id === track.id) &&
                player.isPlaying

              // Convert BeatGenerationOutput to format accepted by StudioTrackItem
              const studioItem = {
                ...track,
                durationMs: track.durationMs || 30000,
                sampleRate: track.sampleRate || 48000,
                channels: track.channels || 2,
                bitsPerSample: track.bitsPerSample || 16,
              }

              return (
                <StudioTrackItem
                  key={track.id}
                  item={studioItem}
                  isThisPlaying={isThisPlaying}
                  isFav={favorites.includes(track.id)}
                  onPlay={() => onPlayTrack(track)}
                  onToggleFavorite={toggleFavorite}
                  onDeleteTrack={onDeleteTrack}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
