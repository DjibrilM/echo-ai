import '../../../init-env';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';
import * as qvacSdk from '@qvac/sdk';
import type {
  MusicGenerateOptions,
  MusicEditOptions,
  MusicUnderstandOptions,
  MusicUnderstandResult,
  MusicGenerationOutput,
  MusicGenerateResult,
  MusicProgressPayload,
  MusicModelStatusResult,
  MusicModelItem,
  MusicDitVariant,
} from '../interfaces';
import { MusicLoggerService } from './music-logger.service';
import { MusicSanitizerService } from './music-sanitizer.service';
import { MusicDspService } from './music-dsp.service';
import { QwenLyricService } from './qwen-lyric.service';

/**
 * Creates a valid 44-byte RIFF WAV file from interleaved PCM buffer
 * directly adhering to the QVAC AudioGen WAV construction specification.
 */
function createWav(pcm: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const blockAlign = channels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcm.byteLength, true);

  const wav = new Uint8Array(44 + pcm.byteLength);
  wav.set(new Uint8Array(header));
  wav.set(pcm, 44);
  return wav;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function wavToDataUri(wav: Uint8Array): string {
  const base64 = Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength).toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

/**
 * Extracts 64 peak amplitudes (integers 0..100) from PCM for waveform visualization
 */
function computeWaveformPeaks(pcm: Uint8Array, bitsPerSample: number, channels: number, targetPeaks = 64): number[] {
  if (pcm.length === 0) return Array(targetPeaks).fill(10);
  const peaks: number[] = [];

  if (bitsPerSample === 16) {
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
    const step = Math.max(1, Math.floor(samples.length / targetPeaks));
    for (let i = 0; i < targetPeaks; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(samples.length, start + step);
      for (let j = start; j < end; j += channels) {
        const a = Math.abs(samples[j]) / 32768;
        if (a > max) max = a;
      }
      peaks.push(Math.max(6, Math.min(98, Math.round(max * 100))));
    }
  } else if (bitsPerSample === 32) {
    const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
    const step = Math.max(1, Math.floor(samples.length / targetPeaks));
    for (let i = 0; i < targetPeaks; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(samples.length, start + step);
      for (let j = start; j < end; j += channels) {
        const a = Math.abs(samples[j]);
        if (a > max) max = a;
      }
      peaks.push(Math.max(6, Math.min(98, Math.round(max * 100))));
    }
  } else {
    for (let i = 0; i < targetPeaks; i++) {
      peaks.push(Math.round(20 + Math.sin(i / 4) * 15));
    }
  }

  return peaks;
}

export class MusicEngineService {
  private activeModelId?: string;
  private activeEngine?: 'acestep' | 'minimax';
  private activeDitVariant?: MusicDitVariant;
  private activeRequestIds = new Map<string, string>(); // taskId -> requestId
  private musicExportsDir: string;
  private logger = MusicLoggerService.getInstance();

  constructor() {
    try {
      const userData = app?.getPath ? app.getPath('userData') : process.cwd();
      this.musicExportsDir = path.join(userData, 'music-exports');
      if (!fs.existsSync(this.musicExportsDir)) {
        fs.mkdirSync(this.musicExportsDir, { recursive: true });
      }
    } catch {
      this.musicExportsDir = path.join(process.cwd(), 'music-exports');
    }
  }

  public getActiveModelId(): string | undefined {
    return this.activeModelId;
  }

