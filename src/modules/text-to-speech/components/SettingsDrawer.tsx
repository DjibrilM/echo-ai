import { ChevronRight, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { Voice, LanguageOption, LANGUAGES } from '../types'

export interface SettingsDrawerProps {
  activeVoice: Voice
  voices: Voice[]
  selectedVoiceId: string
  stability: number
  similarity: number
  cfgScale: number
  lavaSrEnabled: boolean
  activeLanguage: LanguageOption
  onSelectVoice: (id: string) => void
  onOpenCloneModal: () => void
  onStabilityChange: (val: number) => void
  onSimilarityChange: (val: number) => void
  onCfgScaleChange: (val: number) => void
  onToggleLavaSr: () => void
  onSelectLanguage: (lang: string) => void
}

export function SettingsDrawer({
  activeVoice,
  voices,
  selectedVoiceId,
  stability,
  similarity,
  cfgScale,
  lavaSrEnabled,
  activeLanguage,
  onSelectVoice,
  onOpenCloneModal,
  onStabilityChange,
  onSimilarityChange,
  onCfgScaleChange,
  onToggleLavaSr,
  onSelectLanguage,
}: SettingsDrawerProps) {
  return (
    <div className="w-full shrink-0 h-full overflow-y-auto px-4 py-3 space-y-5 pb-28 sidebar-scrollbar">
      {/* VOICE CONFIGURATION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">Voice</label>
          <button
            type="button"
            onClick={onOpenCloneModal}
            className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Clone or Add Voice</span>
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between rounded-xl border border-[#27272a] bg-[#161619] hover:bg-[#1c1c20] p-2.5 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={activeVoice.avatarUrl || '/voices/jessica.jpg'}
                  alt={activeVoice.name}
                  className="size-7 rounded-full object-cover shrink-0 ring-1 ring-white/15"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                    {activeVoice.name}
                    {activeVoice.category === 'cloned' && (
                      <span className="text-[9px] bg-white/10 border border-white/10 text-zinc-300 px-1 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {activeVoice.description}
                  </div>
                </div>
              </div>
              <ChevronRight className="size-4 text-zinc-500 shrink-0" />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-80 bg-[#18181b] border-[#27272a] text-zinc-200 p-1.5 shadow-2xl">
            <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">
              Select Voice
            </div>

            {voices.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => onSelectVoice(v.id)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs',
                  selectedVoiceId === v.id
                    ? 'bg-white/10 text-white font-medium'
                    : 'hover:bg-white/5 text-zinc-300'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={v.avatarUrl || '/voices/jessica.jpg'}
                    alt={v.name}
                    className="size-6 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                  />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      {v.name}
                      {v.category === 'cloned' && (
                        <span className="text-[9px] bg-white/10 border border-white/10 text-zinc-300 px-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">{v.description}</div>
                  </div>
                </div>
                {selectedVoiceId === v.id && <Check className="size-3.5 text-white" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* VOICE PARAMETERS */}
      <div className="space-y-5 pt-2 border-t border-[#1f1f23]">
        <div className="text-[11px] font-medium text-zinc-400">
          Voice Parameters
        </div>

        {/* Stability / Temperature Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Stability (Temperature)</span>
            <span className="font-mono text-zinc-400">{stability.toFixed(2)}</span>
          </div>
          <Slider
            value={[stability * 100]}
            min={10}
            max={150}
            step={1}
            onValueChange={(val) => onStabilityChange((val[0] || 70) / 100)}
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>Creative (1.2)</span>
            <span>Robust (0.2)</span>
          </div>
        </div>

        {/* Similarity / Reference Top-P Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Cloning Fidelity (Top-P)</span>
            <span className="font-mono text-zinc-400">{similarity.toFixed(2)}</span>
          </div>
          <Slider
            value={[similarity * 100]}
            min={30}
            max={100}
            step={1}
            onValueChange={(val) => onSimilarityChange((val[0] || 85) / 100)}
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>Low Variation</span>
            <span>High Precision</span>
          </div>
        </div>

        {/* Emotion / Exaggeration CFG Scale Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Emotion Intensity (CFG Scale)</span>
            <span className="font-mono text-zinc-400">{cfgScale.toFixed(1)}</span>
          </div>
          <Slider
            value={[cfgScale * 10]}
            min={10}
            max={30}
            step={1}
            onValueChange={(val) => onCfgScaleChange((val[0] || 15) / 10)}
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>Subtle (1.0)</span>
            <span>Standard (1.5)</span>
            <span>Exaggerated (3.0)</span>
          </div>
        </div>

        {/* Studio Voice Clarity Enhancer */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs text-zinc-300">Voice Clarity</div>
            <div className="text-[11px] text-zinc-500">Enhances Speech To 48kHz Ultra HD</div>
          </div>
          <button
            type="button"
            onClick={onToggleLavaSr}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              lavaSrEnabled ? 'bg-white' : 'bg-zinc-700'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block size-4 transform rounded-full bg-[#0f0f10] shadow ring-0 transition duration-200 ease-in-out',
                lavaSrEnabled ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-semibold text-zinc-300">Language</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between gap-2 min-w-[150px] h-8.5 rounded-lg border border-[#27272a] bg-[#161619] hover:bg-[#1c1c20] px-2.5 text-xs text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {!activeLanguage.isAuto && activeLanguage.flag && (
                    <span className="text-sm leading-none shrink-0">{activeLanguage.flag}</span>
                  )}
                  <span className="truncate font-medium">{activeLanguage.name}</span>
                </div>
                <ChevronRight className="size-3.5 text-zinc-500 shrink-0 ml-1" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-72 max-h-[440px] overflow-y-auto bg-[#18181b] border-[#27272a] text-zinc-200 p-1.5 shadow-2xl sidebar-scrollbar">
              <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">
                Select Language
              </div>

              {LANGUAGES.map((langItem) => (
                <DropdownMenuItem
                  key={langItem.code}
                  onClick={() => onSelectLanguage(langItem.name)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs',
                    activeLanguage.name === langItem.name
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
                  {activeLanguage.name === langItem.name && (
                    <Check className="size-3.5 text-white" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
