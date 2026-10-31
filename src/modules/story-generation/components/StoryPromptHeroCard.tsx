import React from 'react';
import { ArrowUp } from 'lucide-react';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import type { RawCreativePrompt } from '../types.ts';

export interface StoryPromptHeroCardProps {
  promptInput: RawCreativePrompt;
  onChangePromptInput: (val: RawCreativePrompt) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const STORY_SUGGESTIONS = [
  {
    label: 'Deep Space Distress Call',
    prompt:
      'A veteran deep-space communications officer at an isolated orbital outpost intercepts an archaic analog distress call from a colonial transport lost a century ago, while his commanding officer attempts to enforce a classified silence.',
    genres: ['Hard Sci-Fi', 'Psychological Thriller', 'Mystery'],
    format: 'short_story' as const,
  },
  {
    label: 'Victorian Gaslight Mystery',
    prompt:
      'A disgraced physician in 1890s London is summoned to an anatomical society gala where a clockwork automaton appears to confess to an unsolved murder in the voice of the missing heiress.',
    genres: ['Mystery', 'Historical Fiction', 'Horror'],
    format: 'audio_drama' as const,
  },
  {
    label: 'Cyberpunk Blackout Heist',
    prompt:
      'During a scheduled three-minute power grid blackout in Neo-Shinjuku, a rogue neuro-courier discovers the memory shard she is smuggling belongs to the syndicate boss who ordered the hit on her crew.',
    genres: ['Cyberpunk', 'Crime Fiction', 'Thriller'],
    format: 'short_story' as const,
  },
  {
    label: 'Ancient Relic Odyssey',
    prompt:
      'An expedition of cartographers discovers a subterranean chamber in the salt flats where atmospheric pressure renders speech impossible, communicating only through acoustic stone resonances.',
    genres: ['Dark Fantasy', 'Mystery', 'Speculative Fiction'],
    format: 'audio_drama' as const,
  },
];

const FORMAT_OPTIONS = [
  { id: 'short_story', label: 'Short Story' },
  { id: 'audio_drama', label: 'Audio Drama' },
  { id: 'branching', label: 'Interactive' },
  { id: 'serialized_arc', label: 'Serialized' },
] as const;

const GENRE_PILLS = [
  'Hard Sci-Fi',
  'Mystery',
  'Psychological Thriller',
  'Dark Fantasy',
  'Cyberpunk',
  'Horror',
  'Historical Fiction',
];

export const StoryPromptHeroCard: React.FC<StoryPromptHeroCardProps> = ({
  promptInput,
  onChangePromptInput,
  onGenerate,
  isGenerating,
}) => {
  const currentFormat = promptInput.format || 'short_story';
  const currentGenres = promptInput.genreHints || [];

  const handleSelectSuggestion = (s: (typeof STORY_SUGGESTIONS)[number]) => {
    onChangePromptInput({
      ...promptInput,
      rawPrompt: s.prompt,
      genreHints: s.genres,
      format: s.format,
    });
  };

  const toggleGenre = (genre: string) => {
    const exists = currentGenres.includes(genre);
    const updated = exists
      ? currentGenres.filter((g) => g !== genre)
      : [...currentGenres, genre];
    onChangePromptInput({
      ...promptInput,
      genreHints: updated,
    });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto z-10 flex flex-col gap-4 select-none">
      {/* Main Glass Input Card */}
      <div className="group relative rounded-2xl border border-[#232328] bg-[#141416] p-4 sm:p-5 shadow-2xl transition-all duration-300 focus-within:border-zinc-500">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#232328]">
          <span className="text-xs font-semibold tracking-wide text-zinc-300">
            Story Description & Premise
          </span>

          {promptInput.rawPrompt && (
            <button
              type="button"
              onClick={() => onChangePromptInput({ ...promptInput, rawPrompt: '' })}
              className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Textarea */}
        <AutoResizeTextarea
          value={promptInput.rawPrompt}
          onChange={(e) =>
            onChangePromptInput({
              ...promptInput,
              rawPrompt: e.target.value,
            })
          }
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && promptInput.rawPrompt.trim()) {
              e.preventDefault();
              onGenerate();
            }
          }}
          minHeight={76}
          placeholder="Describe your story premise, inciting incident, character conflicts, or narrative world rules..."
          className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500 outline-none leading-relaxed font-normal resize-none"
          disabled={isGenerating}
        />

        {/* Action Bar Inside Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-[#232328]">
          {/* Format Selector Pills - Clean, un-cluttered, no extra icons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium mr-1">
              Format:
            </span>
            {FORMAT_OPTIONS.map((f) => {
              const isSelected = currentFormat === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChangePromptInput({ ...promptInput, format: f.id as any })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#1c1c1f] hover:bg-[#25252a] text-zinc-400 hover:text-zinc-200 border border-[#232328]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              ⌘ + Enter
            </span>
            <button
              type="button"
              disabled={isGenerating || !promptInput.rawPrompt.trim()}
              onClick={onGenerate}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                isGenerating || !promptInput.rawPrompt.trim()
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-200 text-black active:scale-95'
              }`}
            >
              <span>{isGenerating ? 'Synthesizing...' : 'Generate Story'}</span>
              <ArrowUp className="size-3.5 rotate-45 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion & Genre Quick-Pills Row */}
      <div className="flex flex-col gap-2 px-1">
        {/* Story Prompts Presets */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sidebar-scrollbar">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold shrink-0">
            Inspire:
          </span>
          {STORY_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="px-3 py-1 rounded-full text-xs bg-[#141416] hover:bg-[#1c1c1f] text-zinc-300 hover:text-white border border-[#232328] transition-colors cursor-pointer shrink-0 font-medium"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Genre Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sidebar-scrollbar">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold shrink-0">
            Genres:
          </span>
          {GENRE_PILLS.map((genre) => {
            const isSelected = currentGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[#141416] hover:bg-[#1c1c1f] text-zinc-400 hover:text-zinc-200 border border-[#232328]'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
