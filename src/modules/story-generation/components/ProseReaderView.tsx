import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Compass,
  FileText,
} from 'lucide-react';
import type { NarrativeProjectSnapshot, StoryGraphState, CanonicalSceneRecord } from '../types.ts';

interface ProseReaderViewProps {
  snapshot: NarrativeProjectSnapshot | null;
  graphState: StoryGraphState | null;
}

export const ProseReaderView: React.FC<ProseReaderViewProps> = ({ snapshot, graphState }) => {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const scenes: CanonicalSceneRecord[] = graphState ? Object.values(graphState.scenes) : [];

  if (!snapshot || scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
        <BookOpen className="size-12 mb-3 text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-400">No Story Prose Produced Yet</h3>
        <p className="text-xs max-w-sm mt-1">
          Launch story generation in the Studio tab to write and review full character-driven narrative scenes.
        </p>
      </div>
    );
  }

  const activeScene = scenes[selectedSceneIndex] || scenes[0];

  const handleCopyProse = () => {
    if (activeScene?.prose) {
      navigator.clipboard.writeText(activeScene.prose);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const paragraphs: string[] = (activeScene.prose || '').split('\n\n');

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full p-6 select-text">
      {/* Top Header & Scene Selector */}
      <div className="flex items-center justify-between border-b border-[#262629] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{snapshot.intent?.title || 'Untitled Narrative'}</h2>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-xs">
              {snapshot.intent?.primaryGenre}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-serif italic">{snapshot.intent?.premise}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyProse}
            className="text-xs gap-1.5 bg-[#18181b] border-[#27272a] text-zinc-300 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Prose</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scene Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {scenes.map((scene: CanonicalSceneRecord, idx: number) => {
          const isSelected = idx === selectedSceneIndex;
          return (
            <button
              key={scene.contract.id}
              type="button"
              onClick={() => setSelectedSceneIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs whitespace-nowrap transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/20 text-white font-semibold'
                  : 'border-[#27272a] bg-[#18181b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="size-3.5" />
              <span>Scene {idx + 1}: {scene.contract.title}</span>
              <span className="text-[10px] text-zinc-500 font-mono">({scene.wordCount}w)</span>
            </button>
          );
        })}
      </div>

      {/* Scene Contract Metadata Card */}
      <Card className="p-4 bg-[#18181b] border-[#27272a] flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="size-4" />
            <span>Contract Verified & Approved</span>
          </div>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">
            <strong>Target:</strong> {activeScene.contract.objective}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <Compass className="size-3 text-indigo-400" />
          <span>{activeScene.wordCount} Words</span>
        </div>
      </Card>

      {/* Narrative Prose Reader Surface */}
      <Card className="p-8 sm:p-10 bg-[#141416] border-[#27272a] shadow-xl">
        <div className="max-w-2xl mx-auto space-y-6 font-serif text-[16px] leading-[1.8] text-zinc-200 selection:bg-indigo-500/30 selection:text-white">
          <div className="text-center pb-6 border-b border-[#27272a]/60">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-sans font-semibold">
              Scene {selectedSceneIndex + 1}
            </span>
            <h3 className="text-2xl font-bold font-sans text-white mt-1">
              {activeScene.contract.title}
            </h3>
          </div>

          {paragraphs.map((para: string, i: number) => (
            <p key={i} className="indent-6 first:indent-0">
              {para}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
};
