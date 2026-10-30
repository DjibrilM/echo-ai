import React from 'react';
import { useAtom } from 'jotai';
import type { MusicDitVariant } from '../types';
import {
  Sliders,
  X,
  Gauge,
  Clock,
  Key,
  Globe,
  Dices,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  engineAtom,
  ditVariantAtom,
  bpmAtom,
  keyscaleAtom,
  timesignatureAtom,
  vocalLanguageAtom,
  durationAtom,
  seedAtom,
  augmentCaptionAtom,
  normalizeLoudnessAtom,
  guidanceScaleAtom,
  dcwEnabledAtom,
  dcwScalerAtom,
  dcwHighScalerAtom,
  inferenceStepsAtom,
  shiftAtom,
  activeDrawerTabAtom,
} from '../store/musicStore';

const KEY_SCALES = [
  '',
  'C major',
  'C minor',
  'C# major',
  'C# minor',
  'D major',
  'D minor',
  'Eb major',
  'Eb minor',
  'E major',
  'E minor',
  'F major',
  'F minor',
  'F# major',
  'F# minor',
  'G major',
  'G minor',
  'Ab major',
  'Ab minor',
  'A major',
  'A minor',
  'Bb major',
  'Bb minor',
  'B major',
  'B minor',
];

const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4'];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ko', label: 'Korean' },
];

