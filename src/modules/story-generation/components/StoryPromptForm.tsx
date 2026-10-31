import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Layers,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import type { RawCreativePrompt, StoryGenerationProgress, NarrativeFormat } from '../types.ts';

interface StoryPromptFormProps {
  prompt: RawCreativePrompt;
  onChangePrompt: (prompt: RawCreativePrompt) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  progress: StoryGenerationProgress | null;
}

const AVAILABLE_GENRES = [
  'Hard Sci-Fi',
  'Psychological Thriller',
  'Mystery',
  'Dark Fantasy',
  'Cyberpunk',
  'Historical Fiction',
  'Cosmic Horror',
  'Dystopian',
];

const AVAILABLE_FORMATS: Array<{ id: NarrativeFormat; label: string; desc: string }> = [
  { id: 'short_story', label: 'Short Story', desc: 'Punchy, tightly wound 2-4 scene narrative' },
  { id: 'audio_drama', label: 'Audio Drama', desc: 'Multi-character script prepared for CosyVoice 3' },
  { id: 'novel', label: 'Novel Outline', desc: 'Multi-act structural arc with full scene contracts' },
  { id: 'episodic', label: 'Episodic Series', desc: 'Serialized storyline with recurring conflicts' },
];

export const StoryPromptForm: React.FC<StoryPromptFormProps> = ({
  prompt,
  onChangePrompt,
  onGenerate,
  isGenerating,
  progress,
}) => {
  const [newConstraint, setNewConstraint] = React.useState('');

  const toggleGenre = (genre: string) => {
    const current = prompt.genreHints || [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onChangePrompt({ ...prompt, genreHints: next });
  };

  const addConstraint = () => {
    if (!newConstraint.trim()) return;
    const current = prompt.constraints || [];
    onChangePrompt({ ...prompt, constraints: [...current, newConstraint.trim()] });
    setNewConstraint('');
  };

  const removeConstraint = (index: number) => {
    const current = prompt.constraints || [];
    onChangePrompt({ ...prompt, constraints: current.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full p-6">
      {/* Hero Banner */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sparkles className="size-6 text-indigo-400" />
          Narrative Orchestration Studio
        </h1>
        <p className="text-sm text-zinc-400">
          Transform high-level creative premises into end-to-end structured story graphs, multi-character prose,
          and natural acoustic audio dramas using local Gemma 4 inference and CosyVoice 3.
        </p>
      </div>

      {/* Progress Card when Generating */}
      {isGenerating && progress && (
        <Card className="p-5 border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950/50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-indigo-300 flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-indigo-400" />
              {progress.stageName}
            </span>
            <span className="text-zinc-400 font-mono">{progress.progressPercent}%</span>
          </div>

          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-zinc-300 font-mono truncate">{progress.message}</p>
        </Card>
      )}

      {/* Main Input Form */}
      <div className="grid gap-6">
        {/* Premise Card */}
        <Card className="p-5 bg-[#18181b] border-[#27272a] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Layers className="size-3.5 text-indigo-400" />
              Creative Premise / Story Seed
            </label>
            <span className="text-[11px] text-zinc-500 font-mono">
              {prompt.rawPrompt.length} characters
            </span>
          </div>

          <Textarea
            rows={4}
            value={prompt.rawPrompt}
            disabled={isGenerating}
            onChange={(e) => onChangePrompt({ ...prompt, rawPrompt: e.target.value })}
            placeholder="Enter your premise, inciting incident, or story world hook..."
            className="bg-[#121214] border-[#27272a] text-zinc-200 placeholder:text-zinc-600 resize-none font-sans text-sm focus-visible:ring-indigo-500"
          />
        </Card>

        {/* Narrative Format Selection */}
        <Card className="p-5 bg-[#18181b] border-[#27272a] flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Radio className="size-3.5 text-indigo-400" />
            Narrative Format
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AVAILABLE_FORMATS.map((fmt) => {
              const isSelected = (prompt.format || 'short_story') === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onChangePrompt({ ...prompt, format: fmt.id })}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-[#27272a] bg-[#121214] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-semibold">{fmt.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{fmt.desc}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Genre Tags */}
        <Card className="p-5 bg-[#18181b] border-[#27272a] flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Sparkles className="size-3.5 text-indigo-400" />
            Genre Direction & Aesthetic Hints
          </label>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_GENRES.map((genre) => {
              const isSelected = prompt.genreHints?.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => toggleGenre(genre)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-medium'
                      : 'border-[#27272a] bg-[#121214] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Explicit Creative Constraints */}
        <Card className="p-5 bg-[#18181b] border-[#27272a] flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <ShieldAlert className="size-3.5 text-amber-400" />
            Explicit Constraints & World Rules
          </label>

          <div className="flex gap-2">
            <Input
              value={newConstraint}
              disabled={isGenerating}
              onChange={(e) => setNewConstraint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addConstraint();
                }
              }}
              placeholder="e.g. No faster-than-light communication, protagonist cannot lie..."
              className="bg-[#121214] border-[#27272a] text-zinc-200 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addConstraint}
              disabled={isGenerating || !newConstraint.trim()}
              className="text-xs"
            >
              Add
            </Button>
          </div>

          {prompt.constraints && prompt.constraints.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {prompt.constraints.map((c, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs gap-1.5 py-1 px-2.5"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => removeConstraint(i)}
                    className="hover:text-amber-100 font-bold ml-1"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Generate Button Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Strict Epistemic Isolation • Max 2 Review Passes • CosyVoice 3 Crossfaded Audio</span>
          </div>

          <Button
            size="lg"
            disabled={isGenerating || !prompt.rawPrompt.trim()}
            onClick={onGenerate}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Generating Story...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 fill-current" />
                <span>Launch Narrative Pipeline</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

