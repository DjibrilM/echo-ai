import React, { useRef } from 'react'
import {
  SlidersHorizontal,
  Music,
  X,
  Clock,
  ArrowUp,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx/lite'
import { useAtomValue } from 'jotai'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { generateAiLyrics } from '../services/lyric-generator.service'
import { generateLyricsStream } from '../services/music-api'
import { engineAtom } from '../store/musicStore'

export interface PromptSuggestion {
  label: string
  prompt: string
}

export const SONG_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    label: 'Upbeat Pop Anthem',
    prompt:
      'Upbeat pop anthem with vibrant modern synths, punchy bass groove, soaring vocal melodies and catchy hook',
  },
  {
    label: 'Melancholy Piano Ballad',
    prompt:
      'Melancholy emotional piano ballad with gentle cello harmonies, emotive chords, intimate vocal delivery, and room reverb',
  },
  {
    label: 'R&B Soul Slow Jam',
    prompt:
      'Smooth contemporary R&B slow jam with silky falsetto harmonies, warm rhodes chords, and deep sub bass',
  },
]

export const BEAT_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    label: 'Hard 808 Trap Beat',
    prompt:
      'Dark energetic trap beat with heavy distorted 808 glides, rapid hi-hat rolls, crisp clap, and eerie bell melody',
  },
  {
    label: 'Lo-Fi Chillhop Beat',
    prompt:
      'Dusty lo-fi hip hop beat with warm rhodes keys, vinyl crackle, mellow bassline, and laid-back boom bap drums',
  },
  {
    label: 'Neon Synthwave Beat',
    prompt:
      'Pulsing 80s outrun synthwave beat with analog arpeggios, punchy gated snare, driving bassline, and vintage drum machine',
  },
]

export const DEFAULT_PROMPT_SUGGESTIONS: PromptSuggestion[] = SONG_PROMPT_SUGGESTIONS

const LYRIC_STRUCTURE_TAGS = ['[Verse]', '[Chorus]', '[Bridge]', '[Outro]']

export interface MusicPromptHeroCardProps {
  prompt: string
  onChangePrompt: (val: string) => void
  lyrics?: string
  onChangeLyrics?: (val: string) => void
  isInstrumental: boolean
  onChangeInstrumental: (val: boolean) => void
  vocalMode?: 'instrumental' | 'manual' | 'auto'
  onChangeVocalMode?: (mode: 'instrumental' | 'manual' | 'auto') => void
  duration: number
  onChangeDuration: (val: number) => void
  onGenerate: () => void
  isGenerating: boolean
  suggestions?: PromptSuggestion[]
  className?: string
}

