import { useState, useMemo } from 'react'
import {
  Search,
  Check,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Smile,
  Share2,
  GraduationCap,
  Megaphone,
  Tv,
  Bookmark,
  X,
  Volume2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Voice, LanguageOption, LANGUAGES } from '../types'

export interface VoiceLanguageExplorerDialogProps {
  isOpen: boolean
  onClose: () => void
  activeVoiceId: string
  activeLanguage: LanguageOption
  voices: Voice[]
  playingVoiceId?: string | null
  onTogglePreview?: (voice: Voice, e?: React.MouseEvent) => void
  onSelectVoice: (voiceId: string) => void
  onSelectLanguage: (languageName: string) => void
  onOpenCloneModal?: () => void
}

const CATEGORY_CHIPS = [
  { id: 'Conversational', label: 'Conversational', icon: MessageSquare },
  { id: 'Narration', label: 'Narration', icon: BookOpen },
  { id: 'Characters', label: 'Characters', icon: Smile },
  { id: 'Social Media', label: 'Social Media', icon: Share2 },
  { id: 'Educational', label: 'Educational', icon: GraduationCap },
  { id: 'Advertisement', label: 'Advertisement', icon: Megaphone },
  { id: 'Entertainment', label: 'Entertainment', icon: Tv },
]

export function VoiceLanguageExplorerDialog({
  isOpen,
  onClose,
  activeVoiceId,
  activeLanguage,
  voices,
  playingVoiceId,
  onTogglePreview,
  onSelectVoice,
  onSelectLanguage,
  onOpenCloneModal,
}: VoiceLanguageExplorerDialogProps) {
  const [activeTab, setActiveTab] = useState<'explore' | 'my-voices'>('explore')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(
    activeLanguage.code === 'auto' ? 'all' : activeLanguage.code
  )
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male' | 'neutral'>('all')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>('gender')
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    )
  }

  const resetFilters = () => {
    setSelectedLanguageCode('all')
    setSelectedGender('all')
    setSelectedCategories([])
    setSearchQuery('')
  }

  const hasActiveFilters =
    selectedLanguageCode !== 'all' ||
    selectedGender !== 'all' ||
    selectedCategories.length > 0 ||
    searchQuery.trim().length > 0

  // Filtered voice list
  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      // 1. Tab filter
      if (activeTab === 'my-voices' && v.category !== 'cloned') {
        return false
      }

      // 2. Language filter
      if (selectedLanguageCode !== 'all') {
        const langObj = LANGUAGES.find((l) => l.code === selectedLanguageCode)
        const langName = langObj?.name.toLowerCase() || ''
        const vLangCode = v.languageCode?.toLowerCase() || ''
        const isEnglishOption = selectedLanguageCode === 'en' || selectedLanguageCode === 'en-gb'

        if (isEnglishOption) {
          const isEng =
            !v.languageCode ||
            vLangCode === 'en' ||
            vLangCode === 'en-gb' ||
            v.tags.some((t) =>
              ['american', 'british', 'australian', 'english'].includes(t.toLowerCase())
            )
          if (!isEng) return false
        } else {
          const matchesCode = vLangCode === selectedLanguageCode
          const matchesName =
            langName &&
            (v.languageName?.toLowerCase() === langName ||
              v.tags.some((t) => t.toLowerCase() === langName))
          if (!matchesCode && !matchesName) return false
        }
      }

      // 3. Gender filter
      if (selectedGender !== 'all') {
        const vGender = (v.gender || 'neutral').toLowerCase()
        if (vGender !== selectedGender) return false
      }

      // 4. Category / Tag filter
      if (selectedCategories.length > 0) {
        const matchesCategory = selectedCategories.some((cat) => {
          const catLower = cat.toLowerCase()
          // Direct tag match
          if (v.tags.some((t) => t.toLowerCase() === catLower || t.toLowerCase().includes(catLower) || catLower.includes(t.toLowerCase()))) {
            return true
          }
          if (v.description.toLowerCase().includes(catLower)) return true
          if (v.name.toLowerCase().includes(catLower)) return true

          // Semantic category synonym matching
          if (catLower === 'conversational') {
            return (
              v.description.toLowerCase().includes('agentic') ||
              v.description.toLowerCase().includes('assistant') ||
              v.description.toLowerCase().includes('conversation') ||
              v.description.toLowerCase().includes('casual') ||
              v.tags.some((t) => ['conversational', 'casual', 'friendly', 'warm', 'trustworthy'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'narration') {
            return (
              v.description.toLowerCase().includes('narrat') ||
              v.description.toLowerCase().includes('story') ||
              v.description.toLowerCase().includes('stories') ||
              v.tags.some((t) => ['narrative', 'narration', 'narrative story', 'resonant', 'storyteller'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'social media') {
            return (
              v.description.toLowerCase().includes('shorts') ||
              v.description.toLowerCase().includes('reels') ||
              v.description.toLowerCase().includes('creator') ||
              v.tags.some((t) => ['social media', 'creator', 'trendy', 'hyped'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'characters') {
            return (
              v.description.toLowerCase().includes('warrior') ||
              v.description.toLowerCase().includes('animated') ||
              v.description.toLowerCase().includes('character') ||
              v.tags.some((t) => ['characters', 'animation', 'theatrical', 'distinctive', 'fierce'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'educational') {
            return (
              v.description.toLowerCase().includes('educat') ||
              v.description.toLowerCase().includes('academic') ||
              v.description.toLowerCase().includes('informative') ||
              v.tags.some((t) => ['educational', 'articulate', 'professional', 'clear'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'advertisement') {
            return (
              v.description.toLowerCase().includes('broadcast') ||
              v.description.toLowerCase().includes('commercial') ||
              v.tags.some((t) => ['advertisement', 'broadcast', 'commercial', 'news'].includes(t.toLowerCase()))
            )
          }
          if (catLower === 'entertainment') {
            return (
              v.description.toLowerCase().includes('playful') ||
              v.description.toLowerCase().includes('theat') ||
              v.tags.some((t) => ['entertainment', 'theatrical', 'expressive', 'optimist'].includes(t.toLowerCase()))
            )
          }
          return false
        })
        if (!matchesCategory) return false
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = v.name.toLowerCase().includes(q)
        const matchesDesc = v.description.toLowerCase().includes(q)
        const matchesTag = v.tags.some((t) => t.toLowerCase().includes(q))
        const matchesLang =
          v.languageName?.toLowerCase().includes(q) ||
          v.languageCode?.toLowerCase().includes(q)
        if (!matchesName && !matchesDesc && !matchesTag && !matchesLang) return false
      }

      return true
    })
  }, [voices, activeTab, selectedLanguageCode, selectedGender, selectedCategories, searchQuery])

  const selectedLangObj = useMemo(() => {
    if (selectedLanguageCode === 'all') return { name: 'All Languages', flag: '🌐' }
    return LANGUAGES.find((l) => l.code === selectedLanguageCode) || { name: 'Select Language', flag: '🌐' }
  }, [selectedLanguageCode])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl w-[96vw] h-[640px] max-h-[92vh] bg-[#0e0e11] border border-white/10 text-white p-0 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
        {/* Hidden screen-reader accessibility header */}
        <DialogHeader className="sr-only">
          <DialogTitle>Voice and Language Library</DialogTitle>
          <DialogDescription>
            Explore and filter voices by language, gender, and categories.
          </DialogDescription>
        </DialogHeader>

        {/* DIALOG MAIN SPLIT CONTAINER */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ==================================================== */}
          {/* LEFT SIDEBAR: FILTERS */}
          {/* ==================================================== */}
          <aside className="w-64 shrink-0 border-r border-[#1f1f23] bg-[#0c0c0e] flex flex-col h-full overflow-y-auto sidebar-scrollbar p-4 space-y-5 select-none">
            {/* 1. Language Dropdown Filter */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
                <span>Language</span>
                {selectedLanguageCode !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedLanguageCode('all')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 font-normal lowercase cursor-pointer"
                  >
                    reset
                  </button>
                )}
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl border border-[#27272a] bg-[#161619] hover:bg-[#1f1f23] hover:border-zinc-600 px-3 py-2 text-xs text-white transition-colors cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm leading-none shrink-0">{selectedLangObj.flag}</span>
                      <span className="truncate font-medium">{selectedLangObj.name}</span>
                    </div>
                    <ChevronDown className="size-3.5 text-zinc-400 group-hover:text-zinc-200 shrink-0 ml-1.5" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-64 max-h-[380px] overflow-y-auto bg-[#18181b] border-[#27272a] text-zinc-200 p-1.5 shadow-2xl sidebar-scrollbar z-[100]"
                >
                  <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">
                    Select Language
                  </div>

                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLanguageCode('all')
                    }}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs',
                      selectedLanguageCode === 'all'
                        ? 'bg-white/10 text-white font-medium'
                        : 'hover:bg-white/5 text-zinc-300'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">🌐</span>
                      <div>
                        <div className="font-semibold text-white">All Languages</div>
                        <div className="text-[10px] text-zinc-400">Show all voices (141+)</div>
                      </div>
                    </div>
                    {selectedLanguageCode === 'all' && (
                      <Check className="size-3.5 text-white" />
                    )}
                  </DropdownMenuItem>

                  {LANGUAGES.filter((l) => !l.isAuto).map((langItem) => (
                    <DropdownMenuItem
                      key={langItem.code}
                      onClick={() => {
                        setSelectedLanguageCode(langItem.code)
                        onSelectLanguage(langItem.name)
                      }}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs',
                        selectedLanguageCode === langItem.code
                          ? 'bg-white/10 text-white font-medium'
                          : 'hover:bg-white/5 text-zinc-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {langItem.flag && <span className="text-sm">{langItem.flag}</span>}
                        <div>
                          <div className="font-semibold text-white">{langItem.name}</div>
                          <div className="text-[10px] text-zinc-400">{langItem.nativeName}</div>
                        </div>
                      </div>
                      {selectedLanguageCode === langItem.code && (
                        <Check className="size-3.5 text-white" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 2. Categories Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  Categories
                </span>
                <ChevronDown className="size-3.5 text-zinc-500" />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_CHIPS.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border',
                        isSelected
                          ? 'bg-white/15 border-white/20 text-white font-medium'
                          : 'bg-[#161619] border-[#27272a] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      )}
                    >
                      <Icon className="size-3 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Gender Filter Accordion */}
            <div className="border-t border-[#1f1f23] pt-3 space-y-2">
              <button
                type="button"
                onClick={() =>
                  setExpandedSection(expandedSection === 'gender' ? null : 'gender')
                }
                className="w-full flex items-center justify-between text-xs text-zinc-300 hover:text-white font-medium cursor-pointer"
              >
                <span>Gender</span>
                {expandedSection === 'gender' ? (
                  <ChevronDown className="size-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="size-3.5 text-zinc-500" />
                )}
              </button>

              {expandedSection === 'gender' && (
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {(['all', 'female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGender(g)}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-[11px] font-medium capitalize text-center transition-colors cursor-pointer border',
                        selectedGender === g
                          ? 'bg-white/15 border-white/20 text-white'
                          : 'bg-[#161619] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      {g === 'all' ? 'All' : g === 'female' ? 'Women' : 'Men'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Collapsible Filters like Screenshot */}
            <div className="border-t border-[#1f1f23] pt-2 space-y-2.5">
              {[
                { title: 'Created by', desc: 'Default & Community' },
                { title: 'Type', desc: 'Neural & Natural' },
                { title: 'Age', desc: 'Young, Middle, Senior' },
                { title: 'Notice period', desc: 'Standard' },
                { title: 'Custom rates', desc: 'Included' },
                { title: 'Quality', desc: 'Studio (48kHz)' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer py-0.5 group"
                >
                  <span className="text-zinc-300 group-hover:text-white">{item.title}</span>
                  <ChevronRight className="size-3 text-zinc-600 group-hover:text-zinc-400" />
                </div>
              ))}
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-[#1f1f23]">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="size-3" />
                  <span>Clear All Filters</span>
                </button>
              </div>
            )}
          </aside>

          {/* ==================================================== */}
          {/* RIGHT MAIN PANEL: TABS, SEARCH & VOICE LIST */}
          {/* ==================================================== */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#0e0e11] overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-3.5 px-5 border-b border-[#1f1f23] flex items-center justify-between gap-3 shrink-0">
              {/* Left Tabs: Explore | My Voices */}
              <div className="flex items-center gap-1 bg-[#161619] p-1 rounded-xl border border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'explore'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Explore
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-voices')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    activeTab === 'my-voices'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  My voices
                </button>
              </div>

              {/* Right Search Input & Filter Icon */}
              <div className="flex items-center gap-2 max-w-sm flex-1 justify-end">
                <div className="relative flex-1">
                  <Search className="size-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Start typing to search..."
                    className="w-full h-9 rounded-xl bg-[#161619] border border-[#27272a] pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Close Button replacing the config button without overlay */}
                <button
                  type="button"
                  onClick={onClose}
                  title="Close Explorer (Esc)"
                  className="size-9 rounded-xl border border-[#27272a] bg-[#161619] hover:bg-[#202024] hover:border-zinc-500 hover:text-white flex items-center justify-center text-zinc-400 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Voice Rows */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 sidebar-scrollbar">
              {/* Active Filter Chips Bar */}
              {(selectedCategories.length > 0 || selectedGender !== 'all' || selectedLanguageCode !== 'all' || searchQuery.trim()) && (
                <div className="flex items-center gap-1.5 flex-wrap pb-2 pt-0.5">
                  <span className="text-[11px] text-zinc-500 font-medium">Filters:</span>
                  {selectedLanguageCode !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-white/10 border border-white/10 text-white px-2 py-0.5 rounded-full">
                      <span>{selectedLangObj.flag} {selectedLangObj.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedLanguageCode('all')}
                        className="hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                  {selectedGender !== 'all' && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-white/10 border border-white/10 text-white px-2 py-0.5 rounded-full capitalize">
                      <span>{selectedGender}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedGender('all')}
                        className="hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 text-[11px] bg-sky-500/15 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="hover:text-white cursor-pointer ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Special Top Row: Auto-Select Voice */}
              {activeTab === 'explore' && !searchQuery && (
                <div
                  onClick={() => {
                    onSelectVoice(voices[0]?.id || 'voice-sterling')
                    onClose()
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#27272a]/60 bg-[#141417]/40 hover:bg-[#1a1a1e] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Volume2 className="size-4 text-zinc-300" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Auto-select voice</div>
                      <div className="text-[11px] text-zinc-500">
                        Picks a voice based on your text and language when you generate
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                    Dynamic
                  </span>
                </div>
              )}

              {/* No Voices Match Fallback */}
              {filteredVoices.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="size-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                    <Search className="size-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">No voices match your filters</div>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                      Try clearing filters or search terms to see the full list of available voices.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="text-xs rounded-lg mt-1"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}

              {/* Voice Items */}
              {filteredVoices.map((v) => {
                const isSelected = activeVoiceId === v.id
                const isPlaying = playingVoiceId === v.id
                const isBookmarked = bookmarkedIds.has(v.id)

                // Resolve flag for voice
                const langMatch =
                  LANGUAGES.find((l) => l.code === v.languageCode) ||
                  LANGUAGES.find((l) =>
                    v.tags.some((t) => t.toLowerCase() === l.name.toLowerCase())
                  ) || { flag: '🇺🇸', name: 'English' }

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      onSelectVoice(v.id)
                      if (v.languageName) {
                        onSelectLanguage(v.languageName)
                      }
                      onClose()
                    }}
                    className={cn(
                      'group flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all cursor-pointer',
                      isSelected
                        ? 'border-white/30 bg-white/[0.08] shadow-sm'
                        : 'border-transparent hover:border-[#27272a] hover:bg-[#161619]'
                    )}
                  >
                    {/* Left: Avatar with play audition button overlay + Name/Desc */}
                    <div className="flex items-center gap-3 min-w-0 pr-3 flex-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          if (v.sampleUrl && onTogglePreview) {
                            onTogglePreview(v, e)
                          }
                        }}
                        className="relative size-9 shrink-0 rounded-full overflow-hidden ring-1 ring-white/10 group/avatar cursor-pointer"
                        title={isPlaying ? 'Pause preview' : 'Audition voice sample'}
                      >
                        <img
                          src={v.avatarUrl || '/voices/sterling.jpg'}
                          alt={v.name}
                          className="size-full object-cover"
                        />
                        <div
                          className={cn(
                            'absolute inset-0 flex items-center justify-center transition-all',
                            isPlaying
                              ? 'bg-black/60 opacity-100'
                              : 'bg-black/40 opacity-0 group-hover:opacity-100'
                          )}
                        >
                          {isPlaying ? (
                            <Pause className="size-3.5 fill-white text-white animate-pulse" />
                          ) : (
                            <Play className="size-3.5 fill-white text-white ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-white truncate">
                            {v.name}
                          </span>
                          {v.category === 'cloned' && (
                            <span className="text-[9px] bg-white/10 border border-white/10 text-zinc-300 px-1.5 py-0.2 rounded font-medium">
                              Custom
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {v.description}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Language Flag & Clickable Category/Style Tag Badges */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap max-w-[280px] justify-end">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                        <span className="text-sm leading-none">{langMatch.flag}</span>
                        <span className="text-[11.5px] text-zinc-300">{langMatch.name}</span>
                      </div>

                      {v.tags.map((tag) => {
                        const isTagActive = selectedCategories.some(
                          (c) => c.toLowerCase() === tag.toLowerCase()
                        )
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategory(tag)
                            }}
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer border',
                              isTagActive
                                ? 'bg-sky-500/25 border-sky-500/40 text-sky-300 font-medium'
                                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-zinc-500'
                            )}
                            title={`Filter by ${tag}`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>

                    {/* Right: Actions (Bookmark & Select checkmark) */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(v.id, e)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors cursor-pointer',
                          isBookmarked
                            ? 'text-amber-400'
                            : 'text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                        )}
                        title="Bookmark voice"
                      >
                        <Bookmark className="size-3.5 fill-current" />
                      </button>

                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          <Check className="size-3" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="opacity-0 group-hover:opacity-100 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg px-2.5 h-7 transition-all"
                        >
                          Use
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Footer Bar */}
            <div className="p-3 px-5 border-t border-[#1f1f23] flex items-center justify-between text-xs text-zinc-400 shrink-0 bg-[#0c0c0e]">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-white">{filteredVoices.length}</strong> of{' '}
                  {voices.length} voices
                </span>
                {selectedLanguageCode !== 'all' && (
                  <span className="text-zinc-500">• Filtered by {selectedLangObj.name}</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {onOpenCloneModal && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      onClose()
                      onOpenCloneModal()
                    }}
                    className="text-xs h-8 px-3 rounded-lg border-zinc-700 hover:bg-white/10 text-zinc-200"
                  >
                    + Clone Voice
                  </Button>
                )}

                <Button
                  size="xs"
                  onClick={onClose}
                  className="text-xs h-8 px-4 rounded-lg bg-white hover:bg-zinc-200 text-black font-medium"
                >
                  Done
                </Button>
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
