import React from 'react';
import { useAtom } from 'jotai';
import {
  Sparkles,
  StopCircle,
  Flame,
  Radio,
  Disc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  captionAtom,
  bpmAtom,
  keyscaleAtom,
  timesignatureAtom,
  durationAtom,
  taskTypeAtom,
  MUSIC_PRESETS,
} from '../store/musicStore';
import { useMusicGeneration } from '../hooks/useMusicGeneration';

export const MusicPromptEditor: React.FC = () => {
  const [caption, setCaption] = useAtom(captionAtom);
  const [bpm, setBpm] = useAtom(bpmAtom);
  const [keyscale, setKeyscale] = useAtom(keyscaleAtom);
  const [timesignature, setTimesignature] = useAtom(timesignatureAtom);
  const [duration, setDuration] = useAtom(durationAtom);
  const [taskType, setTaskType] = useAtom(taskTypeAtom);

  const {
    isGenerating,
    generationProgress,
    startGeneration,
    cancelActiveTask,
  } = useMusicGeneration();

  const handleApplyPreset = (preset: typeof MUSIC_PRESETS[0]) => {
    setCaption(preset.caption);
    setBpm(preset.bpm);
    setKeyscale(preset.keyscale);
    setTimesignature(preset.timesignature);
    setDuration(preset.duration);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      {/* Top Mode Tabs & Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setTaskType('text2music')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              taskType === 'text2music'
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-3.5 text-violet-500" />
            <span>Text to Music</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskType('cover-nofsq')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              taskType === 'cover-nofsq'
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Disc className="size-3.5 text-indigo-500" />
            <span>Cover Song</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskType('lego')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              taskType === 'lego'
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="size-3.5 text-sky-500" />
            <span>Lego Stem Layer</span>
          </button>
        </div>

        {/* Quick Musical Meta Indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
            {bpm > 0 ? `${bpm} BPM` : 'Auto BPM'}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
            {keyscale || 'Auto Key'}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
            {timesignature}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
            ~{duration >= 60 ? `${duration / 60}m` : `${duration}s`}
          </span>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Describe the musical track: genre, instrumentation, tempo, mood, melodic style..."
          rows={3}
          disabled={isGenerating}
          className="resize-none rounded-xl bg-background/50 border-border/70 p-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary shadow-inner"
        />

        {caption && !isGenerating && (
          <button
            type="button"
            onClick={() => setCaption('')}
            className="absolute bottom-2.5 right-2.5 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Style Presets Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground mr-1 flex items-center gap-1">
          <Flame className="size-3 text-amber-500" /> Presets:
        </span>
        {MUSIC_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={isGenerating}
            onClick={() => handleApplyPreset(preset)}
            className="group inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 hover:bg-muted/80 hover:border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-all shadow-2xs"
          >
            <span className="font-medium">{preset.title}</span>
            <span className="text-[10px] opacity-60">({preset.bpm} BPM)</span>
          </button>
        ))}
      </div>

      {/* Generation Action & Live Progress Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-border/40">
        <div className="flex-1 min-w-[200px]">
          {isGenerating && generationProgress ? (
            <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="inline-block size-2 rounded-full bg-primary animate-ping" />
                  {generationProgress.stage || 'Synthesizing Audio...'}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                  {generationProgress.etaFormatted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-sans font-medium border border-primary/20">
                      ~{generationProgress.etaFormatted}
                    </span>
                  )}
                  <span>
                    {generationProgress.percentage}% ({generationProgress.step}/{generationProgress.total || '?'})
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.max(5, generationProgress.percentage)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {generationProgress.message || 'Running neural diffusion steps...'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              ACE-Step 1.5 generates lossless 48kHz audio directly on your device.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isGenerating ? (
            <Button
              type="button"
              variant="destructive"
              onClick={cancelActiveTask}
              className="gap-2 rounded-xl px-5 shadow-md shadow-destructive/20 font-semibold"
            >
              <StopCircle className="size-4 animate-spin" />
              <span>Cancel</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={startGeneration}
              disabled={!caption.trim()}
              className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/35 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="size-4" />
              <span>Generate Music</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