export const MusicPromptHeroCard: React.FC<MusicPromptHeroCardProps> = ({
  prompt,
  onChangePrompt,
  lyrics = '',
  onChangeLyrics,
  isInstrumental,
  onChangeInstrumental,
  onChangeVocalMode,
  duration,
  onChangeDuration,
  onGenerate,
  isGenerating,
  suggestions,
  className,
}) => {
  const activeEngine = useAtomValue(engineAtom)
  const activeSuggestions = suggestions || SONG_PROMPT_SUGGESTIONS
  const lyricsInputRef = useRef<HTMLTextAreaElement>(null)
  const [isStreamingLyrics, setIsStreamingLyrics] = React.useState(false)

  const handleGenerateAiLyrics = async () => {
    if (!onChangeLyrics || isStreamingLyrics) return
    setIsStreamingLyrics(true)
    onChangeLyrics('')
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

  const handleInsertTag = (tag: string) => {
    if (!onChangeLyrics) return
    const textarea = lyricsInputRef.current
    const currentText = lyrics || ''

    if (!textarea) {
      const separator = currentText.length > 0 && !currentText.endsWith('\n') ? '\n\n' : ''
      onChangeLyrics(`${currentText}${separator}${tag}\n`)
      return
    }

    const start = textarea.selectionStart ?? currentText.length
    const end = textarea.selectionEnd ?? currentText.length

    const textBefore = currentText.substring(0, start)
    const textAfter = currentText.substring(end)
    const needsLeadingNewline = textBefore.length > 0 && !textBefore.endsWith('\n')
    const prefix = needsLeadingNewline ? '\n\n' : ''
    const insertion = `${prefix}${tag}\n`

    const updated = textBefore + insertion + textAfter
    onChangeLyrics(updated)

    const newCursorPos = start + insertion.length
    requestAnimationFrame(() => {
      if (lyricsInputRef.current) {
        lyricsInputRef.current.focus()
        lyricsInputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }

  const canGenerate = Boolean(prompt.trim())
  const generateDisabled = isGenerating || !canGenerate

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !generateDisabled) {
      e.preventDefault()
      onGenerate()
    }
  }

  const generateTooltip = !prompt.trim()
    ? 'Enter a song description'
    : isGenerating
      ? 'Generating audio...'
      : 'Generate Song'

  return (
    <div className={clsx('relative flex flex-col items-center w-full pt-1', className)}>
      {/* Ambient Subtle Glow behind right side of card */}
      <div className="absolute top-2 right-1/4 w-[420px] h-[220px] bg-white/5 blur-[90px] pointer-events-none rounded-full" />

      {/* Floating Prompt Card - Exact match to ElevenLabs style */}
      <div className="relative z-10 w-full max-w-3xl bg-[#232327]/95 border border-[#35353c] focus-within:border-zinc-500 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all flex flex-col gap-3.5">
        {/* Top: Suggestion Chips inside the card */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSuggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onChangePrompt(suggestion.prompt)}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-[#313136] hover:bg-[#3a3a41] text-zinc-300 hover:text-white border border-[#404048] transition-colors cursor-pointer select-none flex items-center gap-1.5 shadow-xs"
            >
              <SlidersHorizontal className="size-3 text-zinc-400" />
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-bar: Clear button if prompt exists */}
        {prompt && (
          <div className="flex items-center justify-end pt-0.5">
            <button
              type="button"
              onClick={() => onChangePrompt('')}
              className="size-7 rounded-lg bg-[#313136] hover:bg-[#3c3c43] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Clear prompt"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Prompt Textarea - Auto-grows dynamically with text */}
        <AutoResizeTextarea
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          minHeight={75}
          placeholder="Produce an upbeat modern pop anthem with catchy vocal harmonies, soaring hook, and driving drums."
          className="w-full bg-transparent text-[14.5px] sm:text-[15px] text-zinc-100 placeholder:text-zinc-400/90 outline-none leading-relaxed font-normal"
        />

        {/* Lyrics Section */}
        {onChangeLyrics && (
          <div className="pt-2 border-t border-[#35353d]/80 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <FileText className="size-3.5 text-white" />
                <span>Lyrics</span>
                <span className="text-[11px] text-zinc-500 font-normal hidden sm:inline">(Optional)</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={isStreamingLyrics || !prompt.trim()}
                  onClick={handleGenerateAiLyrics}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer shadow-xs active:scale-95 select-none disabled:opacity-50"
                  title={prompt.trim() ? 'Stream lyrics composed by local Qwen-1.7B LLM based on your description' : 'Enter a prompt description first'}
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

                <div className="flex items-center gap-1">
                  {LYRIC_STRUCTURE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleInsertTag(tag)}
                      className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[#2a2a2f] hover:bg-[#34343a] text-zinc-300 hover:text-white transition-colors cursor-pointer border border-[#3c3c44]"
                      title={`Insert ${tag} at cursor`}
                    >
                      {tag}
                    </button>
                  ))}
                  {lyrics && (
                    <button
                      type="button"
                      onClick={() => onChangeLyrics('')}
                      className="size-5 rounded ml-1 bg-[#2a2a2f] hover:bg-[#34343a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Clear lyrics"
                    >
                      <X className="size-3 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <AutoResizeTextarea
              ref={lyricsInputRef}
              value={lyrics}
              onChange={(e) => onChangeLyrics(e.target.value)}
              onKeyDown={handleKeyDown}
              minHeight={65}
              placeholder="Enter custom lyrics with structure tags like [Verse] / [Chorus], or leave empty for auto-vocals / instrumental..."
              className="w-full bg-[#1c1c20]/80 border border-[#34343d] focus:border-zinc-500 rounded-xl p-3 text-xs sm:text-[13px] text-zinc-200 placeholder:text-zinc-400/80 outline-none leading-relaxed font-mono"
            />
          </div>
        )}

        {/* Bottom Bar: Duration & Instrumental on Left, Generate Button on Right */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
            {/* Duration selector pill - Includes 3:00 (180s) with ETA hint */}
            <button
              type="button"
              onClick={() =>
                onChangeDuration(
                  duration === 15 ? 30 : duration === 30 ? 60 : duration === 60 ? 120 : duration === 120 ? 180 : 30
                )
              }
              className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors cursor-pointer select-none"
              title={`Track length: ${duration}s · Click to cycle (0:15, 0:30, 1:00, 2:00, 3:00). Est. generation time: ${
                activeEngine === 'minimax'
                  ? `~${Math.max(1, Math.round((duration / 60) * 5.5))} min`
                  : `~${Math.max(5, Math.round(duration * 0.7))} sec`
              }`}
            >
              <Clock className="size-3.5 text-white" />
              <span>
                {duration >= 60
                  ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                  : `0:${duration.toString().padStart(2, '0')}`}
              </span>
              <span className="text-[10.5px] text-zinc-500 font-sans hidden sm:inline">
                {activeEngine === 'minimax'
                  ? `(~${Math.max(1, Math.round((duration / 60) * 5.5))}m)`
                  : `(~${Math.max(5, Math.round(duration * 0.7))}s)`}
              </span>
            </button>

            {/* Instrumental toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isInstrumental
                onChangeInstrumental(next)
                onChangeVocalMode?.(next ? 'instrumental' : lyrics?.trim() ? 'manual' : 'auto')
              }}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer select-none border',
                isInstrumental
                  ? 'bg-white text-black border-white'
                  : 'text-zinc-400 hover:text-zinc-200 border-[#3c3c44] bg-[#2a2a2f]'
              )}
              title={isInstrumental ? 'Instrumental active (no vocals)' : 'Click to generate instrumental only'}
            >
              <Music className="size-3" />
              <span>Instrumental</span>
            </button>
          </div>

          {/* Right: Generate Arrow Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generateDisabled}
              onClick={onGenerate}
              className="size-8.5 rounded-full bg-zinc-200 text-black hover:bg-white active:scale-95 disabled:bg-[#3f3f46]/60 disabled:text-zinc-500 disabled:pointer-events-none transition-all flex items-center justify-center font-medium shadow-md cursor-pointer"
              title={generateTooltip}
            >
              <ArrowUp className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

