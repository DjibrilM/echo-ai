import React, { useState, useMemo, useRef } from 'react'
import {
  ArrowRight,
  Search,
  FileMusic,
  X,
  Clock,
  Mic2,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { generateAiLyrics } from '../services/lyric-generator.service'
import { generateLyricsStream } from '../services/music-api'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import ExpandableContainer from '@/components/ExpandableContainer'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import NumberFlow from '@number-flow/react'
import { StudioTrackItem } from './StudioTrackItem'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { formatDuration } from '../utils/formatDuration'
import { usePlayer } from '@/hooks/usePlayer'
import type { PlayerTrack } from '@/store/playerStore'
import type { MusicGenerationOutput, MusicProgressState } from '../types'

export interface MusicStudioViewProps {
  prompt: string
  onChangePrompt: (val: string) => void
  lyrics: string
  onChangeLyrics: (val: string) => void
  isInstrumental: boolean
  onChangeInstrumental: (val: boolean) => void
  vocalMode?: 'instrumental' | 'manual' | 'auto'
  onChangeVocalMode?: (mode: 'instrumental' | 'manual' | 'auto') => void
  duration: number
  onChangeDuration: (val: number) => void
  engine: string
  onChangeEngine?: (engine: 'acestep' | 'minimax') => void
  onGenerate: () => void
  onCancelGeneration?: () => void
  isGenerating: boolean
  generationProgress?: MusicProgressState | null
  generationError?: { taskId: string; message: string; details?: any; timestamp: string } | null
  onDismissError?: () => void
  history: MusicGenerationOutput[]
  activeTrack: MusicGenerationOutput | null
  isPlaying: boolean
  onPlayTrack: (track: MusicGenerationOutput) => void
  onDeleteTrack?: (id: string) => void
  onOpenEditModal?: () => void
}

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

export const MusicStudioView: React.FC<MusicStudioViewProps> = ({
  prompt,
  onChangePrompt,
  lyrics,
  onChangeLyrics,
  duration,
  onChangeDuration,
  engine,
  onGenerate,
  onCancelGeneration,
  isGenerating,
  generationProgress,
  generationError,
  onDismissError,
  history = [],
  activeTrack,
  onPlayTrack,
  onDeleteTrack,
}) => {
  const [searchHistory, setSearchHistory] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isStreamingLyrics, setIsStreamingLyrics] = useState(false)
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertTagAtCursor = (tag: string) => {
    const textarea = lyricsTextareaRef.current
    const currentText = lyrics || ''

    if (!textarea) {
      const sep = currentText.length > 0 && !currentText.endsWith('\n') ? '\n\n' : ''
      onChangeLyrics(`${currentText}${sep}${tag}\n`)
      return
    }

    const start = textarea.selectionStart ?? currentText.length
    const end = textarea.selectionEnd ?? currentText.length

    const textBefore = currentText.substring(0, start)
    const textAfter = currentText.substring(end)
    const needsLeadingNewline = textBefore.length > 0 && !textBefore.endsWith('\n')
    const prefix = needsLeadingNewline ? '\n\n' : ''
    const insertion = `${prefix}${tag}\n`

    const newLyrics = textBefore + insertion + textAfter
    onChangeLyrics(newLyrics)

    const newCursorPos = start + insertion.length
    requestAnimationFrame(() => {
      if (lyricsTextareaRef.current) {
        lyricsTextareaRef.current.focus()
        lyricsTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }

  const handleGenerateAiLyrics = async () => {
    if (isStreamingLyrics) return
    setIsStreamingLyrics(true)
    onChangeLyrics('') // Start streaming fresh into textarea
    let accumulated = ''
    try {
      const res = await generateLyricsStream(prompt, (token) => {
        accumulated += token
        onChangeLyrics(accumulated)
      })
      if (res.success && res.lyrics) {
        onChangeLyrics(res.lyrics)
      } else if (!res.success && !accumulated) {
        const fallback = generateAiLyrics(prompt)
        onChangeLyrics(fallback.lyrics)
      }
    } catch {
      const fallback = generateAiLyrics(prompt)
      onChangeLyrics(fallback.lyrics)
    } finally {
      setIsStreamingLyrics(false)
    }
  }


  const player = usePlayer()

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let list = [...history]

    if (searchHistory.trim()) {
      const q = searchHistory.toLowerCase()
      list = list.filter(
        (h) =>
          h.caption?.toLowerCase().includes(q) ||
          h.lyrics?.toLowerCase().includes(q) ||
          h.keyscale?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime()
      const tB = new Date(b.createdAt || 0).getTime()
      return sortOrder === 'newest' ? tB - tA : tA - tB
    })

    return list
  }, [history, searchHistory, favorites, sortOrder])

  // Group history items by date
  const groupedHistory = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups: Record<string, MusicGenerationOutput[]> = {
      TODAY: [],
      YESTERDAY: [],
      PREVIOUS: [],
    }

    for (const item of filteredHistory) {
      const itemDate = new Date(item.createdAt || Date.now()).toDateString()
      if (itemDate === today) {
        groups.TODAY.push(item)
      } else if (itemDate === yesterday) {
        groups.YESTERDAY.push(item)
      } else {
        groups.PREVIOUS.push(item)
      }
    }

    return groups
  }, [filteredHistory])

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="flex-1 h-full min-h-0 bg-[#0f0f10] overflow-hidden select-none"
    >
      {/* LEFT PANEL: Song Generation Console */}
      <ResizablePanel defaultSize="42%" minSize="30%" maxSize="60%">
        <div className="h-full overflow-y-auto sidebar-scrollbar p-5 sm:p-6 flex flex-col gap-4 bg-[#0f0f10]">
        {/* Header: Song Description & Clear */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">
            Song Description
          </h2>

          <div className="flex items-center gap-2">
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

        {/* Prompt Input Box */}
        <div className="bg-[#161619] border border-[#27272a] focus-within:border-zinc-500 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-colors">

          <AutoResizeTextarea
            value={prompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && prompt.trim()) {
                e.preventDefault()
                onGenerate()
              }
            }}
            minHeight={80}
            placeholder="A slow, emotional piano ballad featuring a solo piano with subtle string accompaniment, conveying a sense of sadness and reflection..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none leading-relaxed font-normal"
            disabled={isGenerating}
          />

          {/* Duration Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-[#232328] text-xs">
            <span className="text-zinc-400 font-medium">Duration:</span>
            <div className="flex items-center gap-1">
              {[30, 60, 120, 180].map((d) => (
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
                  title={`${d}s (~${Math.max(1, Math.round((d / 60) * 5.5))}m)`}
                >
                  {d >= 60 ? `${d / 60}m` : `${d}s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lyrics Box */}
        <div className="bg-[#161619] border border-[#27272a] focus-within:border-zinc-500 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Mic2 className="size-3.5 text-white" />
              Lyrics
              <span className="text-[11px] text-zinc-500 font-normal hidden sm:inline">(Optional)</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* AI Lyric Generation Button */}
              <button
                type="button"
                disabled={isStreamingLyrics || isGenerating}
                onClick={handleGenerateAiLyrics}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer shadow-xs active:scale-95 select-none disabled:opacity-50"
                title={prompt.trim() ? 'Stream lyrics composed by local Qwen-1.7B LLM based on your description' : 'Enter a song description first to generate matching lyrics'}
              >
                {isStreamingLyrics ? (
                  <>
                    <Loader2 className="size-3 text-white animate-spin" />
                    <span>Streaming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3 text-white" />
                    <span>{lyrics ? 'Regenerate' : 'Generate with AI'}</span>
                  </>
                )}
              </button>

              {/* Quick structure tag buttons */}
              <div className="flex items-center gap-1">
                {['[verse]', '[chorus]', '[bridge]', '[outro]'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertTagAtCursor(tag)}
                    className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[#141416] hover:bg-[#202026] text-zinc-300 hover:text-white transition-colors cursor-pointer border border-[#27272a]"
                    title={`Insert ${tag} at cursor`}
                  >
                    {tag}
                  </button>
                ))}
                {lyrics && (
                  <button
                    type="button"
                    onClick={() => onChangeLyrics('')}
                    className="size-5 rounded ml-1 bg-[#141416] hover:bg-[#202026] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Clear lyrics"
                  >
                    <X className="size-3 text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <AutoResizeTextarea
            ref={lyricsTextareaRef}
            value={lyrics}
            onChange={(e) => onChangeLyrics(e.target.value)}
            minHeight={100}
            placeholder="[verse]&#10;Write custom lyrics here, or click 'Generate with AI' to compose automatically...&#10;&#10;[chorus]&#10;Leave empty for auto-generated lyrics."
            className="w-full bg-transparent text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 outline-none leading-relaxed transition-colors font-mono"
            disabled={isGenerating}
          />
        </div>

        {/* Submit Generate Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={isGenerating || !prompt.trim()}
            onClick={onGenerate}
            className="w-full py-3 rounded-xl bg-white text-black hover:bg-zinc-200 active:scale-98 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 font-medium text-xs sm:text-sm shadow-xl cursor-pointer"
          >
            <Sparkles className="size-4 text-black" />
            <span>{isGenerating ? 'Synthesizing Song...' : 'Generate Song'}</span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Live Generation Progress Banner - Monochrome Expandable Container */}
        <ExpandableContainer isExpanded={isGenerating} className="w-full">
          <div className="bg-[#161619] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-white animate-ping shrink-0" />
                <ShimmeringText
                  text={generationProgress?.stage || 'Generating Audio...'}
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

        {/* Live Generation Error Banner - Prominent and action-oriented */}
        <ExpandableContainer isExpanded={Boolean(generationError)} className="w-full">
          {generationError && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-red-400 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  <span>Generation Failed ({engine === 'minimax' ? 'MiniMax-Music3' : 'ACE-Step v1.5'})</span>
                </span>
                {onDismissError && (
                  <button
                    type="button"
                    onClick={onDismissError}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title="Dismiss error"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[12px] text-zinc-200 leading-relaxed font-mono break-words bg-black/50 p-2.5 rounded-lg border border-red-500/20">
                {generationError.message}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                <span className="text-zinc-500 text-[10.5px]">
                  Detailed failure trace logged to ~/.qvac/models & logs/music-generation.log
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onDismissError?.()
                      onGenerate()
                    }}
                    className="text-white hover:underline transition-colors cursor-pointer font-medium"
                  >
                    Retry
                  </button>
                  {onDismissError && (
                    <button
                      type="button"
                      onClick={onDismissError}
                      className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </ExpandableContainer>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* RIGHT PANEL: Studio Generations & Active Track List */}
      <ResizablePanel defaultSize="58%" minSize="40%">
        <div className="flex flex-col h-full min-h-0 bg-[#0f0f10] overflow-hidden">
          {/* Search & Sort Controls Header - Touching Sub Main Header Directly */}
          <div className="shrink-0 border-b border-[#1f1f23] bg-[#0f0f10] px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="relative flex-1">
              <Search className="size-3.5 text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search session tracks..."
                className="w-full h-9 rounded-lg border-0 bg-[#161619] pl-9 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10 transition-colors"
              />
              {searchHistory && (
                <button
                  type="button"
                  onClick={() => setSearchHistory('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  title="Clear Search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#161619] hover:bg-[#1e1e22] text-zinc-400 hover:text-zinc-200 border border-[#27272a] transition-colors cursor-pointer select-none"
              >
                {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            </div>
          </div>

          {/* Date Grouped Generations List - Scrollable */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scrollbar flex flex-col gap-6 min-w-0">
            {(['TODAY', 'YESTERDAY', 'PREVIOUS'] as const).map((groupKey) => {
              const items = groupedHistory[groupKey]
              if (!items || items.length === 0) return null

              return (
                <div key={groupKey} className="flex flex-col gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {groupKey === 'PREVIOUS' ? 'Previous Generations' : groupKey}
                  </span>

                  <div className="flex flex-col gap-3">
                    {items.map((item, idx) => {
                      const isThisPlaying =
                        (player.currentTrack?.id === item.id || activeTrack?.id === item.id) &&
                        player.isPlaying
                      const isFav = favorites.has(item.id)

                      const handlePlayItem = () => {
                        if (player.currentTrack?.id === item.id) {
                          player.togglePlay()
                          return
                        }

                        const playlistItems: PlayerTrack[] = items.map((t) => ({
                          id: t.id,
                          title: t.caption || 'Studio Generation',
                          subtitle: t.keyscale ? `${t.keyscale} · ${t.bpm || 120} BPM` : 'MiniMax-Music3',
                          artist: 'Studio',
                          category: 'Studio',
                          audioUrl: t.audioUrl,
                          duration: t.durationMs ? Math.round(t.durationMs / 1000) : 60,
                          durationFormatted: formatDuration(t.durationMs ? t.durationMs / 1000 : 60),
                          bpm: t.bpm,
                          keyscale: t.keyscale,
                          waveform: t.waveform,
                          sourceList: `Studio - ${groupKey}`,
                          originalItem: t,
                        }))

                        player.playList(playlistItems, idx, `Studio - ${groupKey}`)
                        onPlayTrack?.(item)
                      }

                      return (
                        <StudioTrackItem
                          key={item.id}
                          item={item}
                          isThisPlaying={isThisPlaying}
                          isFav={isFav}
                          onPlay={handlePlayItem}
                          onToggleFavorite={toggleFavorite}
                          onDeleteTrack={onDeleteTrack}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {filteredHistory.length === 0 && (
              <div className="bg-[#121215] border border-dashed border-[#27272a] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                <FileMusic className="size-8 text-zinc-600" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-zinc-300">No tracks generated in this session</span>
                  <span className="text-xs text-zinc-500 max-w-sm">
                    Write a prompt on the left and click Generate to create a track in this studio session.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
