import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import {
  captionAtom,
  lyricsAtom,
  isInstrumentalAtom,
  vocalModeAtom,
  type MusicVocalMode,
  engineAtom,
  ditVariantAtom,
  bpmAtom,
  keyscaleAtom,
  timesignatureAtom,
  vocalLanguageAtom,
  durationAtom,
  seedAtom,
  simpleModeAtom,
  rewriteQueryAtom,
  generateLrcAtom,
  computeQualityScoreAtom,
  augmentCaptionAtom,
  normalizeLoudnessAtom,
  guidanceScaleAtom,
  dcwEnabledAtom,
  dcwScalerAtom,
  dcwHighScalerAtom,
  inferenceStepsAtom,
  shiftAtom,
  taskTypeAtom,
  sourceAudioAtom,
  referenceAudioAtom,
  coverNoiseStrengthAtom,
  trackAtom,
  isGeneratingAtom,
  activeTaskIdAtom,
  generationProgressAtom,
  generationErrorAtom,
  activeTrackAtom,
  historyListAtom,
  studioSessionTracksAtom,
} from '../store/musicStore';
import { usePlayer } from '@/hooks/usePlayer';
import {
  generateMusic,
  cancelMusic,
  getMusicHistory,
  deleteMusicHistory,
  clearMusicHistory,
  subscribeMusicProgress,
} from '../services/music-api';
import type { MusicGenerationOutput } from '../types';

