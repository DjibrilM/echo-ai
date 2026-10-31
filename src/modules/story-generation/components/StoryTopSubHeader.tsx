import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { StoryTab } from '../types.ts';

export interface StoryTopSubHeaderProps {
  activeTab: StoryTab;
  onSelectTab: (tab: StoryTab) => void;
  onBack?: () => void;
  storiesCount?: number;
  tracksCount?: number;
  isGenerating?: boolean;
  onNewStory?: () => void;
}

export const StoryTopSubHeader: React.FC<StoryTopSubHeaderProps> = ({
  activeTab,
  onSelectTab,
  onBack,
  storiesCount = 0,
  tracksCount = 0,
  isGenerating = false,
  onNewStory,
}) => {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#1f1f23] px-6 bg-[#0c0c0e] select-none">
      {/* Left: View breadcrumbs & engine badge matching MusicTopSubHeader */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
              title="Return to previous screen"
            >
              <ChevronLeft className="size-3.5 text-white" />
              <span>Back</span>
            </button>
            <span className="text-zinc-600 text-xs">•</span>
          </>
        )}

        {activeTab === 'studio' ? (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('stories')}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
            >
              Stories
            </button>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-xs font-medium text-zinc-200">Story Studio</span>
          </>
        ) : activeTab === 'models' ? (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('stories')}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer select-none"
            >
              Stories
            </button>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-xs font-medium text-zinc-200">Narrative Models</span>
          </>
        ) : (
          <span className="text-xs font-medium text-zinc-300">Stories Activities</span>
        )}

        <span className="text-zinc-600 text-xs">•</span>

        {/* Engine Badge */}
        <button
          type="button"
          onClick={() => onSelectTab('models')}
          className="flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#161619] hover:bg-[#1e1e22] text-zinc-300 hover:text-white border border-[#27272a] hover:border-zinc-600 transition-colors cursor-pointer select-none"
          title="View Local Gemma 4 & CosyVoice 3 Models"
        >
          <span>Gemma 4 • CosyVoice 3</span>
        </button>
      </div>

      {/* Right: Meta counts & actions */}
      <div className="flex items-center gap-4">
        {activeTab === 'studio' ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Scenes:</span>
            <span className="font-semibold text-zinc-300">
              {tracksCount} {tracksCount === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>
        ) : activeTab === 'models' ? null : (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Stories:</span>
            <span className="font-semibold text-zinc-300">
              {storiesCount} {storiesCount === 1 ? 'Story' : 'Stories'}
            </span>
          </div>
        )}

        {activeTab !== 'studio' && activeTab !== 'models' && onNewStory && (
          <button
            type="button"
            onClick={onNewStory}
            disabled={isGenerating}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-zinc-200 text-black transition-colors cursor-pointer"
          >
            New Story
          </button>
        )}
      </div>
    </div>
  );
};
