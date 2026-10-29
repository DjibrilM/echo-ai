import React from 'react';
import { useAtom } from 'jotai';
import {
  Mic,
  Music2,
  Sparkles,
  AlignLeft,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  lyricsAtom,
  isInstrumentalAtom,
  simpleModeAtom,
  rewriteQueryAtom,
  generateLrcAtom,
  computeQualityScoreAtom,
} from '../store/musicStore';

export const LyricsEditor: React.FC = () => {
  const [lyrics, setLyrics] = useAtom(lyricsAtom);
  const [isInstrumental, setIsInstrumental] = useAtom(isInstrumentalAtom);
  const [simpleMode, setSimpleMode] = useAtom(simpleModeAtom);
  const [rewriteQuery, setRewriteQuery] = useAtom(rewriteQueryAtom);
  const [generateLrc, setGenerateLrc] = useAtom(generateLrcAtom);
  const [computeQualityScore, setComputeQualityScore] = useAtom(computeQualityScoreAtom);

  const insertTag = (tag: string) => {
    if (isInstrumental) {
      setIsInstrumental(false);
    }
    const addition = `\n${tag}\n`;
    setLyrics((prev) => (prev ? prev + addition : tag + '\n'));
  };

  const handleSimpleModeToggle = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    if (next) {
      setRewriteQuery(false); // Mutually exclusive per documentation
    }
  };

  const handleRewriteQueryToggle = () => {
    const next = !rewriteQuery;
    setRewriteQuery(next);
    if (next) {
      setSimpleMode(false); // Mutually exclusive per documentation
      if (isInstrumental) {
        setIsInstrumental(false); // Query Rewriting requires real lyrics
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mic className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vocal Lyrics & LM Assistance</h3>
            <p className="text-[11px] text-muted-foreground">
              Provide vocal lyrics or let the ACE-Step Language Model compose/align them
            </p>
          </div>
        </div>

        {/* Instrumental Switch Pill */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsInstrumental(true);
              setRewriteQuery(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-all ${
              isInstrumental
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music2 className="size-3.5 text-indigo-500" />
            <span>Instrumental</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInstrumental(false)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-all ${
              !isInstrumental
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="size-3.5 text-violet-500" />
            <span>Vocals / Lyrics</span>
          </button>
        </div>
      </div>

      {!isInstrumental && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          {/* Quick Structure Insert Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Insert:</span>
            {['[verse]', '[chorus]', '[bridge]', '[outro]'].map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertTag(tag)}
                className="h-7 rounded-lg text-xs font-mono border-border/60 hover:bg-muted"
              >
                + {tag}
              </Button>
            ))}
          </div>

          {/* Lyrics Textarea */}
          <Textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder={`[verse]\nThe neon lights flicker as the rain falls down\n\n[chorus]\nEchoes in the night, drifting through the sound`}
            rows={5}
            className="font-mono text-xs leading-relaxed resize-none rounded-xl bg-background/50 border-border/70 p-3.5 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
          />
        </div>
      )}

      {/* LM Intelligent Assistance Controls (per QVAC docs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-border/40 text-xs">
        {/* Simple Mode */}
        <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
          simpleMode ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border/40 hover:bg-muted/50'
        }`}>
          <input
            type="checkbox"
            checked={simpleMode}
            onChange={handleSimpleModeToggle}
            className="mt-0.5 rounded text-primary focus:ring-primary/20"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Simple Mode (Auto-Compose)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              LM composes detailed caption & lyrics from a short prompt.
            </p>
          </div>
        </label>

        {/* Query Rewriting */}
        <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
          rewriteQuery ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border/40 hover:bg-muted/50'
        }`}>
          <input
            type="checkbox"
            checked={rewriteQuery}
            onChange={handleRewriteQueryToggle}
            disabled={isInstrumental}
            className="mt-0.5 rounded text-primary focus:ring-primary/20 disabled:opacity-40"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <FileText className="size-3.5 text-blue-500" />
              <span>Query Rewriting</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              LM refines musical description while preserving your lyric content.
            </p>
          </div>
        </label>

        {/* Generate LRC Karaoke Lyrics */}
        <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
          generateLrc ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border/40 hover:bg-muted/50'
        }`}>
          <input
            type="checkbox"
            checked={generateLrc}
            onChange={(e) => setGenerateLrc(e.target.checked)}
            disabled={isInstrumental && !simpleMode}
            className="mt-0.5 rounded text-primary focus:ring-primary/20 disabled:opacity-40"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <AlignLeft className="size-3.5 text-emerald-500" />
              <span>Generate LRC (Karaoke Lyrics)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Aligns vocal timing into synchronized karaoke timestamp text.
            </p>
          </div>
        </label>

        {/* Compute Quality Score */}
        <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
          computeQualityScore ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border/40 hover:bg-muted/50'
        }`}>
          <input
            type="checkbox"
            checked={computeQualityScore}
            onChange={(e) => setComputeQualityScore(e.target.checked)}
            className="mt-0.5 rounded text-primary focus:ring-primary/20"
          />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="size-3.5 text-violet-500" />
              <span>Teacher-Forcing Quality Score</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Scores caption/lyrics PMI & metadata recall [0..1] in stats.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