  /**
   * Assess hardware and memory fit for ACE-Step or MiniMax models before loading
   */
  public async assessFit(engine: 'acestep' | 'minimax' = 'acestep', ditVariant: MusicDitVariant = 'turbo-q4') {
    try {
      if (engine === 'acestep') {
        const ditModelSrc = this.resolveDitModelSrc(ditVariant);
        const result = await qvacSdk.assessModelFit({
          models: [
            {
              modelType: 'audiogen',
              modelConfig: {
                engine: 'acestep',
                textEncModelSrc: qvacSdk.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
                lmModelSrc: qvacSdk.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
                ditModelSrc,
                vaeModelSrc: qvacSdk.AUDIOGEN_VAE_BF16,
                useGPU: true,
              },
            },
          ],
        });
        return { success: true, data: result };
      }
      const { lmModelSrc, synthModelSrc } = this.resolveMiniMaxModelPaths();
      if (lmModelSrc && synthModelSrc) {
        const result = await qvacSdk.assessModelFit({
          models: [
            {
              modelType: 'audiogen',
              modelConfig: {
                engine: 'minimax',
                lmModelSrc,
                synthModelSrc,
                useGPU: true,
              },
            },
          ],
        });
        return { success: true, data: result };
      }
      return { success: true, message: 'MiniMax assessment requires local model paths' };
    } catch (err: any) {
      this.logger.logFailure({
        taskId: 'assess-fit',
        engine,
        stage: 'ASSESS_FIT',
        error: err,
        options: { engine, ditVariant },
      });
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Discovers downloaded MiniMax-Music3 GGUF model files from disk cache (~/.qvac/models)
   */
  public resolveMiniMaxModelPaths(customLm?: string, customSynth?: string): { lmModelSrc?: string; synthModelSrc?: string } {
    let lmModelSrc = customLm;
    let synthModelSrc = customSynth;
    const cacheDir = path.join(os.homedir(), '.qvac', 'models');

    if (fs.existsSync(cacheDir)) {
      try {
        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
          const lower = file.toLowerCase();
          if (
            lower.endsWith('.download') ||
            lower.endsWith('.tmp') ||
            lower.endsWith('.partial') ||
            lower.endsWith('.crdownload')
          ) {
            continue;
          }

          const fullPath = path.join(cacheDir, file);
          try {
            const st = fs.statSync(fullPath);
            if (!st.isFile() || st.size < 1024 * 1024) continue;
          } catch {
            continue;
          }

          if (
            !lmModelSrc &&
            (lower.includes('mm3-lm') || (lower.includes('minimax') && (lower.includes('lm') || lower.includes('transformer')))) &&
            !lower.includes('vocoder') &&
            !lower.includes('synth')
          ) {
            // If the LM file ends with -imat.gguf, create or use canonical counterpart without -imat
            // because QVAC AudioGen compares the quant string between LM and Synth filenames!
            if (file.includes('-imat.gguf')) {
              const canonicalName = file.replace('-imat.gguf', '.gguf');
              const canonicalPath = path.join(cacheDir, canonicalName);
              if (!fs.existsSync(canonicalPath)) {
                try {
                  fs.linkSync(fullPath, canonicalPath);
                  console.log(`[MusicEngineService] Created quant-matched hardlink: ${canonicalName} -> ${file}`);
                } catch {
                  try {
                    fs.symlinkSync(fullPath, canonicalPath);
                  } catch { }
                }
              }
              if (fs.existsSync(canonicalPath)) {
                lmModelSrc = canonicalPath;
                continue;
              }
            }
            lmModelSrc = fullPath;
          }

          if (
            !synthModelSrc &&
            (lower.includes('mm3-synth') || (lower.includes('minimax') && (lower.includes('synth') || lower.includes('vocoder')))) &&
            !lower.includes('transformer') &&
            !lower.includes('lm')
          ) {
            synthModelSrc = fullPath;
          }
        }
      } catch (err) {
        console.warn('[MusicEngineService] Error resolving MiniMax model paths:', err);
      }
    }

    return { lmModelSrc, synthModelSrc };
  }

  /**
   * Checks whether MiniMax Music-v3 models are installed and accessible on disk
   */
  public areMiniMaxModelsAvailable(): boolean {
    const { lmModelSrc, synthModelSrc } = this.resolveMiniMaxModelPaths();
    return Boolean(lmModelSrc && synthModelSrc);
  }

  /**
   * Resolves the DiT model source constant based on user variant selection
   */
  private resolveDitModelSrc(ditVariant?: MusicDitVariant) {
    switch (ditVariant) {
      case 'turbo-q8':
        return qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q8_0;
      case 'sft-q8':
        return qvacSdk.AUDIOGEN_ACESTEP_V15_SFT_Q8_0;
      case 'base-q4':
        return (qvacSdk as any).AUDIOGEN_ACESTEP_V15_BASE_Q4_K_M || qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
      case 'turbo-q4':
      default:
        return qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
    }
  }

  /**
   * Ensures the appropriate AudioGen model is loaded in QVAC runtime
   */
  public async ensureModelLoaded(
    options: {
      engine?: 'acestep' | 'minimax';
      ditVariant?: MusicDitVariant;
      inferenceSteps?: number;
      useGPU?: boolean;
      lmModelSrc?: string;
      synthModelSrc?: string;
      threads?: number;
    },
    onProgress?: (progress: MusicProgressPayload) => void
  ): Promise<string> {
    const targetEngine = options.engine || 'acestep';
    const targetDit = options.ditVariant || 'turbo-q4';

    // If currently loaded with same configuration, reuse model
    if (this.activeModelId && this.activeEngine === targetEngine && (targetEngine === 'minimax' || this.activeDitVariant === targetDit)) {
      return this.activeModelId;
    }

    // Unload previous model if exists
    if (this.activeModelId) {
      try {
        await qvacSdk.unloadModel({ modelId: this.activeModelId });
      } catch (e) {
        console.warn('[MusicEngineService] Warning unloading prior model:', e);
      }
      this.activeModelId = undefined;
    }

    if (targetEngine === 'acestep') {
      const ditModelSrc = this.resolveDitModelSrc(targetDit);

      onProgress?.({
        taskId: 'model-load',
        stage: 'Loading Models',
        step: 0,
        total: 100,
        percentage: 0,
        message: 'Preparing ACE-Step AudioGen models...',
      });

      this.logger.logMilestone('model-load', 'LOAD_START', `Loading ACE-Step (${targetDit}) into QVAC runtime`);

      try {
        const modelId = await qvacSdk.loadModel({
          modelType: 'audiogen',
          modelConfig: {
            engine: 'acestep',
            textEncModelSrc: qvacSdk.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
            lmModelSrc: qvacSdk.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
            ditModelSrc,
            vaeModelSrc: qvacSdk.AUDIOGEN_VAE_BF16,
            useGPU: options.useGPU !== false,
            inferenceSteps: options.inferenceSteps || 8,
          },
          onProgress: (p: qvacSdk.ModelProgressUpdate) => {
            const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
            const filename = p.downloadKey?.split('/').pop() || p.downloadKey || 'model';
            onProgress?.({
              taskId: 'model-load',
              stage: 'Downloading',
              step: Math.round(p.downloaded / 1e6),
              total: Math.round(p.total / 1e6),
              percentage: p.percentage,
              message: `Downloading ${filename}: ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`,
            });
          },
        });

        this.activeModelId = modelId;
        this.activeEngine = 'acestep';
        this.activeDitVariant = targetDit;
        this.logger.logMilestone('model-load', 'LOAD_SUCCESS', `ACE-Step model loaded ID: ${modelId}`);
        return modelId;
      } catch (loadErr: any) {
        this.logger.logFailure({
          taskId: 'model-load',
          engine: 'acestep',
          stage: 'LOAD_ACESTEP_RUNTIME',
          error: loadErr,
          options,
          resolvedPaths: { ditModelSrc },
        });
        throw loadErr;
      }
    } else {
      // MiniMax-Music3
      const { lmModelSrc, synthModelSrc } = this.resolveMiniMaxModelPaths(options.lmModelSrc, options.synthModelSrc);
      if (!lmModelSrc || !synthModelSrc) {
        const errMsg = 'MiniMax-Music3 model files are not installed. Please download the MiniMax models first.';
        this.logger.logFailure({
          taskId: 'model-load',
          engine: 'minimax',
          stage: 'RESOLVE_MINIMAX_PATHS',
          error: new Error(errMsg),
          options,
          resolvedPaths: { lmModelSrc, synthModelSrc },
        });
        console.error(`[MusicEngineService] ✖ MiniMax Model Load Failed: missing model paths`, {
          lmModelSrc,
          synthModelSrc,
          optionsLm: options.lmModelSrc,
          optionsSynth: options.synthModelSrc,
        });
        throw new Error(errMsg);
      }

      onProgress?.({
        taskId: 'model-load',
        stage: 'Loading Models',
        step: 0,
        total: 100,
        percentage: 0,
        message: 'Loading MiniMax-Music3 local GGUF models...',
      });

      this.logger.logMilestone('model-load', 'LOAD_START', `Loading MiniMax models into QVAC runtime (LM: ${lmModelSrc}, Synth: ${synthModelSrc})`);

      // Free the lyric LLM first: MiniMax needs ~7+ GB and low free memory causes swapping.
      await QwenLyricService.getInstance().unload();
      const freeGb = os.freemem() / 1024 ** 3;
      if (freeGb < 8) {
        this.logger.logMilestone(
          'model-load',
          'LOW_MEMORY',
          `Only ${freeGb.toFixed(1)} GB reported free before MiniMax load; generation may be slow. Close heavy apps for best speed.`
        );
        console.warn(`[MusicEngineService] Low free memory before MiniMax load: ${freeGb.toFixed(1)} GB`);
      }

      try {
        const modelId = await qvacSdk.loadModel({
          modelType: 'audiogen',
          modelConfig: {
            engine: 'minimax',
            lmModelSrc,
            synthModelSrc,
            device: options.useGPU === false ? 'cpu' : 'gpu',
            ...(options.threads !== undefined && { threads: options.threads }),
          },
        });

        this.activeModelId = modelId;
        this.activeEngine = 'minimax';
        this.logger.logMilestone('model-load', 'LOAD_SUCCESS', `MiniMax model loaded successfully! ID: ${modelId}`);
        return modelId;
      } catch (loadErr: any) {
        this.logger.logFailure({
          taskId: 'model-load',
          engine: 'minimax',
          stage: 'LOAD_MINIMAX_RUNTIME',
          error: loadErr,
          options,
          resolvedPaths: { lmModelSrc, synthModelSrc },
        });
        console.error(`[MusicEngineService] ✖ Failed to load MiniMax models in QVAC runtime:`, {
          error: loadErr?.message || String(loadErr),
          code: loadErr?.code,
          stack: loadErr?.stack,
          lmModelSrc,
          synthModelSrc,
        });
        throw loadErr;
      }
    }
  }

  /**
   * Generates music track based on prompt, lyrics, and musical controls
   */
  public async generate(
    options: MusicGenerateOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void,
    isCancelled?: () => boolean
  ): Promise<MusicGenerateResult> {
    const { taskId, caption } = options;
    if (!caption || !caption.trim()) {
      return { success: false, error: 'Caption is required and cannot be empty.' };
    }

    this.logger.logSessionStart({
      taskId,
      engine: options.engine || 'acestep',
      caption,
      lyrics: options.lyrics,
      isInstrumental: options.isInstrumental,
      duration: options.duration,
      ditVariant: options.ditVariant,
      seed: options.seed,
    });

    try {
      onLog?.({ text: `▸ Initializing Music Generation: "${caption}"`, stream: 'system' });

      // 1. Ensure AudioGen model is loaded
      const modelId = await this.ensureModelLoaded(options, onProgress);
      if (isCancelled?.()) {
        this.logger.logMilestone(taskId, 'CANCELLED', 'Cancelled by user before synthesis started');
        return { success: false, error: 'Cancelled by user before synthesis started.' };
      }

      this.logger.logMilestone(taskId, 'MODEL_READY', `Model ID: ${modelId} (${options.engine || 'acestep'})`);
      onLog?.({ text: `▸ Model loaded successfully: ${modelId} (Engine: ${options.engine || 'acestep'})`, stream: 'system' });

      // 2. Sanitize prompt, lyrics, and duration through the second-layer sanitizer
      const engine = options.engine || 'acestep';
      const sanitized = MusicSanitizerService.getInstance().sanitize({
        caption: options.caption,
        lyrics: options.lyrics,
        isInstrumental: options.isInstrumental,
        vocalMode: options.vocalMode,
        duration: options.duration,
        engine,
        bpm: options.bpm,
        keyscale: options.keyscale,
        timesignature: options.timesignature,
        vocalLanguage: options.vocalLanguage,
        ditVariant: options.ditVariant,
        simpleMode: options.simpleMode,
        taskType: options.taskType,
      });

      this.logger.logMilestone(
        taskId,
        'SANITIZED',
        `Cleaned Caption: "${sanitized.caption.slice(0, 80)}..." | Target Duration: ${sanitized.duration}s | LyricsLength: ${sanitized.lyrics.length} | Mode: ${sanitized.isInstrumental ? 'INSTRUMENTAL' : 'VOCAL'}${sanitized.vocalHintInjected ? ` | VocalInjected: "${sanitized.vocalHintInjected}"` : ''}`
      );
      onLog?.({
        text: `▸ Request Sanitized: "${sanitized.caption.slice(0, 60)}..." (Mode: ${sanitized.isInstrumental ? 'Instrumental' : 'Vocal'}, Duration: ${sanitized.duration}s)`,
        stream: 'system',
      });

      let runParams: any = {
        modelId,
        caption: sanitized.caption,
        lyrics: sanitized.lyrics,
        duration: sanitized.duration,
      };

      if (options.seed !== undefined) {
        runParams.seed = options.seed;
      }

      if (engine === 'acestep') {
        // ACE-Step 5Hz LM architecture is strictly bounded to 60 seconds (300 codes).
        // Requesting 120s or 180s on ACE-Step causes the 5Hz LM to output EOS immediately
        // resulting in "acestep engine: LM produced no audio codes".
        // If MiniMax models are available on disk and duration > 60s, automatically elevate to MiniMax
        // which effortlessly generates 180s (3m) full tracks; otherwise clamp duration to 60s for ACE-Step.
        if (sanitized.duration > 60) {
          const hasMiniMax = this.areMiniMaxModelsAvailable();
          if (hasMiniMax) {
            this.logger.logMilestone(
              taskId,
              'ENGINE_ELEVATED',
              `Extended duration (${sanitized.duration}s) exceeds ACE-Step's 60s window. Seamlessly routing to MiniMax Music-v3 Global LM.`
            );
            return await this.generate({
              ...options,
              engine: 'minimax',
            }, onProgress, onLog, isCancelled);
          } else {
            this.logger.logMilestone(
              taskId,
              'DURATION_CLAMPED',
              `ACE-Step 5Hz LM natively supports up to 60s. Clamping from ${sanitized.duration}s to 60s to ensure successful synthesis.`
            );
            sanitized.duration = 60;
            runParams.duration = 60;
          }
        }

        // Vocal generation requested without explicit lyrics:
        // Do NOT set [Instrumental]! Enable simpleMode so ACE-Step LM writes lyrics & vocals!
        if (options.simpleMode !== false && !sanitized.isInstrumental && !options.lyrics) {
          runParams.simpleMode = true;
          delete runParams.lyrics;
        } else if (sanitized.isInstrumental) {
          runParams.simpleMode = false;
          runParams.lyrics = '[Instrumental]';
        }
        if (!options.vocalLanguage && !sanitized.isInstrumental) {
          runParams.vocalLanguage = 'en';
        }
      }

      if (engine === 'acestep') {
        // Musical steering controls
        if (options.bpm !== undefined) runParams.bpm = options.bpm;
        if (options.keyscale) runParams.keyscale = options.keyscale;
        if (options.timesignature) runParams.timesignature = options.timesignature;
        if (options.vocalLanguage) runParams.vocalLanguage = options.vocalLanguage;
        if (options.augmentCaptionWithMetadata) runParams.augmentCaptionWithMetadata = true;

        // LM-assisted modes
        if (runParams.simpleMode || options.simpleMode) {
          runParams.simpleMode = true;
          // SimpleMode cannot combine with audioCodes or rewriteQuery
        } else if (options.rewriteQuery) {
          runParams.rewriteQuery = true;
        }

        if (options.generateLrc) runParams.generateLrc = true;
        if (options.computeQualityScore) runParams.computeQualityScore = true;

        // Output and acoustic guidance for ACE-Step
        if (options.normalizeLoudness !== undefined) {
          runParams.normalizeLoudness = options.normalizeLoudness;
        } else {
          runParams.normalizeLoudness = true;
        }

        const isTurbo = !options.ditVariant || options.ditVariant.includes('turbo');

        // 1. Classifier-Free Guidance (CFG / guidanceScale)
        // Turbo DiTs are distilled: CFG > 1.5 causes harsh clipping, severe noise over-saturation,
        // and phase distortion. Set to 0 (auto: 1.0) or 1.0 for turbo; 7.0 for SFT/base.
        if (isTurbo) {
          if (options.guidanceScale && options.guidanceScale > 1.5) {
            console.warn(`[MusicEngineService] Clamping high guidanceScale (${options.guidanceScale}) to 1.0 on turbo DiT to prevent distortion.`);
            runParams.guidanceScale = 1.0;
          } else {
            runParams.guidanceScale = options.guidanceScale !== undefined ? options.guidanceScale : 0;
          }
        } else {
          runParams.guidanceScale = options.guidanceScale !== undefined ? options.guidanceScale : 7.0;
        }

        // 2. Timestep Shift
        // Turbo DiT requires shift = 3.0 (official default). A shift of 1.0 leaves high frequencies
        // unresolved in 8-12 steps, making drums and instruments sound muffled/underwater.
        if (isTurbo) {
          if (options.shift && options.shift < 2.0) {
            console.warn(`[MusicEngineService] Correcting low shift (${options.shift}) to 3.0 on turbo DiT for acoustic clarity.`);
            runParams.shift = 3.0;
          } else {
            runParams.shift = options.shift !== undefined ? options.shift : 3.0;
          }
        } else {
          runParams.shift = options.shift !== undefined ? options.shift : 1.0;
        }

        // 3. Haar Dual-Channel Wavelet (DCW) frequency separation
        // Mandatory for preventing sub-bass from clashing with mid/high harmonics.
        runParams.dcwEnabled = options.dcwEnabled !== undefined ? options.dcwEnabled : true;
        runParams.dcwScaler = options.dcwScaler !== undefined ? options.dcwScaler : 0.05;
        runParams.dcwHighScaler = options.dcwHighScaler !== undefined ? options.dcwHighScaler : 0.02;

        // 4. Diffusion Steps
        // 10 steps on turbo yields dramatically clearer transients and stereo width than 8 steps.
        if (options.inferenceSteps) {
          runParams.inferenceSteps = isTurbo ? Math.max(8, options.inferenceSteps) : Math.max(30, options.inferenceSteps);
        } else {
          runParams.inferenceSteps = isTurbo ? 10 : 50;
        }

        // Reference Audio & Cover Tasks
        if (options.referenceAudio) {
          runParams.referenceAudio = options.referenceAudio;
        }

        if (options.taskType && options.taskType !== 'text2music') {
          runParams.taskType = options.taskType;
          if (options.sourceAudio) {
            runParams.sourceAudio = options.sourceAudio;
          }
          if (options.taskType === 'cover-nofsq') {
            runParams.audioCoverStrength = 1;
            runParams.coverNoiseStrength = options.coverNoiseStrength ?? 0.75;
          } else if (options.taskType === 'lego') {
            if (options.track) {
              runParams.track = options.track;
            }
          }
        }
      } else {
        // MiniMax-Music3 specific
        // 1. CFG Guidance: Essential for crisp vocal articulation and eliminating robotic drift
        runParams.cfgScale = options.cfgScale !== undefined ? options.cfgScale : 1.8;

        // 2. Duration / Frames
        if (options.maxFrames !== undefined) {
          runParams.maxFrames = options.maxFrames;
          delete runParams.duration;
        }

        // 3. Flow-matching Steps: MiniMax requires 20-25 steps to resolve high-frequency formants and sibilance.
        // If the UI passes 8 (the ACE-Step turbo default), elevate to 22 steps for crystal-clear vocal details.
        if (options.inferenceSteps && options.inferenceSteps >= 16) {
          runParams.inferenceSteps = options.inferenceSteps;
        } else {
          runParams.inferenceSteps = 22; // Studio sweet spot for natural human voice
        }
      }

      onLog?.({ text: `▸ Starting QVAC audioGen inference run...`, stream: 'system' });

      // 3. Initiate generation
      const run = qvacSdk.audioGen(runParams);
      this.activeRequestIds.set(taskId, run.requestId);

      onLog?.({ text: `▸ Assigned requestId: ${run.requestId}`, stream: 'system' });

      // 4. Stream real-time progress
      (async () => {
        const stageStart = new Map<string, number>();
        const formatEta = (ms: number) => {
          const s = Math.max(0, Math.round(ms / 1000));
          return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
        };
        try {
          for await (const progress of run.progressStream) {
            if (isCancelled?.()) break;
            const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;
            let msg = progress.total > 0
              ? `${progress.stage}: step ${progress.step}/${progress.total}`
              : `${progress.stage}: step ${progress.step}`;

            // Per-stage ETA from the observed step rate
            if (!stageStart.has(progress.stage)) stageStart.set(progress.stage, Date.now());
            let etaSeconds: number | undefined;
            let etaFormatted: string | undefined;

            const minStepsForEta = progress.total > 12 ? 5 : 2;
            if (progress.total > 0 && progress.step >= minStepsForEta && progress.step < progress.total) {
              const elapsed = Date.now() - (stageStart.get(progress.stage) as number);
              const remainingMs = (elapsed / progress.step) * (progress.total - progress.step);
              etaSeconds = Math.max(1, Math.round(remainingMs / 1000));
              etaFormatted = formatEta(remainingMs);
              msg += ` · ~${etaFormatted} remaining`;
            }

            onProgress?.({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: msg,
              etaSeconds,
              etaFormatted,
            });

            onLog?.({ text: `▸ [${progress.stage}] ${progress.step}/${progress.total || '?'}`, stream: 'stdout' });
          }
        } catch (streamErr) {
          // Stream error is also caught by run.audio promise rejection
        }
      })();

      // 5. Await audio synthesis and stats
      const [audio, stats] = await Promise.all([run.audio, run.stats]);
      this.activeRequestIds.delete(taskId);

      const backendId = (stats as any)?.backendId;
      const backendName = backendId === 1 ? 'Metal (Apple GPU)' : backendId === 2 ? 'CUDA (GPU)' : backendId === 0 ? 'CPU' : (backendId !== undefined ? `Backend #${backendId}` : 'Metal (Apple GPU)');
      const fallbackReason = (stats as any)?.gpuFallbackReason;

      this.logger.logMilestone(
        taskId,
        'BACKEND_STATS',
        `Compute Backend: ${backendName}${fallbackReason && fallbackReason !== 0 ? ` (Fallback Reason: ${fallbackReason})` : ''}`
      );
      onLog?.({
        text: `▸ Compute Backend: ${backendName}`,
        stream: 'system',
      });

      // Per-stage timing so we can see where MiniMax spends its time (AR vs flow vs vocoder)
      const s = stats as any;
      if (s && (s.arMs !== undefined || s.flowMs !== undefined || s.totalTimeMs !== undefined)) {
        const sec = (ms?: number) => (typeof ms === 'number' ? `${(ms / 1000).toFixed(1)}s` : 'n/a');
        const timing =
          `total=${sec(s.totalTimeMs)} | AR=${sec(s.arMs)} | condition=${sec(s.conditionMs)} | flow=${sec(s.flowMs)} | vocoder=${sec(s.vocoderMs)}` +
          ` | frames=${s.emittedFrames ?? 'n/a'}${s.emittedFrames ? ` (~${(s.emittedFrames / 25).toFixed(0)}s audio)` : ''}` +
          ` | RTF=${typeof s.realTimeFactor === 'number' ? s.realTimeFactor.toFixed(2) : 'n/a'}`;
        this.logger.logMilestone(taskId, 'STAGE_TIMINGS', timing);
        onLog?.({ text: `▸ Stage timings: ${timing}`, stream: 'system' });
      }

      onLog?.({ text: `▸ Synthesis completed! Mastering ${audio.pcm.byteLength} raw PCM bytes...`, stream: 'system' });

      // 6. Master PCM: Filter DC rumble (32Hz), boost vocal air & presence (+2.2dB @ 9.5kHz), and normalize peak to -0.5 dBFS
      const { masteredPcm, details: dspDetails } = MusicDspService.getInstance().masterPcm(
        audio.pcm,
        audio.sampleRate,
        audio.channels,
        audio.bitsPerSample
      );
      this.logger.logMilestone(taskId, 'DSP_MASTERED', dspDetails);
      onLog?.({ text: `▸ Audio Mastered: ${dspDetails}`, stream: 'system' });

      // 7. Encode into standard WAV and save to disk
      const wav = createWav(masteredPcm, audio.sampleRate, audio.channels, audio.bitsPerSample);

      // Save output WAV to exports folder for high-performance direct streaming
      const filename = `music-${Date.now()}-${taskId.slice(0, 8)}.wav`;
      const wavFilePath = path.join(this.musicExportsDir, filename);
      let audioUrl = "";
      try {
        fs.writeFileSync(wavFilePath, Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength));
        audioUrl = `echo-media://${wavFilePath}`;
        onLog?.({ text: `▸ Exported WAV saved to: ${wavFilePath}`, stream: 'system' });
      } catch (writeErr) {
        console.warn('[MusicEngineService] Could not write export file, falling back to data URI:', writeErr);
        audioUrl = wavToDataUri(wav);
      }

      // 7. Compute waveform peaks and duration
      const waveform = computeWaveformPeaks(audio.pcm, audio.bitsPerSample, audio.channels, 64);
      const durationMs = stats?.audioDurationMs || Math.round((audio.pcm.byteLength / (audio.bitsPerSample / 8) / audio.channels / audio.sampleRate) * 1000);

      // 8. Extract rendered metadata
      const renderedMetadata = (stats as any)?.metadata;

      const output: MusicGenerationOutput = {
        id: `music_gen_${Date.now()}`,
        taskId,
        caption: renderedMetadata?.caption || caption,
        lyrics: renderedMetadata?.lyrics || options.lyrics,
        audioUrl,
        wavFilePath,
        durationMs,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
        bitsPerSample: audio.bitsPerSample,
        waveform,
        bpm: renderedMetadata?.bpm ?? options.bpm,
        keyscale: renderedMetadata?.keyscale ?? options.keyscale,
        timesignature: renderedMetadata?.beatsPerBar ? `${renderedMetadata.beatsPerBar}/4` : options.timesignature,
        vocalLanguage: renderedMetadata?.vocalLanguage ?? options.vocalLanguage,
        isInstrumental: options.isInstrumental ?? (runParams.lyrics === '[Instrumental]'),
        seed: renderedMetadata?.seed ?? options.seed,
        taskType: options.taskType || 'text2music',
        lrc: (stats as any)?.lrc,
        lyricsScore: (stats as any)?.lyricsScore,
        qualityScore: (stats as any)?.qualityScore,
        qualityReport: renderedMetadata?.qualityReport,
        stats,
        metadata: renderedMetadata,
        createdAt: new Date().toISOString(),
      };

      this.logger.logSuccess(taskId, output);
      onLog?.({ text: `▸ Music generation finished successfully (${(durationMs / 1000).toFixed(1)}s)`, stream: 'system' });
      return { success: true, data: output };
    } catch (err: any) {
      this.activeRequestIds.delete(taskId);
      if (err instanceof qvacSdk.InferenceCancelledError || isCancelled?.()) {
        console.warn(`[MusicEngineService] Generation cancelled for task ${taskId}`);
        this.logger.logMilestone(taskId, 'CANCELLED', 'Generation was cancelled by user');
        onLog?.({ text: `▸ Music generation cancelled.`, stream: 'stderr' });
        return { success: false, error: 'Generation was cancelled.' };
      }

      const paths = (options.engine === 'minimax')
        ? this.resolveMiniMaxModelPaths(options.lmModelSrc, options.synthModelSrc)
        : { ditModelSrc: this.resolveDitModelSrc(options.ditVariant) };

      this.logger.logFailure({
        taskId,
        engine: options.engine || 'acestep',
        stage: 'INFERENCE_RUN',
        error: err,
        options,
        resolvedPaths: paths,
      });

      console.error(`[MusicEngineService] ✖ Music Generation FAILED for task ${taskId}:`, {
        error: err?.message || String(err),
        code: err?.code,
        stack: err?.stack,
        cause: err?.cause,
        options: {
          engine: options.engine || 'acestep',
          caption: options.caption,
          lyrics: options.lyrics ? `${options.lyrics.slice(0, 80)}...` : undefined,
          duration: options.duration,
          ditVariant: options.ditVariant,
        },
      });
      onLog?.({
        text: `✖ Generation Failed: ${err?.message || String(err)}${err?.stack ? `\n${err.stack}` : ''}`,
        stream: 'stderr',
      });
      return {
        success: false,
        error: err?.message || 'Music generation failed.',
        errorDetails: {
          code: err?.code,
          stage: 'INFERENCE_RUN',
          engine: options.engine || 'acestep',
          stack: err?.stack,
          cause: err?.cause,
        },
      };
    }
  }

