import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import clsx from 'clsx/lite'
import { Story, ActiveMedia } from '../types'
import { STORIES } from '../services/dashboard-service'

export interface AudioStoriesCarouselProps {
  activeMedia: ActiveMedia | null
  isPlaying: boolean
  onPlayStory: (story: Story) => void
}

export function AudioStoriesCarousel({
  activeMedia,
  isPlaying,
  onPlayStory,
}: AudioStoriesCarouselProps) {
  const storiesScrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true })

  const updateScroll = () => {
    const el = storiesScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setScrollState({
      canScrollLeft: scrollLeft > 10,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 10,
    })
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (storiesScrollRef.current) {
      const scrollAmount = 480
      storiesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(updateScroll, 300)
    }
  }

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Audio Stories</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immersive cinematic stories with professional voice actors and background score
          </p>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="size-8 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Previous stories"
            aria-label="Previous stories"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="size-8 rounded-full border border-white/15 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Next stories"
            aria-label="Next stories"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Story Cards Carousel with Smooth Edge Gradients */}
      <div className="relative -mx-2 px-2">
        {/* Left Fade Mask */}
        <div
          className={clsx(
            'pointer-events-none absolute left-0 top-0 bottom-4 w-10 sm:w-16 bg-gradient-to-r from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Right Fade Mask */}
        <div
          className={clsx(
            'pointer-events-none absolute right-0 top-0 bottom-4 w-10 sm:w-16 bg-gradient-to-l from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          ref={storiesScrollRef}
          onScroll={updateScroll}
          className="flex gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none"
        >
          {STORIES.map((story) => {
            const isCurrentStory = activeMedia?.id === story.id
            const isCurrentPlaying = isCurrentStory && isPlaying

            return (
              <div
                key={story.id}
                onClick={() => onPlayStory(story)}
                className="group relative flex flex-col w-[190px] sm:w-[215px] shrink-0 cursor-pointer"
              >
                {/* 1:1 Album Cover Container */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#18181b] shadow-lg">
                  <img
                    src={story.cover}
                    alt={story.title}
                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10 pointer-events-none transition-opacity duration-300" />

                  {/* Play Button - ALWAYS VISIBLE */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlayStory(story)
                    }}
                    className={clsx(
                      'absolute bottom-3 right-3 size-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-black/60 transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer z-10',
                      isCurrentPlaying ? 'ring-2 ring-white/50' : ''
                    )}
                    title={isCurrentPlaying ? 'Pause' : 'Play'}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="size-5 fill-black" />
                    ) : (
                      <Play className="size-5 fill-black ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Story Info Beneath Cover */}
                <div className="mt-2.5 flex flex-col">
                  <h3 className="text-[14px] font-semibold text-white tracking-tight truncate group-hover:text-zinc-200 transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {story.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
