import React, { useRef } from 'react'
import {
  SlidersHorizontal,
  Music,
  X,
  Layers,
  Clock,
  ArrowUp,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx/lite'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { generateAiLyrics } from '../services/lyric-generator.service'
import { generateLyricsStream } from '../services/music-api'

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
  vocalMode,
  onChangeVocalMode,
  duration,
  onChangeDuration,
  onGenerate,
  isGenerating,
  suggestions,
  className,
}) => {
  const activeSuggestions = suggestions || SONG_PROMPT_SUGGESTIONS
  const currentMode = vocalMode || (isInstrumental ? 'instrumental' : lyrics.trim() ? 'manual' : 'auto')
  const handleModeChange = (mode: 'instrumental' | 'manual' | 'auto') => {
    if (onChangeVocalMode) {
      onChangeVocalMode(mode)
    } else {
      onChangeInstrumental(mode === 'instrumental')
    }
  }
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
    const current = lyrics || ''
    const separator = current.length > 0 && !current.endsWith('\n') ? '\n\n' : ''
    const updated = `${current}${separator}${tag}\n`
    onChangeLyrics(updated)
    setTimeout(() => {
      lyricsInputRef.current?.focus()
    }, 50)
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
      {/* Ambient Subtle Radial Glow behind right side of card */}
      <div className="absolute top-2 right-1/4 w-[420px] h-[220px] bg-gradient-to-r from-amber-600/15 via-rose-600/20 to-red-600/15 blur-[90px] pointer-events-none rounded-full" />

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

        {/* Sub-bar: 3-Way Mode Segmented Control & Clear button */}
        <div className="flex items-center justify-between pt-0.5">
          {/* 3-Way Vocal Mode Segmented Control */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#19191d] border border-white/5">
            <button
              type="button"
              onClick={() => handleModeChange('instrumental')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none',
                currentMode === 'instrumental'
                  ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
              title="Pure instrumental backing track, no vocals"
            >
              <Music className="size-3 text-zinc-400" />
              <span>Instrumental</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('manual')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none',
                currentMode === 'manual'
                  ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
              title="Write your own lyrics with structure tags"
            >
              <FileText className="size-3 text-sky-400" />
              <span>Manual</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none',
                currentMode === 'auto'
                  ? 'bg-[#2c2c31] text-white shadow-xs border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
              title="AI generates lyrics from your description using Qwen-1.7B"
            >
              <Sparkles className="size-3 text-amber-400" />
              <span>Auto</span>
            </button>
          </div>

          {/* Right: Clear Prompt Button */}
          {prompt && (
            <button
              type="button"
              onClick={() => onChangePrompt('')}
              className="size-7 rounded-lg bg-[#313136] hover:bg-[#3c3c43] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Clear prompt"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Prompt Textarea - Auto-grows dynamically with text */}
        <AutoResizeTextarea
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          minHeight={75}
          placeholder="Produce an upbeat modern pop anthem with catchy vocal harmonies, soaring hook, and driving drums."
          className="w-full bg-transparent text-[14.5px] sm:text-[15px] text-zinc-100 placeholder:text-zinc-400/90 outline-none leading-relaxed font-normal"
        />

        {/* Instrumental Mode Notice */}
        {currentMode === 'instrumental' && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#19191d] border border-white/5 text-xs text-zinc-400 animate-in fade-in duration-200">
            <Music className="size-3.5 text-zinc-400 shrink-0" />
            <span>Instrumental mode — backing music will render without singing.</span>
          </div>
        )}

        {/* Manual Lyrics Editor */}
        {currentMode === 'manual' && onChangeLyrics && (
          <div className="pt-2 border-t border-[#35353d]/80 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <FileText className="size-3.5 text-white" />
                <span>Manual Lyrics</span>
              </div>

              {/* Quick structure tag buttons */}
              <div className="flex items-center gap-1">
                {LYRIC_STRUCTURE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-[#2a2a2f] hover:bg-[#34343a] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-[#3c3c44]"
                    title={`Insert ${tag}`}
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
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            <AutoResizeTextarea
              ref={lyricsInputRef}
              value={lyrics}
              onChange={(e) => onChangeLyrics(e.target.value)}
              onKeyDown={handleKeyDown}
              minHeight={65}
              placeholder="Enter custom lyrics with structure tags like [Verse] / [Chorus]..."
              className="w-full bg-[#1c1c20]/80 border border-[#34343d] focus:border-zinc-500 rounded-xl p-3 text-xs sm:text-[13px] text-zinc-200 placeholder:text-zinc-400/80 outline-none leading-relaxed"
            />
          </div>
        )}

        {/* Auto Lyrics (AI-composed with streaming preview) */}
        {currentMode === 'auto' && onChangeLyrics && (
          <div className="pt-2 border-t border-[#35353d]/80 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Sparkles className="size-3.5 text-amber-400" />
                  <span>Auto Lyrics</span>
                </div>
                <button
                  type="button"
                  disabled={isStreamingLyrics || !prompt.trim()}
                  onClick={handleGenerateAiLyrics}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-200 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95 select-none disabled:opacity-50"
                  title={prompt.trim() ? 'Stream lyrics composed by local Qwen-1.7B LLM based on your description' : 'Enter a prompt description first'}
                >
                  {isStreamingLyrics ? (
                    <>
                      <Loader2 className="size-3 text-amber-400 animate-spin" />
                      <span>Streaming...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3 text-amber-400" />
                      <span>{lyrics ? '✨ Regenerate' : '✨ Generate Lyrics'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option to edit in manual mode */}
              {lyrics && (
                <button
                  type="button"
                  onClick={() => handleModeChange('manual')}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <FileText className="size-3" />
                  <span>Edit in Manual</span>
                </button>
              )}
            </div>

            {lyrics ? (
              <AutoResizeTextarea
                ref={lyricsInputRef}
                value={lyrics}
                onChange={(e) => onChangeLyrics(e.target.value)}
                onKeyDown={handleKeyDown}
                minHeight={65}
                placeholder="AI-generated lyrics will appear here..."
                className="w-full bg-[#1c1c20]/80 border border-[#34343d] focus:border-zinc-500 rounded-xl p-3 text-xs sm:text-[13px] text-zinc-200 placeholder:text-zinc-400/80 outline-none leading-relaxed"
              />
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#19191d] border border-white/5 text-xs text-zinc-500">
                <Sparkles className="size-3 text-amber-500/50 shrink-0" />
                <span>Click "✨ Generate Lyrics" to compose lyrics from your prompt, or leave empty for the engine to auto-compose during generation.</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Bar: Variants & Duration on Left, Generate Button on Right */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
            {/* Variations indicator - Clean inline matching ElevenLabs */}
            <div className="flex items-center gap-1.5 select-none" title="2 Generation Variants">
              <Layers className="size-3.5 text-zinc-400" />
              <span>2</span>
            </div>

            {/* Duration selector pill - Includes 3:00 (180s) */}
            <button
              type="button"
              onClick={() =>
                onChangeDuration(
                  duration === 30 ? 60 : duration === 60 ? 120 : duration === 120 ? 180 : 30
                )
              }
              className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors cursor-pointer select-none"
              title="Click to toggle track duration (0:30, 1:00, 2:00, 3:00)"
            >
              <Clock className="size-3.5 text-zinc-400" />
              <span>
                {duration >= 60
                  ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                  : `0:${duration.toString().padStart(2, '0')}`}
              </span>
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

