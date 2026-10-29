import React from 'react';
import { useAtom } from 'jotai';
import {
  Music,
  Sliders,
  History,
  Wand2,
  Layers,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  engineAtom,
  ditVariantAtom,
  activeDrawerTabAtom,
  audioEditModalOpenAtom,
  audioUnderstandModalOpenAtom,
  modelStatusModalOpenAtom,
  historyListAtom,
} from '../store/musicStore';

export const MusicHeader: React.FC = () => {
  const [engine] = useAtom(engineAtom);
  const [ditVariant] = useAtom(ditVariantAtom);
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);
  const [, setAudioEditModalOpen] = useAtom(audioEditModalOpenAtom);
  const [, setAudioUnderstandModalOpen] = useAtom(audioUnderstandModalOpenAtom);
  const [, setModelStatusModalOpen] = useAtom(modelStatusModalOpenAtom);
  const [historyList] = useAtom(historyListAtom);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/20 text-white">
          <Music className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              AudioGen Music Studio
            </h1>
            <Badge variant="secondary" className="text-[11px] font-mono tracking-tight bg-primary/10 text-primary border-primary/20">
              {engine === 'acestep' ? `ACE-Step 1.5 • ${ditVariant.toUpperCase()}` : 'MiniMax-Music3'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate full compositions, covers, stem layers & karaoke lyrics with neural audio synthesis
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModelStatusModalOpen(true)}
          className="h-9 gap-1.5 text-xs rounded-lg border-border/60 hover:bg-muted/50"
          title="Inspect Engine Hardware & Model Fit"
        >
          <Activity className="size-3.5 text-emerald-500" />
          <span>System & Fit</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setAudioUnderstandModalOpen(true)}
          className="h-9 gap-1.5 text-xs rounded-lg border-border/60 hover:bg-muted/50"
          title="Reverse Analyze a Recording with AudioUnderstand"
        >
          <Wand2 className="size-3.5 text-amber-500" />
          <span>Analyze Audio</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setAudioEditModalOpen(true)}
          className="h-9 gap-1.5 text-xs rounded-lg border-border/60 hover:bg-muted/50"
          title="Flow-Edit or Repaint an existing song"
        >
          <Layers className="size-3.5 text-blue-500" />
          <span>Edit & Repaint</span>
        </Button>

        <Button
          variant={activeDrawerTab === 'controls' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setActiveDrawerTab((prev) => (prev === 'controls' ? null : 'controls'))}
          className="h-9 gap-1.5 text-xs rounded-lg border-border/60"
        >
          <Sliders className="size-3.5" />
          <span>Controls</span>
        </Button>

        <Button
          variant={activeDrawerTab === 'history' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setActiveDrawerTab((prev) => (prev === 'history' ? null : 'history'))}
          className="h-9 gap-1.5 text-xs rounded-lg border-border/60 relative"
        >
          <History className="size-3.5" />
          <span>History</span>
          {historyList.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              {historyList.length}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};
