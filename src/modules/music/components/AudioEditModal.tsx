import React, { useState } from 'react';
import { useAtom } from 'jotai';
import {
  Layers,
  X,
  Upload,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { audioEditModalOpenAtom } from '../store/musicStore';
import { editMusic } from '../services/music-api';
import { useMusicGeneration } from '../hooks/useMusicGeneration';

interface FlowEditOp {
  type: 'flow-edit';
  from: { caption: string };
  to: { caption: string };
}

interface RepaintOp {
  type: 'repaint';
  caption: string;
  lyrics?: string;
  start: number;
  end: number;
  mode: 'conservative' | 'balanced' | 'aggressive';
  strength: number;
}

type EditOp = FlowEditOp | RepaintOp;

export const AudioEditModal: React.FC = () => {
  const [open, setOpen] = useAtom(audioEditModalOpenAtom);
  const [sourceAudio, setSourceAudio] = useState('');
  const [operations, setOperations] = useState<EditOp[]>([
    {
      type: 'flow-edit',
      from: { caption: 'Original pop song' },
      to: { caption: 'Guitar pop-rock with driving live drums' },
    },
    {
      type: 'repaint',
      caption: 'Analog synthesizer solo',
      lyrics: '[Instrumental]',
      start: 10,
      end: 20,
      mode: 'balanced',
      strength: 0.5,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const { selectTrack } = useMusicGeneration();

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const filePath = (file as File & { path?: string }).path || file.name;
      setSourceAudio(filePath);
    }
  };

  const handleAddFlowEdit = () => {
    setOperations((prev) => [
      ...prev,
      {
        type: 'flow-edit',
        from: { caption: 'Original arrangement' },
        to: { caption: 'New arrangement style' },
      },
    ]);
  };

  const handleAddRepaint = () => {
    setOperations((prev) => [
      ...prev,
      {
        type: 'repaint',
        caption: 'Instrument solo',
        lyrics: '[Instrumental]',
        start: 0,
        end: 10,
        mode: 'balanced',
        strength: 0.5,
      },
    ]);
  };

  const handleRemoveOperation = (index: number) => {
    setOperations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunEdit = async () => {
    if (!sourceAudio || operations.length === 0) return;
    setIsProcessing(true);
    setStatusMessage('Executing ACE-Step AudioEdit pipeline...');

    try {
      const taskId = `music_edit_${Date.now()}`;
      const res = await editMusic({
        taskId,
        sourceAudio,
        operations,
      });

      if (res.success && res.data) {
        setStatusMessage('Edit completed successfully!');
        selectTrack(res.data, true);
        setTimeout(() => {
          setOpen(false);
          setIsProcessing(false);
        }, 1200);
      } else {
        setStatusMessage(`Error: ${res.error || 'Edit failed.'}`);
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Error: ${msg}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/70 bg-card p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">ACE-Step Audio Edit Pipeline</h2>
              <p className="text-xs text-muted-foreground">
                Run sequential Flow-Edit style transfer and Repaint segment regenerations
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

        {/* Source Audio */}
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-foreground">Source Recording (WAV, MP3, FLAC, M4A)</label>
          {sourceAudio ? (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 p-2.5 font-mono">
              <span className="truncate">{sourceAudio}</span>
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
              onClick={() => document.getElementById('edit-modal-audio-input')?.click()}
              className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-muted/10 cursor-pointer gap-2"
            >
              <Upload className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Select audio file to edit</span>
              <input
                type="file"
                id="edit-modal-audio-input"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>

        {/* Operations List */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Pipeline Operations ({operations.length})</span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFlowEdit}
                className="h-7 text-xs"
              >
                <Plus className="size-3 mr-1" /> Add Flow-Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRepaint}
                className="h-7 text-xs"
              >
                <Plus className="size-3 mr-1" /> Add Repaint
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {operations.map((op, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-2.5 relative"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    Step {index + 1}: {op.type}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleRemoveOperation(index)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {op.type === 'flow-edit' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">From Prompt</span>
                      <Input
                        value={op.from?.caption || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOperations((prev) =>
                            prev.map((o, i) =>
                              i === index && o.type === 'flow-edit'
                                ? { ...o, from: { ...o.from, caption: val } }
                                : o
                            )
                          );
                        }}
                        placeholder="Original style"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">To Prompt</span>
                      <Input
                        value={op.to?.caption || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOperations((prev) =>
                            prev.map((o, i) =>
                              i === index && o.type === 'flow-edit'
                                ? { ...o, to: { ...o.to, caption: val } }
                                : o
                            )
                          );
                        }}
                        placeholder="Target style"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={op.caption || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOperations((prev) =>
                          prev.map((o, i) => (i === index ? { ...o, caption: val } : o))
                        );
                      }}
                      placeholder="Repaint caption prompt"
                      className="h-8 text-xs"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Start (seconds)</span>
                        <Input
                          type="number"
                          value={op.start ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOperations((prev) =>
                              prev.map((o, i) => (i === index ? { ...o, start: val } : o))
                            );
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">End (seconds)</span>
                        <Input
                          type="number"
                          value={op.end ?? 10}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOperations((prev) =>
                              prev.map((o, i) => (i === index ? { ...o, end: val } : o))
                            );
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Mode</span>
                        <select
                          value={op.mode || 'balanced'}
                          onChange={(e) => {
                            const val = e.target.value as 'conservative' | 'balanced' | 'aggressive';
                            setOperations((prev) =>
                              prev.map((o, i) =>
                                i === index && o.type === 'repaint' ? { ...o, mode: val } : o
                              )
                            );
                          }}
                          className="w-full rounded-md border border-border h-7 text-xs bg-background px-2"
                        >
                          <option value="conservative">conservative</option>
                          <option value="balanced">balanced</option>
                          <option value="aggressive">aggressive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {statusMessage && (
          <p className="text-xs font-mono text-center text-primary animate-pulse">
            {statusMessage}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRunEdit}
            disabled={!sourceAudio || operations.length === 0 || isProcessing}
            className="rounded-xl bg-primary text-primary-foreground font-semibold px-5"
          >
            {isProcessing ? 'Processing Pipeline...' : 'Run Edit Operations'}
          </Button>
        </div>
      </div>
    </div>
  );
};
