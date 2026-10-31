import React, { useState } from 'react'
import {
  FileMusic,
  ArrowUp,
  Disc3,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { StudioTrackItem } from '@/modules/music/components/StudioTrackItem'
import { usePlayer } from '@/hooks/usePlayer'
import ExpandableContainer from '@/components/ExpandableContainer'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import NumberFlow from '@number-flow/react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { BEAT_PROMPT_SUGGESTIONS } from '@/modules/music/components/MusicPromptHeroCard'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import type { BeatGenerationOutput, BeatProgressState } from '../types'

/**
 * Safely extracts numbers from a progress message string and renders them with NumberFlow.
 * Includes complete null/undefined/empty safety with fallback text.
 */
function renderProgressMessageWithNumberFlow(message?: string | null): React.ReactNode {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return 'Processing diffusion steps...'
  }

  // Tokenize by numbers (integers or decimals)
  const parts = message.split(/(\d+(?:\.\d+)?)/)

  return parts.map((part, index) => {
    if (!part) return null
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      const num = parseFloat(part)
      if (Number.isFinite(num)) {
        return <NumberFlow key={index} value={num} className="inline-block tabular-nums" />
      }
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const player = usePlayer()

  const filteredHistory = searchQuery.trim()
    ? history.filter((track) =>
        (track.caption || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    )
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="flex-1 h-full min-h-0 bg-[#0f0f10] overflow-hidden"
    >
      {/* LEFT PANEL: Beat Generation Console */}
      <ResizablePanel defaultSize="42%" minSize="30%" maxSize="60%">
        <div className="h-full overflow-y-auto sidebar-scrollbar p-5 sm:p-6 flex flex-col gap-5 bg-[#0f0f10]">
        {/* Header: Beat Description & Engine Info */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">
            Beat Description
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161619] text-zinc-300 border border-[#27272a] select-none">
              <FileMusic className="size-3.5 text-zinc-400" />
              <span>ACE-Step v1.5</span>
            </div>

            {prompt && (
              <button
                type="button"
                onClick={() => onChangePrompt('')}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
                title="Clear description"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Prompt Area Interface */}
        <div className="bg-[#161619] border border-[#27272a] focus-within:border-zinc-500 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm transition-colors">
          {/* Quick Beat Inspiration Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {BEAT_PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                disabled={isGenerating}
                onClick={() => onChangePrompt(suggestion.prompt)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#212126] hover:bg-[#2c2c33] text-zinc-300 hover:text-white border border-[#2c2c33] transition-colors cursor-pointer select-none"
              >
                {suggestion.label}
              </button>
            ))}
          </div>

          <AutoResizeTextarea
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && prompt.trim()) {
                e.preventDefault()
                onGenerate()
              }
            }}
            minHeight={100}
            placeholder="Describe your beat: 808s, tempo, drum grooves, rhythm, instruments, vibe..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none leading-relaxed font-normal"
            disabled={isGenerating}
          />

          {/* Bottom Toolbar: Duration & Mode on Left, Circular Submit Button on Right */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#232328]">
            <div className="flex items-center gap-3">
              {/* Duration selector - supports up to 3m (180s) for instrumentals */}
              <div className="flex items-center gap-1">
                {[15, 30, 60, 120, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onChangeDuration(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      duration === d
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#212126] hover:bg-[#2c2c33] text-zinc-400'
                    }`}
                    title={`${d >= 60 ? `${d / 60}m` : `${d}s`} (${d} seconds)`}
                  >
                    {d >= 60 ? `${d / 60}m` : `${d}s`}
                  </button>
                ))}
              </div>

              {/* Mode indicator */}
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/10 text-[11px] font-medium">
                Instrumental
              </span>
            </div>

            {/* Circular Prompt Submit Action Button */}
            <button
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={onGenerate}
              className="size-8.5 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:bg-[#27272a] disabled:text-zinc-600 disabled:pointer-events-none transition-all flex items-center justify-center font-medium shadow-md cursor-pointer shrink-0"
              title={
                !prompt.trim()
                  ? 'Enter a beat description (⌘+Enter)'
                  : isGenerating
                    ? 'Synthesizing beat...'
                    : 'Generate Beat (⌘+Enter)'
              }
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin text-zinc-600" />
              ) : (
                <ArrowUp className="size-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Live Generation Progress Banner - Monochrome Expandable Container */}
        <ExpandableContainer isExpanded={isGenerating} className="w-full">
          <div className="bg-[#161619] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-white animate-ping shrink-0" />
                <ShimmeringText
                  text={generationProgress?.stage || 'Synthesizing Beat...'}
                  shimmerColor="#ffffff"
                  duration={1.8}
                  className="text-xs font-medium text-white"
                />
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                {generationProgress?.etaFormatted && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-white font-sans font-medium border border-white/10 flex items-center gap-1">
                    <Clock className="size-3 text-white/70" />
                    ~{generationProgress.etaFormatted}
                  </span>
                )}
                <span className="text-zinc-300">
                  {generationProgress?.percentage !== undefined && generationProgress.percentage > 0 ? (
                    <>
                      <NumberFlow value={generationProgress.percentage} />%
                    </>
                  ) : (
                    'In progress'
                  )}
                </span>
              </div>
            </div>

            {/* Progress Bar - Clean monochrome white */}
            <div className="w-full h-1.5 bg-[#141416] rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${generationProgress?.percentage || 5}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-0.5 flex-wrap">
                {renderProgressMessageWithNumberFlow(generationProgress?.message)}
              </span>
              {onCancelGeneration && (
                <button
                  type="button"
                  onClick={onCancelGeneration}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </ExpandableContainer>

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
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* RIGHT PANEL: Studio Generations & Active Track List */}
      <ResizablePanel defaultSize="58%" minSize="40%">
        <div className="flex flex-col h-full min-h-0 bg-[#0f0f10] overflow-hidden">
          {/* Search Header - Touching Sub Main Header Directly */}
          <div className="shrink-0 border-b border-[#1f1f23] bg-[#0f0f10] px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="relative flex-1">
              <Search className="size-3.5 text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search beat tracks..."
                className="w-full h-9 rounded-lg border-0 bg-[#161619] pl-9 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  title="Clear Search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>
          </div>

          {/* Scrolled Track List Area */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scrollbar flex flex-col gap-4">
            {filteredHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-500 rounded-2xl border border-dashed border-[#232328] bg-[#121215]">
                <Disc3 className="size-10 text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-400">
                  {searchQuery ? 'No matching beats found' : 'No beats generated in this session'}
                </p>
                <p className="text-xs text-zinc-600 max-w-sm mt-1">
                  {searchQuery
                    ? 'Try searching with different keywords.'
                    : 'Enter a beat description on the left and submit to start producing.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredHistory.map((track) => {
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
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
