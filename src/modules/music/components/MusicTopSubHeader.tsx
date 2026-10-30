import React from 'react'
import { ChevronLeft } from 'lucide-react'

export type MusicTab = 'activities' | 'generations' | 'models'

export interface MusicTopSubHeaderProps {
  activeTab: MusicTab
  onSelectTab: (tab: MusicTab) => void
  onBack?: () => void
  engine?: string
  generationsCount?: number
  tracksCount?: number
}

export const MusicTopSubHeader: React.FC<MusicTopSubHeaderProps> = ({
  activeTab,
  onSelectTab,
  onBack,
  engine = 'minimax',
  generationsCount = 0,
  tracksCount = 0,
}) => {
  const featureLabel = 'Songs'

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1f1f23] px-6 bg-[#0c0c0e]">
      {/* Left: View title / breadcrumb & Engine toggle - minimalist matching TTS */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer select-none"
              title="Return to previous screen"
            >
              <ChevronLeft className="size-3.5" />
              <span>Back</span>
            </button>
            <span className="text-zinc-600 text-xs">•</span>
          </>
        )}

        {activeTab === 'generations' ? (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('activities')}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer select-none"
              title="Return to Activities"
            >
              Activities
            </button>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-xs font-medium text-zinc-200">{featureLabel} Studio</span>
          </>
        ) : activeTab === 'models' ? (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('activities')}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer select-none"
              title="Return to Activities"
            >
              Activities
            </button>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-xs font-medium text-zinc-200">{featureLabel} Models</span>
          </>
        ) : (
          <span className="text-xs font-medium text-zinc-300">{featureLabel} Activities</span>
        )}

        <span className="text-zinc-600 text-xs">•</span>

        {/* Engine Badge */}
        <button
          type="button"
          onClick={() => onSelectTab('models')}
          className="flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#161619] hover:bg-[#1e1e22] text-zinc-300 hover:text-zinc-100 border border-[#27272a] hover:border-zinc-700 transition-colors cursor-pointer select-none"
          title="View MiniMax Models"
        >
          <span>MiniMax Music-v3</span>
        </button>
      </div>

      {/* Right: Meta counts - matching TTS 'Rounds: X Speakers' style */}
      <div className="flex items-center gap-3">
        {activeTab === 'generations' ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Generations:</span>
            <span className="font-semibold text-zinc-300">
              {generationsCount} {generationsCount === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>
        ) : activeTab === 'models' ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Engine:</span>
            <span className="font-semibold text-zinc-300">
              {engine === 'minimax' ? 'MiniMax Music-v3' : 'MiniMax'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Tracks:</span>
            <span className="font-semibold text-zinc-300">
              {tracksCount} {tracksCount === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