  /**
   * Edits an existing recording using ACE-Step Flow-Edit or Repaint operations
   */
  public async edit(
    options: MusicEditOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void,
    isCancelled?: () => boolean
  ): Promise<MusicGenerateResult> {
    const { taskId, sourceAudio, operations } = options;
    if (!sourceAudio) {
      return { success: false, error: 'sourceAudio is required for editing.' };
    }
    if (!operations || operations.length === 0) {
      return { success: false, error: 'At least one edit operation is required.' };
    }

    try {
      onLog?.({ text: `▸ Starting Audio Edit with ${operations.length} operation(s)...`, stream: 'system' });

      // Flow-Edit requires turbo DiT variant
      const modelId = await this.ensureModelLoaded({ engine: 'acestep', ditVariant: 'turbo-q4', useGPU: options.useGPU }, onProgress);

      const runParams: any = {
        modelId,
        sourceAudio,
        operations,
        ...(options.seed !== undefined && { seed: options.seed }),
        ...(options.referenceAudio && { referenceAudio: options.referenceAudio }),
        ...(options.vocalLanguage && { vocalLanguage: options.vocalLanguage }),
        ...(options.bpm !== undefined && { bpm: options.bpm }),
        ...(options.keyscale && { keyscale: options.keyscale }),
        ...(options.timesignature && { timesignature: options.timesignature }),
        ...(options.augmentCaptionWithMetadata && { augmentCaptionWithMetadata: true }),
        ...(options.dcwEnabled !== undefined && { dcwEnabled: options.dcwEnabled }),
        ...(options.dcwScaler !== undefined && { dcwScaler: options.dcwScaler }),
        ...(options.dcwHighScaler !== undefined && { dcwHighScaler: options.dcwHighScaler }),
        ...(options.inferenceSteps !== undefined && { inferenceSteps: options.inferenceSteps }),
        ...(options.shift !== undefined && { shift: options.shift }),
      };

      const run = qvacSdk.audioEdit(runParams);
      this.activeRequestIds.set(taskId, run.requestId);

      (async () => {
        try {
          for await (const progress of run.progressStream) {
            if (isCancelled?.()) break;
            const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;
            onProgress?.({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: `${progress.stage}: ${progress.step}/${progress.total}`,
            });
          }
        } catch { }
      })();

      const [audio, stats] = await Promise.all([run.audio, run.stats]);
      this.activeRequestIds.delete(taskId);

      const { masteredPcm } = MusicDspService.getInstance().masterPcm(
        audio.pcm,
        audio.sampleRate,
        audio.channels,
        audio.bitsPerSample
      );

      const wav = createWav(masteredPcm, audio.sampleRate, audio.channels, audio.bitsPerSample);

      const filename = `music-edit-${Date.now()}-${taskId.slice(0, 8)}.wav`;
      const wavFilePath = path.join(this.musicExportsDir, filename);
      let audioUrl = "";
      try {
        fs.writeFileSync(wavFilePath, Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength));
        audioUrl = `echo-media://${wavFilePath}`;
      } catch {
        audioUrl = wavToDataUri(wav);
      }

      const waveform = computeWaveformPeaks(audio.pcm, audio.bitsPerSample, audio.channels, 64);
      const durationMs = stats?.audioDurationMs || Math.round((audio.pcm.byteLength / (audio.bitsPerSample / 8) / audio.channels / audio.sampleRate) * 1000);

      const output: MusicGenerationOutput = {
        id: `music_edit_${Date.now()}`,
        taskId,
        caption: `Edit (${operations.map((op) => op.type).join(' + ')})`,
        audioUrl,
        wavFilePath,
        durationMs,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
        bitsPerSample: audio.bitsPerSample,
        waveform,
        stats,
        createdAt: new Date().toISOString(),
      };

      return { success: true, data: output };
    } catch (err: any) {
      this.activeRequestIds.delete(taskId);
      if (err instanceof qvacSdk.InferenceCancelledError || isCancelled?.()) {
        return { success: false, error: 'Edit was cancelled.' };
      }
      return { success: false, error: err?.message || 'Audio edit failed.' };
    }
  }

  /**
   * Describes an existing recording using ACE-Step reverse analysis pipeline
   */
  public async understand(
    options: MusicUnderstandOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void
  ): Promise<{ success: boolean; data?: MusicUnderstandResult; error?: string }> {
    const { taskId, sourceAudio, vocalLanguage, seed } = options;
    if (!sourceAudio) {
      return { success: false, error: 'sourceAudio is required for audio understand.' };
    }

    try {
      onLog?.({ text: `▸ Analyzing audio recording with ACE-Step AudioUnderstand...`, stream: 'system' });

      const modelId = await this.ensureModelLoaded({ engine: 'acestep', ditVariant: 'turbo-q4' }, onProgress);

      const runParams: any = {
        modelId,
        sourceAudio,
        ...(vocalLanguage && { vocalLanguage }),
        ...(seed !== undefined && { seed }),
        ...(options.lmTemperature !== undefined && { lmTemperature: options.lmTemperature }),
        ...(options.lmTopP !== undefined && { lmTopP: options.lmTopP }),
        ...(options.lmTopK !== undefined && { lmTopK: options.lmTopK }),
      };

      const run = qvacSdk.audioUnderstand(runParams);
      this.activeRequestIds.set(taskId, run.requestId);

      (async () => {
        try {
          for await (const progress of run.progressStream) {
            const pct = progress.total > 0 ? Math.round((progress.step / progress.total) * 100) : 0;
            onProgress?.({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: `${progress.stage}: ${progress.step}/${progress.total}`,
            });
          }
        } catch { }
      })();

      const description = await run.description;
      this.activeRequestIds.delete(taskId);

      onLog?.({ text: `▸ Analysis complete! Detected: ${description.bpm} BPM, ${description.keyscale}, ${description.timesignature}`, stream: 'system' });

      return {
        success: true,
        data: {
          caption: description.caption,
          bpm: description.bpm,
          keyscale: description.keyscale,
          timesignature: description.timesignature,
          vocalLanguage: description.vocalLanguage,
          duration: description.duration,
          audioCodes: Array.from(description.audioCodes || []),
          seed: description.seed,
        },
      };
    } catch (err: any) {
      this.activeRequestIds.delete(taskId);
      return { success: false, error: err?.message || 'Audio analysis failed.' };
    }
  }

  /**
   * Hard-cancels an in-flight QVAC generation or edit task
   */
  public cancel(taskId: string): boolean {
    const requestId = this.activeRequestIds.get(taskId);
    if (requestId) {
      try {
        qvacSdk.cancel({ requestId });
        this.activeRequestIds.delete(taskId);
        return true;
      } catch (e) {
        console.warn(`[MusicEngineService] Failed to cancel request ${requestId}:`, e);
      }
    }
    return false;
  }

  /**
   * Checks current model download and load status for UI indicators
   */
  public getStatus(): MusicModelStatusResult {
    const models: MusicModelItem[] = [
      {
        id: 'audiogen-qwen3-embedding',
        name: 'Qwen3 Embedding Text Encoder (0.6B Q8_0)',
        descriptorName: 'AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0',
        sizeBytes: 784144960,
        sizeFormatted: '784 MB',
        stage: 'text-encoder',
        downloaded: false,
        status: 'idle',
      },
      {
        id: 'audiogen-acestep-5hz-lm',
        name: 'ACE-Step 5Hz Language Model (0.6B Q8_0)',
        descriptorName: 'AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0',
        sizeBytes: 709846656,
        sizeFormatted: '710 MB',
        stage: 'lm',
        downloaded: false,
        status: 'idle',
      },
      {
        id: 'audiogen-acestep-turbo-dit',
        name: 'ACE-Step v1.5 Turbo DiT (Q4_K_M)',
        descriptorName: 'AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M',
        sizeBytes: 1445710272,
        sizeFormatted: '1.45 GB',
        stage: 'dit',
        downloaded: false,
        status: 'idle',
      },
      {
        id: 'audiogen-vae-bf16',
        name: 'ACE-Step Audio VAE (BF16)',
        descriptorName: 'AUDIOGEN_VAE_BF16',
        sizeBytes: 337420928,
        sizeFormatted: '337 MB',
        stage: 'vae',
        downloaded: false,
        status: 'idle',
      },
    ];

    return {
      ready: !!this.activeModelId,
      activeModelId: this.activeModelId,
      engine: this.activeEngine || 'acestep',
      models,
      gpuAvailable: true,
    };
  }

  /**
   * Unloads active model to free GPU memory
   */
  public async unload(): Promise<boolean> {
    if (this.activeModelId) {
      try {
        await qvacSdk.unloadModel({ modelId: this.activeModelId });
        this.activeModelId = undefined;
        this.activeEngine = undefined;
        this.activeDitVariant = undefined;
        return true;
      } catch (err) {
        console.warn('[MusicEngineService] Error unloading model:', err);
      }
    }
    return false;
  }

  /**
   * Retrieves recent music generation logs
   */
  public getRecentLogs(limitLines?: number): string {
    return this.logger.getRecentLogs(limitLines);
  }

  /**
   * Clears generation log files
   */
  public clearLogs(): boolean {
    return this.logger.clearLogs();
  }
}
