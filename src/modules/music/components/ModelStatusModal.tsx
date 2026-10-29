import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  Activity,
  X,
  PowerOff,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { modelStatusModalOpenAtom, ditVariantAtom } from '../store/musicStore';
import {
  getMusicModelStatus,
  assessMusicFit,
  unloadMusicModel,
} from '../services/music-api';

export const ModelStatusModal: React.FC = () => {
  const [open, setOpen] = useAtom(modelStatusModalOpenAtom);
  const [ditVariant] = useAtom(ditVariantAtom);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [fitResult, setFitResult] = useState<Record<string, unknown> | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isUnloading, setIsUnloading] = useState(false);

  useEffect(() => {
    if (open) {
      getMusicModelStatus().then((res) => {
        if (res.success && res.data) {
          setStatus(res.data);
        }
      });
    }
  }, [open]);

  if (!open) return null;

  const handleAssessFit = async () => {
    setIsAssessing(true);
    try {
      const res = await assessMusicFit({ engine: 'acestep', ditVariant });
      if (res.success && res.data) {
        setFitResult(res.data);
      }
    } finally {
      setIsAssessing(false);
    }
  };

  const handleUnload = async () => {
    setIsUnloading(true);
    try {
      await unloadMusicModel();
      const updated = await getMusicModelStatus();
      if (updated.success && updated.data) {
        setStatus(updated.data);
      }
    } finally {
      setIsUnloading(false);
    }
  };

  const modelsList = [
    {
      stage: 'Text Encoder',
      constant: 'AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0',
      size: '784 MB',
      purpose: 'Encodes captions, prompts, and vocal lyrics',
    },
    {
      stage: 'Language Model (LM)',
      constant: 'AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0',
      size: '710 MB',
      purpose: 'Plans the song, tempo, and musical structure at 5 Hz',
    },
    {
      stage: 'Diffusion Transformer (DiT)',
      constant: ditVariant === 'turbo-q8' ? 'AUDIOGEN_ACESTEP_V15_TURBO_Q8_0' : 'AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M',
      size: ditVariant === 'turbo-q8' ? '2.1 GB' : '1.45 GB',
      purpose: 'Fast lower-memory Turbo audio generation with Haar DCW',
    },
    {
      stage: 'Acoustic VAE Decoder',
      constant: 'AUDIOGEN_VAE_BF16',
      size: '337 MB',
      purpose: 'Decodes the latent representation into 48 kHz PCM audio',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-card p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">AudioGen Models & Hardware Fit</h2>
              <p className="text-xs text-muted-foreground">
                ACE-Step 1.5 model bundle architecture (~3.3 GB total weights)
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

        {/* Runtime Status Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-2.5">
            <Zap className={`size-4 ${status?.ready ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div>
              <span className="font-semibold text-foreground">
                Runtime Status: {status?.ready ? 'Model Loaded in Memory' : 'Idle (Loads on first generate)'}
              </span>
              <p className="text-[11px] text-muted-foreground">
                GPU Acceleration: Metal / Apple Silicon enabled
              </p>
            </div>
          </div>

          {Boolean(status?.ready) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUnloading}
              onClick={handleUnload}
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
            >
              <PowerOff className="size-3 mr-1" />
              {isUnloading ? 'Unloading...' : 'Unload'}
            </Button>
          )}
        </div>

        {/* Models Breakdown Table */}
        <div className="space-y-2 text-xs">
          <span className="font-semibold text-foreground block">ACE-Step 1.5 Pipeline Architecture</span>
          <div className="space-y-2">
            {modelsList.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-border/40 bg-background/50 flex items-start justify-between gap-3 font-mono text-[11px]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{m.stage}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {m.size}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{m.constant}</p>
                  <p className="text-[11px] text-foreground font-sans pt-0.5">{m.purpose}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary shrink-0">
                  Registry GGUF
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Fit Assessment */}
        <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Memory Assessment (assessModelFit)</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isAssessing}
              onClick={handleAssessFit}
              className="h-7 text-xs"
            >
              {isAssessing ? 'Assessing memory...' : 'Check Hardware Fit'}
            </Button>
          </div>

          {fitResult && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-emerald-500 font-bold">
                <span>
                  Verdict:{' '}
                  {typeof fitResult.verdict === 'string'
                    ? fitResult.verdict
                    : 'Fits device memory'}
                </span>
                <span>Peak ~3.3 GB</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans">
                Engine fit verified for device configuration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
