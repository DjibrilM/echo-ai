import React from 'react';
import { useAtom } from 'jotai';
import {
  Upload,
  Disc,
  Radio,
  FileAudio,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  taskTypeAtom,
  sourceAudioAtom,
  referenceAudioAtom,
  coverNoiseStrengthAtom,
  trackAtom,
} from '../store/musicStore';
import type { MusicInstrumentTrack } from '../types';

const AUDIOGEN_TRACKS: { id: MusicInstrumentTrack; label: string }[] = [
  { id: 'drums', label: 'Drums / Beat' },
  { id: 'bass', label: 'Bassline' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'keyboard', label: 'Keyboard / Piano' },
  { id: 'synth', label: 'Synthesizer' },
  { id: 'strings', label: 'Strings' },
  { id: 'percussion', label: 'Percussion' },
  { id: 'vocals', label: 'Lead Vocals' },
  { id: 'backing_vocals', label: 'Backing Vocals' },
  { id: 'brass', label: 'Brass Stabs' },
  { id: 'woodwinds', label: 'Woodwinds' },
  { id: 'fx', label: 'Sound FX' },
];

export const ReferenceAndCoverSection: React.FC = () => {
  const [taskType, setTaskType] = useAtom(taskTypeAtom);
  const [sourceAudio, setSourceAudio] = useAtom(sourceAudioAtom);
  const [referenceAudio, setReferenceAudio] = useAtom(referenceAudioAtom);
  const [coverNoiseStrength, setCoverNoiseStrength] = useAtom(coverNoiseStrengthAtom);
  const [track, setTrack] = useAtom(trackAtom);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'source' | 'reference') => {
    const file = e.target.files?.[0];
    if (file) {
      // In Electron, file.path contains the absolute local filepath
      const filePath = (file as unknown as { path?: string }).path || file.name;
      if (target === 'source') {
        setSourceAudio(filePath);
      } else {
        setReferenceAudio(filePath);
      }
    }
  };

  if (taskType === 'text2music' && !referenceAudio) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileAudio className="size-4 text-primary" />
          <span>Optional: Condition style & timbre using a reference recording</span>
        </div>
        <div>
          <input
            type="file"
            id="timbre-reference-input"
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, 'reference')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('timbre-reference-input')?.click()}
            className="h-7 text-xs rounded-lg"
          >
            <Upload className="size-3 mr-1.5" />
            Add Timbre Reference
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {taskType === 'cover-nofsq' ? (
            <Disc className="size-4 text-indigo-500" />
          ) : taskType === 'lego' ? (
            <Radio className="size-4 text-sky-500" />
          ) : (
            <FileAudio className="size-4 text-violet-500" />
          )}
          <h3 className="text-sm font-semibold text-foreground">
            {taskType === 'cover-nofsq'
              ? 'Cover Song (Preserve Structure, Re-render Style)'
              : taskType === 'lego'
              ? 'Lego Stem (Regenerate Single Instrument Layer)'
              : 'Timbre Reference Conditioning'}
          </h3>
        </div>

        {taskType !== 'text2music' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTaskType('text2music')}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Switch to Text to Music
          </Button>
        )}
      </div>

      {/* Source Audio Input (Required for Cover and Lego) */}
      {taskType !== 'text2music' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground flex items-center justify-between">
            <span>Source Recording Audio (WAV, MP3, FLAC, M4A)</span>
            <span className="text-[10px] text-muted-foreground">Required</span>
          </label>

          {sourceAudio ? (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 p-2.5 text-xs font-mono">
              <div className="flex items-center gap-2 truncate">
                <FileAudio className="size-4 text-primary shrink-0" />
                <span className="truncate">{sourceAudio}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSourceAudio('')}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => document.getElementById('source-audio-input')?.click()}
              className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-all text-center gap-1.5"
            >
              <Upload className="size-5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Click to upload source audio file</p>
              <p className="text-[11px] text-muted-foreground">Decodes server-side to 48kHz stereo</p>
              <input
                type="file"
                id="source-audio-input"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'source')}
              />
            </div>
          )}
        </div>
      )}

      {/* Cover Noise Strength Slider (for cover-nofsq) */}
      {taskType === 'cover-nofsq' && (
        <div className="space-y-2 pt-1 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Cover Noise Strength (Structure Blend)</span>
            <span className="font-mono text-muted-foreground">{coverNoiseStrength}</span>
          </div>
          <Slider
            value={[coverNoiseStrength]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([val]) => setCoverNoiseStrength(val)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.0 (Maximum Variation)</span>
            <span>0.75 (Recommended)</span>
            <span>1.0 (Close to Source)</span>
          </div>
        </div>
      )}

      {/* Track Layer Selector (for Lego) */}
      {taskType === 'lego' && (
        <div className="space-y-2 pt-1 border-t border-border/30">
          <label className="text-xs font-medium text-foreground flex items-center justify-between">
            <span>Instrument Layer to Regenerate</span>
            <span className="text-[10px] text-primary">AUDIOGEN_TRACKS</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {AUDIOGEN_TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrack(t.id)}
                className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                  track === t.id
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional Timbre Reference Audio */}
      <div className="space-y-2 pt-1 border-t border-border/30">
        <label className="text-xs font-medium text-foreground flex items-center justify-between">
          <span>Optional Timbre Reference Recording</span>
          <span className="text-[10px] text-muted-foreground">Steers audio acoustic color</span>
        </label>

        {referenceAudio ? (
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 p-2.5 text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <FileAudio className="size-4 text-indigo-500 shrink-0" />
              <span className="truncate">{referenceAudio}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReferenceAudio('')}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => document.getElementById('reference-audio-input')?.click()}
            className="flex items-center justify-center p-3 rounded-xl border border-dashed border-border/60 hover:border-primary/50 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-all text-center gap-2"
          >
            <Upload className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload reference audio for acoustic timbre nudging</span>
            <input
              type="file"
              id="reference-audio-input"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'reference')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
