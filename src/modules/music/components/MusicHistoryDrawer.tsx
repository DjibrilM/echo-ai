import React from 'react';
import { useAtom } from 'jotai';
import {
  History,
  X,
  Play,
  Pause,
  Trash2,
  Download,
  RotateCcw,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  activeDrawerTabAtom,
  historyListAtom,
  activeTrackAtom,
  seedAtom,
  captionAtom,
  bpmAtom,
  keyscaleAtom,
} from '../store/musicStore';
import { useMusicGeneration } from '../hooks/useMusicGeneration';
import { TrackWavePlayer } from '@/components/player/TrackWavePlayer';
import type { MusicGenerationOutput } from '../types';

export const MusicHistoryDrawer: React.FC = () => {
  const [activeDrawerTab, setActiveDrawerTab] = useAtom(activeDrawerTabAtom);
  const [historyList] = useAtom(historyListAtom);
  const [activeTrack] = useAtom(activeTrackAtom);
  const [, setSeed] = useAtom(seedAtom);
  const [, setCaption] = useAtom(captionAtom);
  const [, setBpm] = useAtom(bpmAtom);
  const [, setKeyscale] = useAtom(keyscaleAtom);

  const { selectTrack, playPause, deleteTrack, clearAllHistory, isPlaying } = useMusicGeneration();

  if (activeDrawerTab !== 'history') return null;

  const handleReplaySeed = (item: MusicGenerationOutput, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.seed !== undefined) setSeed(item.seed);
    if (item.caption) setCaption(item.caption);
    if (item.bpm) setBpm(item.bpm);
    if (item.keyscale) setKeyscale(item.keyscale);
  };

  const handleDownload = (item: MusicGenerationOutput, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.audioUrl) return;
    const a = document.createElement('a');
    a.href = item.audioUrl;
    a.download = `echo-audiogen-${item.bpm || 120}bpm-${item.id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 border-l border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Generation History</h2>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {historyList.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {historyList.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllHistory}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          )}
          <button
            type="button"
            onClick={() => setActiveDrawerTab(null)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-muted-foreground">
            <Music className="size-8 opacity-40" />
            <p className="text-xs font-medium">No music renders yet</p>
            <p className="text-[11px] opacity-70">
              Generated songs and iterations will appear here
            </p>
          </div>
        ) : (
          historyList.map((item) => {
            const isCurrent = activeTrack?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => selectTrack(item, true)}
                className={`group flex flex-col gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-primary/60 bg-primary/10 shadow-sm'
                    : 'border-border/50 bg-card/60 hover:bg-muted/40 hover:border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) {
                          playPause();
                        } else {
                          selectTrack(item, true);
                        }
                      }}
                      className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="size-3.5" />
                      ) : (
                        <Play className="size-3.5 ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate" title={item.caption}>
                        {item.caption}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {(item.durationMs / 1000).toFixed(0)}s • {item.bpm || '?'} BPM • {item.keyscale || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleReplaySeed(item, e)}
                      title="Use this seed & settings"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownload(item, e)}
                      title="Download WAV"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Download className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrack(item.id);
                      }}
                      title="Delete take"
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Real-time TrackWavePlayer */}
                <TrackWavePlayer
                  trackId={item.id}
                  waveform={item.waveform}
                  duration={item.durationMs ? Math.round(item.durationMs / 1000) : 60}
                  onPlay={() => selectTrack(item, true)}
                  height={16}
                  className="w-full px-0.5"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
