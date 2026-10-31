import { useRef, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles, Download, MoreVertical } from 'lucide-react'
import clsx from 'clsx/lite'
import { MusicTrack, ActiveMedia } from '../types'
import { MUSIC_TRACKS } from '../services/dashboard-service'

export interface MusicGenerationCarouselProps {
  activeMedia: ActiveMedia | null
  isPlaying: boolean
  onPlayTrack: (track: MusicTrack) => void
}

export function MusicGenerationCarousel({
  activeMedia,
  isPlaying,
  onPlayTrack,
}: MusicGenerationCarouselProps) {
  const musicScrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true })

  const updateScroll = () => {
    const el = musicScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setScrollState({
      canScrollLeft: scrollLeft > 10,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 10,
    })
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (musicScrollRef.current) {
      const scrollAmount = 380
      musicScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(updateScroll, 300)
    }
  }

  const musicColumns = useMemo(() => {
    const cols: MusicTrack[][] = [[], [], []]
    MUSIC_TRACKS.forEach((track, i) => {
      cols[i % 3].push(track)
    })
    return cols
  }, [])

  return (
    <section className="mb-10 pt-2">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pt-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            My Latest Music
          </h2>
          <p className="text-xs text-zinc-400 my-1.5">
            AI-generated compositions, tracks, and audio masters
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="size-8 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Previous tracks"
            aria-label="Previous tracks"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="size-8 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Next tracks"
            aria-label="Next tracks"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* 3-Column YouTube Music Grid with Smooth Edge Gradients */}
      <div className="relative -mx-2 px-2">
        {/* Left Fade Mask */}
        <div
          className={clsx(
            'pointer-events-none absolute left-0 top-0 bottom-3 w-8 sm:w-14 bg-gradient-to-r from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Right Fade Mask */}
        <div
          className={clsx(
            'pointer-events-none absolute right-0 top-0 bottom-3 w-8 sm:w-14 bg-gradient-to-l from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          ref={musicScrollRef}
          onScroll={updateScroll}
          className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1"
        >
          {musicColumns.map((column, colIdx) => (
            <div key={colIdx} className="min-w-[320px] flex-1 flex flex-col gap-1">
              {column.map((track) => {
                const isCurrentTrack = activeMedia?.id === track.id
                const isThisPlaying = isCurrentTrack && isPlaying

                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    {/* Left: Play button + Track Index + Title & AI Generation Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Audio Play Button */}
                      <div
                        className={clsx(
                          'size-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer',
                          isThisPlaying
                            ? 'bg-white text-black shadow-md scale-105'
                            : 'bg-white/[0.08] group-hover:bg-white/[0.16] text-zinc-300 group-hover:text-white'
                        )}
                      >
                        {isThisPlaying ? (
                          <Pause className="size-4 fill-current text-current" />
                        ) : (
                          <Play className="size-4 fill-current text-current ml-0.5" />
                        )}
                      </div>

                      {/* Track Sequence Index */}
                      <div className="flex items-center justify-start w-5 shrink-0">
                        <span
                          className={clsx(
                            'font-mono text-xs tabular-nums transition-colors',
                            isThisPlaying
                              ? 'text-white font-bold'
                              : 'text-zinc-500 group-hover:text-zinc-300'
                          )}
                        >
                          {track.trackNumber}
                        </span>
                      </div>

                      {/* Title & AI Generation Details */}
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[13.5px] font-semibold text-white truncate tracking-tight group-hover:text-zinc-100">
                          {track.title}
                        </span>
                        <div className="text-[11.5px] text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="text-zinc-300 font-medium truncate">{track.genre}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400 truncate">{track.bpm} BPM</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-500 truncate">{track.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Duration & Quick AI Actions on hover */}
                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                      <span className="text-[11px] font-mono text-zinc-500 tabular-nums group-hover:hidden transition-all pr-1">
                        {track.duration}
                      </span>

                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="size-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                          title="Generate variations"
                        >
                          <Sparkles className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="size-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                          title="Download audio"
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="size-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                          title="More options"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
