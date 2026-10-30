import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { MusicPromptHeroCard, BEAT_PROMPT_SUGGESTIONS } from '@/modules/music/components/MusicPromptHeroCard'
import { MusicTrackItem, type MusicTrackItemData } from '@/modules/music/components/MusicTrackItem'
import { usePlayer } from '@/hooks/usePlayer'
import type { PlayerTrack } from '@/store/playerStore'
import { dbService } from '@/lib/services/dbService'
import { formatDuration } from '@/modules/music/utils/formatDuration'
import type { BeatGenerationOutput } from '../types'

const CURATED_BEAT_TRACKS: MusicTrackItemData[] = [
  {
    id: 'curated-beat-1',
    title: 'Next Move — 808 Tech Trap Beat',
    category: 'Beats Generation',
    subCategory: 'Echo Studio · 140 BPM · F minor',
    duration: '0:30',
    durationSec: 30,
    cover: '/covers/star_fox_dream.jpg',
    waveform: [15, 35, 50, 70, 80, 90, 75, 65, 70, 85, 80, 65, 50, 35, 30, 45, 60, 75, 50, 25],
  },
  {
    id: 'curated-beat-2',
    title: 'Midnight Lo-Fi Chillhop Coffee',
    category: 'Beats Generation',
    subCategory: 'Echo Studio · 82 BPM · Eb major',
    duration: '0:30',
    durationSec: 30,
    cover: '/covers/stardust_visitor.jpg',
    waveform: [25, 45, 60, 75, 65, 50, 70, 85, 60, 45, 75, 90, 70, 50, 35, 45, 60, 75, 55, 35],
  },
  {
    id: 'curated-beat-3',
    title: 'Cyber Drift — Outrun Synthwave Beat',
    category: 'Beats Generation',
    subCategory: 'Echo Studio · 120 BPM · D minor',
    duration: '0:30',
    durationSec: 30,
    cover: '/covers/got/knight_oath.jpg',
    waveform: [30, 50, 70, 85, 95, 80, 65, 75, 90, 80, 65, 70, 85, 60, 45, 55, 75, 85, 65, 40],
  },
]

interface BeatsActivitiesViewProps {
  prompt: string
  onChangePrompt: (val: string) => void
  duration: number
  onChangeDuration: (val: number) => void
  onGenerate: () => void
  isGenerating: boolean
  activeTrack: BeatGenerationOutput | null
  onPlayTrack?: (track: MusicTrackItemData | BeatGenerationOutput) => void
  historyTracks?: BeatGenerationOutput[]
}

export const BeatsActivitiesView: React.FC<BeatsActivitiesViewProps> = ({
  prompt,
  onChangePrompt,
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
  const [dbBeatTracks, setDbBeatTracks] = useState<MusicTrackItemData[]>([])

  const player = usePlayer()

  // Load beat activities from SQLite database
  useEffect(() => {
    dbService
      .getActivities()
      .then((items) => {
        if (items && items.length > 0) {
          const beatActivities: MusicTrackItemData[] = items
            .filter((a) => a.type === 'beat' || a.category?.toLowerCase().includes('beat'))
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
                  : 30
              const dur = formatDuration(durMs ? durMs / 1000 : rawDur || 30)
              const wf = (music?.waveform as number[]) || (a.metadata?.waveform as number[]) || [20, 40, 60, 80, 50, 30]

              return {
                id: a.id,
                title: a.title,
                category: 'Beats Generation',
                subCategory: a.subCategory || String(music?.caption || 'ACE-Step 1.5 Instrumental'),
                duration: dur,
                durationSec: durSec,
                cover: String(music?.cover || '/covers/stardust_visitor.jpg'),
                waveform: wf,
                audioUrl: typeof music?.audioUrl === 'string' ? music.audioUrl : undefined,
              }
            })
          setDbBeatTracks(beatActivities)
        }
      })
      .catch(() => {})
  }, [])

  // Map local history items into MusicTrackItemData
  const historyMapped: MusicTrackItemData[] = historyTracks.map((h) => {
    const durSec = h.durationMs ? Math.round(h.durationMs / 1000) : 30
    return {
      id: h.id,
      title: h.caption || 'Generated Instrumental Beat',
      category: 'Beats Generation',
      subCategory: `${h.bpm || 140} BPM · ${h.keyscale || 'F minor'} · ACE-Step 1.5`,
      duration: `${Math.floor(durSec / 60)}:${durSec % 60 < 10 ? '0' : ''}${durSec % 60}`,
      durationSec: durSec,
      cover: '/covers/stardust_visitor.jpg',
      waveform: h.waveform || [25, 45, 60, 75, 50, 40],
      audioUrl: h.audioUrl,
    }
  })

  // Combine history + db tracks + curated tracks
  const combinedTracks = [
    ...historyMapped,
    ...dbBeatTracks.filter((d) => !historyMapped.some((h) => h.id === d.id)),
    ...CURATED_BEAT_TRACKS.filter((c) => !historyMapped.some((h) => h.id === c.id)),
  ]

  const allTracks = searchQuery.trim()
    ? combinedTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subCategory.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : combinedTracks

  const handleDownload = (_id: string, audioUrl?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `beat-${Date.now()}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloadedId(_id)
    setTimeout(() => setDownloadedId(null), 2000)
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-20">
      {/* Dynamic Ambient Background Glow - matching Songs screen */}
      <div className="absolute top-0 left-0 right-0 h-[480px] overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/25 via-orange-700/12 to-transparent blur-[80px]" />
        <div className="absolute -top-[40px] right-[8%] w-[480px] h-[280px] bg-gradient-to-br from-rose-500/18 via-red-600/10 to-transparent blur-[80px] rounded-full" />
        <div className="absolute -top-[60px] left-[6%] w-[500px] h-[300px] bg-gradient-to-tr from-purple-800/16 via-amber-950/10 to-transparent blur-[90px] rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e0e11]/30 to-[#0e0e11]" />
      </div>

      {/* 1. Prompt Hero Card Section */}
      <MusicPromptHeroCard
        prompt={prompt}
        onChangePrompt={onChangePrompt}
        isInstrumental={true}
        onChangeInstrumental={() => {}}
        duration={duration}
        onChangeDuration={onChangeDuration}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
        suggestions={BEAT_PROMPT_SUGGESTIONS}
      />

      {/* 2. Activities List (Identical to Songs home screen) */}
      <section className="relative z-10 mb-10 pt-2 w-full">
        {/* Section Header with Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Recent Activity
            </h2>
            <p className="text-xs text-zinc-400 my-1.5">
              All generated beats, instrumental arrangements, and rhythm productions
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search beats..."
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

        {/* Clean Activity Rows Container */}
        <div className="w-full shrink-0 flex flex-col gap-1">
          {allTracks.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No beats match your search.
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

                const playlistItems: PlayerTrack[] = allTracks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  subtitle: t.subCategory,
                  artist: t.category,
                  category: t.category,
                  cover: t.cover,
                  audioUrl: t.audioUrl || '',
                  duration: t.durationSec,
                  durationFormatted: t.duration ? String(t.duration) : undefined,
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
