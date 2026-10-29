import React, { useState } from 'react';
import { useAtom } from 'jotai';
import {
  Wand2,
  X,
  Upload,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  audioUnderstandModalOpenAtom,
  captionAtom,
  bpmAtom,
  keyscaleAtom,
  timesignatureAtom,
  vocalLanguageAtom,
} from '../store/musicStore';
import { understandMusic } from '../services/music-api';

interface AudioUnderstandResult {
  caption: string;
  bpm: number;
  keyscale: string;
  timesignature: string;
  vocalLanguage: string;
  duration: number;
  audioCodes: number[];
  seed: number;
}

export const AudioUnderstandModal: React.FC = () => {
  const [open, setOpen] = useAtom(audioUnderstandModalOpenAtom);
  const [sourceAudio, setSourceAudio] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioUnderstandResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [, setCaption] = useAtom(captionAtom);
  const [, setBpm] = useAtom(bpmAtom);
  const [, setKeyscale] = useAtom(keyscaleAtom);
  const [, setTimesignature] = useAtom(timesignatureAtom);
  const [, setVocalLanguage] = useAtom(vocalLanguageAtom);

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const filePath = (file as File & { path?: string }).path || file.name;
      setSourceAudio(filePath);
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleRunAnalysis = async () => {
    if (!sourceAudio) return;
    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      const taskId = `music_understand_${Date.now()}`;
      const res = await understandMusic({
        taskId,
        sourceAudio,
      });

      if (res.success && res.data) {
        setResult(res.data as AudioUnderstandResult);
      } else {
        setErrorMsg(res.error || 'Audio analysis failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyToStudio = () => {
    if (!result) return;
    if (result.caption) setCaption(result.caption);
    if (result.bpm) setBpm(result.bpm);
    if (result.keyscale) setKeyscale(result.keyscale);
    if (result.timesignature) setTimesignature(result.timesignature);
    if (result.vocalLanguage) setVocalLanguage(result.vocalLanguage);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Wand2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">ACE-Step Audio Understand</h2>
              <p className="text-xs text-muted-foreground">
                Reverse-engineer musical properties and LM semantic codes from any recording
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Audio File Selection */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-foreground">Select Audio File to Analyze</label>
          {sourceAudio ? (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 p-2.5 font-mono">
              <span className="truncate">{sourceAudio}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSourceAudio('');
                  setResult(null);
                }}
                className="h-6 px-2 text-[11px]"
              >
                Change
              </Button>
            </div>
          ) : (
            <div
              onClick={() => document.getElementById('understand-modal-audio-input')?.click()}
              className="flex items-center justify-center p-6 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-muted/10 cursor-pointer gap-2"
            >
              <Upload className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Upload track to analyze (up to 600s)</span>
              <input
                type="file"
                id="understand-modal-audio-input"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>

        {/* Run Analysis Button */}
        {!result && (
          <Button
            type="button"
            onClick={handleRunAnalysis}
            disabled={!sourceAudio || isAnalyzing}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
          >
            {isAnalyzing ? 'Decoding semantic FSQ codes & analyzing...' : 'Start Audio Analysis'}
          </Button>
        )}

        {errorMsg && (
          <p className="text-xs text-destructive text-center font-medium">{errorMsg}</p>
        )}

        {/* Result View */}
        {result && (
          <div className="space-y-3.5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 animate-in fade-in duration-300 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
              <CheckCircle2 className="size-4" />
              <span>Analysis Complete</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Inferred Caption Description:
              </span>
              <p className="text-xs text-foreground font-medium leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/40">
                "{result.caption}"
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Tempo</span>
                <span className="font-bold">{result.bpm} BPM</span>
              </div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Key</span>
                <span className="font-bold">{result.keyscale}</span>
              </div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Meter</span>
                <span className="font-bold">{result.timesignature}</span>
              </div>
              <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                <span className="text-[10px] text-muted-foreground block">Codes</span>
                <span className="font-bold">{result.audioCodes?.length || 0}</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleApplyToStudio}
              className="w-full rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 mt-2"
            >
              <span>Transfer to Studio Prompt & Controls</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
