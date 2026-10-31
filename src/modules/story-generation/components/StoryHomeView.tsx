import React, { useState, useMemo } from 'react';
import { Search, X, Play, Pause, Trash2, ArrowRight } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import type { PlayerTrack } from '@/store/playerStore';
import { StoryPromptHeroCard } from './StoryPromptHeroCard.tsx';
import type { RawCreativePrompt, StoryProjectSummary } from '../types.ts';

export interface StoryHomeViewProps {
  promptInput: RawCreativePrompt;
  onChangePromptInput: (val: RawCreativePrompt) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  stories: StoryProjectSummary[];
  onSelectStory: (story: StoryProjectSummary) => void;
  onDeleteStory?: (storyId: string) => void;
}

export const StoryHomeView: React.FC<StoryHomeViewProps> = ({
  promptInput,
  onChangePromptInput,
  onGenerate,
  isGenerating,
  stories,
  onSelectStory,
  onDeleteStory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const player = usePlayer();

  const filteredStories = useMemo(() => {
    let list = [...stories];

    if (selectedFormatFilter !== 'all') {
      list = list.filter((s) => s.format === selectedFormatFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.premise.toLowerCase().includes(q) ||
          s.primaryGenre.toLowerCase().includes(q) ||
          s.subgenres.some((g) => g.toLowerCase().includes(q)),
      );
    }

    if (sortOrder === 'oldest') {
      list.reverse();
    }

    return list;
  }, [stories, searchQuery, selectedFormatFilter, sortOrder]);

  const handleTogglePlayStory = (story: StoryProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation();

    if (player.currentTrack?.id === story.id) {
      player.togglePlay();
      return;
    }

    const track: PlayerTrack = {
      id: story.id,
      title: story.title,
      subtitle: `${story.primaryGenre} · ${story.completedScenes} Scenes`,
      artist: 'Story Studio',
      category: 'Story',
      duration: story.audioDurationSeconds || 180,
      audioUrl: '',
      waveform: [25, 45, 65, 80, 55, 40, 70, 90, 60, 45, 75, 85, 50, 35, 60, 80],
    };

    player.play(track);
  };

  return (
    <div className="relative flex-1 min-h-0 px-6 md:px-8 py-6 w-full flex flex-col gap-8 select-none bg-[#0f0f10] text-[#f4f4f5]">
      {/* 1. Prompt Hero Card Section */}
      <StoryPromptHeroCard
        promptInput={promptInput}
        onChangePromptInput={onChangePromptInput}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />

      {/* 2. All Stories Collection Section */}
      <section className="relative z-10 mb-12 pt-2 w-full flex flex-col gap-4">
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f23]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">
              Stories Activities
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#141416] text-zinc-400 border border-[#232328] font-mono">
              {stories.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories..."
                className="w-full h-8 rounded-lg border border-[#232328] bg-[#141416] pl-9 pr-7 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="size-3 text-white" />
                </button>
              )}
            </div>

            {/* Format Filter Pills */}
            <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-lg border border-[#232328] text-[11px]">
              {(['all', 'short_story', 'audio_drama', 'branching'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormatFilter(fmt)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer capitalize ${
                    selectedFormatFilter === fmt
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {fmt === 'all'
                    ? 'All'
                    : fmt === 'short_story'
                      ? 'Fiction'
                      : fmt === 'audio_drama'
                        ? 'Audio'
                        : 'Branch'}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#141416] hover:bg-[#1c1c1f] text-zinc-400 hover:text-white border border-[#232328] transition-colors cursor-pointer"
            >
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[#232328] bg-[#141416]">
            <h3 className="text-sm font-semibold text-zinc-300">No stories found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 leading-relaxed">
              {searchQuery
                ? `No stories matched "${searchQuery}". Try clearing search filters.`
                : 'Enter a creative premise above to generate your first multi-scene narrative with CosyVoice 3 natural audio.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFormatFilter('all');
                }}
                className="text-xs text-white hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStories.map((story) => {
              const isPlayingThis =
                player.currentTrack?.id === story.id && player.isPlaying;

              return (
                <div
                  key={story.id}
                  onClick={() => onSelectStory(story)}
                  className="group relative flex flex-col justify-between rounded-xl border border-[#232328] bg-[#141416] hover:border-zinc-600 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg"
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Header Row: Genres & Duration */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-zinc-300 bg-[#1c1c1f] px-2 py-0.5 rounded truncate">
                        {story.primaryGenre}
                      </span>

                      <span className="text-[10.5px] font-mono text-zinc-500">
                        {story.audioDurationSeconds
                          ? `${Math.floor(story.audioDurationSeconds / 60)}m ${story.audioDurationSeconds % 60}s`
                          : '3m 15s'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
                      {story.title}
                    </h3>

                    {/* Premise Snippet */}
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {story.premise}
                    </p>
                  </div>

                  {/* Bottom Stats & Actions */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#232328] text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <span>{story.completedScenes} Scenes</span>
                      <span>·</span>
                      <span>{story.totalWords.toLocaleString()} Words</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Play Preview Audio Button */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePlayStory(story, e)}
                        className={`size-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isPlayingThis
                            ? 'bg-white text-black'
                            : 'bg-[#212126] hover:bg-[#2c2c33] text-white'
                        }`}
                        title={isPlayingThis ? 'Pause Audio' : 'Play Story Audio'}
                      >
                        {isPlayingThis ? (
                          <Pause className="size-3.5 fill-current text-current" />
                        ) : (
                          <Play className="size-3.5 fill-current text-current ml-0.5" />
                        )}
                      </button>

                      {/* Open in Studio Button */}
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="size-7 rounded-lg bg-[#212126] hover:bg-[#2c2c33] text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Open in Story Studio"
                      >
                        <ArrowRight className="size-3.5 text-white" />
                      </button>

                      {/* Delete Button */}
                      {onDeleteStory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStory(story.id);
                          }}
                          className="size-7 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Story"
                        >
                          <Trash2 className="size-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
