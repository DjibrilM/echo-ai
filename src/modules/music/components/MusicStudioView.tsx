import React, { useState, useMemo } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  ArrowRight,
  Search,
  FileMusic,
  X,
  Clock,
  Mic2,
  Music,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  Sliders,
} from 'lucide-react'
import { generateAiLyrics } from '../services/lyric-generator.service'
import { generateLyricsStream } from '../services/music-api'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import ExpandableContainer from '@/components/ExpandableContainer'
import { ShimmeringText } from '@/components/ui/shimmering-text'
import NumberFlow from '@number-flow/react'
import { StudioTrackItem } from './StudioTrackItem'
import { ReferenceAndCoverSection } from './ReferenceAndCoverSection'
import { formatDuration } from '../utils/formatDuration'
import { usePlayer } from '@/hooks/usePlayer'
import {
  referenceAudioAtom,
  activeDrawerTabAtom,
  bpmAtom,
  keyscaleAtom,
} from '../store/musicStore'
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
  onChangeEngine: (engine: 'acestep' | 'minimax') => void
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
  isInstrumental,
  onChangeInstrumental,
  vocalMode,
  onChangeVocalMode,
  duration,
  onChangeDuration,
  engine,
  onChangeEngine,
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
  onOpenEditModal,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'reference'>('prompt')
  const [searchHistory, setSearchHistory] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isStreamingLyrics, setIsStreamingLyrics] = useState(false)

  const referenceAudio = useAtomValue(referenceAudioAtom)
  const bpm = useAtomValue(bpmAtom)
  const keyscale = useAtomValue(keyscaleAtom)
  const [, setActiveDrawerTab] = useAtom(activeDrawerTabAtom)

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
    <div className="w-full min-h-0 select-none pb-28">
      <div className="w-full max-w-[1600px] mx-auto  flex flex-col lg:flex-row gap-7 p-6 sm:p-8 items-start">
        {/* LEFT COLUMN: Prompt Studio Panel (Sticky Editor) */}
        <div className="lg:w-115 xl:w-[750px] w-full shrink-0 flex flex-col gap-5 pr-0.5 lg:sticky lg:top-4 self-start max-h-[calc(100vh-140px)] lg:overflow-y-auto sidebar-scrollbar">
          {/* Model Pills row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeEngine(engine === 'acestep' ? 'minimax' : 'acestep')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#161619] hover:bg-[#1e1e22] text-zinc-200 border border-[#27272a] hover:border-zinc-700 transition-colors cursor-pointer select-none"
              >
                <FileMusic className="size-3.5 text-zinc-400" />
                <span>{engine === 'acestep' ? 'Music v2 (ACE-Step)' : 'MiniMax Music'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'reference' ? 'prompt' : 'reference')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer select-none ${
                  referenceAudio
                    ? 'bg-violet-950/40 text-violet-300 border-violet-700/50 hover:bg-violet-900/40'
                    : 'bg-[#161619] text-zinc-400 border-[#27272a] hover:border-zinc-700 hover:text-zinc-300'
                }`}
                title={referenceAudio ? `Active Reference: ${referenceAudio}` : 'Click to add reference audio'}
              >
                <span>{referenceAudio ? `🎵 Ref: ${referenceAudio.split(/[/\\]/).pop()}` : 'Default Timbre'}</span>
              </button>
            </div>

            {/* Quick Musical Context badges */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              {bpm > 0 && (
                <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#27272a]">
                  {bpm} BPM
                </span>
              )}
              {keyscale && keyscale.toLowerCase() !== 'none' && (
                <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#27272a]">
                  {keyscale}
                </span>
              )}
              <button
                type="button"
                onClick={() => setActiveDrawerTab('controls')}
                className="p-1.5 rounded-md bg-[#161619] hover:bg-[#1e1e22] text-zinc-400 hover:text-zinc-200 border border-[#27272a] hover:border-zinc-700 transition-colors cursor-pointer"
                title="Open musical controls (BPM, Key, Time signature, etc.)"
              >
                <Sliders className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Studio Prompt Card - Big, spacious editing */}
          <div className="bg-[#161619] border border-[#27272a] focus-within:border-zinc-600 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 relative transition-all">
            {/* Top Tabs inside Prompt Box */}
            <div className="flex items-center justify-between border-b border-[#232328] pb-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('prompt')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${activeTab === 'prompt'
                    ? 'bg-[#1e1e22] text-zinc-100 border border-[#2d2d33]'
                    : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  Prompt
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reference')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${activeTab === 'reference'
                    ? 'bg-[#1e1e22] text-zinc-100 border border-[#2d2d33]'
                    : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  + Reference
                </button>
              </div>

              {prompt && (
                <button
                  type="button"
                  onClick={() => onChangePrompt('')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Prompt Description Textarea or Reference Conditioning */}
            {activeTab === 'reference' ? (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <ReferenceAndCoverSection />
              </div>
            ) : (
              <AutoResizeTextarea
                value={prompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && prompt.trim()) {
                    e.preventDefault()
                    onGenerate()
                  }
                }}
                minHeight={115}
                placeholder="A slow, emotional piano ballad featuring a solo piano with subtle string accompaniment, conveying a sense of sadness and reflection..."
                className="w-full bg-transparent text-[15px] sm:text-base text-zinc-100 placeholder:text-zinc-500 outline-none leading-relaxed font-normal"
              />
            )}

            {/* Vocal & Lyrics Mode Selector Section: Instrumental | Manual Lyrics | Auto Lyrics */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-[#232328]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mic2 className="size-3.5 text-white" />
                  <span className="text-xs sm:text-[13px] font-semibold text-zinc-300">Vocals & Lyrics</span>
                </div>

                {/* 3-Way Mode Segmented Control */}
                {(() => {
                  const currentMode = vocalMode || (isInstrumental ? 'instrumental' : lyrics.trim() ? 'manual' : 'auto')
                  const handleModeChange = (mode: 'instrumental' | 'manual' | 'auto') => {
                    if (onChangeVocalMode) {
                      onChangeVocalMode(mode)
                    } else {
                      onChangeInstrumental(mode === 'instrumental')
                    }
                  }

                  return (
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#141418] border border-white/5">
                      <button
                        type="button"
                        onClick={() => handleModeChange('instrumental')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentMode === 'instrumental'
                            ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Music className="size-3 text-zinc-400" />
                        <span>Instrumental</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange('manual')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentMode === 'manual'
                            ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <FileText className="size-3 text-sky-400" />
                        <span>Manual Lyrics</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange('auto')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentMode === 'auto'
                            ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Sparkles className="size-3 text-amber-400" />
                        <span>Auto Lyrics</span>
                      </button>
                    </div>
                  )
                })()}
              </div>

              {/* Views per Mode */}
              {(() => {
                const currentMode = vocalMode || (isInstrumental ? 'instrumental' : lyrics.trim() ? 'manual' : 'auto')
                const handleModeChange = (mode: 'instrumental' | 'manual' | 'auto') => {
                  if (onChangeVocalMode) {
                    onChangeVocalMode(mode)
                  } else {
                    onChangeInstrumental(mode === 'instrumental')
                  }
                }

                if (currentMode === 'instrumental') {
                  return (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141418] border border-white/5 text-xs text-zinc-400 animate-in fade-in duration-200">
                      <Music className="size-3.5 text-zinc-400 shrink-0" />
                      <span>Instrumental Mode active. Backing music will be rendered without singing.</span>
                    </div>
                  )
                }

                if (currentMode === 'manual') {
                  return (
                    <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-zinc-400 font-medium">Write custom song lyrics:</span>

                        {/* Quick structure tag buttons */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">Tags:</span>
                          {['[verse]', '[chorus]', '[bridge]', '[outro]'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const cur = lyrics || ''
                                const sep = cur.length > 0 && !cur.endsWith('\n') ? '\n\n' : ''
                                onChangeLyrics(`${cur}${sep}${tag}\n`)
                              }}
                              className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[#0e0e11] hover:bg-[#202026] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-[#27272a]"
                              title={`Insert ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                          {lyrics && (
                            <button
                              type="button"
                              onClick={() => onChangeLyrics('')}
                              className="size-5 rounded ml-1 bg-[#0e0e11] hover:bg-[#202026] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Clear lyrics"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <AutoResizeTextarea
                        value={lyrics}
                        onChange={(e) => onChangeLyrics(e.target.value)}
                        minHeight={120}
                        placeholder="[verse]&#10;Write your verse lines here...&#10;&#10;[chorus]&#10;Write your chorus lines here..."
                        className="w-full bg-[#0e0e11] border border-[#24242a] focus:border-zinc-500 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 outline-none leading-relaxed transition-colors font-mono"
                      />
                    </div>
                  )
                }

                // Auto (AI Lyrics) Mode View
                return (
                  <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isStreamingLyrics}
                        onClick={handleGenerateAiLyrics}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-200 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95 select-none disabled:opacity-50"
                        title={prompt.trim() ? 'Stream lyrics composed by local Qwen-1.7B LLM based on your description' : 'Enter a prompt description to generate matching lyrics'}
                      >
                        {isStreamingLyrics ? (
                          <>
                            <Loader2 className="size-3.5 text-amber-400 animate-spin" />
                            <span>Streaming with Qwen-1.7B...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5 text-amber-400" />
                            <span>{lyrics ? '✨ Regenerate with Qwen' : '✨ Generate Lyrics with Qwen'}</span>
                          </>
                        )}
                      </button>

                      {lyrics && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('manual')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
                        >
                          <FileText className="size-3" />
                          <span>Edit in Manual Mode</span>
                        </button>
                      )}
                    </div>

                    {lyrics ? (
                      <AutoResizeTextarea
                        value={lyrics}
                        onChange={(e) => onChangeLyrics(e.target.value)}
                        minHeight={120}
                        className="w-full bg-[#0e0e11] border border-amber-500/25 focus:border-amber-500/40 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 outline-none leading-relaxed transition-colors font-mono"
                      />
                    ) : (
                      <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-zinc-300">
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                          <Sparkles className="size-3.5" />
                          <span>Automatic Lyrics Active</span>
                        </div>
                        <p className="text-zinc-400 text-[11.5px] leading-relaxed">
                          Qwen-1.7B will automatically compose, structure, and perform lyrics based on your song description. Click <strong className="text-amber-200">"✨ Generate Lyrics with Qwen"</strong> above to preview & stream, or simply click <strong className="text-zinc-200">"Generate"</strong> to let AI create and sing automatically!
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Bottom Bar: Duration & Generate Button */}
            <div className="flex items-center justify-between pt-3 border-t border-[#232328]">
              <div className="flex items-center gap-2">
                {/* Duration selector */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeDuration(
                      duration === 30 ? 60 : duration === 60 ? 120 : duration === 120 ? 180 : 30
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-[#0e0e11] border border-[#27272a] hover:border-zinc-600 transition-colors cursor-pointer select-none"
                  title="Toggle duration (30s, 1:00, 2:00, 3:00)"
                >
                  <Clock className="size-3.5 text-zinc-400" />
                  <span>
                    {duration >= 60
                      ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                      : `0:${duration.toString().padStart(2, '0')}`}
                  </span>
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="button"
                disabled={isGenerating || !prompt.trim()}
                onClick={onGenerate}
                className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2 font-medium text-xs sm:text-sm shadow-xl cursor-pointer"
                title={
                  !prompt.trim()
                    ? 'Enter a prompt description'
                    : isGenerating
                      ? 'Synthesizing...'
                      : 'Generate Music'
                }
              >
                <span>{isGenerating ? 'Synthesizing...' : 'Generate'}</span>
                <ArrowRight className="size-4 stroke-[2.5]" />
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
                    text={generationProgress?.stage || 'Generating Audio...'}
                    shimmerColor="#ffffff"
                    duration={1.8}
                    className="text-xs font-medium text-white"
                  />
                </span>
                <span className="font-mono text-zinc-300 text-xs flex items-center">
                  {generationProgress?.percentage !== undefined && generationProgress.percentage > 0 ? (
                    <>
                      <NumberFlow value={generationProgress.percentage} />%
                    </>
                  ) : (
                    'In progress'
                  )}
                </span>
              </div>

              {/* Progress Bar - Clean monochrome white */}
              <div className="w-full h-1.5 bg-[#0e0e11] rounded-full overflow-hidden border border-white/5">
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

        {/* RIGHT COLUMN: Preview & Project History (Page level flow) */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 pl-0.5">
          {/* Search & Sort Controls Header - Sticky with top padding and no star icon */}
          <div className="sticky top-0 z-10 bg-[#0e0e11]/95 backdrop-blur-md pt-3.5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search project history..."
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

          {/* Date Grouped Generations List */}
          <div className="flex flex-col gap-6">
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
                          subtitle: t.keyscale ? `${t.keyscale} · ${t.bpm || 120} BPM` : 'ACE-Step v1.5',
                          artist: 'Studio',
                          category: 'Studio',
                          cover: '/covers/stardust_visitor.jpg',
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
                          onOpenEditModal={onOpenEditModal}
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
      </div>
    </div>
  )
}