export function useMusicGeneration() {
  const [caption, setCaption] = useAtom(captionAtom);
  const [lyrics, setLyrics] = useAtom(lyricsAtom);
  const [isInstrumental, setIsInstrumental] = useAtom(isInstrumentalAtom);
  const [vocalMode, setVocalMode] = useAtom(vocalModeAtom);
  const [engine, setEngine] = useAtom(engineAtom);
  const [ditVariant, setDitVariant] = useAtom(ditVariantAtom);
  const [bpm, setBpm] = useAtom(bpmAtom);
  const [keyscale, setKeyscale] = useAtom(keyscaleAtom);
  const [timesignature, setTimesignature] = useAtom(timesignatureAtom);
  const [vocalLanguage, setVocalLanguage] = useAtom(vocalLanguageAtom);
  const [duration, setDuration] = useAtom(durationAtom);
  const [seed, setSeed] = useAtom(seedAtom);
  const [simpleMode, setSimpleMode] = useAtom(simpleModeAtom);
  const [rewriteQuery, setRewriteQuery] = useAtom(rewriteQueryAtom);
  const [generateLrc, setGenerateLrc] = useAtom(generateLrcAtom);
  const [computeQualityScore, setComputeQualityScore] = useAtom(computeQualityScoreAtom);
  const [augmentCaption, setAugmentCaption] = useAtom(augmentCaptionAtom);
  const [normalizeLoudness, setNormalizeLoudness] = useAtom(normalizeLoudnessAtom);
  const [guidanceScale, setGuidanceScale] = useAtom(guidanceScaleAtom);
  const [dcwEnabled, setDcwEnabled] = useAtom(dcwEnabledAtom);
  const [dcwScaler, setDcwScaler] = useAtom(dcwScalerAtom);
  const [dcwHighScaler, setDcwHighScaler] = useAtom(dcwHighScalerAtom);
  const [inferenceSteps, setInferenceSteps] = useAtom(inferenceStepsAtom);
  const [shift, setShift] = useAtom(shiftAtom);
  const [taskType, setTaskType] = useAtom(taskTypeAtom);
  const [sourceAudio, setSourceAudio] = useAtom(sourceAudioAtom);
  const [referenceAudio, setReferenceAudio] = useAtom(referenceAudioAtom);
  const [coverNoiseStrength, setCoverNoiseStrength] = useAtom(coverNoiseStrengthAtom);
  const [track, setTrack] = useAtom(trackAtom);

  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [activeTaskId, setActiveTaskId] = useAtom(activeTaskIdAtom);
  const [generationProgress, setGenerationProgress] = useAtom(generationProgressAtom);
  const [generationError, setGenerationError] = useAtom(generationErrorAtom);
  const [activeTrack, setActiveTrack] = useAtom(activeTrackAtom);
  const [historyList, setHistoryList] = useAtom(historyListAtom);
  const [studioSessionTracks, setStudioSessionTracks] = useAtom(studioSessionTracksAtom);

  const player = usePlayer();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Reset any dangling generation state from app crash or ungraceful close on mount
  useEffect(() => {
    setIsGenerating(false);
    setActiveTaskId(null);
    setGenerationProgress(null);
  }, []);

  // Load history on mount
  useEffect(() => {
    let mounted = true;
    getMusicHistory().then((res) => {
      if (mounted && res.success && res.data) {
        setHistoryList(res.data);
        if (!activeTrack && res.data.length > 0) {
          setActiveTrack(res.data[0]);
        }
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playPause = useCallback(() => {
    if (activeTrack && player.currentTrack?.id !== activeTrack.id) {
      player.play({
        id: activeTrack.id,
        title: activeTrack.caption || 'Generated Track',
        artist: activeTrack.keyscale ? `${activeTrack.keyscale} · ${activeTrack.bpm || 120} BPM` : 'ACE-Step v1.5',
        coverUrl: '/covers/stardust_visitor.jpg',
        audioUrl: activeTrack.audioUrl,
        waveform: activeTrack.waveform,
        duration: activeTrack.durationMs ? Math.round(activeTrack.durationMs / 1000) : 60,
      });
    } else {
      player.togglePlay();
    }
  }, [activeTrack, player]);

  const seek = useCallback(
    (timeInSeconds: number) => {
      player.seek(timeInSeconds);
    },
    [player]
  );

  const selectTrack = useCallback(
    (trackItem: MusicGenerationOutput, autoPlay = true) => {
      setActiveTrack(trackItem);
      if (autoPlay) {
        player.play({
          id: trackItem.id,
          title: trackItem.caption || 'Generated Track',
          artist: trackItem.keyscale ? `${trackItem.keyscale} · ${trackItem.bpm || 120} BPM` : 'ACE-Step v1.5',
          coverUrl: '/covers/stardust_visitor.jpg',
          audioUrl: trackItem.audioUrl,
          waveform: trackItem.waveform,
          duration: trackItem.durationMs ? Math.round(trackItem.durationMs / 1000) : 60,
        });
      }
    },
    [setActiveTrack, player]
  );

  const startGeneration = useCallback(async () => {
    if (!caption || !caption.trim() || isGenerating) return;

    const taskId = `music_task_${Date.now()}`;
    setActiveTaskId(taskId);
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress({
      stage: 'Initializing',
      step: 0,
      total: 100,
      percentage: 0,
      message: 'Preparing AudioGen session...',
    });

    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeMusicProgress(
      taskId,
      (progress) => {
        setGenerationProgress(progress);
      },
      (generation) => {
        setIsGenerating(false);
        setActiveTaskId(null);
        setGenerationProgress(null);
        setGenerationError(null);
        setActiveTrack(generation);
        setStudioSessionTracks((prev) => [generation, ...prev.filter((p) => p.id !== generation.id)]);
        setHistoryList((prev) => [generation, ...prev.filter((p) => p.id !== generation.id)]);
        // Autoplay the newly rendered track through the centralized player
        player.play({
          id: generation.id,
          title: generation.caption || 'Generated Track',
          artist: generation.keyscale ? `${generation.keyscale} · ${generation.bpm || 120} BPM` : 'MiniMax Music-v3',
          coverUrl: '/covers/stardust_visitor.jpg',
          audioUrl: generation.audioUrl,
          waveform: generation.waveform,
          duration: generation.durationMs ? Math.round(generation.durationMs / 1000) : 60,
        });
      },
      (errorMsg, details) => {
        console.error('[useMusicGeneration] ✖ Music Generation Error Event:', { errorMsg, details });
        setIsGenerating(false);
        setActiveTaskId(null);
        setGenerationProgress(null);
        setGenerationError({
          taskId,
          message: errorMsg,
          details,
          timestamp: new Date().toISOString(),
        });
      }
    );

    try {
      const effectiveIsInstrumental = vocalMode === 'instrumental' || isInstrumental;
      const actualLyrics = effectiveIsInstrumental
        ? '[Instrumental]'
        : lyrics && lyrics.trim() !== '' && lyrics.trim() !== '[Instrumental]'
          ? lyrics.trim()
          : undefined;

      const response = await generateMusic({
        taskId,
        caption: caption.trim(),
        engine,
        ditVariant,
        lyrics: actualLyrics,
        isInstrumental: effectiveIsInstrumental,
        vocalMode,
        bpm,
        keyscale,
        timesignature,
        vocalLanguage,
        duration,
        seed: seed >= 0 ? seed : undefined,
        simpleMode: simpleMode || (!effectiveIsInstrumental && !lyrics),
        rewriteQuery: simpleMode || (!effectiveIsInstrumental && !lyrics) ? false : rewriteQuery,
        generateLrc,
        computeQualityScore,
        augmentCaptionWithMetadata: augmentCaption,
        normalizeLoudness,
        guidanceScale,
        dcwEnabled,
        dcwScaler,
        dcwHighScaler,
        inferenceSteps,
        shift,
        taskType,
        sourceAudio: sourceAudio || undefined,
        referenceAudio: referenceAudio || undefined,
        coverNoiseStrength,
        track: taskType === 'lego' && engine === 'acestep' ? track : undefined,
        useGPU: true,
      });

      if (!response.success) {
        console.error('[useMusicGeneration] ✖ generateMusic response failed:', {
          taskId,
          engine,
          error: response.error,
          details: (response as any).details,
        });
        setIsGenerating(false);
        setActiveTaskId(null);
        setGenerationProgress(null);
        setGenerationError({
          taskId,
          message: response.error || 'Generation failed.',
          details: (response as any).details,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      console.error('[useMusicGeneration] ✖ generateMusic exception caught:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setIsGenerating(false);
      setActiveTaskId(null);
      setGenerationProgress(null);
      setGenerationError({
        taskId,
        message: errMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Keep subscription until complete or error fires
    }
  }, [
    caption,
    isGenerating,
    isInstrumental,
    lyrics,
    engine,
    ditVariant,
    bpm,
    keyscale,
    timesignature,
    vocalLanguage,
    duration,
    seed,
    simpleMode,
    rewriteQuery,
    generateLrc,
    computeQualityScore,
    augmentCaption,
    normalizeLoudness,
    guidanceScale,
    dcwEnabled,
    dcwScaler,
    dcwHighScaler,
    inferenceSteps,
    shift,
    taskType,
    sourceAudio,
    referenceAudio,
    coverNoiseStrength,
    track,
    setIsGenerating,
    setActiveTaskId,
    setGenerationProgress,
    setActiveTrack,
    player,
  ]);

  const cancelActiveTask = useCallback(async () => {
    unsubscribeRef.current?.();
    if (activeTaskId) {
      try {
        await cancelMusic(activeTaskId);
      } catch (e) {
        console.warn('[useMusicGeneration] Warning cancelling music task:', e);
      }
    }
    setIsGenerating(false);
    setActiveTaskId(null);
    setGenerationProgress(null);
  }, [activeTaskId, setIsGenerating, setActiveTaskId, setGenerationProgress]);

  const deleteTrack = useCallback(
    async (id: string) => {
      await deleteMusicHistory(id);
      setStudioSessionTracks((prev) => prev.filter((item) => item.id !== id));
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
      if (activeTrack?.id === id) {
        setActiveTrack(null);
      }
      if (player.currentTrack?.id === id) {
        player.pause();
      }
    },
    [activeTrack, setHistoryList, setActiveTrack, player]
  );

  const clearAllHistory = useCallback(async () => {
    await clearMusicHistory();
    setHistoryList([]);
    setActiveTrack(null);
    player.pause();
  }, [setHistoryList, setActiveTrack, player]);

  return {
    // Inputs & Options
    caption,
    setCaption,
    lyrics,
    setLyrics,
    isInstrumental,
    setIsInstrumental: useCallback((val: boolean) => {
      setIsInstrumental(val);
      setVocalMode(val ? 'instrumental' : (lyrics && lyrics.trim() && lyrics.trim() !== '[Instrumental]' ? 'manual' : 'auto'));
    }, [setIsInstrumental, setVocalMode, lyrics]),
    vocalMode,
    setVocalMode: useCallback((mode: MusicVocalMode) => {
      setVocalMode(mode);
      setIsInstrumental(mode === 'instrumental');
    }, [setVocalMode, setIsInstrumental]),
    engine,
    setEngine,
    ditVariant,
    setDitVariant,
    bpm,
    setBpm,
    keyscale,
    setKeyscale,
    timesignature,
    setTimesignature,
    vocalLanguage,
    setVocalLanguage,
    duration,
    setDuration,
    seed,
    setSeed,
    simpleMode,
    setSimpleMode,
    rewriteQuery,
    setRewriteQuery,
    generateLrc,
    setGenerateLrc,
    computeQualityScore,
    setComputeQualityScore,
    augmentCaption,
    setAugmentCaption,
    normalizeLoudness,
    setNormalizeLoudness,
    guidanceScale,
    setGuidanceScale,
    dcwEnabled,
    setDcwEnabled,
    dcwScaler,
    setDcwScaler,
    dcwHighScaler,
    setDcwHighScaler,
    inferenceSteps,
    setInferenceSteps,
    shift,
    setShift,
    taskType,
    setTaskType,
    sourceAudio,
    setSourceAudio,
    referenceAudio,
    setReferenceAudio,
    coverNoiseStrength,
    setCoverNoiseStrength,
    track,
    setTrack,

    // Runtime states
    isGenerating,
    generationProgress,
    generationError,
    activeTrack,
    isPlaying: player.isPlaying && (!activeTrack || player.currentTrack?.id === activeTrack.id),
    playbackCurrentTime: player.currentTime,
    playbackDuration: player.duration || (activeTrack?.durationMs ? activeTrack.durationMs / 1000 : 60),
    historyList,
    studioSessionTracks,
    setStudioSessionTracks,

    // Actions
    startGeneration,
    cancelActiveTask,
    dismissError: useCallback(() => setGenerationError(null), [setGenerationError]),
    playPause,
    seek,
    selectTrack,
    deleteTrack,
    clearAllHistory,
  };
}
