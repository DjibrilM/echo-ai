import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { app } from "electron";
import * as qvacSdk from "@qvac/sdk";

import type {
  VoiceModelInfo,
  VoiceModelStatusResult,
  ModelDownloadProgressPayload,
  TtsGenerateOptions,
  TtsGenerateResult,
  TtsGenerationOutput,
  TtsProgressCallback,
  TtsLogCallback,
} from "../interfaces";

type LoadedTtsModel = {
  modelId: string;
  key: string;
};

function pcmToWavDataUri(samples: number[], sampleRate: number): string {
  sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.round(sampleRate) : 24000;
  const numSamples = samples.length;
  const headerSize = 44;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(headerSize + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // QVAC returns signed 16-bit PCM values in number[] form. Do not infer
  // float PCM from a small peak: quiet int16 audio can also peak below 1.
  for (let i = 0; i < numSamples; i++) {
    const sample = Number.isFinite(samples[i]) ? Math.round(samples[i]) : 0;
    const value = Math.max(-32768, Math.min(32767, sample));
    buffer.writeInt16LE(value, headerSize + i * 2);
  }
  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}

function computePeaks(samples: number[], count: number): number[] {
  count = Math.max(1, Math.floor(count));
  if (samples.length === 0) return Array(count).fill(4);
  const peaks: number[] = [];
  const chunk = Math.max(1, Math.floor(samples.length / count));
  for (let i = 0; i < count; i++) {
    let max = 0;
    const start = i * chunk;
    const end = Math.min(samples.length, start + chunk);
    for (
      let j = start;
      j < end;
      j += Math.max(1, Math.floor((end - start) / 40))
    ) {
      const a = Math.abs(samples[j] / 32768);
      if (a > max) max = a;
    }
    peaks.push(Math.max(4, Math.min(98, Math.round(max * 100))));
  }
  return peaks;
}

/**
 * Writes raw PCM samples to a playable WAV file under assets/testing-voice-output.
 * Used for diagnostic inspection of QVAC's raw output before WAV encoding.
 */
function savePcmAsWavFile(
  samples: number[],
  sampleRate: number,
  label: string,
): string {
  sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.round(sampleRate) : 24000;
  const numSamples = samples.length;
  const headerSize = 44;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(headerSize + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Preserve QVAC's signed 16-bit PCM samples exactly (apart from clamping).
  for (let i = 0; i < numSamples; i++) {
    const sample = Number.isFinite(samples[i]) ? Math.round(samples[i]) : 0;
    const value = Math.max(-32768, Math.min(32767, sample));
    buffer.writeInt16LE(value, headerSize + i * 2);
  }
  const maxAbs = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);

  const dir = path.resolve(process.cwd(), "assets/testing-voice-output");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${label}-${Date.now()}.wav`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(
    `[TTS Debug] Saved PCM to ${filePath} (${numSamples} samples @ ${sampleRate}Hz, maxAbs=${maxAbs.toFixed(4)})`,
  );
  return filePath;
}

interface TextOrPauseSegment {
  type: "speech" | "pause";
  text?: string;
  pauseSec?: number;
}

function parseTextAndPauses(rawText: string): TextOrPauseSegment[] {
  const PAUSE_REGEX = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi;
  const segments: TextOrPauseSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PAUSE_REGEX.exec(rawText)) !== null) {
    const textBefore = rawText.slice(lastIndex, match.index).trim();
    if (textBefore) segments.push({ type: "speech", text: textBefore });
    const pauseSec = parseFloat(match[1]);
    if (Number.isFinite(pauseSec) && pauseSec > 0)
      segments.push({ type: "pause", pauseSec: Math.min(pauseSec, 30) });
    lastIndex = match.index + match[0].length;
  }

  const textAfter = rawText.slice(lastIndex).trim();
  if (textAfter) segments.push({ type: "speech", text: textAfter });
  return segments;
}

export class VoiceEngineService {
  private cacheDir: string;
  private stateFilePath: string;
  private downloadedModelIds: Set<string> = new Set();
  private activeDownloads: Map<string, { cancel: () => void }> = new Map();
  private loadedModel: LoadedTtsModel | null = null;
  private activeTtsRequestIds: Map<string, string> = new Map();

  // Definition of CosyVoice 3 and Parler-TTS neural models
  private modelDefinitions: Omit<VoiceModelInfo, "downloaded" | "status">[] = [
    {
      id: "parler-mini-v1-q8_0",
      name: "Parler-TTS Mini V1 (880M, Q8_0)",
      descriptorName: "TTS_MINI_V1_EN_PARLER_TTS_Q8_0",
      sizeBytes: 1162597856,
      sizeFormatted: "1.16 GB",
      description:
        "Description-conditioned neural speech transformer with 12 expressive emotions and natural prosody (fast on all hardware).",
      category: "backbone",
      engine: "parler",
      required: false,
    },
    {
      id: "cosyvoice3-llm-q8_0",
      name: "CosyVoice 3 Neural Speech Backbone (0.5B, Q8_0)",
      descriptorName: "TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0",
      sizeBytes: 973496000,
      sizeFormatted: "973 MB",
      description:
        "Zero-shot neural speech generator with instruct conditioning for voice design & cloning (optimized for Apple Silicon / M-series).",
      category: "backbone",
      engine: "cosyvoice3",
      required: false,
    },
    {
      id: "lavasr-enhancer",
      name: "Lava-SR 48kHz Neural Enhancer (FP16)",
      descriptorName: "TTS_ENHANCER_LAVASR_FP16",
      sizeBytes: 28051008,
      sizeFormatted: "28 MB",
      description:
        "Deep spectral bandwidth upsampler and harmonic clarity enhancer for studio-grade 48kHz ultra-HD audio.",
      category: "enhancer",
      engine: "shared",
      required: false,
    },
    {
      id: "cosyvoice3-s3tok-fp16",
      name: "CosyVoice 3 S3Tok Speech Tokenizer (FP16)",
      descriptorName: "TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16",
      sizeBytes: 496605536,
      sizeFormatted: "496 MB",
      description:
        "Neural speech tokenizer required for high-fidelity instant voice cloning in CosyVoice 3.",
      category: "vocoder",
      engine: "cosyvoice3",
      required: false,
    },
    {
      id: "cosyvoice3-campplus-fp32",
      name: "CosyVoice 3 CAM++ Speaker Encoder (FP32)",
      descriptorName: "TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32",
      sizeBytes: 27530656,
      sizeFormatted: "27 MB",
      description:
        "Deep acoustic timbre and speaker embedding extractor for voice cloning in CosyVoice 3.",
      category: "multilingual",
      engine: "cosyvoice3",
      required: false,
    },
  ];

  constructor() {
    this.cacheDir = path.join(os.homedir(), ".qvac", "models");
    const userData = app
      ? app.getPath("userData")
      : path.join(os.homedir(), ".echo-ai");
    if (!fs.existsSync(userData)) {
      try {
        fs.mkdirSync(userData, { recursive: true });
      } catch {}
    }
    this.stateFilePath = path.join(userData, "voice_engine_state.json");
    this.loadState();
  }

  /**
   * Load persisted downloaded model status and discover cached weights
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.downloadedModelIds)) {
          this.downloadedModelIds = new Set(data.downloadedModelIds);
        }
      }
    } catch (e) {
      console.warn("[VoiceEngineService] Could not load state file:", e);
    }

    // Check physical model files in QVAC cache
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.includes("parler-mini") || file.includes("parler")) {
            this.downloadedModelIds.add("parler-mini-v1-q8_0");
          }
          if (file.includes("cosyvoice3-llm") || file.includes("cosy_voice")) {
            this.downloadedModelIds.add("cosyvoice3-llm-q8_0");
          }
          if (file.includes("lavasr") || file.includes("enhancer")) {
            this.downloadedModelIds.add("lavasr-enhancer");
          }
          if (file.includes("cosyvoice3-s3tok")) {
            this.downloadedModelIds.add("cosyvoice3-s3tok-fp16");
          }
          if (file.includes("cosyvoice3-campplus")) {
            this.downloadedModelIds.add("cosyvoice3-campplus-fp32");
          }
        }

        // Check companion sets layout
        const setsDir = path.join(this.cacheDir, "sets");
        if (fs.existsSync(setsDir)) {
          const setDirs = fs.readdirSync(setsDir);
          for (const sd of setDirs) {
            const setPath = path.join(setsDir, sd);
            try {
              if (fs.existsSync(setPath)) {
                const setFiles = fs.readdirSync(setPath);
                if (setFiles.some((f) => f.includes("parler-mini") || f.includes("parler"))) {
                  this.downloadedModelIds.add("parler-mini-v1-q8_0");
                }
                if (setFiles.some((f) => f.includes("cosyvoice3-llm"))) {
                  this.downloadedModelIds.add("cosyvoice3-llm-q8_0");
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  /**
   * Persist state to disk
   */
  private saveState(): void {
    try {
      const data = {
        downloadedModelIds: Array.from(this.downloadedModelIds),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(data, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.warn("[VoiceEngineService] Could not save state file:", e);
    }
  }

  /**
   * Delete all installed models from disk and reset engine state
   */
  public async deleteAllModels(): Promise<boolean> {
    if (this.loadedModel) {
      try {
        await (qvacSdk as any).unloadModel?.({
          modelId: this.loadedModel.modelId,
        });
      } catch {}
      this.loadedModel = null;
    }

    this.downloadedModelIds.clear();
    this.saveState();

    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          const fullPath = path.join(this.cacheDir, file);
          try {
            const st = fs.statSync(fullPath);
            if (st.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fullPath);
            }
          } catch {}
        }
      }
    } catch {}

    return true;
  }

  /**
   * Get complete status of all voice engine models
   */
  public getStatus(selectedEngine?: "cosyvoice3" | "parler"): VoiceModelStatusResult {
    const models: VoiceModelInfo[] = this.modelDefinitions.map((def) => {
      const isDownloaded = this.downloadedModelIds.has(def.id);
      const isDownloading = this.activeDownloads.has(def.id);
      const isRequired = selectedEngine
        ? def.category === "backbone" && def.engine === selectedEngine
        : def.category === "backbone";

      return {
        ...def,
        required: isRequired,
        downloaded: isDownloaded,
        status: isDownloading ? "downloading" : isDownloaded ? "ready" : "idle",
      };
    });

    const hasReadyBackbone = selectedEngine
      ? this.downloadedModelIds.has(
          selectedEngine === "parler" ? "parler-mini-v1-q8_0" : "cosyvoice3-llm-q8_0",
        )
      : this.downloadedModelIds.has("parler-mini-v1-q8_0") ||
        this.downloadedModelIds.has("cosyvoice3-llm-q8_0");

    return {
      ready: hasReadyBackbone,
      allRequiredDownloaded: hasReadyBackbone,
      models,
      cacheDirectory: this.cacheDir,
    };
  }

  /**
   * Download a single model with live progress updates
   */
  public async downloadModel(
    modelId: string,
    onProgress?: (p: ModelDownloadProgressPayload) => void,
  ): Promise<{ success: boolean; modelId: string; error?: string }> {
    const def = this.modelDefinitions.find((m) => m.id === modelId);
    if (!def) {
      return { success: false, modelId, error: `Unknown model ID: ${modelId}` };
    }

    if (this.downloadedModelIds.has(modelId)) {
      onProgress?.({
        modelId,
        percentage: 100,
        downloaded: def.sizeBytes,
        total: def.sizeBytes,
        speed: "Ready",
      });
      return { success: true, modelId };
    }

    let isCancelled = false;
    let lastPct = 0;
    this.activeDownloads.set(modelId, {
      cancel: () => {
        isCancelled = true;
      },
    });

    try {
      const sdk: any = qvacSdk as any;
      const sdkDescriptor: any = sdk[def.descriptorName] || null;

      if (!sdkDescriptor || typeof qvacSdk.downloadAsset !== "function") {
        return {
          success: false,
          modelId,
          error: `No asset descriptor found for ${modelId}`,
        };
      }

      const downloadPromise = qvacSdk.downloadAsset({
        assetSrc: sdkDescriptor,
        onProgress: (p: any) => {
          if (isCancelled) return;
          const pct = Math.min(100, Math.round(p.percentage || 0));
          // Ignore backwards progress (QVAC may send non-monotonic percentages
          // for multi-file model sets or post-processing events)
          if (pct < lastPct) return;
          lastPct = pct;
          const dl = p.downloaded || Math.round((pct / 100) * def.sizeBytes);
          const tot = p.total || def.sizeBytes;
          const speed = p.speed || "Downloading...";
          onProgress?.({
            modelId,
            percentage: pct,
            downloaded: dl,
            total: tot,
            speed,
          });
        },
      });

      if (downloadPromise && downloadPromise.requestId) {
        this.activeDownloads.set(modelId, {
          cancel: () => {
            isCancelled = true;
            try {
              if (typeof (qvacSdk as any).cancel === "function") {
                (qvacSdk as any).cancel({
                  requestId: downloadPromise.requestId,
                });
              }
            } catch {}
          },
        });
      }

      await downloadPromise;

      if (isCancelled) {
        return { success: false, modelId, error: "Download cancelled" };
      }

      this.downloadedModelIds.add(modelId);
      this.saveState();

      onProgress?.({
        modelId,
        percentage: 100,
        downloaded: def.sizeBytes,
        total: def.sizeBytes,
        speed: "Completed",
      });

      return { success: true, modelId };
    } catch (err) {
      console.error(`[VoiceEngineService] Download error for ${modelId}:`, err);
      return { success: false, modelId, error: String(err) };
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }

  /**
   * Cancel an active model download
   */
  public cancelDownload(modelId: string): boolean {
    const active = this.activeDownloads.get(modelId);
    if (active) {
      active.cancel();
      this.activeDownloads.delete(modelId);
      return true;
    }
    return false;
  }

  /**
   * Mark all required models as downloaded for fast setup
   */
  public markAllAsReady(): void {
    for (const def of this.modelDefinitions) {
      if (def.required) {
        this.downloadedModelIds.add(def.id);
      }
    }
    this.saveState();
  }

  /**
   * Ensures the requested engine (CosyVoice 3 or Parler-TTS) is loaded with configuration.
   */
  private async ensureModelLoaded(opts: {
    engine?: "cosyvoice3" | "parler";
    language?: string;
    lavaSrEnabled?: boolean;
    instruct?: string;
    emotion?: string;
    pace?: string;
    taskId: string;
    onProgress?: TtsProgressCallback;
    onLog?: TtsLogCallback;
  }): Promise<{ modelId: string; engine: "cosyvoice3" | "parler" }> {
    const engine: "cosyvoice3" | "parler" = opts.engine || "cosyvoice3";
    const lavaSr = opts.lavaSrEnabled !== false;
    const lavasrSrc = (qvacSdk as any).TTS_ENHANCER_LAVASR_FP16;

    if (engine === "parler") {
      const parlerDescriptor =
        (qvacSdk as any).TTS_MINI_V1_EN_PARLER_TTS_Q8_0 ||
        (qvacSdk as any).TTS_MINI_V1_EN_PARLER_TTS_FP16;

      if (!parlerDescriptor) {
        throw new Error("QVAC Parler-TTS descriptor missing from SDK");
      }

      const key = `parler|${process.arch === "arm64" ? "metal" : "cpu"}|native44k`;

      if (this.loadedModel && this.loadedModel.key === key) {
        return { modelId: this.loadedModel.modelId, engine: "parler" };
      }

      if (this.loadedModel) {
        try {
          await (qvacSdk as any).unloadModel?.({
            modelId: this.loadedModel.modelId,
          });
        } catch {}
        this.loadedModel = null;
      }

      opts.onLog?.({
        text: `[Echo Voice Engine] Loading Parler-TTS Mini V1 (880M Q8_0, 44.1kHz native${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout",
      });

      // Parler natively outputs 44.1kHz high-fidelity speech. LavaSR is a 24k->48k upsampler
      // meant for CosyVoice 3 and must NOT be attached to 44.1kHz Parler streams.
      // Conditioning options (description or template fields like emotion/pace) are passed
      // per-call to textToSpeech(), preventing mutual exclusion conflicts during load.
      const baseConfig: any = {
        ttsEngine: "parler",
        useGPU: process.arch === "arm64",
        seed: 42,
      };

      const modelId = await (qvacSdk as any).loadModel({
        modelSrc: parlerDescriptor,
        modelType: "tts",
        modelConfig: baseConfig,
        onProgress: (p: any) => {
          const pct = Math.round(p?.percentage ?? 0);
          opts.onProgress?.({
            taskId: opts.taskId,
            progress: Math.min(40, Math.round(pct * 0.4)),
            message: `Loading Parler-TTS weights ${pct}%...`,
            phase: "loading",
          });
        },
      });

      this.loadedModel = { modelId, key };
      return { modelId, engine: "parler" };
    } else {
      // CosyVoice 3
      const cosyvoiceDescriptor =
        (qvacSdk as any).TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 ||
        (qvacSdk as any).TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;

      if (!cosyvoiceDescriptor) {
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      }

      const instructPrompt = opts.instruct?.trim() || "";
      const rawEmotion = opts.emotion?.toLowerCase() || "";
      const validEmotions = ["anger", "happy", "neutral", "sad"];
      const emotion = validEmotions.includes(rawEmotion)
        ? rawEmotion
        : undefined;

      const key = [
        "cosyvoice3",
        "baseline",
        instructPrompt || "none",
        emotion || "none",
        lavaSr ? "lavasr48k" : "native24k",
      ].join("|");

      if (this.loadedModel && this.loadedModel.key === key) {
        return { modelId: this.loadedModel.modelId, engine: "cosyvoice3" };
      }

      if (this.loadedModel) {
        try {
          await (qvacSdk as any).unloadModel?.({
            modelId: this.loadedModel.modelId,
          });
        } catch {}
        this.loadedModel = null;
      }

      opts.onLog?.({
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0${lavaSr ? " +LavaSR 48kHz" : ""}${instructPrompt ? ` instruct="${instructPrompt.slice(0, 45)}..."` : ""})...`,
        stream: "stdout",
      });

      const baseConfig: any = {
        ttsEngine: "cosyvoice3",
        useGPU: true,
        seed: 42,
        ...(lavaSr && lavasrSrc?.src
          ? { lavasrEnhancerModelSrc: lavasrSrc.src }
          : {}),
        ...(instructPrompt ? { instruct: instructPrompt } : {}),
        ...(emotion && !instructPrompt ? { emotion } : {}),
      };

      const modelId = await (qvacSdk as any).loadModel({
        modelSrc: cosyvoiceDescriptor,
        modelType: "tts",
        modelConfig: baseConfig,
        onProgress: (p: any) => {
          const pct = Math.round(p?.percentage ?? 0);
          opts.onProgress?.({
            taskId: opts.taskId,
            progress: Math.min(40, Math.round(pct * 0.4)),
            message: `Loading CosyVoice 3 weights ${pct}%...`,
            phase: "loading",
          });
        },
      });

      this.loadedModel = { modelId, key };
      return { modelId, engine: "cosyvoice3" };
    }
  }

  public cancelSynthesis(taskId: string): void {
    const reqId = this.activeTtsRequestIds.get(taskId);
    if (reqId) {
      try {
        void (qvacSdk as any).cancel?.({ requestId: reqId });
      } catch {}
      this.activeTtsRequestIds.delete(taskId);
    }
  }

  /**
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Parler-TTS)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  public async synthesize(
    options: TtsGenerateOptions,
    onProgress?: TtsProgressCallback,
    onLog?: TtsLogCallback,
    isCancelled?: () => boolean,
  ): Promise<TtsGenerateResult> {
    const { taskId, rounds } = options;
    const activeEngine: "cosyvoice3" | "parler" = options.engine || "cosyvoice3";
    const activeRounds = rounds.filter((r) => r.text.trim().length > 0);
    if (activeRounds.length === 0) {
      return { success: false, error: "No active speech rounds to synthesize" };
    }

    const firstRound = activeRounds[0];
    const speakerName = options.speakerName || "Selected Speaker";
    onLog?.({
      text: `[Echo Voice Engine] Synthesis task ${taskId} engine="${activeEngine}" voice="${speakerName}" turns=${activeRounds.length}...`,
      stream: "system",
    });

    try {
      if (isCancelled?.()) return { success: false, error: "Cancelled" };
      onProgress?.({
        taskId,
        progress: 8,
        message: `Loading ${activeEngine === "parler" ? "Parler-TTS" : "CosyVoice 3"} Engine...`,
        phase: "loading",
      });

      const lavaSrEnabled = options.lavaSrEnabled !== false;
      const voicePrompt =
        options.voicePrompt ||
        options.prompt ||
        options.description ||
        firstRound.prompt ||
        firstRound.description;

      const rawEmotion = firstRound.emotion?.toLowerCase() || "";
      const validEmotions = [
        "command", "anger", "narration", "conversation", "disgust",
        "fear", "happy", "neutral", "proper noun", "news", "sad", "surprise"
      ];
      const detectedEmotion = validEmotions.includes(rawEmotion)
        ? rawEmotion
        : undefined;

      const { modelId, engine } = await this.ensureModelLoaded({
        engine: activeEngine,
        language: options.language || "en",
        lavaSrEnabled,
        instruct: voicePrompt || undefined,
        emotion: detectedEmotion,
        pace: firstRound.pace?.toLowerCase(),
        taskId,
        onProgress,
        onLog,
      });

      if (isCancelled?.()) return { success: false, error: "Cancelled" };

      const allSamples: number[] = [];
      let sampleRate = engine === "parler" ? 44100 : lavaSrEnabled ? 48000 : 24000;

      for (let i = 0; i < activeRounds.length; i++) {
        if (isCancelled?.()) {
          const reqId = this.activeTtsRequestIds.get(taskId);
          if (reqId) {
            try {
              await (qvacSdk as any).cancel?.({ requestId: reqId });
            } catch {}
          }
          return { success: false, error: "Cancelled" };
        }

        const round = activeRounds[i];
        onProgress?.({
          taskId,
          progress: 40 + Math.round((i / activeRounds.length) * 50),
          message: `Synthesizing turn ${i + 1}/${activeRounds.length}...`,
          phase: "synthesis",
        });

        // Inter-turn natural spacing
        if (i > 0) {
          const interTurnPause = Math.floor(sampleRate * 0.25);
          for (let p = 0; p < interTurnPause; p++) allSamples.push(0);
        }

        // Parse explicit [pause X.Xs] cues into real acoustic silence
        const segments = parseTextAndPauses(round.text);
        for (const seg of segments) {
          if (isCancelled?.()) {
            const reqId = this.activeTtsRequestIds.get(taskId);
            if (reqId) {
              try {
                await (qvacSdk as any).cancel?.({ requestId: reqId });
              } catch {}
            }
            return { success: false, error: "Cancelled" };
          }

          if (seg.type === "pause" && seg.pauseSec) {
            const pauseSamples = Math.floor(sampleRate * seg.pauseSec);
            for (let p = 0; p < pauseSamples; p++) allSamples.push(0);
            continue;
          }

          if (seg.type === "speech" && seg.text) {
            const ttsPayload: any = {
              modelId,
              text: seg.text,
              inputType: "text",
              stream: false,
            };

            if (engine === "parler") {
              const userPrompt = (
                round.prompt ||
                round.description ||
                voicePrompt ||
                ""
              ).trim();

              const roundEmotion = (round.emotion?.toLowerCase() || detectedEmotion || "conversation").trim();
              const validParlerEmotions = [
                "command", "anger", "narration", "conversation", "disgust",
                "fear", "happy", "neutral", "proper noun", "news", "sad", "surprise"
              ];
              const parlerEmotion = validParlerEmotions.includes(roundEmotion) ? roundEmotion : "conversation";

              const roundPace = (round.pace?.toLowerCase() || "").trim();
              const validPaces = ["slow", "moderate", "fast"];
              const parlerPace = validPaces.includes(roundPace) ? roundPace : "moderate";

              if (userPrompt) {
                // Parler-TTS is cross-attention conditioned and performs best with concise, lightweight scene descriptions
                // (e.g. "A woman in a podcast environment" or "A deep-voiced man in a podcast studio")
                // without artificial prompt bloat or keyword stacking.
                ttsPayload.description = userPrompt;
              } else {
                // Natural, lightweight fallback when no custom prompt is given
                const emotionHint =
                  parlerEmotion && parlerEmotion !== "neutral" && parlerEmotion !== "conversation"
                    ? ` in a ${parlerEmotion} tone`
                    : "";
                const paceHint = parlerPace && parlerPace !== "moderate" ? ` at a ${parlerPace} pace` : "";
                ttsPayload.description = `A speaker in a podcast environment${emotionHint}${paceHint}.`;
              }
            }

            const result: any = (qvacSdk as any).textToSpeech(ttsPayload);

            if (result?.requestId)
              this.activeTtsRequestIds.set(taskId, result.requestId);
            const pcm: number[] = (await result.buffer) ?? [];
            const done = await result.done;
            const srValue = await result.sampleRate;
            const sr = typeof srValue === "number" && srValue > 0
              ? srValue
              : engine === "parler"
                ? 44100
                : sampleRate;
            sampleRate = sr;
            this.activeTtsRequestIds.delete(taskId);

            // Debug: log raw PCM stats to diagnose noise issues
            if (pcm.length > 0) {
              let maxAbs = 0;
              let minVal = Infinity;
              let maxVal = -Infinity;
              for (const sample of pcm) {
                const value = Number.isFinite(sample) ? sample : 0;
                maxAbs = Math.max(maxAbs, Math.abs(value));
                minVal = Math.min(minVal, value);
                maxVal = Math.max(maxVal, value);
              }
              const allZero = pcm.every((s) => s === 0);
              const allSame = pcm.every((s) => s === pcm[0]);
              console.log(
                `[TTS Debug] PCM length=${pcm.length}, maxAbs=${maxAbs.toFixed(4)}, min=${minVal.toFixed(4)}, max=${maxVal.toFixed(4)}, allZero=${allZero}, allSame=${allSame}, sampleRate=${sr}`,
              );
            }

            // Save QVAC's raw output as a playable WAV file for inspection
            if (pcm.length > 0) {
              const safeLabel =
                seg.text?.replace(/[^a-z0-9]/gi, "_").slice(0, 40) ||
                `round-${i}`;
              savePcmAsWavFile(pcm, sr, `segment-${i}-${safeLabel}`);
            }

            if (!done || !pcm || pcm.length === 0) {
              throw new Error(
                `${engine === "parler" ? "Parler-TTS" : "CosyVoice 3"} returned no audio for turn ${i + 1}`,
              );
            }
            for (const s of pcm) allSamples.push(s);
          }
        }
      }

      if (isCancelled?.()) return { success: false, error: "Cancelled" };
      onProgress?.({
        taskId,
        progress: 95,
        message: `Finalizing ${sampleRate}Hz WAV & waveform...`,
        phase: "finalizing",
      });

      // Save the final combined output for inspection
      if (allSamples.length > 0) {
        savePcmAsWavFile(allSamples, sampleRate, "combined-output");
      }

      const audioUrl = pcmToWavDataUri(allSamples, sampleRate);
      const waveform = computePeaks(allSamples, 38);
      const duration = Math.round((allSamples.length / sampleRate) * 10) / 10;

      const fullSnippet = activeRounds[0].text.trim();
      const textSnippet =
        fullSnippet.length > 55
          ? `${fullSnippet.slice(0, 52)}...`
          : fullSnippet;

      const output: TtsGenerationOutput = {
        id: `gen-${taskId}`,
        roundIndex: options.historyIndex || 0,
        title: `Generation ${(options.historyIndex || 0) + 1}`,
        textSnippet,
        speakerName:
          activeRounds.length > 1
            ? `${activeRounds.length} Speakers`
            : engine === "parler"
              ? "Parler Persona"
              : options.speakerName || "Sterling Rhodes",
        speakerColor:
          activeRounds.length > 1
            ? "#10b981"
            : engine === "parler"
              ? "#a855f7"
              : options.speakerColor || "#38bdf8",
        speakerAvatarUrl:
          engine === "parler"
            ? "/voices/sterling.jpg"
            : options.speakerAvatarUrl || "/voices/sterling.jpg",
        duration,
        audioUrl,
        waveform,
        timestamp: "Just now",
        emotion: firstRound.emotion || "Neutral",
      };

      onProgress?.({
        taskId,
        progress: 100,
        message: "CosyVoice 3 synthesis complete",
        phase: "complete",
      });

      onLog?.({
        text: `[Echo Voice Engine] Synthesis complete (${duration}s @ ${sampleRate}Hz, ${allSamples.length} samples).`,
        stream: "stdout",
      });

      return { success: true, data: output };
    } catch (err: any) {
      this.activeTtsRequestIds.delete(taskId);
      const msg = err?.message ? String(err.message) : String(err);
      onLog?.({
        text: `[Echo Voice Engine] Synthesis failed: ${msg}`,
        stream: "stderr",
      });
      return { success: false, error: msg };
    }
  }
}
