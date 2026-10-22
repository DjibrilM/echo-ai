export interface TopSubHeaderProps {
  totalRounds: number
  engine?: 'cosyvoice3' | 'parler'
  onEngineChange?: (engine: 'cosyvoice3' | 'parler') => void
}

export function TopSubHeader({ totalRounds, engine = 'cosyvoice3', onEngineChange }: TopSubHeaderProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1f1f23] px-6">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium text-zinc-400">Dialogue Script</span>
        <span className="text-zinc-600 text-xs">•</span>
        <button
          type="button"
          onClick={() => onEngineChange?.(engine === 'cosyvoice3' ? 'parler' : 'cosyvoice3')}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#161619] hover:bg-[#202025] text-zinc-300 border border-[#27272a] hover:border-zinc-600 transition-all cursor-pointer"
          title="Click to toggle between CosyVoice 3 and Parler-TTS"
        >
          <span className={`size-1.5 rounded-full ${engine === 'cosyvoice3' ? 'bg-emerald-400' : 'bg-purple-400'}`} />
          <span>{engine === 'cosyvoice3' ? 'CosyVoice 3 (Apple Silicon)' : 'Parler-TTS (12 Emotions)'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Rounds:</span>
          <span className="font-semibold text-zinc-300">
            {totalRounds} {totalRounds === 1 ? 'Speaker' : 'Speakers'}
          </span>
        </div>
      </div>
    </div>
  )
}
