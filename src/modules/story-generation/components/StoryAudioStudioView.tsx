import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Headphones,
  Play,
  Pause,
  Sparkles,
  Music,
  Wind,
  Mic,
} from 'lucide-react';
import type {
  NarrativeProjectSnapshot,
  ProducedSceneAudio,
  StoryGraphState,
  PerformanceScript,
  CanonicalSceneRecord,
  AudioUtteranceSegment,
} from '../types.ts';

interface StoryAudioStudioViewProps {
  snapshot: NarrativeProjectSnapshot | null;
  graphState: StoryGraphState | null;
  performanceScripts: PerformanceScript[];
  audioResults: Record<string, ProducedSceneAudio>;
}

export const StoryAudioStudioView: React.FC<StoryAudioStudioViewProps> = ({
  snapshot,
  graphState,
  performanceScripts,
  audioResults,
}) => {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isPlayingMaster, setIsPlayingMaster] = useState(false);

  const scenes: CanonicalSceneRecord[] = graphState ? Object.values(graphState.scenes) : [];

  if (!snapshot || scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
        <Headphones className="size-12 mb-3 text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-400">No Audio Performance Tracks Prepared Yet</h3>
        <p className="text-xs max-w-sm mt-1">
          Generate a story with audio preparation enabled to produce multi-speaker dialogue scripts and CosyVoice 3 waveforms.
        </p>
      </div>
    );
  }

  const activeScene = scenes[selectedSceneIndex] || scenes[0];
  const activeScript = performanceScripts[selectedSceneIndex] || performanceScripts[0];
  const producedAudio = activeScene ? audioResults[activeScene.contract.id] : undefined;

  const togglePlayback = () => {
    setIsPlayingMaster((prev) => !prev);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full p-6 select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-[#262629] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">CosyVoice 3 Audio Studio</h2>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
              Natural Voice Processing
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-shot multi-character neural voice synthesis with acoustic crossfades, natural breath marks, and room tone.
          </p>
        </div>

        {producedAudio && (
          <div className="text-right font-mono text-xs">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Master Duration</span>
            <span className="text-emerald-400 font-semibold">
              {(producedAudio.totalDurationMs / 1000).toFixed(1)}s Runtime
            </span>
          </div>
        )}
      </div>

      {/* Scene Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {scenes.map((scene: CanonicalSceneRecord, idx: number) => {
          const isSelected = idx === selectedSceneIndex;
          const hasAudio = Boolean(audioResults[scene.contract.id]);
          return (
            <button
              key={scene.contract.id}
              type="button"
              onClick={() => setSelectedSceneIndex(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs whitespace-nowrap transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/20 text-white font-semibold'
                  : 'border-[#27272a] bg-[#18181b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Headphones className="size-3.5 text-emerald-400" />
              <span>Scene {idx + 1}: {scene.contract.title}</span>
              {hasAudio && (
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Master Audio Track Player Card */}
      {producedAudio && (
        <Card className="p-5 bg-gradient-to-r from-emerald-950/30 via-[#18181b] to-zinc-900 border-[#27272a] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={togglePlayback}
                className="size-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black p-0 shadow-lg shadow-emerald-500/20"
              >
                {isPlayingMaster ? (
                  <Pause className="size-4 fill-current" />
                ) : (
                  <Play className="size-4 fill-current ml-0.5" />
                )}
              </Button>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Master Scene Audio ({activeScene.contract.title})
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono truncate max-w-lg">
                  {producedAudio.masterAudioFilePath}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Wind className="size-3.5 text-emerald-400" />
                <span>Room Tone crossfaded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Music className="size-3.5 text-indigo-400" />
                <span>24kHz Linear PCM WAV</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Multi-Character Dialogue Utterance Breakdown */}
      {activeScript && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Mic className="size-3.5 text-emerald-400" />
              Performance Utterance Script ({activeScript.segments.length} segments)
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              CosyVoice 3 Voice Design & Instruct Tags
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {activeScript.segments.map((seg: AudioUtteranceSegment, i: number) => (
              <div
                key={seg.id}
                className="p-3.5 rounded-lg bg-[#141416] border border-[#27272a] flex flex-col gap-2 transition-all hover:border-zinc-700"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-zinc-500 text-[11px]">#{i + 1}</span>
                    <span className="font-semibold text-white">{seg.speakerName}</span>
                    <Badge variant="outline" className="text-[10px] text-zinc-400 font-mono">
                      {seg.voiceProfile.assignedVoiceId}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize font-mono bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    >
                      {seg.performance.emotion}
                    </Badge>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      speed: {seg.performance.speedMultiplier}x
                    </span>
                  </div>
                </div>

                {/* Spoken Prose with highlighted performance tags */}
                <p className="text-xs text-zinc-200 font-sans pl-6 border-l-2 border-emerald-500/40">
                  {seg.spokenText}
                </p>

                {/* Acoustic Timing Details */}
                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pl-6">
                  <span>Pre-pause: {seg.performance.prePauseMs}ms</span>
                  <span>Post-pause: {seg.performance.postPauseMs}ms</span>
                  {seg.soundDesignCue?.soundEffectId && (
                    <span className="text-indigo-400 flex items-center gap-1">
                      <Sparkles className="size-2.5" />
                      SFX: {seg.soundDesignCue.soundEffectId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
