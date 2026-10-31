import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import {
  beatCaptionAtom,
  beatBpmAtom,
  beatKeyScaleAtom,
  beatTimeSignatureAtom,
  beatDurationAtom,
  beatSeedAtom,
  beatDitVariantAtom,
  beatGuidanceScaleAtom,
  beatInferenceStepsAtom,
  beatShiftAtom,
  beatDcwEnabledAtom,
  beatDcwScalerAtom,
  beatDcwHighScalerAtom,
  isBeatGeneratingAtom,
  beatGenerationProgressAtom,
  beatGenerationErrorAtom,
  beatActiveTrackAtom,
  beatHistoryAtom,
  beatStudioSessionTracksAtom,
} from '../store/beatsStore';
import { usePlayer } from '@/hooks/usePlayer';
import { generateBeat, cancelBeat, subscribeBeatProgress } from '../services/beats-api';
import type { BeatGenerationOutput } from '../types';

export function useBeatsGeneration() {
  const [caption, setCaption] = useAtom(beatCaptionAtom);
  const [bpm, setBpm] = useAtom(beatBpmAtom);
  const [keyscale, setKeyscale] = useAtom(beatKeyScaleAtom);
  const [timesignature, setTimesignature] = useAtom(beatTimeSignatureAtom);
  const [duration, setDuration] = useAtom(beatDurationAtom);
  const [seed, setSeed] = useAtom(beatSeedAtom);
  const [ditVariant, setDitVariant] = useAtom(beatDitVariantAtom);
  const [guidanceScale, setGuidanceScale] = useAtom(beatGuidanceScaleAtom);
  const [inferenceSteps, setInferenceSteps] = useAtom(beatInferenceStepsAtom);
  const [shift, setShift] = useAtom(beatShiftAtom);
  const [dcwEnabled] = useAtom(beatDcwEnabledAtom);
  const [dcwScaler] = useAtom(beatDcwScalerAtom);
  const [dcwHighScaler] = useAtom(beatDcwHighScalerAtom);

  const [isGenerating, setIsGenerating] = useAtom(isBeatGeneratingAtom);
  const [generationProgress, setGenerationProgress] = useAtom(beatGenerationProgressAtom);
  const [generationError, setGenerationError] = useAtom(beatGenerationErrorAtom);
  const [activeTrack, setActiveTrack] = useAtom(beatActiveTrackAtom);
  const [historyList, setHistoryList] = useAtom(beatHistoryAtom);
  const [studioSessionTracks, setStudioSessionTracks] = useAtom(beatStudioSessionTracksAtom);

  const activeTaskIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const player = usePlayer();

  useEffect(() => {
    setIsGenerating(false);
    setGenerationProgress(null);
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [setIsGenerating, setGenerationProgress]);

  const selectTrack = useCallback(
    (trackItem: BeatGenerationOutput, autoPlay = true) => {
      setActiveTrack(trackItem);
      if (autoPlay) {
        player.play({
          id: trackItem.id,
          title: trackItem.caption || 'Generated Beat',
          artist: trackItem.keyscale ? `${trackItem.keyscale} · ${trackItem.bpm || 140} BPM · ACE-Step` : 'ACE-Step v1.5 Beat',
          audioUrl: trackItem.audioUrl,
          waveform: trackItem.waveform,
          duration: trackItem.durationMs ? Math.round(trackItem.durationMs / 1000) : 30,
        });
      }
    },
    [setActiveTrack, player]
  );

  const startGeneration = useCallback(async () => {
    if (isGenerating) return;

    const currentCaption = caption.trim();
    if (!currentCaption) {
      setGenerationError('Please describe the beat you want to create.');
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);
    setGenerationProgress({
      stage: 'Initializing ACE-Step Beat Engine',
      step: 0,
      total: 100,
      percentage: 0,
      message: 'Preparing latents and loading models...',
    });

    const taskId = `beat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    activeTaskIdRef.current = taskId;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeBeatProgress(
      taskId,
      (progress) => {
        setGenerationProgress(progress);
      },
      (output) => {
        setIsGenerating(false);
        setGenerationProgress(null);
        activeTaskIdRef.current = null;

        const beatOutput: BeatGenerationOutput = {
          ...output,
          bpm: output.bpm || bpm,
          keyscale: output.keyscale || keyscale,
          timesignature: output.timesignature || timesignature,
        };

        setHistoryList((prev) => [beatOutput, ...prev.filter((p) => p.id !== beatOutput.id)]);
        setStudioSessionTracks((prev) => [beatOutput, ...prev.filter((p) => p.id !== beatOutput.id)]);
        selectTrack(beatOutput, true);
      },
      (errorMsg) => {
        setIsGenerating(false);
        setGenerationProgress(null);
        setGenerationError(errorMsg);
        activeTaskIdRef.current = null;
      }
    );

    try {
      const result = await generateBeat({
        taskId,
        caption: currentCaption,
        bpm,
        keyscale,
        timesignature,
        duration,
        ditVariant,
        guidanceScale,
        inferenceSteps,
        shift,
        dcwEnabled,
        dcwScaler,
        dcwHighScaler,
        seed: seed === -1 ? Math.floor(Math.random() * 1000000) : seed,
      });

      if (!result.success) {
        throw new Error(result.error || 'Beat generation failed to start');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg);
      setIsGenerating(false);
      setGenerationProgress(null);
      activeTaskIdRef.current = null;
    }
  }, [
    isGenerating,
    caption,
    bpm,
    keyscale,
    timesignature,
    duration,
    ditVariant,
    guidanceScale,
    inferenceSteps,
    shift,
    seed,
    setGenerationError,
    setIsGenerating,
    setGenerationProgress,
    setHistoryList,
    setStudioSessionTracks,
    selectTrack,
  ]);

  const cancelActiveTask = useCallback(async () => {
    if (activeTaskIdRef.current) {
      try {
        await cancelBeat(activeTaskIdRef.current);
      } catch {
        // ignore
      }
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsGenerating(false);
    setGenerationProgress(null);
    activeTaskIdRef.current = null;
  }, [setIsGenerating, setGenerationProgress]);

  const deleteTrack = useCallback(
    (id: string) => {
      setHistoryList((prev) => prev.filter((t) => t.id !== id));
      setStudioSessionTracks((prev) => prev.filter((t) => t.id !== id));
      if (activeTrack?.id === id) {
        setActiveTrack(null);
        if (player.isPlaying) {
          player.togglePlay();
        }
      }
    },
    [setHistoryList, setStudioSessionTracks, activeTrack, setActiveTrack, player]
  );

  return {
    caption,
    setCaption,
    bpm,
    setBpm,
    keyscale,
    setKeyscale,
    timesignature,
    setTimesignature,
    duration,
    setDuration,
    seed,
    setSeed,
    ditVariant,
    setDitVariant,
    guidanceScale,
    setGuidanceScale,
    inferenceSteps,
    setInferenceSteps,
    shift,
    setShift,
    isGenerating,
    generationProgress,
    generationError,
    dismissError: () => setGenerationError(null),
    historyList,
    studioSessionTracks,
    setStudioSessionTracks,
    activeTrack,
    isPlaying: player.isPlaying,
    currentTime: player.currentTime,
    durationSeconds: player.duration,
    playPause: player.togglePlay,
    seek: player.seek,
    selectTrack,
    startGeneration,
    cancelActiveTask,
    deleteTrack,
  };
}
