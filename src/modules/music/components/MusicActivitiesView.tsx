import React, { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { usePlayer } from '@/hooks/usePlayer'
import type { PlayerTrack } from '@/store/playerStore'
import { dbService } from '@/lib/services/dbService'
import { MusicPromptHeroCard } from './MusicPromptHeroCard'
import { MusicTrackItem } from './MusicTrackItem'
import { formatDuration } from '../utils/formatDuration'
import type { MusicGenerationOutput } from '../types'

export interface MusicMarketplaceTrack {
  id: string
  title: string
  category: string
  subCategory: string
  duration: string
  durationSec: number
  cover: string
  waveform: number[]
  audioUrl?: string
}

export interface MusicActivitiesViewProps {
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
  activeTrack: MusicGenerationOutput | null
  isPlaying: boolean
  onPlayTrack: (track: MusicMarketplaceTrack | MusicGenerationOutput) => void
  historyTracks?: MusicGenerationOutput[]
}

export type MusicMarketplaceViewProps = MusicActivitiesViewProps

const DEFAULT_TRACKS: MusicMarketplaceTrack[] = [
  {
    id: 'curated-1',
    title: 'Inspire The Future',
    category: 'Music Generation',
    subCategory: 'Colours · Cinematic, Classical',
    duration: '1:00',
    durationSec: 60,
    cover: '/covers/stardust_visitor.jpg',
    waveform: [20, 35, 60, 80, 50, 40, 75, 90, 65, 45, 80, 95, 70, 50, 30, 45, 65, 85, 55, 40],
  },
  {
    id: 'curated-2',
    title: 'From Nothing — Powerful Cinematic Victory',
    category: 'Music Generation',
    subCategory: 'Good Music · Orchestral Climaxes',
    duration: '1:00',
    durationSec: 60,
    cover: '/covers/got/valyrian_blade.jpg',
    waveform: [15, 25, 40, 65, 85, 90, 95, 70, 60, 75, 90, 85, 60, 40, 30, 50, 70, 85, 60, 35],
  },
  {
    id: 'curated-3',
    title: 'Everything Will Be Fine - Hopeful Vibe',
    category: 'Music Generation',
    subCategory: 'Samuel · Pop, Piano Music',
    duration: '1:00',
    durationSec: 60,
    cover: '/covers/got/iron_crown.jpg',
    waveform: [25, 40, 50, 55, 70, 65, 80, 75, 60, 65, 70, 85, 65, 50, 40, 35, 50, 65, 55, 30],
  },
  {
    id: 'curated-4',
    title: 'Echoes of Redemption',
    category: 'Music Generation',
    subCategory: 'Quang Anh · Classical Cello & Synth',
    duration: '1:00',
    durationSec: 60,
    cover: '/covers/got/ashen_fortress.jpg',
    waveform: [30, 45, 65, 80, 70, 85, 90, 75, 60, 50, 70, 85, 90, 75, 55, 40, 60, 75, 50, 35],
  },
  {
    id: 'curated-5',
    title: 'Electric Bloom - Sparkling Synth Explainer Bed',
    category: 'Music Generation',
    subCategory: 'Hoa Nguyen · Commercial Pop',
    duration: '0:30',
    durationSec: 30,
    cover: '/covers/cloud_kingdom.jpg',
    waveform: [10, 20, 35, 55, 75, 85, 70, 60, 75, 80, 85, 65, 50, 40, 30, 45, 60, 75, 50, 30],
  },
  {
    id: 'curated-6',
    title: "The Hero's Heart",
    category: 'Music Generation',
    subCategory: 'Lê Anh · Epic Orchestral Brass',
    duration: '1:00',
    durationSec: 60,
    cover: '/covers/got/knight_oath.jpg',
    waveform: [20, 30, 45, 60, 75, 90, 85, 70, 80, 95, 85, 70, 50, 40, 35, 50, 65, 80, 55, 30],
  },
  {
    id: 'curated-7',
    title: 'Next Move — Digital Product Innovation',
    category: 'Music Generation',
    subCategory: 'quangtonle · Electronic Tech Beat',
    duration: '0:30',
    durationSec: 30,
    cover: '/covers/star_fox_dream.jpg',
    waveform: [15, 35, 50, 70, 80, 90, 75, 65, 70, 85, 80, 65, 50, 35, 30, 45, 60, 75, 50, 25],
  },
  {
    id: 'curated-8',
    title: 'Neon Horizon',
    category: 'Music Generation',
    subCategory: 'Echo Studio · 80s Synthwave & Drums',
    duration: '3:42',
    durationSec: 222,
    cover: '/covers/stardust_visitor.jpg',
    waveform: [35, 55, 70, 90, 80, 60, 75, 85, 70, 55, 65, 80, 95, 70, 50, 45, 65, 80, 60, 40],
  },
]

export const MusicActivitiesView: React.FC<MusicActivitiesViewProps> = ({
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
  activeTrack,
  onPlayTrack,
  historyTracks = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadedId, setDownloadedId] = useState<string | null>(null)
  const [dbMusicTracks, setDbMusicTracks] = useState<MusicMarketplaceTrack[]>([])

  const player = usePlayer()

  // Load activities from SQLite database
  useEffect(() => {
    dbService
      .getActivities()
      .then((items) => {
        if (items && items.length > 0) {
          const musicActivities: MusicMarketplaceTrack[] = items
            .filter((a) => a.type === 'music' || a.category?.toLowerCase().includes('music'))
            .map((a) => {
              const music = a.music || (a.data as Record<string, unknown> | undefined)
              const durMs = typeof music?.durationMs === 'number' ? music.durationMs : undefined
              const rawDur =
                typeof a.metadata?.duration === 'string' || typeof a.metadata?.duration === 'number'
                  ? a.metadata.duration
                  : typeof music?.duration === 'string' || typeof music?.duration === 'number'
                    ? music.duration
                    : undefined
              const durSec = durMs
                ? Math.round(durMs / 1000)
                : typeof rawDur === 'number'
                  ? Math.round(rawDur)
                  : 60
              const dur = formatDuration(durMs ? durMs / 1000 : rawDur || 60)
              const wf = (music?.waveform as number[]) || (a.metadata?.waveform as number[]) || [30, 50, 70, 85, 60, 40]

              return {
                id: a.id,
                title: a.title,
                category: a.category || 'Music Generation',
                subCategory: a.subCategory || String(music?.caption || 'ACE-Step v1.5'),
                duration: dur,
                durationSec: durSec,
                cover: String(music?.cover || '/covers/stardust_visitor.jpg'),
                waveform: wf,
                audioUrl: typeof music?.audioUrl === 'string' ? music.audioUrl : undefined,
              }
            })
          setDbMusicTracks(musicActivities)
        }
      })
      .catch(console.error)
  }, [])

  const handleDownload = (id: string, audioUrl?: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDownloadedId(id)
    setTimeout(() => setDownloadedId(null), 2000)

    if (audioUrl) {
      const a = document.createElement('a')
      a.href = audioUrl
      a.download = `echo-track-${id}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  // Combine user history tracks, DB activities, and curated tracks into a single list
  const allTracks = useMemo(() => {
    const fromHistory: MusicMarketplaceTrack[] = historyTracks.map((h) => {
      const durSec = h.durationMs ? Math.round(h.durationMs / 1000) : 60
      return {
        id: h.id,
        title: h.caption || 'Generated Track',
        category: 'Music Generation',
        subCategory: h.keyscale ? `${h.keyscale} · ${h.bpm || 120} BPM` : 'Original Track',
        duration: formatDuration(durSec),
        durationSec: durSec,
        cover: '/covers/stardust_visitor.jpg',
        waveform: h.waveform?.length ? h.waveform.slice(0, 32) : [30, 45, 60, 75, 50, 40, 65, 80],
        audioUrl: h.audioUrl,
      }
    })

    const map = new Map<string, MusicMarketplaceTrack>()
    for (const t of fromHistory) map.set(t.id, t)
    for (const t of dbMusicTracks) map.set(t.id, t)
    for (const t of DEFAULT_TRACKS) {
      if (!map.has(t.id)) map.set(t.id, t)
    }

    const combined = Array.from(map.values())

    if (!searchQuery.trim()) return combined

    const q = searchQuery.toLowerCase()
    return combined.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.subCategory.toLowerCase().includes(q)
    )
  }, [historyTracks, dbMusicTracks, searchQuery])

  return (
    <div className="relative flex-1 min-h-0 px-6 md:px-8 py-6 w-full flex flex-col gap-8 select-none">
      {/* YouTube Music Ambient Dynamic Gradient Backdrop - Confined strictly to prompt hero area */}
      <div className="absolute top-0 left-0 right-0 h-[260px] pointer-events-none overflow-hidden select-none z-0">
        {/* Layer 1: Top-wide deep crimson / ruby radial wash */}
        <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/25 via-rose-700/12 to-transparent blur-[80px]" />

        {/* Layer 2: Right-hand warm amber / orange fiery glow */}
        <div className="absolute -top-[40px] right-[8%] w-[480px] h-[280px] bg-gradient-to-br from-amber-500/18 via-orange-600/10 to-transparent blur-[80px] rounded-full" />

        {/* Layer 3: Left-hand deep plum / burgundy accent */}
        <div className="absolute -top-[60px] left-[6%] w-[500px] h-[300px] bg-gradient-to-tr from-purple-800/16 via-rose-950/10 to-transparent blur-[90px] rounded-full" />

        {/* Layer 4: Clean dissolve to solid background BEFORE activities list */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e0e11]/30 to-[#0e0e11]" />
      </div>

      {/* 1. Prompt Hero Card Section */}
      <MusicPromptHeroCard
        prompt={prompt}
        onChangePrompt={onChangePrompt}
        lyrics={lyrics}
        onChangeLyrics={onChangeLyrics}
        isInstrumental={isInstrumental}
        onChangeInstrumental={onChangeInstrumental}
        vocalMode={vocalMode}
        onChangeVocalMode={onChangeVocalMode}
        duration={duration}
        onChangeDuration={onChangeDuration}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />

      {/* 2. Activities List (Clean, unbordered, matching home screen) */}
      <section className="relative z-10 mb-10 pt-2 w-full">
        {/* Section Header with TTS Side Menu-style Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Recent Activity
            </h2>
            <p className="text-xs text-zinc-400 my-1.5">
              All generated voices, music compositions, and activities
            </p>
          </div>

          {/* Consistent Text Input Search - EXACT match with TTS Side Menu */}
          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
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
        </div>

        {/* Clean Activity Rows Container - No surrounding box, gap-1, exact copy of home screen */}
        <div className="w-full shrink-0 flex flex-col gap-1">
          {allTracks.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No activities match your search.
            </div>
          ) : (
            allTracks.map((activity, idx) => {
              const isThisPlaying =
                (player.currentTrack?.id === activity.id || activeTrack?.id === activity.id) &&
                player.isPlaying

              const handleTrackRowClick = () => {
                if (player.currentTrack?.id === activity.id) {
                  player.togglePlay()
                  return
                }

                // Convert list of activities into the playlist queue!
                const playlistItems: PlayerTrack[] = allTracks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  subtitle: t.subCategory,
                  artist: t.category,
                  category: t.category,
                  cover: t.cover,
                  audioUrl: t.audioUrl || '',
                  duration: t.durationSec,
                  durationFormatted: t.duration,
                  waveform: t.waveform,
                  sourceList: 'Recent Activity',
                  originalItem: t,
                }))

                player.playList(playlistItems, idx, 'Recent Activity')
                onPlayTrack?.(activity)
              }

              return (
                <MusicTrackItem
                  key={activity.id}
                  track={activity}
                  isPlaying={isThisPlaying}
                  onPlay={handleTrackRowClick}
                  onDownload={handleDownload}
                  isDownloaded={downloadedId === activity.id}
                />
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

// Backward compatibility alias
export const MusicMarketplaceView = MusicActivitiesView