export const MusicControlsDrawer: React.FC = () => {
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);
  const [engine, setEngine] = useAtom(engineAtom);
  const [ditVariant, setDitVariant] = useAtom(ditVariantAtom);
  const [bpm, setBpm] = useAtom(bpmAtom);
  const [keyscale, setKeyscale] = useAtom(keyscaleAtom);
  const [timesignature, setTimesignature] = useAtom(timesignatureAtom);
  const [vocalLanguage, setVocalLanguage] = useAtom(vocalLanguageAtom);
  const [duration, setDuration] = useAtom(durationAtom);
  const [seed, setSeed] = useAtom(seedAtom);
  const [augmentCaption, setAugmentCaption] = useAtom(augmentCaptionAtom);
  const [normalizeLoudness, setNormalizeLoudness] = useAtom(normalizeLoudnessAtom);
  const [guidanceScale, setGuidanceScale] = useAtom(guidanceScaleAtom);
  const [dcwEnabled, setDcwEnabled] = useAtom(dcwEnabledAtom);
  const [dcwScaler, setDcwScaler] = useAtom(dcwScalerAtom);
  const [dcwHighScaler, setDcwHighScaler] = useAtom(dcwHighScalerAtom);
  const [inferenceSteps, setInferenceSteps] = useAtom(inferenceStepsAtom);
  const [shift, setShift] = useAtom(shiftAtom);

  if (activeDrawerTab !== 'controls') return null;

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 border-l border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Musical & Engine Controls</h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawerTab(null)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Engine & DiT Variant */}
        <div className="space-y-3">
          <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Cpu className="size-3.5 text-violet-500" /> Inference Engine
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEngine('acestep')}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                engine === 'acestep'
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <span className="font-bold text-xs">ACE-Step 1.5</span>
              <span className="text-[10px] opacity-70">Lyrics, stems, covers & edits</span>
            </button>

            <button
              type="button"
              onClick={() => setEngine('minimax')}
              className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                engine === 'minimax'
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <span className="font-bold text-xs">MiniMax-Music3</span>
              <span className="text-[10px] opacity-70">Desktop GGUF weights</span>
            </button>
          </div>

          {engine === 'acestep' && (
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-medium text-muted-foreground">DiT Variant</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'turbo-q4', label: 'Turbo Q4', hint: 'Fastest' },
                  { id: 'turbo-q8', label: 'Turbo Q8', hint: 'High-Fi' },
                  { id: 'sft-q8', label: 'SFT Q8', hint: 'Fine-Tuned' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setDitVariant(v.id as MusicDitVariant)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                      ditVariant === v.id
                        ? 'border-primary bg-primary/15 text-primary font-bold'
                        : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-xs">{v.label}</span>
                    <span className="text-[9px] opacity-70">{v.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BPM Tempo Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Gauge className="size-3.5 text-amber-500" /> Tempo (BPM)
            </label>
            <span className="font-mono font-bold text-foreground">
              {bpm > 0 ? `${bpm} BPM` : 'Auto (Inferred)'}
            </span>
          </div>
          <Slider
            value={[bpm]}
            min={0}
            max={200}
            step={1}
            onValueChange={([val]) => setBpm(val)}
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0 (Auto)</span>
            <span>60 (Slow)</span>
            <span>120 (Moderate)</span>
            <span>180 (Fast)</span>
          </div>
        </div>

        {/* Key & Scale Selection */}
        <div className="space-y-2">
          <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Key className="size-3.5 text-sky-500" /> Musical Key & Scale
          </label>
          <select
            value={keyscale}
            onChange={(e) => setKeyscale(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="">Auto (Infer from Prompt)</option>
            {KEY_SCALES.filter(Boolean).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* Time Signature */}
        <div className="space-y-2">
          <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-violet-500" /> Time Signature
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SIGNATURES.map((sig) => (
              <button
                key={sig}
                type="button"
                onClick={() => setTimesignature(sig)}
                className={`py-1.5 rounded-lg border font-mono text-center transition-all ${
                  timesignature === sig
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {sig}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-emerald-500" /> Target Duration
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">~{duration}s</span>
              <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                {engine === 'minimax'
                  ? `Est: ~${Math.max(1, Math.round((duration / 60) * 5.5))}m`
                  : `Est: ~${Math.max(5, Math.round(duration * 0.7))}s`}
              </span>
            </div>
          </div>
          <Slider
            value={[duration]}
            min={10}
            max={180}
            step={5}
            onValueChange={([val]) => setDuration(val)}
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>10s</span>
            <span>30s</span>
            <span>60s</span>
            <span>120s</span>
            <span>180s</span>
          </div>
        </div>

        {/* Vocal Language */}
        <div className="space-y-2">
          <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3.5 text-blue-500" /> Vocal Language
          </label>
          <select
            value={vocalLanguage}
            onChange={(e) => setVocalLanguage(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary shadow-xs"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
        </div>

        {/* RNG Seed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Dices className="size-3.5 text-indigo-500" /> RNG Seed
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRandomSeed}
              className="h-6 px-2 text-[10px]"
            >
              Roll Random
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={seed === -1 ? '' : seed}
              onChange={(e) => setSeed(e.target.value === '' ? -1 : Number(e.target.value))}
              placeholder="Random (-1)"
              className="h-8 font-mono text-xs rounded-lg"
            />
            {seed !== -1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSeed(-1)}
                className="h-8 px-2 text-[10px]"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Output & Guidance Section */}
        <div className="space-y-3 pt-3 border-t border-border/40">
          <h4 className="font-bold text-xs text-foreground uppercase tracking-wider text-muted-foreground/80">
            Advanced Sampler & Audio Tuning
          </h4>

          {/* Normalize Loudness */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="font-medium text-foreground">99.9th Percentile Normalization</span>
            <input
              type="checkbox"
              checked={normalizeLoudness}
              onChange={(e) => setNormalizeLoudness(e.target.checked)}
              className="rounded text-primary focus:ring-primary/20"
            />
          </label>

          {/* Guidance Scale */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">DiT Guidance Scale (CFG)</span>
              <span className="font-mono text-muted-foreground">
                {guidanceScale === 0 ? 'Auto (1.0 Turbo / 7.0 SFT)' : guidanceScale}
              </span>
            </div>
            <Slider
              value={[guidanceScale]}
              min={0}
              max={12}
              step={0.5}
              onValueChange={([val]) => setGuidanceScale(val)}
            />
          </div>

          {/* Inference Steps */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">DiT Inference Steps</span>
              <span className="font-mono text-muted-foreground">{inferenceSteps}</span>
            </div>
            <Slider
              value={[inferenceSteps]}
              min={4}
              max={50}
              step={1}
              onValueChange={([val]) => setInferenceSteps(val)}
            />
          </div>

          {/* Augment Caption with Metadata */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="font-medium text-foreground">Reinforce Metadata in Caption</span>
            <input
              type="checkbox"
              checked={augmentCaption}
              onChange={(e) => setAugmentCaption(e.target.checked)}
              className="rounded text-primary focus:ring-primary/20"
            />
          </label>

          {/* Timestep Shift */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">DiT Timestep Shift</span>
              <span className="font-mono text-muted-foreground">{shift}</span>
            </div>
            <Slider
              value={[shift]}
              min={1.0}
              max={5.0}
              step={0.5}
              onValueChange={([val]) => setShift(val)}
            />
          </div>

          {/* DCW Haar Correction */}
          <div className="space-y-2 pt-1 border-t border-border/30">
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="font-medium text-foreground">Haar DCW Sampler Correction</span>
              <input
                type="checkbox"
                checked={dcwEnabled}
                onChange={(e) => setDcwEnabled(e.target.checked)}
                className="rounded text-primary focus:ring-primary/20"
              />
            </label>

            {dcwEnabled && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Low Scaler</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={dcwScaler}
                    onChange={(e) => setDcwScaler(Number(e.target.value))}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">High Scaler</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={dcwHighScaler}
                    onChange={(e) => setDcwHighScaler(Number(e.target.value))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
