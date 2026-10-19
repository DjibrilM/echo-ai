export interface TopSubHeaderProps {
  totalRounds: number
}

export function TopSubHeader({ totalRounds }: TopSubHeaderProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1f1f23] px-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-zinc-400">Dialogue Script</span>
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
