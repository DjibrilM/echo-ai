import React, { useMemo, useRef, useEffect } from 'react';
import { AlignLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LrcLyricsViewerProps {
  lrcText?: string;
  lyricsScore?: number;
  qualityScore?: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}

interface LrcLine {
  timeSeconds: number;
  text: string;
}

function parseLrc(lrc: string): LrcLine[] {
  const lines = lrc.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        result.push({
          timeSeconds: minutes * 60 + seconds,
          text,
        });
      }
    }
  }

  return result.sort((a, b) => a.timeSeconds - b.timeSeconds);
}

export const LrcLyricsViewer: React.FC<LrcLyricsViewerProps> = ({
  lrcText,
  lyricsScore,
  qualityScore,
  currentTime,
  onSeek,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parsedLines = useMemo(() => {
    if (!lrcText) return [];
    return parseLrc(lrcText);
  }, [lrcText]);

  // Find active line index based on currentTime
  const activeIndex = useMemo(() => {
    if (parsedLines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (currentTime >= parsedLines[i].timeSeconds) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [parsedLines, currentTime]);

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!lrcText || parsedLines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignLeft className="size-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-foreground">Synchronized Karaoke Lyrics</h3>
        </div>

        <div className="flex items-center gap-2">
          {lyricsScore !== undefined && (
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
              Alignment Confidence: {(lyricsScore * 100).toFixed(0)}%
            </Badge>
          )}

          {qualityScore !== undefined && (
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
              Quality Score: {(qualityScore * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-background/40 border border-border/40 text-center select-none"
      >
        {parsedLines.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;

          return (
            <div
              key={`${line.timeSeconds}-${idx}`}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek?.(line.timeSeconds)}
              className={`py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-200 text-xs ${
                isActive
                  ? 'bg-primary/20 text-primary font-bold text-sm scale-102 shadow-xs'
                  : isPassed
                  ? 'text-muted-foreground/60 hover:text-foreground'
                  : 'text-muted-foreground/90 hover:text-foreground'
              }`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
