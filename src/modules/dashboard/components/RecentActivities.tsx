import { useRef, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, ChevronRight, Download, Check, FileText, ArrowUpRight } from 'lucide-react'
import { motion, LayoutGroup } from 'framer-motion'
import clsx from 'clsx/lite'
import { TrackWavePlayer } from '@/components/player/TrackWavePlayer'
import { usePlayer } from '@/hooks/usePlayer'
import type { PlayerTrack } from '@/store/playerStore'
import { ActivityItem, ActivityTabId } from '../types'
import { ACTIVITIES, ACTIVITIES_TABS } from '../services/dashboard-service'
import { dbService } from '@/lib/services/dbService'
import type { ActivityTtsOrigin, ActivityMusicOrigin, ActivityStoryOrigin } from '@/lib/interfaces/activity'

export interface RecentActivitiesProps {
  activeActivityTab: ActivityTabId
  onSelectTab: (tabId: ActivityTabId) => void
  activeMediaId: string | null
  isPlaying: boolean
  downloadedId: string | null
  onPlayActivity: (activity: ActivityItem) => void
  onDownload: (id: string, e: React.MouseEvent) => void
}

export function RecentActivities({
  activeActivityTab,
  onSelectTab,
  activeMediaId,
  isPlaying,
  downloadedId,
  onPlayActivity,
  onDownload,
}: RecentActivitiesProps) {
  const [isSliding, setIsSliding] = useState(false)
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined)
  const [dbActivities, setDbActivities] = useState<ActivityItem[]>([])
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])

  const activeTabIndex = ACTIVITIES_TABS.findIndex((t) => t.id === activeActivityTab)

  useEffect(() => {
    dbService.getActivities().then((items) => {
      if (items && items.length > 0) {
        const mapped: ActivityItem[] = items.map((a) => {
          const tts = a.tts || (a.type === 'tts' && a.data ? (a.data as unknown as ActivityTtsOrigin) : undefined)
          const music = a.music || (a.type === 'music' && a.data ? (a.data as unknown as ActivityMusicOrigin) : undefined)
          const story = a.story || ((a.type === 'story' || a.type === 'stories') && a.data ? (a.data as unknown as ActivityStoryOrigin) : undefined)

          let itemType: ActivityItem['type'] = 'audio'
          if (a.type === 'story' || a.type === 'stories') {
            itemType = 'stories'
          } else if (a.type === 'texts') {
            itemType = 'texts'
          }

          let cover: string | undefined = undefined
          if (story?.cover) cover = story.cover
          else if (tts?.voiceAvatarUrl) cover = tts.voiceAvatarUrl

          let duration = 'Audio'
          if (tts?.duration) duration = tts.duration
          else if (music?.duration) duration = music.duration
          else if (story?.duration) duration = story.duration
          else if (a.metadata?.duration) duration = String(a.metadata.duration)

          let waveform: number[] = [25, 40, 65, 85, 45, 30]
          if (tts?.waveform && tts.waveform.length > 0) waveform = tts.waveform
          else if (music?.waveform && music.waveform.length > 0) waveform = music.waveform
          else if (Array.isArray(a.metadata?.waveform) && a.metadata.waveform.length > 0) waveform = a.metadata.waveform as number[]

          const textExcerpt = a.description || tts?.text || music?.lyrics || story?.text || ''

          let audioUrl: string | undefined = undefined
          if (music?.audioUrl) audioUrl = music.audioUrl
          else if (tts?.audioUrl) audioUrl = tts.audioUrl
          else if (story?.audioUrl) audioUrl = story.audioUrl
          else if (a.metadata?.audioUrl) audioUrl = String(a.metadata.audioUrl)

          const subCategory =
            a.subCategory ||
            (tts?.voiceName
              ? tts.voiceName
              : music?.caption
              ? music.caption
              : story?.narrator
              ? story.narrator
              : 'Single Speaker')

          const category =
            a.category ||
            (a.type === 'music'
              ? 'Music Generation'
              : a.type === 'story' || a.type === 'stories'
              ? 'Audio Story'
              : 'Text to Speech')

          return {
            id: a.id,
            title: a.title,
            category,
            subCategory,
            type: itemType,
            duration,
            plays: a.type === 'music' ? 'Generated' : a.type === 'story' || a.type === 'stories' ? 'Story' : 'Synthesized',
            cover,
            waveform,
            textExcerpt,
            audioUrl,
          }
        })
        setDbActivities(mapped)
      }
    }).catch(console.error)
  }, [])

  const allItems = useMemo(() => [...dbActivities, ...ACTIVITIES], [dbActivities])

  const tabPanels = useMemo(
    () => [
      { id: 'all', items: allItems },
      { id: 'audio', items: allItems.filter((a) => a.type === 'audio') },
      { id: 'stories', items: allItems.filter((a) => a.type === 'stories') },
      { id: 'texts', items: allItems.filter((a) => a.type === 'texts') },
    ],
    [allItems]
  )

  useEffect(() => {
    const activeEl = panelRefs.current[activeTabIndex]
    if (!activeEl) return

    setPanelHeight(activeEl.offsetHeight)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelHeight(entry.target.clientHeight)
      }
    })
    observer.observe(activeEl)
    return () => observer.disconnect()
  }, [activeTabIndex])

  const player = usePlayer()

  const handlePlayRow = (activity: ActivityItem) => {
    if (activity.type === 'texts') return

    if (player.currentTrack?.id === activity.id) {
      player.togglePlay()
      return
    }

    const currentTab = tabPanels[activeTabIndex]
    const playableItems = (currentTab ? currentTab.items : allItems).filter(
      (a) => a.type !== 'texts'
    )

    const playlistTracks: PlayerTrack[] = playableItems.map((item) => {
      let durSec = 60
      if (typeof item.duration === 'string') {
        const parts = item.duration.split(':')
        if (parts.length === 2) {
          durSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
        } else {
          const m = item.duration.match(/\d+/)
          if (m) durSec = parseInt(m[0], 10)
        }
      }
      return {
        id: item.id,
        title: item.title,
        artist: `${item.category} › ${item.subCategory}`,
        cover: item.cover,
        coverUrl: item.cover,
        audioUrl: item.audioUrl || '',
        waveform: item.waveform,
        duration: durSec,
      }
    })

    const startIndex = playlistTracks.findIndex((t) => t.id === activity.id)
    const tabName = ACTIVITIES_TABS[activeTabIndex]?.label || 'Recent'
    player.playList(
      playlistTracks,
      Math.max(0, startIndex),
      `${tabName} Activities`
    )

    onPlayActivity?.(activity)
  }

  const renderActivityRow = (activity: ActivityItem) => {
    const isThisPlaying =
      (player.currentTrack?.id === activity.id && player.isPlaying) ||
      (activeMediaId === activity.id && isPlaying)
    const isText = activity.type === 'texts'

    return (
      <div
        key={activity.id}
        onClick={() => {
          if (!isText) {
            handlePlayRow(activity)
          }
        }}
        className={clsx(
          'group flex items-center justify-between gap-3 sm:gap-4 p-2 pr-4 sm:pr-6 rounded-xl hover:bg-white/[0.06] transition-colors',
          isText ? 'cursor-default' : 'cursor-pointer'
        )}
      >
        {/* Left: Play button (or document icon for texts) + Title + Category breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          {isText ? (
            <div
              className="size-8 sm:size-9 rounded-full flex items-center justify-center shrink-0 bg-white/[0.06] text-zinc-400 border border-white/[0.06]"
              title="Speech-to-Text transcript (Audio turned into text)"
            >
              <FileText className="size-4 text-zinc-400" />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePlayRow(activity)
              }}
              className={clsx(
                'size-8 sm:size-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer',
                isThisPlaying
                  ? 'bg-white text-black shadow-md scale-105'
                  : 'bg-white/[0.08] group-hover:bg-white/[0.16] text-zinc-300 group-hover:text-white group-hover:scale-105 active:scale-95'
              )}
              title={isThisPlaying ? 'Pause' : 'Play'}
            >
              {isThisPlaying ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current ml-0.5" />
              )}
            </button>
          )}

          {/* Title and Category Breadcrumb */}
          <div className="flex flex-col min-w-0">
            <span className="text-[13.5px] font-medium text-white truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl group-hover:text-zinc-100">
              {activity.title}
            </span>
            <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 mt-0.5 truncate">
              <span className="text-zinc-300 font-medium">{activity.category}</span>
              <ChevronRight className="size-3 text-zinc-600 shrink-0" />
              <span className="text-zinc-400">{activity.subCategory}</span>
              {isText && activity.wordsCount && (
                <>
                  <span className="text-zinc-600 shrink-0">•</span>
                  <span className="font-mono text-zinc-400">{activity.wordsCount}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Audio Activities vs Text Activities */}
        {isText ? (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0 hidden sm:block">
              {activity.duration}
            </span>

            <button
              type="button"
              onClick={(e) => onDownload(activity.id, e)}
              className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Download text transcript"
            >
              {downloadedId === activity.id ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Download className="size-3.5" />
              )}
            </button>

            <Link
              to="/speech-to-text"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-colors border border-white/[0.06]"
            >
              <span>View Transcript</span>
              <ArrowUpRight className="size-3 text-zinc-400" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {activity.waveform && (
              <div className="hidden md:flex items-center h-6 w-32 lg:w-44 px-1 shrink-0">
                <TrackWavePlayer
                  trackId={activity.id}
                  waveform={activity.waveform}
                  duration={activity.duration}
                  onPlay={() => handlePlayRow(activity)}
                  height={22}
                  className="w-full"
                />
              </div>
            )}

            <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
              {activity.duration}
            </span>

            <button
              type="button"
              onClick={(e) => onDownload(activity.id, e)}
              className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Download audio"
            >
              {downloadedId === activity.id ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Download className="size-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="mb-10 pt-4">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Recent Activity
          </h2>
          <p className="text-xs text-zinc-400 my-1.5">
            All generated voices, music compositions, stories, and transcriptions
          </p>
        </div>
      </div>

      <LayoutGroup id="activityTabsGroup">
        <div className="relative flex items-center gap-2 border-b border-white/[0.08] pt-2 pb-3 mb-3 overflow-x-auto scrollbar-none">
          {ACTIVITIES_TABS.map((tab) => {
            const isActive = activeActivityTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={clsx(
                  'relative px-4 py-1.5 text-xs sm:text-[13px] rounded-full transition-colors duration-200 cursor-pointer select-none shrink-0 font-medium',
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeActivityTabPill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-white/[0.12] rounded-full"
                  />
                )}

                {isActive && (
                  <motion.div
                    layoutId="activeActivityTabLine"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute -bottom-[12.5px] left-2 right-2 h-[2px] bg-white rounded-full"
                  />
                )}

                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>

      <div className="relative">
        <div
          className={clsx(
            'pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            isSliding ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          className={clsx(
            'pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-[#0f0f10] via-[#0f0f10]/80 to-transparent z-20 transition-opacity duration-300',
            isSliding ? 'opacity-100' : 'opacity-0'
          )}
        />

        <motion.div
          className="relative overflow-hidden w-full"
          animate={{ height: panelHeight ?? 'auto' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <motion.div
            className="flex w-full items-start"
            animate={{ x: `-${activeTabIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            onAnimationStart={() => setIsSliding(true)}
            onAnimationComplete={() => setIsSliding(false)}
          >
            {tabPanels.map((panel, idx) => (
              <div
                key={panel.id}
                ref={(el) => {
                  panelRefs.current[idx] = el
                }}
                className="w-full shrink-0 flex flex-col gap-1"
              >
                {panel.items.map((activity) => renderActivityRow(activity))}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
