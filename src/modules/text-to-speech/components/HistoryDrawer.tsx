import { useMemo } from 'react'
import {
  Search,
  X,
  Play,
  Pause,
  Sparkles,
  Copy,
  Trash2,
  Download,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { HistoryEntry } from '../types'

export interface HistoryDrawerProps {
  history: HistoryEntry[]
  historySearch: string
  playingHistoryId: string | null
  onSearchChange: (query: string) => void
  onClearSearch: () => void
  onSelectHistoryItem: (text: string) => void
  onTogglePlayHistory: (item: HistoryEntry) => void
  onDeleteHistoryItem: (id: string) => void
}

const DATE_ORDER = ['Today', 'August 27, 2025', 'August 26, 2025']

export function HistoryDrawer({
  history,
  historySearch,
  playingHistoryId,
  onSearchChange,
  onClearSearch,
  onSelectHistoryItem,
  onTogglePlayHistory,
  onDeleteHistoryItem,
}: HistoryDrawerProps) {
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history
    const q = historySearch.toLowerCase()
    return history.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.voiceName.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q)
    )
  }, [history, historySearch])

  const historyGroups = useMemo(() => {
    const groups: { [key: string]: HistoryEntry[] } = {}
    filteredHistory.forEach((item) => {
      if (!groups[item.dateGroup]) groups[item.dateGroup] = []
      groups[item.dateGroup].push(item)
    })
    return groups
  }, [filteredHistory])

  const orderedDateGroups = useMemo(() => {
    const keys = Object.keys(historyGroups)
    return keys.sort((a, b) => {
      const idxA = DATE_ORDER.indexOf(a)
      const idxB = DATE_ORDER.indexOf(b)
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })
  }, [historyGroups])

  return (
    <div className="w-full shrink-0 h-full overflow-y-auto px-4 pb-28 sidebar-scrollbar">
      {/* Sticky Search History Bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1.5 pb-1 bg-[#111113]">
        <div className="relative">
          <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={historySearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search History..."
            className="w-full h-9 rounded-lg border-0 bg-[#161619] pl-9 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/10 transition-colors"
          />
          {historySearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              title="Clear Search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grouped Timeline Items */}
      <div className="pt-0.5 space-y-3">
        {orderedDateGroups.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">No Matching History</div>
        ) : (
          orderedDateGroups.map((dateLabel) => (
            <div key={dateLabel} className="space-y-2">
              {/* Centered Date Badge */}
              <div className="flex justify-center pt-3.5 pb-2">
                <span className="rounded-full bg-[#202024] text-[11px] font-medium text-zinc-400 px-3.5 py-1 shadow-xs border border-white/[0.04]">
                  {dateLabel}
                </span>
              </div>

              {/* Items for this Date */}
              <div className="space-y-2.5">
                {historyGroups[dateLabel]?.map((item) => {
                  const isThisItemPlaying = playingHistoryId === item.id
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistoryItem(item.text)}
                      className={cn(
                        'group relative flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer border border-transparent',
                        isThisItemPlaying
                          ? 'bg-[#1a1a1e] border-white/10 shadow-sm'
                          : 'hover:bg-[#18181c] hover:border-white/[0.04]'
                      )}
                    >
                      <div className="flex-1 min-w-0 pr-1.5">
                        <p className="text-[13px] text-zinc-200 truncate font-normal tracking-tight leading-snug">
                          {item.text}
                        </p>
                        <div className="flex items-center gap-2 text-[11.5px] text-zinc-400 mt-1.5">
                          <img
                            src={item.voiceAvatarUrl || '/voices/sterling.jpg'}
                            alt={item.voiceName}
                            className="size-3.5 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                          />
                          <span className="truncate">
                            {item.voiceName} · {item.timeAgo}
                          </span>
                        </div>
                      </div>

                      {/* Right Hover Actions */}
                      <div
                        className={cn(
                          'items-center gap-1.5 shrink-0 pl-1',
                          isThisItemPlaying ? 'flex' : 'hidden group-hover:flex'
                        )}
                      >
                        {/* Play Button with "Play" Tooltip */}
                        <div className="relative group/play">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onTogglePlayHistory(item)
                            }}
                            className={cn(
                              'size-7 flex items-center justify-center rounded-full transition-all cursor-pointer',
                              isThisItemPlaying
                                ? 'bg-white text-black'
                                : 'bg-white/10 hover:bg-white text-white hover:text-black'
                            )}
                          >
                            {isThisItemPlaying ? (
                              <Pause className="size-3.5 fill-current" />
                            ) : (
                              <Play className="size-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          {/* Tooltip bubble on hover */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-semibold px-2 py-0.5 rounded shadow-lg pointer-events-none opacity-0 group-hover/play:opacity-100 transition-opacity whitespace-nowrap z-30">
                            {isThisItemPlaying ? 'Pause' : 'Play'}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-white" />
                          </div>
                        </div>

                        {/* Options Menu Button (Three Horizontal Bars) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="size-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/5"
                              title="Options"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <line x1="2" y1="4" x2="14" y2="4" />
                                <line x1="2" y1="8" x2="14" y2="8" />
                                <line x1="2" y1="12" x2="14" y2="12" />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-44 bg-[#18181b] border-[#27272a] text-zinc-200 p-1">
                            <DropdownMenuItem
                              onClick={() => onSelectHistoryItem(item.text)}
                              className="text-xs cursor-pointer flex items-center gap-2"
                            >
                              <Sparkles className="size-3.5" />
                              <span>Use In Editor</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard.writeText(item.text)}
                              className="text-xs cursor-pointer flex items-center gap-2"
                            >
                              <Copy className="size-3.5" />
                              <span>Copy Text</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={() => onDeleteHistoryItem(item.id)}
                              className="text-xs cursor-pointer text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Download Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const blob = new Blob([item.text], { type: 'text/plain' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `echo-${item.id}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="size-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/5"
                          title="Download Audio / Text"
                        >
                          <Download className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
