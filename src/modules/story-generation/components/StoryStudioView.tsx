import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import ExpandableContainer from '@/components/ExpandableContainer';
import { Slider } from '@/components/ui/slider';
import { TrackWavePlayer } from '@/components/player/TrackWavePlayer';
import { usePlayer } from '@/hooks/usePlayer';
import type { PlayerTrack } from '@/store/playerStore';
import type {
  RawCreativePrompt,
  NarrativeProjectSnapshot,
  StoryGraphState,
  PerformanceScript,
  ProducedSceneAudio,
  StoryGenerationProgress,
  CanonicalSceneRecord,
} from '../types.ts';

export interface StoryStudioViewProps {
  promptInput: RawCreativePrompt;
  onChangePromptInput: (val: RawCreativePrompt) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  progress: StoryGenerationProgress | null;
  activeProject: NarrativeProjectSnapshot | null;
  graphState: StoryGraphState | null;
  performanceScripts: PerformanceScript[];
  audioResults: Record<string, ProducedSceneAudio>;
  voicePrompt?: string;
  onChangeVoicePrompt?: (val: string) => void;
  cfgScale?: number;
  onChangeCfgScale?: (val: number) => void;
  stability?: number;
  onChangeStability?: (val: number) => void;
  similarity?: number;
  onChangeSimilarity?: (val: number) => void;
  lavaSrEnabled?: boolean;
  onToggleLavaSr?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const COSYVOICE_DIRECTOR_PRESETS = [
  'Cinematic audio drama with dramatic breath and pregnant pauses',
  'Tense psychological thriller with urgent whispers and muted pacing',
  'Epic space opera with authoritative resonance and measured cadence',
  'Intimate dialogue with warm delivery and subtle emotional subtext',
  'Furious confrontation speaking rapidly with elevated intensity',
];

export const StoryStudioView: React.FC<StoryStudioViewProps> = ({
  promptInput,
  onChangePromptInput,
  onGenerate,
  isGenerating,
  progress,
  activeProject,
  graphState,
  performanceScripts,
  audioResults,
  voicePrompt = 'Cinematic audio drama with dramatic breath and pregnant pauses',
  onChangeVoicePrompt,
  cfgScale = 1.5,
  onChangeCfgScale,
  stability = 0.7,
  onChangeStability,
  similarity = 0.85,
  onChangeSimilarity,
  lavaSrEnabled = true,
  onToggleLavaSr,
}) => {
  const [leftTab, setLeftTab] = useState<'console' | 'prose' | 'contracts' | 'cast'>('console');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [searchTracks, setSearchTracks] = useState<string>('');
  const [targetScenesCount, setTargetScenesCount] = useState<number>(2);

  const player = usePlayer();

  const scenes: CanonicalSceneRecord[] = useMemo(() => {
    return Object.values(graphState?.scenes || {});
  }, [graphState]);

  const activeScene: CanonicalSceneRecord | undefined = scenes[selectedSceneIndex] || scenes[0];

  const filteredScripts = useMemo(() => {
    if (!performanceScripts || performanceScripts.length === 0) return [];
    if (!searchTracks.trim()) return performanceScripts;
    const q = searchTracks.toLowerCase();
    return performanceScripts.filter(
      (s) =>
        s.sceneTitle.toLowerCase().includes(q) ||
        (s.segments || []).some(
          (seg) =>
            seg.spokenText.toLowerCase().includes(q) ||
            seg.speakerName.toLowerCase().includes(q),
        ),
    );
  }, [performanceScripts, searchTracks]);

  const handlePlaySceneAudio = (script: PerformanceScript) => {
    const audioData = audioResults[script.sceneId];
    const trackId = `scene-${script.sceneId}`;

    if (player.currentTrack?.id === trackId) {
      player.togglePlay();
      return;
    }

    const segmentsList = script.segments || [];
    const durationSec = audioData?.totalDurationMs
      ? Math.round(audioData.totalDurationMs / 1000)
      : Math.round(segmentsList.length * 4.2);

    const track: PlayerTrack = {
      id: trackId,
      title: script.sceneTitle || `Scene ${script.sceneId}`,
      subtitle: `${Object.keys(script.voiceCast || {}).length} Speakers · CosyVoice 3 Audio`,
      artist: activeProject?.intent?.title || 'Story Studio',
      category: 'Scene Audio',
      duration: durationSec,
      audioUrl: audioData?.masterAudioFilePath ? `echo-media://${audioData.masterAudioFilePath}` : '',
      waveform: [30, 45, 60, 75, 85, 70, 55, 65, 80, 95, 70, 50, 40, 60, 75, 90],
    };

    player.play(track);
  };

  const downloadWav = (script: PerformanceScript) => {
    const audioData = audioResults[script.sceneId];
    if (audioData?.masterAudioFilePath) {
      const a = document.createElement('a');
      a.href = `echo-media://${audioData.masterAudioFilePath}`;
      a.download = `${script.sceneTitle.replace(/\s+/g, '_')}_audio.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="flex-1 h-full min-h-0 bg-[#0f0f10] text-[#f4f4f5] overflow-hidden select-none"
    >
      {/* =========================================================================
          LEFT PANEL: Narrative Editing Area & Generation Console
         ========================================================================= */}
      <ResizablePanel defaultSize="45%" minSize="32%" maxSize="60%">
        <div className="h-full overflow-y-auto sidebar-scrollbar p-5 sm:p-6 flex flex-col gap-4 bg-[#0f0f10] border-r border-[#1f1f23]">
          {/* Sub Navigation Tabs for the Editing Panel */}
          <div className="flex items-center justify-between gap-2 border-b border-[#1f1f23] pb-3 shrink-0">
            <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-lg border border-[#232328] text-xs">
              <button
                type="button"
                onClick={() => setLeftTab('console')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  leftTab === 'console'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Console
              </button>

              <button
                type="button"
                onClick={() => setLeftTab('prose')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  leftTab === 'prose'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Prose Editor {scenes.length > 0 && `(${scenes.length})`}
              </button>

              <button
                type="button"
                onClick={() => setLeftTab('contracts')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  leftTab === 'contracts'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Contracts
              </button>

              <button
                type="button"
                onClick={() => setLeftTab('cast')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  leftTab === 'cast'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Characters
              </button>
            </div>

            {promptInput.rawPrompt && (
              <button
                type="button"
                onClick={() => onChangePromptInput({ ...promptInput, rawPrompt: '' })}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
              >
                Clear
              </button>
            )}
          </div>

          {/* VIEW 1: GENERATION CONSOLE */}
          {leftTab === 'console' && (
            <div className="flex flex-col gap-4">
              {/* Prompt Textarea Box */}
              <div className="bg-[#141416] border border-[#232328] focus-within:border-zinc-500 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-colors">
                <span className="text-xs font-semibold text-zinc-300">
                  Story Premise & Outline
                </span>

                <AutoResizeTextarea
                  value={promptInput.rawPrompt}
                  onChange={(e) =>
                    onChangePromptInput({
                      ...promptInput,
                      rawPrompt: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating && promptInput.rawPrompt.trim()) {
                      e.preventDefault();
                      onGenerate();
                    }
                  }}
                  minHeight={90}
                  placeholder="Describe your story premise, characters, conflicts, or scenes..."
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none leading-relaxed font-normal"
                  disabled={isGenerating}
                />

                {/* Target Scenes Selector Row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#232328] text-xs">
                  <span className="text-zinc-400 font-medium">Scenes to Produce:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5].map((count) => (
                      <button
                        key={count}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setTargetScenesCount(count)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          targetScenesCount === count
                            ? 'bg-white text-black font-semibold'
                            : 'bg-[#1c1c1f] hover:bg-[#25252a] text-zinc-400'
                        }`}
                      >
                        {count} {count === 1 ? 'Scene' : 'Scenes'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format & Narrative Constraints Box */}
              <div className="bg-[#141416] border border-[#232328] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    Story Parameters
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">
                    {promptInput.format || 'short_story'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#18181b] p-2.5 rounded-xl border border-[#232328]">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">
                      Primary Genre
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {promptInput.genreHints?.[0] || 'Speculative Fiction'}
                    </span>
                  </div>

                  <div className="bg-[#18181b] p-2.5 rounded-xl border border-[#232328]">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">
                      Subgenres
                    </span>
                    <span className="text-zinc-200 font-medium truncate block">
                      {promptInput.genreHints?.slice(1).join(', ') || 'Mystery, Thriller'}
                    </span>
                  </div>
                </div>

                {promptInput.constraints?.length ? (
                  <div className="bg-[#18181b] p-2.5 rounded-xl border border-[#232328]">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">
                      Established Constraints
                    </span>
                    <ul className="text-xs text-zinc-300 list-disc list-inside space-y-0.5">
                      {promptInput.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* CosyVoice 3 Voice Direction & Neural Audio Parameters Card */}
              <div className="bg-[#141416] border border-[#232328] rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#232328] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      CosyVoice 3 Performance Direction
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white font-mono">
                      Neural TTS
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {lavaSrEnabled ? '48 kHz Ultra HD' : '24 kHz'}
                  </span>
                </div>

                {/* Voice Performance Prompt & Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-zinc-400 font-medium">
                    Acoustic Direction (Prompt)
                  </span>
                  <textarea
                    value={voicePrompt}
                    onChange={(e) => onChangeVoicePrompt?.(e.target.value)}
                    rows={2}
                    placeholder="Instruct performance, mood, whispering, tone, or pacing in natural language..."
                    className="w-full rounded-xl border border-[#232328] bg-[#18181b] p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COSYVOICE_DIRECTOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onChangeVoicePrompt?.(preset)}
                        className={`text-[10.5px] px-2.5 py-1 rounded-md transition-all text-left cursor-pointer truncate max-w-full font-medium ${
                          voicePrompt === preset
                            ? 'bg-white text-black font-semibold'
                            : 'bg-[#18181b] hover:bg-[#202024] text-zinc-400 hover:text-white border border-[#232328]'
                        }`}
                      >
                        {preset.split(' ').slice(0, 4).join(' ')}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders Grid: CFG Scale, Stability, Similarity */}
                <div className="flex flex-col gap-3.5 pt-2 border-t border-[#232328]">
                  {/* Emotion Intensity (CFG Scale) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">Emotion Intensity (CFG Scale)</span>
                      <span className="font-mono text-white text-[11px] bg-[#18181b] px-1.5 py-0.5 rounded border border-[#232328]">
                        {cfgScale.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[cfgScale * 10]}
                      min={10}
                      max={30}
                      step={1}
                      onValueChange={(val) => onChangeCfgScale?.((val[0] || 15) / 10)}
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Subtle (1.0)</span>
                      <span>Standard (1.5)</span>
                      <span>Dramatic (3.0)</span>
                    </div>
                  </div>

                  {/* Cloning Fidelity (Top-P) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">Cloning Fidelity (Top-P)</span>
                      <span className="font-mono text-white text-[11px] bg-[#18181b] px-1.5 py-0.5 rounded border border-[#232328]">
                        {similarity.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[similarity * 100]}
                      min={30}
                      max={100}
                      step={1}
                      onValueChange={(val) => onChangeSimilarity?.((val[0] || 85) / 100)}
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Expressive (0.3)</span>
                      <span>Matched Timbre (1.0)</span>
                    </div>
                  </div>

                  {/* Stability (Temperature) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">Performance Stability</span>
                      <span className="font-mono text-white text-[11px] bg-[#18181b] px-1.5 py-0.5 rounded border border-[#232328]">
                        {stability.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[stability * 100]}
                      min={20}
                      max={120}
                      step={1}
                      onValueChange={(val) => onChangeStability?.((val[0] || 70) / 100)}
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Dynamic (1.2)</span>
                      <span>Controlled (0.2)</span>
                    </div>
                  </div>

                  {/* 48kHz LavaSR Clarity Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#232328]">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">
                        Studio Voice Clarity (LavaSR)
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Enhances speech to 48kHz Ultra-HD resolution
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onToggleLavaSr}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        lavaSrEnabled ? 'bg-white' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-4 transform rounded-full bg-[#0f0f10] shadow ring-0 transition duration-200 ease-in-out ${
                          lavaSrEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate Primary Button */}
              <button
                type="button"
                disabled={isGenerating || !promptInput.rawPrompt.trim()}
                onClick={onGenerate}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                  isGenerating || !promptInput.rawPrompt.trim()
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-white hover:bg-zinc-200 text-black active:scale-[0.99]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-black" />
                    <span>Orchestrating Narrative Agents...</span>
                  </>
                ) : (
                  <span>Run Story Generation Pipeline</span>
                )}
              </button>

              {/* Live Multi-Agent Progress Banner */}
              <ExpandableContainer isExpanded={Boolean(isGenerating || progress)}>
                {progress && (
                  <div className="rounded-2xl border border-[#232328] bg-[#141416] p-4 flex flex-col gap-2.5 shadow-lg">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-zinc-200">
                        {progress.stageName}
                      </span>
                      <span className="font-mono text-zinc-400">
                        {progress.progressPercent}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#18181b] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-300 rounded-full"
                        style={{ width: `${progress.progressPercent}%` }}
                      />
                    </div>

                    <div className="text-[11.5px] text-zinc-400 font-mono leading-relaxed truncate">
                      {progress.message}
                    </div>
                  </div>
                )}
              </ExpandableContainer>
            </div>
          )}

          {/* VIEW 2: PROSE EDITOR */}
          {leftTab === 'prose' && (
            <div className="flex flex-col gap-3">
              {scenes.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-[#232328] rounded-2xl bg-[#141416]">
                  No prose generated yet. Run the pipeline in the Generation Console.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {scenes.map((scene, idx) => (
                      <button
                        key={scene.contract.id}
                        type="button"
                        onClick={() => setSelectedSceneIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                          selectedSceneIndex === idx
                            ? 'bg-white text-black font-semibold'
                            : 'bg-[#141416] hover:bg-[#1c1c1f] text-zinc-400 border border-[#232328]'
                        }`}
                      >
                        Scene {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#141416] border border-[#232328] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-[#232328] pb-2">
                      <h3 className="text-xs font-semibold text-zinc-200 truncate">
                        {activeScene?.contract.title || `Scene ${selectedSceneIndex + 1}`}
                      </h3>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {activeScene?.wordCount || 0} words
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-serif whitespace-pre-line max-h-[460px] overflow-y-auto sidebar-scrollbar pr-2">
                      {activeScene?.prose || 'No prose written for this scene.'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW 3: SCENE CONTRACTS */}
          {leftTab === 'contracts' && (
            <div className="flex flex-col gap-3">
              {!activeProject?.blueprint ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-[#232328] rounded-2xl bg-[#141416]">
                  No blueprint generated yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeProject.blueprint.acts.map((act) =>
                    act.chapters.map((chap) =>
                      chap.scenes.map((sc) => (
                        <div
                          key={sc.id}
                          className="bg-[#141416] border border-[#232328] rounded-xl p-3.5 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-200">
                              {sc.title}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1c1f] text-zinc-400 border border-[#232328]">
                              {sc.targetWordCount} words
                            </span>
                          </div>

                          <p className="text-xs text-zinc-400">
                            <strong className="text-zinc-300">Objective:</strong> {sc.objective}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-zinc-500">
                            <span>Characters: {sc.participatingCharacterIds.join(', ')}</span>
                            <span>·</span>
                            <span>Setting: {sc.locationId}</span>
                          </div>
                        </div>
                      )),
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: CHARACTERS */}
          {leftTab === 'cast' && (
            <div className="flex flex-col gap-3">
              {!graphState?.characters || Object.keys(graphState.characters).length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-[#232328] rounded-2xl bg-[#141416]">
                  No characters designed yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {Object.values(graphState.characters).map((char) => {
                    const epistemic = graphState.epistemicStates[char.id];
                    return (
                      <div
                        key={char.id}
                        className="bg-[#141416] border border-[#232328] rounded-xl p-3.5 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">
                            {char.name} ({char.role})
                          </span>
                          <span className="text-[10.5px] font-mono text-zinc-500">
                            Cadence: {char.dialogueStyle?.speechCadence || 'measured'}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400">
                          {char.personality?.primaryMotivation}
                        </p>

                        {epistemic?.hiddenSecrets?.length ? (
                          <div className="pt-1 text-[11px] text-zinc-400">
                            <span>Secret: {epistemic.hiddenSecrets[0]}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* =========================================================================
          RIGHT PANEL: Preview Tracks & Produced Audio Scenes with Wave Player
         ========================================================================= */}
      <ResizablePanel defaultSize="55%" minSize="40%">
        <div className="flex flex-col h-full min-h-0 bg-[#0f0f10] overflow-hidden">
          {/* Header Bar with Search & Track Count */}
          <div className="shrink-0 border-b border-[#1f1f23] bg-[#0f0f10] px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="size-3.5 text-white absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTracks}
                onChange={(e) => setSearchTracks(e.target.value)}
                placeholder="Search scene audio tracks..."
                className="w-full h-9 rounded-lg border border-[#232328] bg-[#141416] pl-9 pr-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {searchTracks && (
                <button
                  type="button"
                  onClick={() => setSearchTracks('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="size-3.5 text-white" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 bg-[#141416] px-2.5 py-1.5 rounded-lg border border-[#232328]">
                {filteredScripts.length} {filteredScripts.length === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>
          </div>

          {/* Tracks List (Scrollable) */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scrollbar flex flex-col gap-4 min-w-0 bg-[#0f0f10]">
            {filteredScripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[#232328] bg-[#141416] my-auto">
                <h3 className="text-sm font-semibold text-zinc-300">
                  No scene tracks generated yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 leading-relaxed">
                  When you run the narrative pipeline on the left, Gemma 4 writes scene dialogue and CosyVoice 3 natural audio preview tracks will appear here with interactive waveforms.
                </p>
              </div>
            ) : (
              filteredScripts.map((script, idx) => {
                const trackId = `scene-${script.sceneId}`;
                const isPlayingThis =
                  player.currentTrack?.id === trackId && player.isPlaying;
                const audioData = audioResults[script.sceneId];
                const isExpanded = expandedScriptId === script.sceneId;

                const segmentsList = script.segments || [];
                const durationSec = audioData?.totalDurationMs
                  ? Math.round(audioData.totalDurationMs / 1000)
                  : Math.round(segmentsList.length * 4.2);

                const dominantEmotion = segmentsList[0]?.performance?.emotion || 'cinematic';

                return (
                  <div
                    key={script.sceneId}
                    className={`flex flex-col rounded-2xl border p-4 sm:p-5 transition-all min-w-0 w-full gap-3.5 shadow-sm ${
                      isPlayingThis
                        ? 'border-white/30 bg-[#17171a] shadow-lg'
                        : 'border-[#232328] bg-[#141416] hover:border-zinc-700'
                    }`}
                  >
                    {/* Track Header & Metadata Row matching TTS style */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] text-zinc-400 font-mono bg-[#1c1c1f] px-2 py-0.5 rounded border border-[#232328]">
                            Scene {idx + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                            {script.sceneTitle}
                          </h4>
                        </div>

                        <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                          {formatTime(isPlayingThis ? player.currentTime : durationSec)}
                        </span>
                      </div>

                      {/* CosyVoice 3 Audio Metadata Tag Bar */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
                          <span className="size-1.5 rounded-full bg-white" />
                          CosyVoice 3
                        </span>

                        <span className="text-zinc-700">/</span>

                        <span>
                          Mood: <span className="text-zinc-300 capitalize">{dominantEmotion}</span>
                        </span>

                        <span className="text-zinc-700">/</span>

                        <span>
                          CFG <span className="tabular-nums text-zinc-300">{cfgScale.toFixed(1)}</span>
                        </span>

                        {lavaSrEnabled && (
                          <>
                            <span className="text-zinc-700">/</span>
                            <span className="text-zinc-300 font-medium">48 kHz Ultra HD</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Interactive TrackWavePlayer bound to player with Seek Bar */}
                    <div className="flex w-full items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePlaySceneAudio(script)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer shadow-xs"
                        title={isPlayingThis ? 'Pause Scene Audio' : 'Play Scene Audio'}
                      >
                        {isPlayingThis ? (
                          <Pause className="size-4 fill-black text-black" />
                        ) : (
                          <Play className="size-4 fill-black text-black ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <TrackWavePlayer
                          trackId={trackId}
                          waveform={[30, 45, 60, 75, 85, 70, 55, 65, 80, 95, 70, 50, 40, 60, 75, 90, 80, 60, 45, 70]}
                          duration={durationSec}
                          onPlay={() => handlePlaySceneAudio(script)}
                          height={30}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadWav(script)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                        title="Download Scene Audio (.wav)"
                      >
                        <Download className="size-4 text-white" />
                      </button>
                    </div>

                    {/* Character Voice Cast Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-[#232328]">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mr-1">
                        Cast:
                      </span>
                      {Object.values(script.voiceCast || {}).map((cast) => (
                        <span
                          key={cast.characterId}
                          className="text-[11px] px-2 py-0.5 rounded bg-[#1c1c1f] text-zinc-300 border border-[#232328]"
                        >
                          {cast.characterName} ({cast.assignedVoiceId})
                        </span>
                      ))}
                    </div>

                    {/* Collapsible Dialogue Transcript with Tone Cues */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedScriptId(isExpanded ? null : script.sceneId)
                        }
                        className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer pt-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-3.5 text-white" />
                        ) : (
                          <ChevronRight className="size-3.5 text-white" />
                        )}
                        <span>
                          {isExpanded ? 'Hide' : 'View'} CosyVoice 3 Performance Script ({segmentsList.length} utterances)
                        </span>
                      </button>

                      <ExpandableContainer isExpanded={isExpanded} className="w-full">
                        <div className="mt-2.5 flex flex-col gap-2 p-3.5 rounded-xl bg-[#0c0c0e] border border-[#232328] max-h-64 overflow-y-auto sidebar-scrollbar">
                          {segmentsList.map((seg) => (
                            <div
                              key={seg.id}
                              className="text-xs flex flex-col gap-1 leading-relaxed pb-2 border-b border-white/5 last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-200">
                                    {seg.speakerName}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.2 rounded bg-[#141416] border border-[#232328] capitalize">
                                    {seg.performance?.emotion || 'neutral'}
                                  </span>
                                </div>

                                <span className="text-[10px] font-mono text-zinc-500">
                                  Speed {seg.performance?.speedMultiplier || 1.0}x
                                </span>
                              </div>

                              <p className="text-zinc-300 font-serif text-xs leading-relaxed pl-1">
                                {seg.spokenText}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ExpandableContainer>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
