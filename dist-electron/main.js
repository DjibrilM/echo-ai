var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import path from "node:path";
import fs from "node:fs";
import { app, shell, ipcMain, protocol, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import os from "node:os";
import * as qvacSdk from "@qvac/sdk";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const workerCandidatePaths = [
  path.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js"),
  path.resolve(process.cwd(), "node_modules/.pnpm/@qvac+sdk@0.22.0/node_modules/@qvac/sdk/dist/src/worker/index.js")
];
for (const p of workerCandidatePaths) {
  if (fs.existsSync(p)) {
    process.env.QVAC_WORKER_PATH = p;
    break;
  }
}
class SystemService {
  constructor() {
    __publicField(this, "prevCpuTimes", null);
  }
  /**
   * Calculate live CPU usage from os.cpus()
   */
  getCpuUsage() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type of Object.keys(cpu.times)) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    if (!this.prevCpuTimes) {
      this.prevCpuTimes = { idle, total };
      return 14;
    }
    const idleDelta = idle - this.prevCpuTimes.idle;
    const totalDelta = total - this.prevCpuTimes.total;
    this.prevCpuTimes = { idle, total };
    if (totalDelta <= 0) return 14;
    const usage = Math.round((totalDelta - idleDelta) / totalDelta * 100);
    return Math.max(1, Math.min(100, usage));
  }
  /**
   * Query full hardware telemetry (RAM, CPU, GPU)
   */
  getMetrics() {
    var _a;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const baseRam = usedMem / totalMem * 100;
    const memFluctuation = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2);
    const ramPercent = Math.max(5, Math.min(99, Math.round(baseRam + memFluctuation)));
    const rawCpu = this.getCpuUsage();
    const cpuVariation = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1));
    const cpuPercent = Math.max(3, Math.min(98, Math.round(rawCpu + cpuVariation)));
    let gpuPercent = 12;
    try {
      const metrics = app.getAppMetrics();
      const gpuMetric = metrics.find((m) => m.type === "GPU");
      if (gpuMetric) {
        gpuPercent = Math.min(100, Math.max(8, Math.round(gpuMetric.cpu.percentCPUUsage * 2 + 10)));
      } else {
        const gpuJitter = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
        gpuPercent = Math.max(6, Math.min(94, Math.round(cpuPercent * 0.7 + 8 + gpuJitter)));
      }
    } catch {
      gpuPercent = Math.max(6, Math.min(94, Math.round(cpuPercent * 0.7 + 8)));
    }
    const dynamicUsed = usedMem / (1024 * 1024 * 1024) + memFluctuation * 0.1;
    return {
      ram: {
        usedGB: dynamicUsed.toFixed(1),
        totalGB: (totalMem / (1024 * 1024 * 1024)).toFixed(1),
        percent: ramPercent
      },
      cpu: {
        percent: cpuPercent,
        cores: os.cpus().length,
        model: ((_a = os.cpus()[0]) == null ? void 0 : _a.model) || "Processor"
      },
      gpu: {
        percent: gpuPercent,
        name: process.platform === "darwin" ? "Apple Silicon GPU" : "GPU Compute"
      }
    };
  }
  /**
   * Ensure exports directory exists and reveal it in native file manager
   */
  async openExportsFolder() {
    try {
      const exportsDir = path.join(app.getPath("documents"), "Echo", "Exports");
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      await shell.openPath(exportsDir);
      return { success: true, path: exportsDir };
    } catch (error) {
      console.error("[SystemService] Failed to open exports directory:", error);
      return { success: false, error: String(error) };
    }
  }
}
class BaseController {
}
const IPC_CHANNELS = {
  // Voices domain (metadata & SQLite persistence)
  VOICES_SCAN: "voices:scan",
  VOICES_LOAD: "voices:load",
  VOICES_GET: "voices:get",
  VOICES_LIST_CUSTOM: "voices:list-custom",
  VOICES_SAVE_CUSTOM: "voices:save-custom",
  VOICES_DELETE_CUSTOM: "voices:delete-custom",
  // Voice generation & TTS domain (Echo Voice Engine & conversation persistence)
  TTS_GENERATE: "tts:generate",
  TTS_CANCEL: "tts:cancel",
  TTS_PROGRESS: "tts:progress",
  TTS_COMPLETE: "tts:complete",
  TTS_ERROR: "tts:error",
  TTS_HISTORY_LIST: "tts:history:list",
  TTS_HISTORY_SAVE: "tts:history:save",
  TTS_HISTORY_DELETE: "tts:history:delete",
  TTS_HISTORY_CLEAR: "tts:history:clear",
  // Activity domain (Activities persistence & 1-to-1 origin link)
  ACTIVITY_LIST: "activity:list",
  ACTIVITY_GET: "activity:get",
  ACTIVITY_GET_BY_ORIGIN: "activity:get-by-origin",
  ACTIVITY_SAVE: "activity:save",
  ACTIVITY_DELETE: "activity:delete",
  // Music generation domain (ACE-Step & MiniMax-Music3 QVAC AudioGen)
  MUSIC_GENERATE: "music:generate",
  MUSIC_CANCEL: "music:cancel",
  MUSIC_EDIT: "music:edit",
  MUSIC_UNDERSTAND: "music:understand",
  MUSIC_PROGRESS: "music:progress",
  MUSIC_COMPLETE: "music:complete",
  MUSIC_ERROR: "music:error",
  MUSIC_MODEL_STATUS: "music:model-status",
  MUSIC_LOAD_MODEL: "music:load-model",
  MUSIC_UNLOAD_MODEL: "music:unload-model",
  MUSIC_ASSESS_FIT: "music:assess-fit",
  MUSIC_HISTORY_LIST: "music:history:list",
  MUSIC_HISTORY_SAVE: "music:history:save",
  MUSIC_HISTORY_DELETE: "music:history:delete",
  MUSIC_HISTORY_CLEAR: "music:history:clear",
  MUSIC_GET_LOGS: "music:get-logs",
  MUSIC_CLEAR_LOGS: "music:clear-logs",
  MUSIC_GENERATE_LYRICS: "music:generate-lyrics",
  MUSIC_LYRICS_TOKEN: "music:lyrics-token",
  // Models management domain (Echo Voice Engine weights)
  MODELS_GET_STATUS: "models:get-status",
  MODELS_GET_INFO: "models:get-info",
  MODELS_DELETE_ALL: "models:delete-all",
  MODELS_DOWNLOAD: "models:download",
  MODELS_DOWNLOAD_PROGRESS: "models:download-progress",
  MODELS_CANCEL_DOWNLOAD: "models:cancel-download",
  // System telemetry & utilities domain
  SYSTEM_GET_METRICS: "system:getMetrics",
  SYSTEM_OPEN_EXPORTS: "system:openExports",
  // Compatibility aliases
  DB_CONVERSATIONS_LIST: "tts:history:list",
  DB_CONVERSATIONS_SAVE: "tts:history:save",
  DB_CONVERSATIONS_DELETE: "tts:history:delete",
  DB_CONVERSATIONS_CLEAR: "tts:history:clear",
  DB_VOICES_LIST: "voices:list-custom",
  DB_VOICES_SAVE: "voices:save-custom",
  DB_VOICES_DELETE: "voices:delete-custom",
  // Terminal Log domain
  TERMINAL_LOG: "terminal:log",
  // Legacy channel aliases for backwards compatibility
  LEGACY_SCAN_VOICE_SAMPLES: "scan-voice-samples",
  LEGACY_GET_SYSTEM_METRICS: "get-system-metrics",
  LEGACY_OPEN_EXPORTS_FOLDER: "open-exports-folder"
};
class SystemController extends BaseController {
  constructor(systemService) {
    super();
    this.systemService = systemService;
  }
  init() {
    ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_METRICS, async () => {
      return this.systemService.getMetrics();
    });
    ipcMain.handle(IPC_CHANNELS.LEGACY_GET_SYSTEM_METRICS, async () => {
      return this.systemService.getMetrics();
    });
    ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXPORTS, async () => {
      return this.systemService.openExportsFolder();
    });
    ipcMain.handle(IPC_CHANNELS.LEGACY_OPEN_EXPORTS_FOLDER, async () => {
      return this.systemService.openExportsFolder();
    });
  }
}
class ModelsService {
  constructor() {
    __publicField(this, "cacheDir");
    __publicField(this, "stateFilePath");
    __publicField(this, "downloadedModelIds", /* @__PURE__ */ new Set());
    __publicField(this, "activeDownloads", /* @__PURE__ */ new Map());
    // Full specification of neural TTS voice models
    __publicField(this, "modelDefinitions", [
      {
        id: "chatterbox-t3-turbo-q8_0",
        name: "Chatterbox T3 Turbo Backbone (Q8_0 GGUF)",
        descriptorName: "TTS_T3_TURBO_EN_CHATTERBOX_Q8_0",
        sizeBytes: 487091392,
        sizeFormatted: "487 MB",
        description: "Fast and expressive autoregressive T3 speech backbone with high dynamic range and instant voice cloning.",
        category: "backbone",
        engine: "chatterbox",
        required: false
      },
      {
        id: "chatterbox-s3gen-q8_0",
        name: "Chatterbox S3Gen Acoustic Vocoder (Q8_0 GGUF)",
        descriptorName: "TTS_S3GEN_EN_CHATTERBOX_Q8_0",
        sizeBytes: 829702464,
        sizeFormatted: "830 MB",
        description: "Companion diffusion vocoder for realistic breath, timbre, and natural prosody in Chatterbox speech.",
        category: "vocoder",
        engine: "chatterbox",
        required: false
      },
      {
        id: "chatterbox-t3-multilingual-q8_0",
        name: "Chatterbox T3 Multilingual (23 Languages, Q8_0)",
        descriptorName: "TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0",
        sizeBytes: 487091392,
        sizeFormatted: "487 MB",
        description: "Multilingual T3 speech model supporting 23 international languages with cross-lingual voice cloning.",
        category: "backbone",
        engine: "chatterbox",
        required: false
      },
      {
        id: "chatterbox-s3gen-multilingual-q8_0",
        name: "Chatterbox S3Gen Multilingual Vocoder (Q8_0)",
        descriptorName: "TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0",
        sizeBytes: 829702464,
        sizeFormatted: "830 MB",
        description: "Multilingual diffusion vocoder generating clean, natural acoustic waveforms across 23 languages.",
        category: "vocoder",
        engine: "chatterbox",
        required: false
      },
      {
        id: "cosyvoice3-llm-q8_0",
        name: "CosyVoice 3 Neural Speech Backbone (0.5B, Q8_0)",
        descriptorName: "TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0",
        sizeBytes: 973496e3,
        sizeFormatted: "973 MB",
        description: "Zero-shot neural speech generator with instruct conditioning for voice design & cloning (optimized for Apple Silicon / M-series).",
        category: "backbone",
        engine: "cosyvoice3",
        required: false
      },
      {
        id: "cosyvoice3-flow-fp16",
        name: "CosyVoice 3 Flow Matching Acoustic (FP16)",
        descriptorName: "TTS_COSYVOICE3_FLOW_COSYVOICE_FP16",
        sizeBytes: 669966336,
        sizeFormatted: "639 MB",
        description: "Uncompressed FP16 flow-matching ODE acoustic generator for pristine vocal detail, breath dynamics, and zero metallic distortion.",
        category: "vocoder",
        engine: "cosyvoice3",
        required: false
      },
      {
        id: "lavasr-enhancer",
        name: "Lava-SR 48kHz Neural Enhancer (FP16)",
        descriptorName: "TTS_ENHANCER_LAVASR_FP16",
        sizeBytes: 28051008,
        sizeFormatted: "28 MB",
        description: "Deep spectral bandwidth upsampler and harmonic clarity enhancer for studio-grade 48kHz ultra-HD audio.",
        category: "enhancer",
        engine: "shared",
        required: false
      },
      {
        id: "cosyvoice3-s3tok-fp16",
        name: "CosyVoice 3 S3Tok Speech Tokenizer (FP16)",
        descriptorName: "TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16",
        sizeBytes: 496605536,
        sizeFormatted: "496 MB",
        description: "Neural speech tokenizer required for high-fidelity instant voice cloning in CosyVoice 3.",
        category: "vocoder",
        engine: "cosyvoice3",
        required: false
      },
      {
        id: "cosyvoice3-campplus-fp32",
        name: "CosyVoice 3 CAM++ Speaker Encoder (FP32)",
        descriptorName: "TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32",
        sizeBytes: 27530656,
        sizeFormatted: "27 MB",
        description: "Deep acoustic timbre and speaker embedding extractor for voice cloning in CosyVoice 3.",
        category: "multilingual",
        engine: "cosyvoice3",
        required: false
      },
      // Music Generation Models (ACE-Step & MiniMax AudioGen)
      {
        id: "audiogen-qwen3-embedding",
        name: "Qwen3 Embedding Text Encoder (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0",
        sizeBytes: 784144960,
        sizeFormatted: "784 MB",
        description: "Encodes captions, prompts, and vocal lyrics into continuous musical semantic space.",
        category: "text-encoder",
        engine: "acestep",
        required: true
      },
      {
        id: "audiogen-acestep-5hz-lm",
        name: "ACE-Step 5Hz Language Model (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0",
        sizeBytes: 709846656,
        sizeFormatted: "710 MB",
        description: "Plans song structure, tempo, arrangement, and section transitions at 5 Hz.",
        category: "lm",
        engine: "acestep",
        required: true
      },
      {
        id: "audiogen-acestep-turbo-dit",
        name: "ACE-Step v1.5 Turbo DiT (Q4_K_M)",
        descriptorName: "AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M",
        sizeBytes: 1445710272,
        sizeFormatted: "1.45 GB",
        description: "Fast 8-step Diffusion Transformer with Haar DCW for expressive music audio latents.",
        category: "dit",
        engine: "acestep",
        required: true
      },
      {
        id: "audiogen-vae-bf16",
        name: "ACE-Step Audio VAE (BF16)",
        descriptorName: "AUDIOGEN_VAE_BF16",
        sizeBytes: 337420928,
        sizeFormatted: "337 MB",
        description: "Acoustic decoder rendering pristine 48 kHz stereo PCM audio waveforms.",
        category: "vae",
        engine: "acestep",
        required: true
      },
      {
        id: "minimax-music-v3-transformer",
        name: "MiniMax Music-v3 Global LM (Q4_K_M GGUF)",
        descriptorName: "MINIMAX_MUSIC_V3_TRANSFORMER",
        sizeBytes: 5512456672,
        sizeFormatted: "5.13 GB",
        description: "Qwen3-8B based global language model with extended audio vocabulary, planning semantic music structures.",
        category: "lm",
        engine: "minimax",
        required: true
      },
      {
        id: "minimax-music-vocoder",
        name: "MiniMax Music-v3 Synth Stack (Q4_K_M GGUF)",
        descriptorName: "MINIMAX_MUSIC_VOCODER",
        sizeBytes: 2131105508,
        sizeFormatted: "1.98 GB",
        description: "Full synthesis pipeline: RVQ depth decoder, condition encoder, flow-matching DiT, and stereo vocoder.",
        category: "vocoder",
        engine: "minimax",
        required: true
      }
    ]);
    this.cacheDir = path.join(os.homedir(), ".qvac", "models");
    const userData = app ? app.getPath("userData") : path.join(os.homedir(), ".echo-ai");
    if (!fs.existsSync(userData)) {
      try {
        fs.mkdirSync(userData, { recursive: true });
      } catch {
      }
    }
    this.stateFilePath = path.join(userData, "voice_engine_state.json");
    this.loadState();
  }
  /**
   * Returns list of configured model definitions
   */
  getDefinitions() {
    return this.modelDefinitions;
  }
  /**
   * Fast check if a specific model is downloaded and ready
   */
  isModelDownloaded(modelId) {
    if (this.downloadedModelIds.has(modelId)) return true;
    for (const id of this.downloadedModelIds) {
      if (id === modelId) return true;
      if (id.startsWith(modelId) || modelId.startsWith(id) && !modelId.startsWith("minimax-")) {
        return true;
      }
    }
    return false;
  }
  /**
   * Load persisted downloaded model status and discover cached weights
   */
  loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.downloadedModelIds)) {
          this.downloadedModelIds = new Set(data.downloadedModelIds);
        }
      }
    } catch (e) {
      console.warn("[ModelsService] Could not load state file:", e);
    }
    this.syncCacheFromDisk();
  }
  /**
   * Persist state to disk
   */
  saveState() {
    try {
      const data = {
        downloadedModelIds: Array.from(this.downloadedModelIds),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("[ModelsService] Could not save state file:", e);
    }
  }
  /**
   * Scan disk cache directory for downloaded models and verify their file presence/integrity
   */
  syncCacheFromDisk() {
    let changed = false;
    try {
      if (fs.existsSync(this.cacheDir)) {
        const foundModelIds = /* @__PURE__ */ new Set();
        const checkFileOrDir = (filePath, filename) => {
          const lower = filename.toLowerCase();
          if (lower.endsWith(".download") || lower.endsWith(".tmp") || lower.endsWith(".partial") || lower.endsWith(".crdownload")) {
            return;
          }
          let stats = null;
          try {
            stats = fs.statSync(filePath);
          } catch {
            return;
          }
          const isAdequateSize = stats.isFile() && stats.size > 1024 * 1024;
          if (!isAdequateSize) return;
          if (lower.includes("parler-large-v1-f16") || lower.includes("parler-large-v1-fp16")) {
            foundModelIds.add("chatterbox-t3-turbo-q8_0");
          } else if (lower.includes("chatterbox-s3gen-q8") || lower.includes("chatterbox-s3gen")) {
            foundModelIds.add("chatterbox-s3gen-q8_0");
          } else if (lower.includes("chatterbox-t3-multilingual")) {
            foundModelIds.add("chatterbox-t3-multilingual-q8_0");
          } else if (lower.includes("chatterbox-s3gen-multilingual")) {
            foundModelIds.add("chatterbox-s3gen-multilingual-q8_0");
          } else if (lower.includes("chatterbox-t3") || lower.includes("chatterbox")) {
            foundModelIds.add("chatterbox-t3-turbo-q8_0");
          }
          if (lower.includes("cosyvoice3-llm") || lower.includes("cosy_voice")) {
            foundModelIds.add("cosyvoice3-llm-q8_0");
          }
          if (lower.includes("cosyvoice3-flow-f16") || lower.includes("cosyvoice3-flow-fp16") || lower.includes("cosyvoice3-flow-f32") || lower.includes("cosyvoice3-flow")) {
            foundModelIds.add("cosyvoice3-flow-fp16");
          }
          if (lower.includes("lavasr") || lower.includes("enhancer")) {
            foundModelIds.add("lavasr-enhancer");
          }
          if (lower.includes("cosyvoice3-s3tok") || lower.includes("s3tok")) {
            foundModelIds.add("cosyvoice3-s3tok-fp16");
          }
          if (lower.includes("cosyvoice3-campplus") || lower.includes("campplus")) {
            foundModelIds.add("cosyvoice3-campplus-fp32");
          }
          if (lower.includes("qwen3-embedding") || lower.includes("qwen3_embedding")) {
            foundModelIds.add("audiogen-qwen3-embedding");
          }
          if (lower.includes("acestep-5hz") || lower.includes("acestep_5hz")) {
            foundModelIds.add("audiogen-acestep-5hz-lm");
          }
          if (lower.includes("acestep-v15-turbo") || lower.includes("acestep_v15_turbo") || lower.includes("turbo-q4_k_m")) {
            foundModelIds.add("audiogen-acestep-turbo-dit");
          }
          if (lower.includes("vae-bf16") || lower.includes("audiogen-vae") || lower.includes("audiogen_vae")) {
            foundModelIds.add("audiogen-vae-bf16");
          }
          if ((lower.includes("mm3-lm") || lower.includes("minimax") && (lower.includes("transformer") || lower.includes("lm"))) && !lower.includes("vocoder") && !lower.includes("synth")) {
            foundModelIds.add("minimax-music-v3-transformer");
          }
          if ((lower.includes("mm3-synth") || lower.includes("minimax") && (lower.includes("vocoder") || lower.includes("synth"))) && !lower.includes("transformer") && !lower.includes("lm")) {
            foundModelIds.add("minimax-music-vocoder");
          }
        };
        const topFiles = fs.readdirSync(this.cacheDir);
        for (const file of topFiles) {
          const fullPath = path.join(this.cacheDir, file);
          checkFileOrDir(fullPath, file);
        }
        const setsDir = path.join(this.cacheDir, "sets");
        if (fs.existsSync(setsDir)) {
          const setDirs = fs.readdirSync(setsDir);
          for (const sd of setDirs) {
            const setPath = path.join(setsDir, sd);
            try {
              if (fs.existsSync(setPath)) {
                const setFiles = fs.readdirSync(setPath);
                for (const sf of setFiles) {
                  const subFilePath = path.join(setPath, sf);
                  checkFileOrDir(subFilePath, sf);
                }
              }
            } catch {
            }
          }
        }
        for (const id of foundModelIds) {
          if (!this.downloadedModelIds.has(id)) {
            this.downloadedModelIds.add(id);
            changed = true;
          }
        }
        for (const id of Array.from(this.downloadedModelIds)) {
          if ((id.startsWith("minimax-") || id.startsWith("audiogen-")) && !foundModelIds.has(id)) {
            this.downloadedModelIds.delete(id);
            changed = true;
          }
        }
      }
    } catch (err) {
      console.warn("[ModelsService] Error syncing cache from disk:", err);
    }
    if (changed) {
      this.saveState();
    }
  }
  /**
   * Get complete status of all voice engine models scoped to the selected engine.
   * CosyVoice 3 requires: backbone, enhancer, s3tok, campplus (flow is optional high precision).
   * Parler requires any downloaded Parler backbone model.
   */
  getStatus(selectedEngine) {
    this.syncCacheFromDisk();
    const models = this.modelDefinitions.map((def) => {
      const isDownloaded = this.downloadedModelIds.has(def.id);
      const isDownloading = this.activeDownloads.has(def.id);
      const isRequired = selectedEngine ? selectedEngine === "cosyvoice3" ? def.engine === "cosyvoice3" && def.id !== "cosyvoice3-flow-fp16" || def.engine === "shared" : selectedEngine === "chatterbox" ? def.engine === "chatterbox" && (def.id === "chatterbox-t3-turbo-q8_0" || def.id === "chatterbox-s3gen-q8_0") : def.engine === selectedEngine : def.category === "backbone";
      return {
        ...def,
        required: isRequired,
        downloaded: isDownloaded,
        status: isDownloading ? "downloading" : isDownloaded ? "ready" : "idle"
      };
    });
    let allRequiredDownloaded = false;
    if (selectedEngine === "chatterbox") {
      const hasBackbone = models.some(
        (m) => m.engine === "chatterbox" && m.category === "backbone" && m.downloaded
      );
      const hasVocoder = models.some(
        (m) => m.engine === "chatterbox" && m.category === "vocoder" && m.downloaded
      );
      allRequiredDownloaded = hasBackbone && hasVocoder;
    } else {
      const activeRequiredModels = selectedEngine ? models.filter((m) => m.required) : models.filter((m) => m.category === "backbone");
      allRequiredDownloaded = activeRequiredModels.length > 0 && activeRequiredModels.every((m) => m.downloaded);
    }
    return {
      ready: allRequiredDownloaded,
      allRequiredDownloaded,
      models,
      cacheDirectory: this.cacheDir
    };
  }
  /**
   * Helper to check if an engine is fully ready for speech synthesis
   */
  areAllRequiredModelsDownloaded(selectedEngine = "cosyvoice3") {
    const status = this.getStatus(selectedEngine);
    return status.allRequiredDownloaded;
  }
  /**
   * Download a single model with live progress updates.
   * Correctly handles single-file, sharded, and companion set downloads with smooth monotonic percentages.
   */
  async downloadModel(modelId, onProgress) {
    const def = this.modelDefinitions.find((m) => m.id === modelId);
    if (!def) {
      return { success: false, modelId, error: `Unknown model ID: ${modelId}` };
    }
    this.syncCacheFromDisk();
    if (this.downloadedModelIds.has(modelId)) {
      onProgress == null ? void 0 : onProgress({
        modelId,
        percentage: 100,
        downloaded: def.sizeBytes,
        total: def.sizeBytes,
        speed: "Ready"
      });
      return { success: true, modelId };
    }
    if (def.engine === "minimax") {
      return await this.downloadMiniMaxModel(modelId, def, onProgress);
    }
    let isCancelled = false;
    let lastPct = 0;
    let totalModelBytes = def.sizeBytes;
    this.activeDownloads.set(modelId, {
      cancel: () => {
        isCancelled = true;
      }
    });
    try {
      const sdk = qvacSdk;
      const sdkDescriptor = sdk[def.descriptorName] || null;
      if (!sdkDescriptor || typeof qvacSdk.downloadAsset !== "function") {
        return {
          success: false,
          modelId,
          error: `No asset descriptor found for ${modelId} (${def.descriptorName})`
        };
      }
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const downloadPromise = qvacSdk.downloadAsset({
            assetSrc: sdkDescriptor,
            onProgress: (p) => {
              var _a, _b, _c, _d, _e, _f, _g, _h;
              if (isCancelled) return;
              const overallPct = ((_a = p.fileSetInfo) == null ? void 0 : _a.overallPercentage) ?? ((_b = p.shardInfo) == null ? void 0 : _b.overallPercentage) ?? (p.fileSetInfo || p.shardInfo ? 0 : p.percentage ?? 0);
              const totalBytes = ((_c = p.fileSetInfo) == null ? void 0 : _c.overallTotal) ?? ((_d = p.shardInfo) == null ? void 0 : _d.overallTotal) ?? p.total ?? def.sizeBytes;
              totalModelBytes = totalBytes;
              const downloadedBytes = ((_e = p.fileSetInfo) == null ? void 0 : _e.overallDownloaded) ?? ((_f = p.shardInfo) == null ? void 0 : _f.overallDownloaded) ?? p.downloaded ?? Math.round((overallPct || 0) / 100 * totalBytes);
              const currentPct = Math.min(99, Math.max(1, Math.round(overallPct || 0)));
              lastPct = Math.max(lastPct, currentPct);
              let speed = p.speed || "Downloading...";
              if ((_g = p.fileSetInfo) == null ? void 0 : _g.currentFile) {
                speed = `${p.fileSetInfo.currentFile} (${p.fileSetInfo.fileIndex}/${p.fileSetInfo.totalFiles})`;
              } else if ((_h = p.shardInfo) == null ? void 0 : _h.shardName) {
                speed = `${p.shardInfo.shardName} (${p.shardInfo.currentShard}/${p.shardInfo.totalShards})`;
              }
              const isFinished = downloadedBytes >= totalBytes && totalBytes > 0 || overallPct >= 100;
              if (isFinished) {
                this.downloadedModelIds.add(modelId);
                this.syncCacheFromDisk();
                this.saveState();
              }
              onProgress == null ? void 0 : onProgress({
                modelId,
                percentage: isFinished ? 100 : lastPct,
                downloaded: downloadedBytes,
                total: totalBytes,
                speed: isFinished ? "Completed" : speed
              });
            }
          });
          if (downloadPromise && downloadPromise.requestId) {
            this.activeDownloads.set(modelId, {
              cancel: () => {
                isCancelled = true;
                try {
                  if (typeof qvacSdk.cancel === "function") {
                    ;
                    qvacSdk.cancel({
                      requestId: downloadPromise.requestId
                    });
                  }
                } catch {
                }
              }
            });
          }
          await downloadPromise;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const msg = String((err == null ? void 0 : err.message) || err);
          if (msg.includes("could not be locked") && attempt === 1 && !isCancelled) {
            console.warn(`[ModelsService] Registry lock conflict for ${modelId}. Retrying in 1.2s...`);
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
          throw err;
        }
      }
      if (lastErr) throw lastErr;
      if (isCancelled) {
        return { success: false, modelId, error: "Download cancelled" };
      }
      this.downloadedModelIds.add(modelId);
      this.syncCacheFromDisk();
      this.saveState();
      onProgress == null ? void 0 : onProgress({
        modelId,
        percentage: 100,
        downloaded: totalModelBytes,
        total: totalModelBytes,
        speed: "Completed"
      });
      return { success: true, modelId };
    } catch (err) {
      console.error(`[ModelsService] Download error for ${modelId}:`, err);
      return { success: false, modelId, error: String(err) };
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }
  /**
   * Cancel an in-flight download
   */
  cancelDownload(modelId) {
    const active = this.activeDownloads.get(modelId);
    if (active) {
      active.cancel();
      this.activeDownloads.delete(modelId);
      return true;
    }
    return false;
  }
  /**
   * Delete all installed models from disk and reset internal state
   */
  async deleteAllModels() {
    for (const [modelId, download] of this.activeDownloads.entries()) {
      try {
        download.cancel();
      } catch {
      }
      this.activeDownloads.delete(modelId);
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
          } catch {
          }
        }
      }
    } catch (err) {
      console.warn("[ModelsService] Error deleting cache directory:", err);
    }
    return true;
  }
  /**
   * Query QVAC model info using @qvac/sdk getModelInfo
   */
  async getModelInfo(name) {
    return qvacSdk.getModelInfo({ name });
  }
  /**
   * Directly downloads MiniMax-Music3 GGUF models from Hugging Face repository
   * with streaming progress, real byte metrics, and cancellation support.
   */
  async downloadMiniMaxModel(modelId, def, onProgress) {
    const modelUrls = {
      "minimax-music-v3-transformer": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-lm-Q4_K_M-imat.gguf",
        filename: "mm3-lm-Q4_K_M-imat.gguf"
      },
      "minimax-music-vocoder": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-synth-Q4_K_M.gguf",
        filename: "mm3-synth-Q4_K_M.gguf"
      }
    };
    const target = modelUrls[modelId];
    if (!target) {
      return { success: false, modelId, error: `Unknown MiniMax model: ${modelId}` };
    }
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (err) {
        return { success: false, modelId, error: `Failed to create cache directory: ${err}` };
      }
    }
    const finalPath = path.join(this.cacheDir, target.filename);
    const tempPath = path.join(this.cacheDir, `${target.filename}.download`);
    try {
      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        if (stats.size > 1024 * 1024) {
          this.downloadedModelIds.add(modelId);
          this.syncCacheFromDisk();
          this.saveState();
          onProgress == null ? void 0 : onProgress({
            modelId,
            percentage: 100,
            downloaded: stats.size,
            total: stats.size,
            speed: "Ready"
          });
          return { success: true, modelId };
        }
      }
    } catch {
    }
    const controller = new AbortController();
    let isCancelled = false;
    this.activeDownloads.set(modelId, {
      cancel: () => {
        isCancelled = true;
        controller.abort();
      }
    });
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
      }
    }
    let fileStream = null;
    try {
      const response = await fetch(target.url, {
        signal: controller.signal,
        redirect: "follow"
      });
      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch ${target.url}: HTTP ${response.status} ${response.statusText}`);
      }
      const contentLengthHeader = response.headers.get("content-length");
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : def.sizeBytes;
      fileStream = fs.createWriteStream(tempPath);
      const reader = response.body.getReader();
      let downloadedBytes = 0;
      let lastReportTime = Date.now();
      let lastReportBytes = 0;
      let speedFormatted = "Starting...";
      onProgress == null ? void 0 : onProgress({
        modelId,
        percentage: 1,
        downloaded: 0,
        total: totalBytes,
        speed: speedFormatted
      });
      while (true) {
        if (isCancelled) {
          throw new Error("Download cancelled");
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          const canContinue = fileStream.write(Buffer.from(value));
          downloadedBytes += value.length;
          if (!canContinue) {
            await new Promise((resolve) => fileStream.once("drain", resolve));
          }
          const now = Date.now();
          const timeDelta = now - lastReportTime;
          if (timeDelta >= 400 || downloadedBytes >= totalBytes) {
            const bytesDelta = downloadedBytes - lastReportBytes;
            const seconds = timeDelta / 1e3;
            const bytesPerSec = bytesDelta / Math.max(0.1, seconds);
            const mbPerSec = (bytesPerSec / (1024 * 1024)).toFixed(1);
            speedFormatted = `${mbPerSec} MB/s`;
            lastReportTime = now;
            lastReportBytes = downloadedBytes;
            const pct = totalBytes > 0 ? Math.min(99, Math.max(1, Math.round(downloadedBytes / totalBytes * 100))) : 0;
            onProgress == null ? void 0 : onProgress({
              modelId,
              percentage: pct,
              downloaded: downloadedBytes,
              total: totalBytes,
              speed: speedFormatted
            });
          }
        }
      }
      await new Promise((resolve, reject) => {
        if (!fileStream) return resolve();
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
        fileStream.end();
      });
      fileStream = null;
      if (isCancelled) {
        throw new Error("Download cancelled");
      }
      const st = fs.statSync(tempPath);
      if (st.size < 1024 * 1024) {
        throw new Error(`Downloaded file size (${st.size} bytes) is too small. Corrupt or incomplete download.`);
      }
      const fd = fs.openSync(tempPath, "r");
      const headerBuf = Buffer.alloc(4);
      fs.readSync(fd, headerBuf, 0, 4, 0);
      fs.closeSync(fd);
      if (headerBuf.toString("ascii") !== "GGUF") {
        throw new Error(`Downloaded file is not a valid GGUF binary (magic: ${headerBuf.toString("ascii")})`);
      }
      if (fs.existsSync(finalPath)) {
        try {
          fs.unlinkSync(finalPath);
        } catch {
        }
      }
      fs.renameSync(tempPath, finalPath);
      this.downloadedModelIds.add(modelId);
      this.syncCacheFromDisk();
      this.saveState();
      onProgress == null ? void 0 : onProgress({
        modelId,
        percentage: 100,
        downloaded: totalBytes,
        total: totalBytes,
        speed: "Completed"
      });
      return { success: true, modelId };
    } catch (err) {
      if (fileStream) {
        try {
          fileStream.destroy();
        } catch {
        }
      }
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
        }
      }
      this.downloadedModelIds.delete(modelId);
      this.saveState();
      const isAbort = isCancelled || (err == null ? void 0 : err.name) === "AbortError" || String(err).includes("cancelled");
      return {
        success: false,
        modelId,
        error: isAbort ? "Download cancelled" : (err == null ? void 0 : err.message) || String(err)
      };
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }
}
class ModelsController extends BaseController {
  constructor(modelsService) {
    super();
    this.modelsService = modelsService;
  }
  init() {
    ipcMain.handle(
      IPC_CHANNELS.MODELS_GET_STATUS,
      async (_event, payload) => {
        try {
          const status = this.modelsService.getStatus(payload == null ? void 0 : payload.engine);
          return { success: true, data: status };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_DOWNLOAD,
      async (event, payload) => {
        const onProgress = (p) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MODELS_DOWNLOAD_PROGRESS, p);
            }
          } catch (e) {
            console.warn("[ModelsController] Failed to send download progress:", e);
          }
        };
        if (payload == null ? void 0 : payload.allRequired) {
          const status = this.modelsService.getStatus(payload == null ? void 0 : payload.engine);
          const required = status.models.filter((m) => m.required && !m.downloaded);
          for (const m of required) {
            await this.modelsService.downloadModel(m.id, onProgress);
          }
          return { success: true, data: this.modelsService.getStatus(payload == null ? void 0 : payload.engine) };
        }
        if (payload == null ? void 0 : payload.modelId) {
          const result = await this.modelsService.downloadModel(payload.modelId, onProgress);
          return { ...result, data: this.modelsService.getStatus(payload == null ? void 0 : payload.engine) };
        }
        return { success: false, error: "No modelId or allRequired flag specified" };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_CANCEL_DOWNLOAD,
      async (_event, { modelId }) => {
        const cancelled = this.modelsService.cancelDownload(modelId);
        return { success: cancelled, modelId };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_GET_INFO,
      async (_event, { name }) => {
        try {
          const modelInfo = await this.modelsService.getModelInfo(name);
          return { success: true, data: modelInfo };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      }
    );
    ipcMain.handle(IPC_CHANNELS.MODELS_DELETE_ALL, async () => {
      try {
        await this.modelsService.deleteAllModels();
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    });
  }
}
class VoiceService {
  constructor(repository) {
    __publicField(this, "repository");
    this.repository = repository;
  }
  getRepository() {
    return this.repository;
  }
  async listCustomVoices() {
    if (this.repository) {
      return this.repository.listCustomVoices();
    }
    return [];
  }
  /**
   * Resolve root samples directory across dev server and production builds
   */
  getSamplesDirectory() {
    const publicDir = process.env.VITE_PUBLIC || path.join(process.cwd(), "public");
    const candidates = [
      path.join(publicDir, "voices", "samples"),
      path.join(process.cwd(), "public", "voices", "samples"),
      path.join(app.getAppPath(), "public", "voices", "samples"),
      path.join(app.getAppPath(), "dist", "voices", "samples")
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return dir;
      }
    }
    return null;
  }
  /**
   * Scan voices/samples directory, detecting all self-contained language folders
   * and reading their header file info.json
   */
  scanVoicePackages() {
    try {
      const samplesDir = this.getSamplesDirectory();
      if (!samplesDir) {
        console.warn("[VoiceService] Samples directory not found");
        return { success: false, packages: [], error: "Samples folder not found" };
      }
      const entries = fs.readdirSync(samplesDir, { withFileTypes: true });
      const packages = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const folderPath = path.join(samplesDir, entry.name);
        const infoJsonPath = path.join(folderPath, "info.json");
        const jsonInfoPath = path.join(folderPath, "json.info");
        const targetInfoPath = fs.existsSync(infoJsonPath) ? infoJsonPath : fs.existsSync(jsonInfoPath) ? jsonInfoPath : null;
        if (targetInfoPath) {
          try {
            const raw = fs.readFileSync(targetInfoPath, "utf-8");
            const header = JSON.parse(raw);
            const relativeList = header.list || header.location || (fs.existsSync(path.join(folderPath, "json", "voices.json")) ? "json/voices.json" : "voices.json");
            packages.push({
              folder: entry.name,
              language: header.language || entry.name,
              name: header.name || header.language || entry.name,
              flag: header.flag || "🌐",
              code: header.code || entry.name,
              nativeName: header.nativeName || header.name || header.language,
              list: relativeList,
              location: relativeList,
              listUrl: `/voices/samples/${entry.name}/${relativeList.replace(/^\//, "")}`,
              count: header.count || 0
            });
          } catch (err) {
            console.warn(`[VoiceService] Failed to parse info.json in ${folderPath}:`, err);
          }
        }
      }
      return { success: true, packages };
    } catch (err) {
      console.error("[VoiceService] Failed to scan voice samples:", err);
      return { success: false, packages: [], error: String(err) };
    }
  }
  /**
   * Load voices directly from disk for a given language folder
   */
  loadVoicesForPackage(folder, listRelativePath = "json/voices.json") {
    try {
      const samplesDir = this.getSamplesDirectory();
      if (!samplesDir) {
        return { success: false, voices: [], error: "Samples directory not found" };
      }
      const cleanList = listRelativePath.replace(/^\//, "");
      const possibleJsonPaths = [
        path.join(samplesDir, folder, cleanList),
        path.join(samplesDir, folder, "json", "voices.json"),
        path.join(samplesDir, folder, "voices.json")
      ];
      const jsonPath = possibleJsonPaths.find((p) => fs.existsSync(p));
      if (!jsonPath) {
        return { success: false, voices: [], error: `Voice list not found for folder ${folder}` };
      }
      const content = fs.readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(content);
      const voices = Array.isArray(parsed) ? parsed : parsed.voices || [];
      return { success: true, voices };
    } catch (err) {
      console.error(`[VoiceService] Failed to load voices for ${folder}:`, err);
      return { success: false, voices: [], error: String(err) };
    }
  }
  /**
   * Resolve or create the custom voices directory inside public/voices/custom
   */
  getCustomVoicesDirectory() {
    const publicDir = process.env.VITE_PUBLIC || path.join(process.cwd(), "public");
    const customDir = path.join(publicDir, "voices", "custom");
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }
  /**
   * Saves an imported or microphone-recorded voice audio sample directly to disk
   * and converts it to a standard 24kHz mono WAV for CosyVoice 3 reference conditioning.
   */
  async saveCustomVoice(payload) {
    try {
      const customDir = this.getCustomVoicesDirectory();
      const rawBase = (payload.fileName || "sample.wav").replace(/[^a-zA-Z0-9._-]/g, "_");
      const origExt = path.extname(rawBase).toLowerCase() || ".wav";
      const timestamp = Date.now();
      const origName = `voice_${payload.voiceId}_${timestamp}${origExt}`;
      const origPath = path.join(customDir, origName);
      const buf = Buffer.isBuffer(payload.audioBuffer) ? payload.audioBuffer : Buffer.from(payload.audioBuffer);
      fs.writeFileSync(origPath, buf);
      let finalPath = origPath;
      let finalSampleUrl = `/voices/custom/${origName}`;
      if (origExt !== ".wav") {
        const wavName = `voice_${payload.voiceId}_${timestamp}.wav`;
        const wavPath = path.join(customDir, wavName);
        try {
          const { execFileSync: execFileSync2 } = await import("node:child_process");
          execFileSync2("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", origPath, wavPath]);
          if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 100) {
            finalPath = wavPath;
            finalSampleUrl = `/voices/custom/${wavName}`;
          }
        } catch (err) {
          console.warn("[VoiceService] Audio conversion fallback, using original file:", err);
        }
      }
      let finalAvatarUrl = void 0;
      if (payload.avatarBuffer) {
        const avBuf = Buffer.isBuffer(payload.avatarBuffer) ? payload.avatarBuffer : Buffer.from(payload.avatarBuffer);
        if (avBuf.byteLength > 0) {
          const avExt = path.extname(payload.avatarFileName || ".jpg").toLowerCase() || ".jpg";
          const avName = `avatar_${payload.voiceId}_${timestamp}${avExt}`;
          const avPath = path.join(customDir, avName);
          fs.writeFileSync(avPath, avBuf);
          finalAvatarUrl = `/voices/custom/${avName}`;
        }
      }
      if (this.repository) {
        await this.repository.saveCustomVoice({
          id: payload.voiceId,
          name: payload.name,
          category: "cloned",
          avatarUrl: finalAvatarUrl || "/voices/sterling.jpg",
          sampleUrl: finalSampleUrl,
          referenceAudioName: path.basename(finalPath)
        });
      }
      return {
        success: true,
        filePath: finalPath,
        sampleUrl: finalSampleUrl,
        avatarUrl: finalAvatarUrl
      };
    } catch (err) {
      console.error("[VoiceService] Failed to save custom voice:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Delete a custom voice from disk and SQLite
   */
  async deleteCustomVoice(voiceId) {
    try {
      if (this.repository) {
        await this.repository.deleteCustomVoice(voiceId);
      }
      const customDir = this.getCustomVoicesDirectory();
      if (fs.existsSync(customDir)) {
        const files = fs.readdirSync(customDir);
        for (const file of files) {
          if (file.includes(`_${voiceId}_`)) {
            try {
              fs.unlinkSync(path.join(customDir, file));
            } catch {
            }
          }
        }
      }
      return { success: true };
    } catch (err) {
      console.error("[VoiceService] Failed to delete custom voice files:", err);
      return { success: false, error: String(err) };
    }
  }
}
class VoiceRepositoryService {
  constructor(db) {
    __publicField(this, "db");
    this.db = db;
  }
  /**
   * Query all custom cloned voices from SQLite
   */
  async listCustomVoices() {
    await this.db.init();
    try {
      const records = await this.db.client.customVoice.findMany({
        orderBy: { createdAt: "desc" }
      });
      return records.map((v) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        category: v.category,
        color: v.color,
        avatarUrl: v.avatarUrl,
        initials: v.initials,
        gender: v.gender,
        tags: v.tags ? JSON.parse(v.tags) : [],
        referenceAudioName: v.referenceAudioName || void 0,
        sampleUrl: v.sampleUrl || void 0,
        languageCode: v.languageCode || void 0,
        languageName: v.languageName || void 0,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }));
    } catch (err) {
      console.error("[VoiceRepositoryService] Failed to query custom voices:", err);
      return [];
    }
  }
  /**
   * Save or update a custom voice record in SQLite
   */
  async saveCustomVoice(voice) {
    await this.db.init();
    try {
      await this.db.client.customVoice.upsert({
        where: { id: voice.id },
        update: {
          name: voice.name,
          description: voice.description || "",
          category: voice.category || "cloned",
          color: voice.color || "#38bdf8",
          avatarUrl: voice.avatarUrl || "/voices/sterling.jpg",
          initials: voice.initials || voice.name.slice(0, 2).toUpperCase(),
          gender: voice.gender || "Neutral",
          tags: JSON.stringify(voice.tags || []),
          referenceAudioName: voice.referenceAudioName,
          sampleUrl: voice.sampleUrl,
          languageCode: voice.languageCode,
          languageName: voice.languageName
        },
        create: {
          id: voice.id,
          name: voice.name,
          description: voice.description || "",
          category: voice.category || "cloned",
          color: voice.color || "#38bdf8",
          avatarUrl: voice.avatarUrl || "/voices/sterling.jpg",
          initials: voice.initials || voice.name.slice(0, 2).toUpperCase(),
          gender: voice.gender || "Neutral",
          tags: JSON.stringify(voice.tags || []),
          referenceAudioName: voice.referenceAudioName,
          sampleUrl: voice.sampleUrl,
          languageCode: voice.languageCode,
          languageName: voice.languageName
        }
      });
      return { success: true };
    } catch (err) {
      console.error("[VoiceRepositoryService] Failed to save custom voice:", err);
      return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
    }
  }
  /**
   * Delete a custom voice from SQLite
   */
  async deleteCustomVoice(id) {
    await this.db.init();
    try {
      await this.db.client.customVoice.delete({
        where: { id }
      });
      return { success: true };
    } catch (err) {
      console.error("[VoiceRepositoryService] Failed to delete custom voice:", err);
      return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
    }
  }
}
class VoiceController extends BaseController {
  constructor(voiceService) {
    super();
    this.voiceService = voiceService;
  }
  init() {
    ipcMain.handle(IPC_CHANNELS.VOICES_SCAN, async () => {
      return this.voiceService.scanVoicePackages();
    });
    ipcMain.handle(IPC_CHANNELS.LEGACY_SCAN_VOICE_SAMPLES, async () => {
      return this.voiceService.scanVoicePackages();
    });
    ipcMain.handle(
      IPC_CHANNELS.VOICES_LOAD,
      async (_, { folder, list }) => {
        return this.voiceService.loadVoicesForPackage(folder, list);
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.VOICES_SAVE_CUSTOM,
      async (_, payload) => {
        return this.voiceService.saveCustomVoice(payload);
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.VOICES_DELETE_CUSTOM,
      async (_, { voiceId }) => {
        return this.voiceService.deleteCustomVoice(voiceId);
      }
    );
    ipcMain.handle(IPC_CHANNELS.VOICES_LIST_CUSTOM, async () => {
      try {
        const list = await this.voiceService.listCustomVoices();
        return { success: true, data: list };
      } catch (err) {
        return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
      }
    });
  }
}
function pcmToWavDataUri(samples, sampleRate) {
  sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.round(sampleRate) : 24e3;
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
  for (let i = 0; i < numSamples; i++) {
    const sample = Number.isFinite(samples[i]) ? Math.round(samples[i]) : 0;
    const value = Math.max(-32768, Math.min(32767, sample));
    buffer.writeInt16LE(value, headerSize + i * 2);
  }
  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}
function computePeaks(samples, count) {
  count = Math.max(1, Math.floor(count));
  if (samples.length === 0) return Array(count).fill(4);
  const peaks = [];
  const chunk = Math.max(1, Math.floor(samples.length / count));
  for (let i = 0; i < count; i++) {
    let max = 0;
    const start = i * chunk;
    const end = Math.min(samples.length, start + chunk);
    for (let j = start; j < end; j += Math.max(1, Math.floor((end - start) / 40))) {
      const a = Math.abs(samples[j] / 32768);
      if (a > max) max = a;
    }
    peaks.push(Math.max(4, Math.min(98, Math.round(max * 100))));
  }
  return peaks;
}
function savePcmAsWavFile(samples, sampleRate, label) {
  sampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? Math.round(sampleRate) : 24e3;
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
    `[TTS Debug] Saved PCM to ${filePath} (${numSamples} samples @ ${sampleRate}Hz, maxAbs=${maxAbs.toFixed(4)})`
  );
  return filePath;
}
function generateAcousticRoomPause(durationSec, sampleRate) {
  const numSamples = Math.floor(sampleRate * Math.max(0.015, durationSec));
  const samples = new Array(numSamples);
  let lastNoise = 0;
  for (let i = 0; i < numSamples; i++) {
    const white = (Math.random() * 2 - 1) * 5;
    lastNoise = lastNoise * 0.85 + white * 0.15;
    samples[i] = lastNoise;
  }
  const fadeLen = Math.min(Math.floor(sampleRate * 8e-3), Math.floor(numSamples / 2));
  for (let i = 0; i < fadeLen; i++) {
    const gainIn = 0.5 * (1 - Math.cos(Math.PI * i / fadeLen));
    samples[i] *= gainIn;
    const gainOut = 0.5 * (1 - Math.cos(Math.PI * (fadeLen - i) / fadeLen));
    samples[numSamples - 1 - i] *= gainOut;
  }
  return samples;
}
function trimPcmSilence(samples, sampleRate, preRollMs = 18, postRollMs = 28) {
  if (samples.length === 0) return samples;
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs === 0) return samples;
  const threshold = Math.max(maxAbs * 8e-3, maxAbs > 2 ? 60 : 2e-3);
  const preRoll = Math.floor(sampleRate * preRollMs / 1e3);
  const postRoll = Math.floor(sampleRate * postRollMs / 1e3);
  let startIdx = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      startIdx = Math.max(0, i - preRoll);
      break;
    }
  }
  let endIdx = samples.length;
  for (let i = samples.length - 1; i >= startIdx; i--) {
    if (Math.abs(samples[i]) > threshold) {
      endIdx = Math.min(samples.length, i + 1 + postRoll);
      break;
    }
  }
  if (startIdx >= endIdx || endIdx - startIdx < sampleRate * 0.08) {
    return samples;
  }
  return samples.slice(startIdx, endIdx);
}
function crossfadeAppend(target, incoming, sampleRate, crossfadeMs = 12) {
  if (incoming.length === 0) return;
  if (target.length === 0) {
    for (let i = 0; i < incoming.length; i++) target.push(incoming[i]);
    return;
  }
  const crossLen = Math.min(
    Math.floor(sampleRate * crossfadeMs / 1e3),
    Math.floor(target.length / 2),
    Math.floor(incoming.length / 2)
  );
  if (crossLen <= 0) {
    for (let i = 0; i < incoming.length; i++) target.push(incoming[i]);
    return;
  }
  const targetStart = target.length - crossLen;
  for (let i = 0; i < crossLen; i++) {
    const t = i / crossLen;
    const gainOut = Math.cos(t * (Math.PI / 2));
    const gainIn = Math.sin(t * (Math.PI / 2));
    target[targetStart + i] = target[targetStart + i] * gainOut + incoming[i] * gainIn;
  }
  for (let i = crossLen; i < incoming.length; i++) {
    target.push(incoming[i]);
  }
}
function processConversationalCues(text, engine, initialTone = "normal") {
  let cleaned = text;
  let tone = initialTone;
  const detectedCues = [];
  if (tone === "whisper" || /\[(?:whisper|soft)\]/i.test(cleaned)) {
    tone = "whisper";
    detectedCues.push("whisper");
    cleaned = cleaned.replace(/\[\/?(?:whisper|soft)\]/gi, " ");
  }
  if (tone === "yell" || /\[(?:yell|shout|loud)\]/i.test(cleaned)) {
    tone = "yell";
    detectedCues.push("yell");
    cleaned = cleaned.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ");
    const trimmed = cleaned.trim();
    const ending = /[!?]$/.test(trimmed) ? "" : "!";
    cleaned = `${trimmed.toUpperCase()}${ending}`;
  }
  if (tone === "raise" || /\[(?:raise|emphasis)\]/i.test(cleaned) || /<\/?strong>/i.test(cleaned)) {
    tone = "raise";
    detectedCues.push("raise");
  }
  cleaned = cleaned.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " ");
  cleaned = cleaned.replace(/<\/?laughter>/gi, " ");
  if (/\[(?:sigh|breath)\]/i.test(cleaned) || /<\/?breath>/i.test(cleaned)) {
    detectedCues.push("breath");
  }
  if (/\[(?:hmm+|thinking)\]/i.test(cleaned)) {
    detectedCues.push("hmm");
  }
  if (/\[gasp\]/i.test(cleaned)) {
    detectedCues.push("gasp");
  }
  if (engine === "cosyvoice3") {
    cleaned = cleaned.replace(/\[(?:breath|sigh)\]/gi, " <breath> ");
    cleaned = cleaned.replace(
      /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
      "<strong>$1</strong>"
    );
    if (tone === "raise" && !/<strong>[\s\S]*?<\/strong>/i.test(cleaned)) {
      cleaned = `<strong>${cleaned.trim()}</strong>`;
    }
    cleaned = cleaned.replace(/\[\/?(?:raise|emphasis)\]/gi, " ");
    cleaned = cleaned.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ");
    cleaned = cleaned.replace(/\[gasp\]/gi, "<breath> ");
    cleaned = cleaned.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim();
    if (tone === "whisper" && cleaned.length > 0) {
      cleaned = `<breath> ${cleaned.toLowerCase()} <breath>`;
    }
  } else {
    cleaned = cleaned.replace(/<\/?(?:laughter|strong|breath)>/gi, " ");
    cleaned = cleaned.replace(
      /\[\/?(?:laugh|laughter|giggle|chuckle|breath|sigh|gasp|whisper|soft|yell|shout|loud|raise|emphasis)\]/gi,
      " "
    );
    if (detectedCues.includes("hmm")) {
      cleaned = cleaned.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ");
    }
    if (detectedCues.includes("breath") || detectedCues.includes("sigh") || detectedCues.includes("gasp")) {
      cleaned = cleaned.replace(/\[(?:breath|sigh|gasp)\]/gi, "... ");
    }
    if (tone === "raise") {
      cleaned = cleaned.toUpperCase();
    }
    cleaned = cleaned.replace(/\s+/g, " ").replace(/\.{4,}/g, "...").trim();
    if (tone === "whisper" && cleaned.length > 0) {
      cleaned = `... ${cleaned.toLowerCase()} ...`;
    }
  }
  return { cleanedText: cleaned, detectedCues, tone };
}
function splitSpeechIntoSentences(text, targetMaxWords = 36) {
  const trimmedText = text.trim();
  if (!trimmedText) return [];
  const cleanForWordCount = trimmedText.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim();
  const words = cleanForWordCount.split(/\s+/).filter(Boolean);
  if (words.length <= targetMaxWords) {
    const isEnd = /[.!?]$/.test(cleanForWordCount);
    return [{ text: trimmedText, isSentenceEnd: isEnd }];
  }
  const sentenceMatches = trimmedText.match(/(?:<[^>]+>|[^.!?\n])+([.!?\n]+(?=[\s<]|$)|$)/g) || [trimmedText];
  const chunks = [];
  let currentText = "";
  for (const s of sentenceMatches) {
    const sTrimmed = s.trim();
    if (!sTrimmed) continue;
    const candidate = currentText ? `${currentText} ${sTrimmed}` : sTrimmed;
    const candidateWords = candidate.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length;
    if (candidateWords <= targetMaxWords) {
      currentText = candidate;
    } else {
      if (currentText) {
        const cleanCurrent = currentText.replace(/<\/?[a-z0-9_-]+>/gi, "").trim();
        const isEnd = /[.!?]$/.test(cleanCurrent);
        chunks.push({ text: currentText, isSentenceEnd: isEnd });
      }
      const sWords = sTrimmed.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length;
      if (sWords > targetMaxWords) {
        const clauseMatches = sTrimmed.match(/(?:<[^>]+>|[^,;:—-])+([,;:—-]+(?=[\s<]|$)|$)/g) || [sTrimmed];
        let subText = "";
        for (const cl of clauseMatches) {
          const clTrim = cl.trim();
          if (!clTrim) continue;
          const subCandidate = subText ? `${subText} ${clTrim}` : clTrim;
          const subWords = subCandidate.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length;
          if (subWords <= targetMaxWords) {
            subText = subCandidate;
          } else {
            if (subText) {
              chunks.push({ text: subText, isSentenceEnd: false });
            }
            subText = clTrim;
          }
        }
        if (subText) {
          currentText = subText;
        } else {
          currentText = "";
        }
      } else {
        currentText = sTrimmed;
      }
    }
  }
  if (currentText.trim()) {
    const cleanCurrent = currentText.replace(/<\/?[a-z0-9_-]+>/gi, "").trim();
    const isEnd = /[.!?]$/.test(cleanCurrent);
    chunks.push({ text: currentText.trim(), isSentenceEnd: isEnd });
  }
  return chunks.filter((c) => c.text.length > 0);
}
function parseTextAndPauses(rawText) {
  let text = rawText.replace(
    /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi,
    (fullMatch, secStr) => {
      const sec = parseFloat(secStr);
      if (Number.isFinite(sec) && sec <= 1.2) {
        return "... ";
      }
      return fullMatch;
    }
  );
  text = text.replace(/\[(whisper|soft|yell|shout|loud|raise|emphasis)\]\s*\[\/\1\]/gi, "");
  const TOKEN_REGEX = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]|\[(whisper|soft|yell|shout|loud|raise|emphasis)\]([\s\S]*?)\[\/\2\]/gi;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index).trim();
    if (textBefore) {
      segments.push({ type: "speech", text: textBefore, tone: "normal" });
    }
    if (match[1] !== void 0) {
      const pauseSec = parseFloat(match[1]);
      if (Number.isFinite(pauseSec) && pauseSec > 0) {
        segments.push({ type: "pause", pauseSec: Math.min(pauseSec, 30) });
      }
    } else if (match[2] !== void 0) {
      const toneTag = match[2].toLowerCase();
      const content = (match[3] || "").trim();
      if (content) {
        let tone = "normal";
        if (toneTag === "whisper" || toneTag === "soft") tone = "whisper";
        else if (toneTag === "yell" || toneTag === "shout" || toneTag === "loud") tone = "yell";
        else if (toneTag === "raise" || toneTag === "emphasis") tone = "raise";
        segments.push({ type: "speech", text: content, tone });
      }
    }
    lastIndex = match.index + match[0].length;
  }
  const textAfter = text.slice(lastIndex).trim();
  if (textAfter) {
    segments.push({ type: "speech", text: textAfter, tone: "normal" });
  }
  return segments;
}
function prepareReferenceAudioWav(inputPath) {
  if (!inputPath || typeof inputPath !== "string") return void 0;
  let resolved = inputPath;
  if (!fs.existsSync(resolved)) {
    const pub = path.resolve(process.cwd(), "public", inputPath.replace(/^\//, ""));
    if (fs.existsSync(pub)) resolved = pub;
  }
  if (!fs.existsSync(resolved)) {
    const ws = path.resolve(process.cwd(), inputPath);
    if (fs.existsSync(ws)) resolved = ws;
  }
  if (!fs.existsSync(resolved)) return void 0;
  const ext = path.extname(resolved).toLowerCase();
  if (ext === ".wav") return resolved;
  const cacheDir = path.join(os.tmpdir(), "echo-voice-cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const stat = fs.statSync(resolved);
  const outName = `${path.basename(resolved, ext)}_${stat.size}_${Math.floor(stat.mtimeMs)}.wav`;
  const outPath = path.join(cacheDir, outName);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1e3) {
    return outPath;
  }
  try {
    execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", resolved, outPath]);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1e3) {
      return outPath;
    }
  } catch (err) {
    console.warn(`[Echo Voice Engine] Audio conversion failed for ${resolved}:`, err);
  }
  return void 0;
}
function getValidReferenceWav(userProvidedSrc) {
  if (userProvidedSrc) {
    const converted = prepareReferenceAudioWav(userProvidedSrc);
    if (converted) return converted;
  }
  return void 0;
}
class VoiceEngineService {
  constructor(modelsService) {
    __publicField(this, "modelsService");
    __publicField(this, "loadedModels", /* @__PURE__ */ new Map());
    __publicField(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    this.modelsService = modelsService || new ModelsService();
  }
  getModelsService() {
    return this.modelsService;
  }
  /**
   * Scan disk cache directory for downloaded models
   */
  syncCacheFromDisk() {
    this.modelsService.syncCacheFromDisk();
  }
  /**
   * Delete all installed models from disk and reset engine state
   */
  async deleteAllModels() {
    var _a;
    for (const modelId of this.loadedModels.values()) {
      try {
        await ((_a = qvacSdk.unloadModel) == null ? void 0 : _a.call(qvacSdk, {
          modelId
        }));
      } catch {
      }
    }
    this.loadedModels.clear();
    return this.modelsService.deleteAllModels();
  }
  /**
   * Get complete status of all voice engine models
   */
  getStatus(selectedEngine) {
    return this.modelsService.getStatus(selectedEngine);
  }
  /**
   * Download a single model with live progress updates
   */
  async downloadModel(modelId, onProgress) {
    return this.modelsService.downloadModel(modelId, onProgress);
  }
  /**
   * Cancel an active model download
   */
  cancelDownload(modelId) {
    return this.modelsService.cancelDownload(modelId);
  }
  /**
   * Ensures the requested engine (CosyVoice 3 or Chatterbox T3) is loaded with configuration.
   */
  async ensureModelLoaded(opts) {
    var _a, _b, _c, _d, _e;
    const engine = opts.engine || "cosyvoice3";
    const lavaSr = opts.lavaSrEnabled !== false && this.modelsService.isModelDownloaded("lavasr-enhancer");
    const lavasrSrc = qvacSdk.TTS_ENHANCER_LAVASR_FP16;
    if (engine === "chatterbox") {
      const isMultilingual = opts.language && opts.language !== "en" && this.modelsService.isModelDownloaded("chatterbox-t3-multilingual-q8_0") && this.modelsService.isModelDownloaded("chatterbox-s3gen-multilingual-q8_0");
      let t3Descriptor = isMultilingual ? qvacSdk.TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0 : qvacSdk.TTS_T3_TURBO_EN_CHATTERBOX_Q8_0;
      let s3genDescriptor = isMultilingual ? qvacSdk.TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0 : qvacSdk.TTS_S3GEN_EN_CHATTERBOX_Q8_0;
      const chatterboxModelLabel = isMultilingual ? "Chatterbox T3 Multilingual (Q8_0 GGUF)" : "Chatterbox T3 Turbo EN (Q8_0 GGUF)";
      if (!t3Descriptor || !s3genDescriptor) {
        throw new Error("QVAC Chatterbox descriptors (T3 and/or S3Gen) missing from SDK");
      }
      let refWavPath = getValidReferenceWav(opts.referenceAudioSrc);
      if (!refWavPath) {
        const defaultVoice = path.resolve(process.cwd(), "public", "voices", "samples", "en", "voice_en_male_1.mp3");
        if (fs.existsSync(defaultVoice)) {
          refWavPath = prepareReferenceAudioWav(defaultVoice);
        }
      }
      const key = [
        "chatterbox",
        isMultilingual ? "multilingual" : "en",
        refWavPath ? path.basename(refWavPath) : "default",
        lavaSr ? "lavasr48k" : "native24k",
        process.arch === "arm64" ? "metal" : "cpu"
      ].join("|");
      const cachedModelId = this.loadedModels.get(key);
      if (cachedModelId) {
        return { modelId: cachedModelId, engine: "chatterbox" };
      }
      (_a = opts.onLog) == null ? void 0 : _a.call(opts, {
        text: `[Echo Voice Engine] Loading ${chatterboxModelLabel} + S3Gen Vocoder (${lavaSr ? "48kHz LavaSR" : "24kHz native"}${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const baseConfig = {
        ttsEngine: "chatterbox",
        language: opts.language || "en",
        s3genModelSrc: (s3genDescriptor == null ? void 0 : s3genDescriptor.src) || s3genDescriptor,
        streamChunkTokens: 25,
        streamFirstChunkTokens: 10,
        cfmSteps: 1,
        threads: 8,
        useGPU: process.arch === "arm64",
        seed: 42,
        ...refWavPath ? { referenceAudioSrc: refWavPath } : {},
        ...lavaSr && lavasrSrc ? { lavasrEnhancerModelSrc: lavasrSrc } : {}
      };
      const modelId = await qvacSdk.loadModel({
        modelSrc: t3Descriptor,
        modelType: "tts",
        modelConfig: baseConfig,
        onProgress: (p) => {
          var _a2;
          const pct = Math.round((p == null ? void 0 : p.percentage) ?? 0);
          (_a2 = opts.onProgress) == null ? void 0 : _a2.call(opts, {
            taskId: opts.taskId,
            progress: Math.min(40, Math.round(pct * 0.4)),
            message: `Loading ${chatterboxModelLabel} weights ${pct}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const oldestKey = this.loadedModels.keys().next().value;
        if (oldestKey) {
          const oldId = this.loadedModels.get(oldestKey);
          if (oldId) {
            try {
              await ((_b = qvacSdk.unloadModel) == null ? void 0 : _b.call(qvacSdk, { modelId: oldId }));
            } catch {
            }
          }
          this.loadedModels.delete(oldestKey);
        }
      }
      this.loadedModels.set(key, modelId);
      return { modelId, engine: "chatterbox" };
    } else {
      const cosyvoiceDescriptor = qvacSdk.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || qvacSdk.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!cosyvoiceDescriptor) {
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      }
      const rawEmotion = ((_c = opts.emotion) == null ? void 0 : _c.toLowerCase()) || "";
      const validEmotions = ["anger", "happy", "neutral", "sad"];
      const emotion = validEmotions.includes(rawEmotion) ? rawEmotion : void 0;
      const refWavPath = getValidReferenceWav(opts.referenceAudioSrc);
      const hasCloningModels = (this.modelsService.isModelDownloaded("cosyvoice3-s3tok-fp16") || this.modelsService.isModelDownloaded("cosyvoice3-s3tok")) && (this.modelsService.isModelDownloaded("cosyvoice3-campplus-fp32") || this.modelsService.isModelDownloaded("cosyvoice3-campplus"));
      console.log(
        `[Echo Voice Engine] CosyVoice 3 setup: refWavPath=${refWavPath}, hasCloningModels=${hasCloningModels}`
      );
      const key = [
        "cosyvoice3",
        refWavPath || "native",
        emotion || "none",
        lavaSr ? "lavasr48k" : "native24k"
      ].join("|");
      const cachedModelId = this.loadedModels.get(key);
      if (cachedModelId) {
        return { modelId: cachedModelId, engine: "cosyvoice3" };
      }
      const voiceDesc = refWavPath ? ` voice="${path.basename(refWavPath)}"` : " (native studio voice)";
      const emotionDesc = emotion ? ` emotion="${emotion}"` : "";
      (_d = opts.onLog) == null ? void 0 : _d.call(opts, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0 [FP32 Flow Matching]${lavaSr ? " +LavaSR 48kHz" : ""}${voiceDesc}${emotionDesc})...`,
        stream: "stdout"
      });
      const baseConfig = {
        ttsEngine: "cosyvoice3",
        useGPU: true,
        seed: 42,
        ...refWavPath && hasCloningModels ? {
          cosyvoice3S3tokModelSrc: qvacSdk.TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16,
          cosyvoice3CampplusModelSrc: qvacSdk.TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32,
          referenceAudioSrc: refWavPath
        } : {},
        ...lavaSr && lavasrSrc ? { lavasrEnhancerModelSrc: lavasrSrc } : {},
        ...emotion ? { emotion } : {}
      };
      const modelId = await qvacSdk.loadModel({
        modelSrc: cosyvoiceDescriptor,
        modelType: "tts",
        modelConfig: baseConfig,
        onProgress: (p) => {
          var _a2;
          const pct = Math.round((p == null ? void 0 : p.percentage) ?? 0);
          (_a2 = opts.onProgress) == null ? void 0 : _a2.call(opts, {
            taskId: opts.taskId,
            progress: Math.min(40, Math.round(pct * 0.4)),
            message: `Loading CosyVoice 3 weights ${pct}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const oldestKey = this.loadedModels.keys().next().value;
        if (oldestKey) {
          const oldId = this.loadedModels.get(oldestKey);
          if (oldId) {
            try {
              await ((_e = qvacSdk.unloadModel) == null ? void 0 : _e.call(qvacSdk, { modelId: oldId }));
            } catch {
            }
          }
          this.loadedModels.delete(oldestKey);
        }
      }
      this.loadedModels.set(key, modelId);
      return { modelId, engine: "cosyvoice3" };
    }
  }
  cancelSynthesis(taskId) {
    var _a;
    const reqId = this.activeTtsRequestIds.get(taskId);
    if (reqId) {
      try {
        void ((_a = qvacSdk.cancel) == null ? void 0 : _a.call(qvacSdk, { requestId: reqId }));
      } catch {
      }
      this.activeTtsRequestIds.delete(taskId);
    }
  }
  /**
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Chatterbox T3)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  async synthesize(options, onProgress, onLog, isCancelled) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const { taskId, rounds } = options;
    const activeEngine = options.engine || "cosyvoice3";
    const activeRounds = rounds.filter((r) => r.text.trim().length > 0);
    if (activeRounds.length === 0) {
      return { success: false, error: "No active speech rounds to synthesize" };
    }
    const firstRound = activeRounds[0];
    const speakerName = options.speakerName || "Selected Speaker";
    onLog == null ? void 0 : onLog({
      text: `[Echo Voice Engine] Synthesis task ${taskId} engine="${activeEngine}" voice="${speakerName}" turns=${activeRounds.length}...`,
      stream: "system"
    });
    try {
      if (isCancelled == null ? void 0 : isCancelled()) return { success: false, error: "Cancelled" };
      onProgress == null ? void 0 : onProgress({
        taskId,
        progress: 8,
        message: `Loading ${activeEngine === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const lavaSrEnabled = options.lavaSrEnabled !== false && this.modelsService.isModelDownloaded("lavasr-enhancer");
      const voicePrompt = options.voicePrompt || options.prompt || options.description || firstRound.prompt || firstRound.description;
      const rawEmotion = ((_a = firstRound.emotion) == null ? void 0 : _a.toLowerCase()) || "";
      const validEmotions = [
        "command",
        "anger",
        "narration",
        "conversation",
        "disgust",
        "fear",
        "happy",
        "neutral",
        "proper noun",
        "news",
        "sad",
        "surprise"
      ];
      const detectedEmotion = validEmotions.includes(rawEmotion) ? rawEmotion : void 0;
      const firstRoundRefAudio = firstRound.referenceAudioSrc || options.referenceAudioSrc;
      const { engine } = await this.ensureModelLoaded({
        engine: activeEngine,
        language: options.language || "en",
        lavaSrEnabled,
        instruct: voicePrompt || void 0,
        emotion: detectedEmotion,
        pace: (_b = firstRound.pace) == null ? void 0 : _b.toLowerCase(),
        referenceAudioSrc: firstRoundRefAudio,
        taskId,
        onProgress,
        onLog
      });
      if (isCancelled == null ? void 0 : isCancelled()) return { success: false, error: "Cancelled" };
      const allSamples = [];
      let sampleRate = lavaSrEnabled ? 48e3 : 24e3;
      for (let i = 0; i < activeRounds.length; i++) {
        if (isCancelled == null ? void 0 : isCancelled()) {
          const reqId = this.activeTtsRequestIds.get(taskId);
          if (reqId) {
            try {
              await ((_c = qvacSdk.cancel) == null ? void 0 : _c.call(qvacSdk, { requestId: reqId }));
            } catch {
            }
          }
          return { success: false, error: "Cancelled" };
        }
        const round = activeRounds[i];
        const roundRefAudio = round.referenceAudioSrc || options.referenceAudioSrc;
        const roundRawEmotion = ((_d = round.emotion) == null ? void 0 : _d.toLowerCase()) || "";
        const roundEmotion = validEmotions.includes(roundRawEmotion) ? roundRawEmotion : detectedEmotion;
        const { modelId: roundModelId } = await this.ensureModelLoaded({
          engine: activeEngine,
          language: options.language || "en",
          lavaSrEnabled,
          instruct: round.prompt || round.description || voicePrompt || void 0,
          emotion: roundEmotion,
          pace: (_e = round.pace) == null ? void 0 : _e.toLowerCase(),
          referenceAudioSrc: roundRefAudio,
          taskId,
          onProgress,
          onLog
        });
        onProgress == null ? void 0 : onProgress({
          taskId,
          progress: 40 + Math.round(i / activeRounds.length * 50),
          message: `Synthesizing turn ${i + 1}/${activeRounds.length}${round.speakerName ? ` (${round.speakerName})` : ""}...`,
          phase: "synthesis"
        });
        if (i > 0 && allSamples.length > 0) {
          const interTurnSamples = generateAcousticRoomPause(0.2, sampleRate);
          crossfadeAppend(allSamples, interTurnSamples, sampleRate, 14);
        }
        const segments = parseTextAndPauses(round.text);
        let speechSegCount = 0;
        for (let sIdx = 0; sIdx < segments.length; sIdx++) {
          const seg = segments[sIdx];
          if (isCancelled == null ? void 0 : isCancelled()) {
            const reqId = this.activeTtsRequestIds.get(taskId);
            if (reqId) {
              try {
                await ((_f = qvacSdk.cancel) == null ? void 0 : _f.call(qvacSdk, { requestId: reqId }));
              } catch {
              }
            }
            return { success: false, error: "Cancelled" };
          }
          if (seg.type === "pause" && seg.pauseSec) {
            const pauseSamples = generateAcousticRoomPause(seg.pauseSec, sampleRate);
            crossfadeAppend(allSamples, pauseSamples, sampleRate, 14);
            continue;
          }
          if (seg.type === "speech" && seg.text) {
            const { cleanedText, detectedCues, tone: segTone } = processConversationalCues(seg.text, engine, seg.tone);
            if (!cleanedText) continue;
            const sentenceChunks = splitSpeechIntoSentences(cleanedText, 36);
            for (let cIdx = 0; cIdx < sentenceChunks.length; cIdx++) {
              const chunkObj = sentenceChunks[cIdx];
              const chunkText = chunkObj.text;
              if (!chunkText) continue;
              if (isCancelled == null ? void 0 : isCancelled()) {
                const reqId = this.activeTtsRequestIds.get(taskId);
                if (reqId) {
                  try {
                    await ((_g = qvacSdk.cancel) == null ? void 0 : _g.call(qvacSdk, { requestId: reqId }));
                  } catch {
                  }
                }
                return { success: false, error: "Cancelled" };
              }
              if (allSamples.length > 0) {
                const isMidSentence = cIdx > 0 && !sentenceChunks[cIdx - 1].isSentenceEnd;
                const pauseDuration = isMidSentence ? 0.035 : cIdx > 0 ? 0.09 : 0.08;
                const interPause = generateAcousticRoomPause(pauseDuration, sampleRate);
                crossfadeAppend(allSamples, interPause, sampleRate, 10);
              }
              speechSegCount++;
              const ttsPayload = {
                modelId: roundModelId,
                text: chunkText,
                inputType: "text",
                stream: false
              };
              if (engine === "cosyvoice3") {
                const roundEmotion2 = (((_h = round.emotion) == null ? void 0 : _h.toLowerCase()) || detectedEmotion || "").trim();
                const validCosyEmotions = ["anger", "happy", "neutral", "sad"];
                if (segTone === "whisper" || detectedCues.includes("whisper")) {
                  ttsPayload.volume = "soft";
                  ttsPayload.pace = "slow";
                } else if (segTone === "yell" || detectedCues.includes("yell")) {
                  ttsPayload.volume = "loud";
                  ttsPayload.emotion = "anger";
                } else if (segTone === "raise" || detectedCues.includes("raise")) {
                  ttsPayload.volume = "loud";
                } else {
                  let cosyEmotion = validCosyEmotions.includes(roundEmotion2) ? roundEmotion2 : void 0;
                  if ((detectedCues.includes("sigh") || detectedCues.includes("breath")) && !cosyEmotion) {
                    cosyEmotion = "sad";
                  }
                  if (cosyEmotion && cosyEmotion !== "neutral") {
                    ttsPayload.emotion = cosyEmotion;
                  } else {
                    const roundPace = (((_i = round.pace) == null ? void 0 : _i.toLowerCase()) || "").trim();
                    const validPaces = ["slow", "moderate", "fast"];
                    if (validPaces.includes(roundPace) && roundPace !== "moderate") {
                      ttsPayload.pace = roundPace;
                    }
                  }
                }
              }
              const result = qvacSdk.textToSpeech(ttsPayload);
              if (result == null ? void 0 : result.requestId)
                this.activeTtsRequestIds.set(taskId, result.requestId);
              const pcm = await result.buffer ?? [];
              const done = await result.done;
              const srValue = await result.sampleRate;
              const sr = typeof srValue === "number" && srValue > 0 ? srValue : lavaSrEnabled ? 48e3 : 24e3;
              sampleRate = sr;
              this.activeTtsRequestIds.delete(taskId);
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
                  `[TTS Debug] Turn ${i + 1} Chunk ${cIdx + 1}/${sentenceChunks.length}: PCM length=${pcm.length}, maxAbs=${maxAbs.toFixed(4)}, min=${minVal.toFixed(4)}, max=${maxVal.toFixed(4)}, allZero=${allZero}, allSame=${allSame}, sampleRate=${sr}`
                );
              }
              if (pcm.length > 0) {
                const safeLabel = chunkText.replace(/[^a-z0-9]/gi, "_").slice(0, 30) || `round-${i}-chunk-${cIdx}`;
                savePcmAsWavFile(pcm, sr, `segment-${i}-${safeLabel}`);
              }
              if (!done || !pcm || pcm.length === 0) {
                throw new Error(
                  `${engine === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} returned no audio for turn ${i + 1}`
                );
              }
              const trimmedPcm = trimPcmSilence(pcm, sr);
              crossfadeAppend(allSamples, trimmedPcm, sr, 12);
            }
          }
        }
      }
      if (isCancelled == null ? void 0 : isCancelled()) return { success: false, error: "Cancelled" };
      onProgress == null ? void 0 : onProgress({
        taskId,
        progress: 95,
        message: `Finalizing ${sampleRate}Hz WAV & waveform...`,
        phase: "finalizing"
      });
      if (allSamples.length > 0) {
        savePcmAsWavFile(allSamples, sampleRate, "combined-output");
      }
      const audioUrl = pcmToWavDataUri(allSamples, sampleRate);
      const waveform = computePeaks(allSamples, 38);
      const duration = Math.round(allSamples.length / sampleRate * 10) / 10;
      const fullSnippet = activeRounds[0].text.trim();
      const textSnippet = fullSnippet.length > 55 ? `${fullSnippet.slice(0, 52)}...` : fullSnippet;
      const output = {
        id: `gen-${taskId}`,
        roundIndex: options.historyIndex || 0,
        title: `Generation ${(options.historyIndex || 0) + 1}`,
        textSnippet,
        speakerName: activeRounds.length > 1 ? `${activeRounds.length} Speakers` : options.speakerName || "Sterling Rhodes",
        speakerColor: activeRounds.length > 1 ? "#10b981" : options.speakerColor || "#38bdf8",
        speakerAvatarUrl: options.speakerAvatarUrl || "/voices/sterling.jpg",
        duration,
        audioUrl,
        waveform,
        timestamp: "Just now",
        emotion: firstRound.emotion || "Neutral"
      };
      onProgress == null ? void 0 : onProgress({
        taskId,
        progress: 100,
        message: `${engine === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} synthesis complete`,
        phase: "complete"
      });
      onLog == null ? void 0 : onLog({
        text: `[Echo Voice Engine] Synthesis complete (${duration}s @ ${sampleRate}Hz, ${allSamples.length} samples).`,
        stream: "stdout"
      });
      return { success: true, data: output };
    } catch (err) {
      this.activeTtsRequestIds.delete(taskId);
      const msg = (err == null ? void 0 : err.message) ? String(err.message) : String(err);
      onLog == null ? void 0 : onLog({
        text: `[Echo Voice Engine] Synthesis failed: ${msg}`,
        stream: "stderr"
      });
      return { success: false, error: msg };
    }
  }
}
class TtsService {
  constructor(modelsService, conversationRepo) {
    __publicField(this, "activeTasks", /* @__PURE__ */ new Set());
    __publicField(this, "voiceEngine");
    __publicField(this, "modelsService");
    __publicField(this, "conversationRepo");
    this.modelsService = modelsService || new ModelsService();
    this.voiceEngine = new VoiceEngineService(this.modelsService);
    this.conversationRepo = conversationRepo;
  }
  /** Access conversation persistence repository */
  getConversationRepository() {
    return this.conversationRepo;
  }
  /** Query all persisted conversations from SQLite */
  async listConversations() {
    if (this.conversationRepo) {
      return this.conversationRepo.listConversations();
    }
    return [];
  }
  /** Save conversation and dialogue rounds to SQLite */
  async saveConversation(data) {
    if (this.conversationRepo) {
      return this.conversationRepo.saveConversation(data);
    }
    return { success: false, error: "Conversation repository unavailable" };
  }
  /** Delete conversation from SQLite */
  async deleteConversation(id) {
    if (this.conversationRepo) {
      return this.conversationRepo.deleteConversation(id);
    }
    return { success: false, error: "Conversation repository unavailable" };
  }
  /** Clear all conversations from SQLite */
  async clearConversations() {
    if (this.conversationRepo) {
      return this.conversationRepo.clearConversations();
    }
    return { success: false, error: "Conversation repository unavailable" };
  }
  /** Access the underlying voice engine neural service */
  getVoiceEngine() {
    return this.voiceEngine;
  }
  /** Access the underlying models service */
  getModelsService() {
    return this.modelsService;
  }
  /** Get voice engine models download status */
  getModelStatus(selectedEngine) {
    return this.modelsService.getStatus(selectedEngine);
  }
  /** Download a specific model */
  async downloadModel(modelId, onProgress) {
    return this.modelsService.downloadModel(modelId, onProgress);
  }
  /** Cancel an in-flight model download */
  cancelModelDownload(modelId) {
    return this.modelsService.cancelDownload(modelId);
  }
  /** Delete all installed models from disk and reset engine state */
  async deleteAllModels() {
    return this.voiceEngine.deleteAllModels();
  }
  /** Cancel an active generation task + underlying QVAC request */
  cancelGeneration(taskId) {
    var _a, _b;
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      try {
        ;
        (_b = (_a = this.voiceEngine).cancelSynthesis) == null ? void 0 : _b.call(_a, taskId);
      } catch {
      }
      return true;
    }
    return false;
  }
  /** Check if a task was cancelled */
  isCancelled(taskId) {
    return !this.activeTasks.has(taskId);
  }
  /** High-fidelity speech synthesis pipeline using Echo Voice Engine prompt-driven voice design */
  async generateSpeech(options, onProgress, onLog) {
    const { taskId } = options;
    this.activeTasks.add(taskId);
    try {
      return await this.voiceEngine.synthesize(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      );
    } finally {
      this.activeTasks.delete(taskId);
    }
  }
}
class ConversationRepositoryService {
  constructor(db) {
    __publicField(this, "db");
    this.db = db;
  }
  /**
   * Query all conversations and dialogue rounds from SQLite
   */
  async listConversations() {
    await this.db.init();
    try {
      const records = await this.db.client.conversation.findMany({
        include: {
          rounds: {
            orderBy: {
              roundOrder: "asc"
            }
          },
          activity: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      return records.map((c) => ({
        id: c.id,
        text: c.text,
        previewSnippet: c.previewSnippet || c.text,
        voiceName: c.voiceName,
        voiceColor: c.voiceColor,
        voiceAvatarUrl: c.voiceAvatarUrl || "/voices/sterling.jpg",
        dateGroup: c.dateGroup,
        timeAgo: c.timeAgo,
        timestamp: c.timestamp ? Number(c.timestamp) : c.createdAt.getTime(),
        model: c.model,
        engine: c.engine,
        duration: c.duration,
        durationSec: c.durationSec || 0,
        emotion: c.emotion || void 0,
        audioUrl: c.audioUrl || void 0,
        waveform: c.waveform ? JSON.parse(c.waveform) : [],
        voicePrompt: c.voicePrompt || void 0,
        language: c.language || void 0,
        speakerCount: c.speakerCount,
        generationId: c.generationId || void 0,
        activity: c.activity ? {
          id: c.activity.id,
          type: c.activity.type,
          title: c.activity.title,
          category: c.activity.category,
          subCategory: c.activity.subCategory,
          description: c.activity.description
        } : void 0,
        roundsData: c.rounds.map((r) => ({
          id: r.id,
          voiceId: r.voiceId,
          text: r.text,
          speed: r.speed,
          emotion: r.emotion || void 0,
          pace: r.pace || void 0,
          prompt: r.prompt || void 0,
          description: r.description || void 0,
          referenceAudioSrc: r.referenceAudioSrc || void 0,
          speakerName: r.speakerName || void 0,
          speakerColor: r.speakerColor || void 0
        }))
      }));
    } catch (err) {
      console.error("[ConversationRepositoryService] Failed to query conversations:", err);
      return [];
    }
  }
  /**
   * Save or update a conversation with all dialogue rounds in SQLite
   */
  async saveConversation(data) {
    await this.db.init();
    try {
      const waveformJson = data.waveform ? JSON.stringify(data.waveform) : "[]";
      const timestampBigInt = data.timestamp ? BigInt(Math.floor(data.timestamp)) : BigInt(Date.now());
      await this.db.client.$transaction(async (tx) => {
        await tx.conversation.upsert({
          where: { id: data.id },
          update: {
            text: data.text,
            previewSnippet: data.previewSnippet || data.text,
            voiceName: data.voiceName,
            voiceColor: data.voiceColor,
            voiceAvatarUrl: data.voiceAvatarUrl,
            dateGroup: data.dateGroup,
            timeAgo: data.timeAgo,
            timestamp: timestampBigInt,
            model: data.model,
            engine: data.engine || "cosyvoice3",
            duration: data.duration,
            durationSec: data.durationSec,
            emotion: data.emotion,
            audioUrl: data.audioUrl,
            waveform: waveformJson,
            voicePrompt: data.voicePrompt,
            language: data.language,
            speakerCount: data.speakerCount || 1,
            generationId: data.generationId
          },
          create: {
            id: data.id,
            text: data.text,
            previewSnippet: data.previewSnippet || data.text,
            voiceName: data.voiceName,
            voiceColor: data.voiceColor,
            voiceAvatarUrl: data.voiceAvatarUrl,
            dateGroup: data.dateGroup,
            timeAgo: data.timeAgo,
            timestamp: timestampBigInt,
            model: data.model,
            engine: data.engine || "cosyvoice3",
            duration: data.duration,
            durationSec: data.durationSec,
            emotion: data.emotion,
            audioUrl: data.audioUrl,
            waveform: waveformJson,
            voicePrompt: data.voicePrompt,
            language: data.language,
            speakerCount: data.speakerCount || 1,
            generationId: data.generationId
          }
        });
        await tx.speechRound.deleteMany({
          where: { conversationId: data.id }
        });
        if (data.roundsData && Array.isArray(data.roundsData) && data.roundsData.length > 0) {
          const roundsToCreate = data.roundsData.map((r, idx) => ({
            id: r.id || `${data.id}-round-${idx}`,
            conversationId: data.id,
            roundOrder: idx,
            voiceId: r.voiceId || "voice-en-male-1",
            text: r.text || "",
            speed: typeof r.speed === "number" ? r.speed : 1,
            emotion: r.emotion || null,
            pace: r.pace || null,
            prompt: r.prompt || null,
            description: r.description || null,
            referenceAudioSrc: r.referenceAudioSrc || null,
            speakerName: r.speakerName || null,
            speakerColor: r.speakerColor || null
          }));
          for (const round of roundsToCreate) {
            await tx.speechRound.create({ data: round });
          }
        }
        const rawSnippet = data.previewSnippet || data.text || "";
        const cleanSnippet = rawSnippet.replace(/\s+/g, " ").trim();
        const baseTitle = cleanSnippet ? cleanSnippet.length > 55 ? `${cleanSnippet.slice(0, 52)}...` : cleanSnippet : `${data.voiceName || "Speech Synthesis"} Turn`;
        const existingActivity = await tx.activity.findUnique({
          where: { conversationId: data.id }
        });
        const activityCategory = "Text to Speech";
        const activitySubCategory = data.speakerCount && data.speakerCount > 1 ? `${data.speakerCount} Speakers Diarized` : data.voiceName || "Single Speaker";
        const activityMetadata = JSON.stringify({
          model: data.model,
          engine: data.engine || "cosyvoice3",
          duration: data.duration,
          durationSec: data.durationSec,
          emotion: data.emotion,
          audioUrl: data.audioUrl,
          waveform: data.waveform || [],
          speakerCount: data.speakerCount || 1
        });
        if (!existingActivity) {
          let uniqueTitle = baseTitle;
          let counter = 1;
          while (await tx.activity.findUnique({ where: { title: uniqueTitle } })) {
            counter++;
            uniqueTitle = `${baseTitle} #${counter}`;
          }
          await tx.activity.create({
            data: {
              id: `act-${data.id}`,
              type: "tts",
              title: uniqueTitle,
              category: activityCategory,
              subCategory: activitySubCategory,
              description: cleanSnippet ? cleanSnippet.slice(0, 160) : null,
              originId: data.id,
              originType: "conversation",
              conversationId: data.id,
              metadata: activityMetadata
            }
          });
        } else {
          await tx.activity.update({
            where: { conversationId: data.id },
            data: {
              category: activityCategory,
              subCategory: activitySubCategory,
              description: cleanSnippet ? cleanSnippet.slice(0, 160) : null,
              metadata: activityMetadata
            }
          });
        }
      });
      return { success: true };
    } catch (err) {
      console.error("[ConversationRepositoryService] Failed to save conversation:", err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
  /**
   * Delete a conversation from SQLite
   */
  async deleteConversation(id) {
    await this.db.init();
    try {
      await this.db.client.conversation.delete({
        where: { id }
      });
      return { success: true };
    } catch (err) {
      console.error("[ConversationRepositoryService] Failed to delete conversation:", err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
  /**
   * Delete all conversations from SQLite
   */
  async clearConversations() {
    await this.db.init();
    try {
      await this.db.client.conversation.deleteMany({});
      return { success: true };
    } catch (err) {
      console.error("[ConversationRepositoryService] Failed to clear conversations:", err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
class TtsController extends BaseController {
  constructor(ttsService) {
    super();
    this.ttsService = ttsService;
  }
  init() {
    ipcMain.handle(
      IPC_CHANNELS.TTS_GENERATE,
      async (event, options) => {
        const targetEngine = options.engine || "cosyvoice3";
        const status = this.ttsService.getModelStatus(targetEngine);
        const requiredNotReady = status.models.filter((m) => m.required && !m.downloaded);
        if (requiredNotReady.length > 0) {
          return {
            success: false,
            error: `Required voice engine models not downloaded: ${requiredNotReady.map((m) => m.name).join(", ")}`
          };
        }
        const sendProgress = (data) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_PROGRESS, data);
            }
          } catch (err) {
            console.warn("[TtsController] Failed to send progress event:", err);
          }
        };
        const sendLog = (log) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: "echo-ai",
                text: log.text,
                stream: log.stream,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (err) {
            console.warn("[TtsController] Failed to send log event:", err);
          }
        };
        const result = await this.ttsService.generateSpeech(options, sendProgress, sendLog);
        if (result.success && result.data) {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_COMPLETE, {
                taskId: options.taskId,
                generation: result.data
              });
            }
          } catch (err) {
            console.warn("[TtsController] Failed to send complete event:", err);
          }
        } else if (!result.success) {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_ERROR, {
                taskId: options.taskId,
                error: result.error || "Generation failed"
              });
            }
          } catch (err) {
            console.warn("[TtsController] Failed to send error event:", err);
          }
        }
        return result;
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.TTS_CANCEL,
      async (_, { taskId }) => {
        const cancelled = this.ttsService.cancelGeneration(taskId);
        return { success: cancelled, taskId };
      }
    );
    ipcMain.handle(IPC_CHANNELS.TTS_HISTORY_LIST, async () => {
      try {
        const list = await this.ttsService.listConversations();
        return { success: true, data: list };
      } catch (err) {
        return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
      }
    });
    ipcMain.handle(IPC_CHANNELS.TTS_HISTORY_SAVE, async (_event, data) => {
      try {
        const res = await this.ttsService.saveConversation(data);
        return res;
      } catch (err) {
        return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
      }
    });
    ipcMain.handle(IPC_CHANNELS.TTS_HISTORY_DELETE, async (_event, payload) => {
      try {
        const id = typeof payload === "string" ? payload : payload.id;
        const res = await this.ttsService.deleteConversation(id);
        return res;
      } catch (err) {
        return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
      }
    });
    ipcMain.handle(IPC_CHANNELS.TTS_HISTORY_CLEAR, async () => {
      try {
        const res = await this.ttsService.clearConversations();
        return res;
      } catch (err) {
        return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
      }
    });
  }
}
const _MusicLoggerService = class _MusicLoggerService {
  constructor() {
    __publicField(this, "primaryLogPath");
    __publicField(this, "mirrorLogPath");
    var _a;
    let userDataDir;
    try {
      userDataDir = ((_a = app) == null ? void 0 : _a.getPath) ? app.getPath("userData") : process.cwd();
    } catch {
      userDataDir = process.cwd();
    }
    const primaryLogsDir = path.join(userDataDir, "logs");
    if (!fs.existsSync(primaryLogsDir)) {
      try {
        fs.mkdirSync(primaryLogsDir, { recursive: true });
      } catch {
      }
    }
    this.primaryLogPath = path.join(primaryLogsDir, "music-generation.log");
    const mirrorLogsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(mirrorLogsDir)) {
      try {
        fs.mkdirSync(mirrorLogsDir, { recursive: true });
      } catch {
      }
    }
    this.mirrorLogPath = path.join(mirrorLogsDir, "music-generation.log");
    this.rotateIfNecessary(this.primaryLogPath);
    this.rotateIfNecessary(this.mirrorLogPath);
    this.writeRaw(`
=== Music Logger Initialized [${(/* @__PURE__ */ new Date()).toISOString()}] ===
Primary Log: ${this.primaryLogPath}
Mirror Log: ${this.mirrorLogPath}
`);
  }
  static getInstance() {
    if (!_MusicLoggerService.instance) {
      _MusicLoggerService.instance = new _MusicLoggerService();
    }
    return _MusicLoggerService.instance;
  }
  rotateIfNecessary(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.size > 15 * 1024 * 1024) {
          const backup = `${filePath}.${Date.now()}.bak`;
          fs.renameSync(filePath, backup);
        }
      }
    } catch {
    }
  }
  writeRaw(content) {
    try {
      fs.appendFileSync(this.primaryLogPath, content, "utf-8");
    } catch (e) {
      console.warn("[MusicLogger] Failed to write primary log:", e);
    }
    if (this.mirrorLogPath !== this.primaryLogPath) {
      try {
        fs.appendFileSync(this.mirrorLogPath, content, "utf-8");
      } catch {
      }
    }
  }
  logInfo(message, meta) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    let text = `[${timestamp}] [INFO] ${message}`;
    if (meta) {
      text += `
  Metadata: ${JSON.stringify(meta, null, 2)}`;
    }
    text += "\n";
    this.writeRaw(text);
    console.log(`[MusicLogger] ${message}`);
  }
  logSessionStart(options) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const divider = "=".repeat(80);
    const log = `
${divider}
[${timestamp}] ▸ STARTING MUSIC GENERATION
TaskId:         ${options.taskId}
Engine:         ${options.engine}
Caption:        "${options.caption}"
Lyrics:         ${options.lyrics ? `"${options.lyrics.slice(0, 100)}${options.lyrics.length > 100 ? "..." : ""}"` : "(none)"}
Instrumental:   ${Boolean(options.isInstrumental)}
Duration:       ${options.duration || 30}s
DiT Variant:    ${options.ditVariant || "n/a"}
Seed:           ${options.seed ?? -1}
${divider}
`;
    this.writeRaw(log);
    console.log(`[MusicLogger] ▸ Generation Started for task: ${options.taskId} (Engine: ${options.engine})`);
  }
  logMilestone(taskId, stage, detail) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const line = `[${timestamp}] [${taskId}] [${stage}] ${detail || ""}
`;
    this.writeRaw(line);
    console.log(`[MusicLogger] [${taskId}] [${stage}] ${detail || ""}`);
  }
  logProgress(taskId, stage, step, total, pct) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const line = `[${timestamp}] [${taskId}] [PROGRESS] ${stage}: ${pct}% (${step}/${total})
`;
    this.writeRaw(line);
  }
  logSuccess(taskId, output) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const divider = "-".repeat(80);
    const log = `
${divider}
[${timestamp}] ✓ MUSIC GENERATION SUCCEEDED
TaskId:         ${taskId}
Duration:       ${(output.durationMs / 1e3).toFixed(2)}s
Format:         ${output.sampleRate} Hz, ${output.channels} ch
Output WAV:     ${output.wavFilePath}
${divider}
`;
    this.writeRaw(log);
    console.log(`[MusicLogger] ✓ Generation Succeeded: ${taskId} -> ${output.wavFilePath}`);
  }
  logFailure(ctx) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const divider = "#".repeat(80);
    const err = ctx.error;
    const errorMessage = (err == null ? void 0 : err.message) || String(err);
    const errorCode = (err == null ? void 0 : err.code) || (err == null ? void 0 : err.errCode) || "UNKNOWN";
    const errorStack = (err == null ? void 0 : err.stack) || "(No stack trace available)";
    const errorCause = (err == null ? void 0 : err.cause) ? JSON.stringify(err.cause, null, 2) : void 0;
    const errorAdds = err == null ? void 0 : err.adds;
    let cacheFilesSnapshot = [];
    const cacheDir = path.join(os.homedir(), ".qvac", "models");
    try {
      if (fs.existsSync(cacheDir)) {
        cacheFilesSnapshot = fs.readdirSync(cacheDir).map((f) => {
          try {
            const st = fs.statSync(path.join(cacheDir, f));
            const mb = (st.size / (1024 * 1024)).toFixed(1);
            return `${f} (${mb} MB)`;
          } catch {
            return f;
          }
        });
      }
    } catch {
    }
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const log = `
${divider}
[${timestamp}] ✖ MUSIC GENERATION FAILED
TaskId:           ${ctx.taskId}
Engine:           ${ctx.engine}
Failure Stage:    ${ctx.stage}
Error Code:       ${errorCode}
Error Message:    ${errorMessage}
${errorAdds ? `Error Adds:       ${errorAdds}
` : ""}${errorCause ? `Error Cause:      ${errorCause}
` : ""}
Stack Trace:
${errorStack}

Options Provided:
${JSON.stringify(ctx.options || {}, null, 2)}

Resolved Model Paths:
${JSON.stringify(ctx.resolvedPaths || {}, null, 2)}

Models Cache Directory (${cacheDir}):
${cacheFilesSnapshot.length > 0 ? cacheFilesSnapshot.map((f) => `  - ${f}`).join("\n") : "  (Directory empty or inaccessible)"}

System Resources:
  Platform:       ${os.platform()}-${os.arch()}
  Free Memory:    ${freeMemMb} MB / ${totalMemMb} MB (${Math.round(freeMemMb / totalMemMb * 100)}% free)
  Node Version:   ${process.version}
${divider}
`;
    this.writeRaw(log);
    console.error(`[MusicLogger] ✖ Generation Failed for ${ctx.taskId} (Engine: ${ctx.engine}, Stage: ${ctx.stage}): ${errorMessage}`);
    {
      console.error(errorStack);
    }
  }
  getRecentLogs(limitLines = 200) {
    try {
      if (!fs.existsSync(this.primaryLogPath)) {
        return "No music generation logs recorded yet.";
      }
      const raw = fs.readFileSync(this.primaryLogPath, "utf-8");
      const lines = raw.split("\n");
      if (lines.length <= limitLines) {
        return raw;
      }
      return lines.slice(lines.length - limitLines).join("\n");
    } catch (err) {
      return `Failed to read logs: ${(err == null ? void 0 : err.message) || String(err)}`;
    }
  }
  clearLogs() {
    try {
      if (fs.existsSync(this.primaryLogPath)) {
        fs.writeFileSync(this.primaryLogPath, "", "utf-8");
      }
      if (fs.existsSync(this.mirrorLogPath) && this.mirrorLogPath !== this.primaryLogPath) {
        fs.writeFileSync(this.mirrorLogPath, "", "utf-8");
      }
      return true;
    } catch {
      return false;
    }
  }
  getLogFilePaths() {
    return {
      primary: this.primaryLogPath,
      mirror: this.mirrorLogPath !== this.primaryLogPath ? this.mirrorLogPath : void 0
    };
  }
};
__publicField(_MusicLoggerService, "instance");
let MusicLoggerService = _MusicLoggerService;
const _MusicSanitizerService = class _MusicSanitizerService {
  static getInstance() {
    if (!_MusicSanitizerService.instance) {
      _MusicSanitizerService.instance = new _MusicSanitizerService();
    }
    return _MusicSanitizerService.instance;
  }
  /**
   * Sanitizes prompt, lyrics, and arrangements incorporating all selected UI options
   * (vocalMode, BPM, keyscale, time signature, duration, vocal language, etc.).
   */
  sanitize(options) {
    var _a;
    const rawCaption = options.caption || "";
    const engine = options.engine || "acestep";
    const duration = options.duration && options.duration > 0 ? options.duration : 30;
    const captionRequestsInstrumental = /\b(instrumental|no vocals?|no singing|without vocals?|backing track|karaoke|pure instrumental|solo piano|solo guitar|acoustic instrumental)\b/i.test(rawCaption);
    const isInstrumental = Boolean(
      options.vocalMode === "instrumental" || options.isInstrumental || ((_a = options.lyrics) == null ? void 0 : _a.trim()) === "[Instrumental]" || captionRequestsInstrumental
    );
    let sanitizedCaption = this.stripConversationalMeta(rawCaption);
    let vocalHintInjected;
    let sanitizedLyrics;
    if (isInstrumental) {
      sanitizedCaption = sanitizedCaption.replace(/\b(?:with\s+)?(?:clear\s+melodic\s+)?(?:singing\s+vocals?|singing|lead\s+vocals?|vocalist|singer|soprano|baritone|tenor|choir|voice)\b/gi, "").replace(/\b(?:with\s+lyrics?|lyrics?)\b/gi, "").replace(/\s*,\s*,+/g, ",").trim();
      if (!/\b(instrumental|backing track|no vocals)\b/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, instrumental backing track, no vocals, rich melodic instruments`;
      } else if (!/\bno vocals\b/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, no vocals`;
      }
      sanitizedLyrics = "[Instrumental]";
      vocalHintInjected = void 0;
    } else {
      sanitizedCaption = sanitizedCaption.replace(/\b(?:pure\s+)?instrumental(?:\s+track|\s+version)?\b/gi, "").replace(/\b(?:without|no)\s+vocals?\b/gi, "").replace(/\s*,\s*,+/g, ",").trim();
      const hasVocalDescriptor = /(vocal|singer|voice|singing|choir|soprano|baritone|tenor|lead vocals|vocalist|harmony)/i.test(sanitizedCaption);
      if (!hasVocalDescriptor) {
        vocalHintInjected = this.inferVocalTimbre(sanitizedCaption, options.vocalLanguage);
        sanitizedCaption = `${sanitizedCaption}, ${vocalHintInjected}`;
      }
      if (options.vocalMode === "manual" && options.lyrics && options.lyrics.trim() && options.lyrics.trim() !== "[Instrumental]") {
        sanitizedLyrics = this.formatLyricsForDuration(options.lyrics, sanitizedCaption, duration);
      } else if (engine === "acestep" && !options.lyrics) {
        sanitizedLyrics = "";
      } else {
        sanitizedLyrics = this.formatLyricsForDuration(options.lyrics, sanitizedCaption, duration);
      }
    }
    if (options.bpm && options.bpm > 0) {
      const hasBpm = /\b\d+\s*(?:bpm|beats\s+per\s+minute)\b/i.test(sanitizedCaption);
      if (!hasBpm) {
        sanitizedCaption = `${sanitizedCaption}, ${options.bpm} BPM`;
      }
    }
    if (options.keyscale && options.keyscale.trim() && options.keyscale.toLowerCase() !== "none") {
      const keyClean = options.keyscale.trim();
      const escapedKey = keyClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hasKey = new RegExp(`\\b${escapedKey}\\b`, "i").test(sanitizedCaption) || /\b(?:in\s+key\s+of|key\s+of)\b/i.test(sanitizedCaption);
      if (!hasKey) {
        sanitizedCaption = `${sanitizedCaption}, in ${keyClean}`;
      }
    }
    if (options.timesignature && options.timesignature.trim() && options.timesignature !== "4/4") {
      const timeClean = options.timesignature.trim();
      if (!sanitizedCaption.includes(timeClean)) {
        sanitizedCaption = `${sanitizedCaption}, ${timeClean} time signature`;
      }
    }
    if (!isInstrumental && options.vocalLanguage && options.vocalLanguage !== "en") {
      const langMap = {
        es: "Spanish",
        zh: "Chinese",
        ja: "Japanese",
        ko: "Korean",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        ru: "Russian"
      };
      const langName = langMap[options.vocalLanguage.toLowerCase()];
      if (langName && !new RegExp(`\\b${langName}\\b`, "i").test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, ${langName} vocals`;
      }
    }
    if (duration >= 120) {
      if (!/(extended|full-length|progression|arrangement|complete song)/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, full-length structured arrangement with progression`;
      }
    } else if (duration >= 60) {
      if (!/(progression|arrangement|structured)/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, structured track progression`;
      }
    }
    sanitizedCaption = sanitizedCaption.replace(/\s*,\s*,+/g, ",").replace(/,\s*$/g, "").replace(/\s{2,}/g, " ").trim();
    const maxFrames = engine === "minimax" ? Math.max(750, Math.round(duration * 25)) : void 0;
    return {
      caption: sanitizedCaption.trim(),
      lyrics: sanitizedLyrics.trim(),
      duration,
      maxFrames,
      vocalHintInjected,
      isInstrumental
    };
  }
  /**
   * Strips conversational filler like "generate a...", "make a song about..."
   */
  stripConversationalMeta(text) {
    let clean = text.trim();
    const conversationalPrefixes = [
      /^(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|write|compose|produce)\s+(?:me\s+)?(?:a|an|the|some)?\s+/i,
      /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+have\s+)?(?:a|an|the|some)?\s+)/i,
      /^(?:give\s+me\s+(?:a|an|the)?\s+)/i,
      /^(?:song\s+about\s+)/i,
      /^(?:track\s+about\s+)/i
    ];
    for (const prefix of conversationalPrefixes) {
      clean = clean.replace(prefix, "");
    }
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    clean = clean.replace(/\s*,\s*,+/g, ",").replace(/\s{2,}/g, " ");
    return clean;
  }
  /**
   * Infers the best vocal timbre matching the musical genre/theme and optional language
   */
  inferVocalTimbre(caption, vocalLanguage) {
    const lower = caption.toLowerCase();
    const langMap = {
      es: "Spanish",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian"
    };
    const langPrefix = vocalLanguage && vocalLanguage !== "en" && langMap[vocalLanguage.toLowerCase()] ? `${langMap[vocalLanguage.toLowerCase()]} ` : "";
    if (/(medieval|celtic|harp|fantasy|bard|tavern|folk|ancient|kingdom)/.test(lower)) {
      return `${langPrefix}haunting bard vocals, clear close-mic singing, natural human vibrato, acoustic studio production`;
    }
    if (/(synthwave|retrowave|cyberpunk|80s|neon|electro)/.test(lower)) {
      return `${langPrefix}crisp 80s gated reverb male vocals, polished lead vocal, punchy melodic synth hook`;
    }
    if (/(lo-fi|lofi|chillhop|coffee|relax|bedroom)/.test(lower)) {
      return `${langPrefix}soft breathy female vocals, intimate close-mic acoustic presence, clear pronunciation`;
    }
    if (/(rock|metal|punk|grunge|electric guitar|heavy)/.test(lower)) {
      return `${langPrefix}raw energetic rock vocals, powerful singing voice, clear vocal consonants`;
    }
    if (/(cinematic|epic|orchestral|orchestra|trailer|hero)/.test(lower)) {
      return `${langPrefix}soaring dramatic vocals, rich choral harmonies, expansive dynamic range`;
    }
    if (/(ballad|piano|sad|emotional|heartbreak|acoustic|love|romance|romantic)/.test(lower)) {
      return `${langPrefix}heartfelt emotional solo vocals, warm studio acoustic presence, intimate vocal nuance, close-mic singing`;
    }
    if (/(pop|dance|disco|summer|happy|party)/.test(lower)) {
      return `${langPrefix}bright modern pop vocals, crisp high-end clarity, infectious melodic chorus`;
    }
    if (/(r&b|soul|jazz|blues)/.test(lower)) {
      return `${langPrefix}smooth soulful vocals, rich vocal harmonics, clear diction`;
    }
    return `${langPrefix}expressive lead singing vocals, crisp close-mic presence, natural human vibrato, studio vocal clarity`;
  }
  /**
   * Formats, tags, and extends lyrics according to duration so the model
   * doesn't stop prematurely at ~20 seconds.
   */
  formatLyricsForDuration(rawLyrics, caption, duration) {
    let clean = (rawLyrics || "").trim();
    if (!clean) {
      return this.generateDefaultLyricsForTheme(caption, duration);
    }
    clean = clean.replace(/\[?(?:verse\s*\d*|\(verse\s*\d*\)|verse\s*\d*:)\]?/gi, "[verse]");
    clean = clean.replace(/\[?(?:chorus|\(chorus\)|chorus:)\]?/gi, "[chorus]");
    clean = clean.replace(/\[?(?:bridge|\(bridge\)|bridge:)\]?/gi, "[bridge]");
    clean = clean.replace(/\[?(?:outro|\(outro\)|outro:)\]?/gi, "[outro]");
    clean = clean.replace(/\[?(?:intro|\(intro\)|intro:)\]?/gi, "[intro]");
    clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
    clean = clean.replace(/#{1,6}\s*/g, "");
    if (!clean.startsWith("[")) {
      clean = `[verse]
${clean}`;
    }
    const tagMatches = clean.match(/\[(verse|chorus|bridge|outro|intro)\]/gi) || [];
    if (duration >= 120 && tagMatches.length < 3) {
      const lines = clean.split("\n").filter((l) => l.trim() && !l.startsWith("["));
      if (lines.length > 0) {
        const verseLines = lines.slice(0, Math.min(4, lines.length)).join("\n");
        const chorusLines = lines.length > 4 ? lines.slice(4).join("\n") : verseLines;
        clean = [
          `[verse]
${verseLines}`,
          `[chorus]
${chorusLines}`,
          `[verse]
${verseLines}`,
          `[chorus]
${chorusLines}`,
          `[bridge]
Carried on the melody, through the passing time...`,
          `[chorus]
${chorusLines}`,
          `[outro]
Fading softly into the end...`
        ].join("\n\n");
      }
    } else if (duration >= 60 && tagMatches.length < 2) {
      clean = `${clean}

[chorus]
${clean.replace(/\[verse\]/g, "").trim()}

[outro]
Fading with the music...`;
    }
    return clean;
  }
  /**
   * Generates a complete, multi-section lyric sheet tailored to the duration.
   */
  generateDefaultLyricsForTheme(caption, duration) {
    const lower = caption.toLowerCase();
    if (/(medieval|war|harp|battle|castle)/.test(lower)) {
      if (duration >= 120) {
        return `[verse]
The banners fall beneath the crimson dawn,
A bitter wind blows through the broken shield,
The kings are buried and the armies gone,
And silence settles on the frozen field.

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[verse]
The village smokes into the autumn sky,
Cold ashes drift across the stony path,
No victor smiles beneath the raven's cry,
For who survives the fury of their wrath?

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[bridge]
Let the embers fade, let the trumpets die,
No march remains for those who could not stand,
Only the stars across the northern sky,
Watching the weeping of a weary land.

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
      }
      return `[verse]
The banners fall beneath the crimson dawn,
A bitter wind blows through the broken shield,
The kings are buried and the armies gone,
And silence settles on the frozen field.

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
    }
    return `[verse]
Whispers moving through the midnight air,
Chasing shadows on the quiet street,
Finding a melody that we can share,
Where the harmony and rhythm meet.

[chorus]
Sing it out loud, let the music rise,
Lighting the darkness beneath the skies,
Every single beat a brand new start,
Echoing the feelings of the heart.

[outro]
Soft chords fading into the night...`;
  }
};
__publicField(_MusicSanitizerService, "instance");
let MusicSanitizerService = _MusicSanitizerService;
const _MusicDspService = class _MusicDspService {
  static getInstance() {
    if (!_MusicDspService.instance) {
      _MusicDspService.instance = new _MusicDspService();
    }
    return _MusicDspService.instance;
  }
  /**
   * Post-processes raw interleaved PCM audio buffer into studio-mastered audio.
   * Returns a new Uint8Array with the mastered PCM samples.
   */
  masterPcm(pcm, sampleRate, channels, bitsPerSample, options = {}) {
    if (!pcm || pcm.byteLength === 0 || channels <= 0 || sampleRate <= 0) {
      return { masteredPcm: pcm, peakBeforeDb: -99, peakAfterDb: -99, details: "empty pcm" };
    }
    const {
      enableHighPass = true,
      highPassHz = 32,
      enableAirShelf = true,
      airShelfHz = 9500,
      airShelfGainDb = 2.2,
      enableNormalize = true,
      targetPeakDb = -0.5,
      enableSoftLimiter = true
    } = options;
    const numSamples = bitsPerSample === 16 ? Math.floor(pcm.byteLength / 2) : Math.floor(pcm.byteLength / 4);
    const floatSamples = new Float32Array(numSamples);
    if (bitsPerSample === 16) {
      const int16View = new Int16Array(pcm.buffer, pcm.byteOffset, numSamples);
      for (let i = 0; i < numSamples; i++) {
        floatSamples[i] = int16View[i] / 32768;
      }
    } else if (bitsPerSample === 32) {
      const float32View = new Float32Array(pcm.buffer, pcm.byteOffset, numSamples);
      floatSamples.set(float32View);
    } else {
      return { masteredPcm: pcm, peakBeforeDb: 0, peakAfterDb: 0, details: "unsupported bit depth" };
    }
    let maxInitial = 1e-5;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxInitial) maxInitial = abs;
    }
    const peakBeforeDb = 20 * Math.log10(maxInitial);
    if (enableHighPass && highPassHz > 0 && highPassHz < sampleRate / 2) {
      this.applyHighPassFilter(floatSamples, sampleRate, channels, highPassHz);
    }
    if (enableAirShelf && airShelfGainDb !== 0 && airShelfHz < sampleRate / 2) {
      this.applyHighShelfFilter(floatSamples, sampleRate, channels, airShelfHz, airShelfGainDb);
    }
    let maxFiltered = 1e-5;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxFiltered) maxFiltered = abs;
    }
    if (enableNormalize && maxFiltered > 1e-4) {
      const targetLinear = Math.pow(10, targetPeakDb / 20);
      const gain = targetLinear / maxFiltered;
      for (let i = 0; i < numSamples; i++) {
        floatSamples[i] *= gain;
      }
    }
    if (enableSoftLimiter) {
      const threshold = 0.94;
      const margin = 1 - threshold;
      for (let i = 0; i < numSamples; i++) {
        const x = floatSamples[i];
        if (x > threshold) {
          floatSamples[i] = threshold + margin * Math.tanh((x - threshold) / margin);
        } else if (x < -threshold) {
          floatSamples[i] = -threshold + margin * Math.tanh((x + threshold) / margin);
        }
      }
    }
    let maxFinal = 1e-5;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxFinal) maxFinal = abs;
    }
    const peakAfterDb = 20 * Math.log10(maxFinal);
    const masteredPcm = new Uint8Array(pcm.byteLength);
    if (bitsPerSample === 16) {
      const outView = new Int16Array(masteredPcm.buffer, masteredPcm.byteOffset, numSamples);
      for (let i = 0; i < numSamples; i++) {
        const val = Math.max(-1, Math.min(1, floatSamples[i]));
        outView[i] = val < 0 ? Math.round(val * 32768) : Math.round(val * 32767);
      }
    } else if (bitsPerSample === 32) {
      const outView = new Float32Array(masteredPcm.buffer, masteredPcm.byteOffset, numSamples);
      outView.set(floatSamples);
    }
    const details = `HighPass: ${highPassHz}Hz | AirShelf: +${airShelfGainDb}dB @ ${airShelfHz}Hz | Peak: ${peakBeforeDb.toFixed(1)}dBFS -> ${peakAfterDb.toFixed(1)}dBFS`;
    return { masteredPcm, peakBeforeDb, peakAfterDb, details };
  }
  /**
   * Applies a 2nd-order Butterworth High-Pass Biquad Filter per channel
   */
  applyHighPassFilter(samples, sampleRate, channels, cutoffHz) {
    const w0 = 2 * Math.PI * cutoffHz / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const Q = 0.70710678;
    const alpha = sinW0 / (2 * Q);
    const b0 = (1 + cosW0) / 2;
    const b1 = -(1 + cosW0);
    const b2 = (1 + cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;
    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;
    for (let ch = 0; ch < channels; ch++) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = ch; i < samples.length; i += channels) {
        const x0 = samples[i];
        const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        samples[i] = y0;
      }
    }
  }
  /**
   * Applies a High-Shelf Presence / Vocal Air Biquad Filter per channel
   */
  applyHighShelfFilter(samples, sampleRate, channels, cutoffHz, gainDb) {
    const A = Math.pow(10, gainDb / 40);
    const w0 = 2 * Math.PI * cutoffHz / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const S = 1;
    const alpha = sinW0 / 2 * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    const b0 = A * (A + 1 + (A - 1) * cosW0 + twoSqrtAAlpha);
    const b1 = -2 * A * (A - 1 + (A + 1) * cosW0);
    const b2 = A * (A + 1 + (A - 1) * cosW0 - twoSqrtAAlpha);
    const a0 = A + 1 - (A - 1) * cosW0 + twoSqrtAAlpha;
    const a1 = 2 * (A - 1 - (A + 1) * cosW0);
    const a2 = A + 1 - (A - 1) * cosW0 - twoSqrtAAlpha;
    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;
    for (let ch = 0; ch < channels; ch++) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = ch; i < samples.length; i += channels) {
        const x0 = samples[i];
        const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        samples[i] = y0;
      }
    }
  }
};
__publicField(_MusicDspService, "instance");
let MusicDspService = _MusicDspService;
function createWav(pcm, sampleRate, channels, bitsPerSample) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const blockAlign = channels * (bitsPerSample / 8);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcm.byteLength, true);
  const wav = new Uint8Array(44 + pcm.byteLength);
  wav.set(new Uint8Array(header));
  wav.set(pcm, 44);
  return wav;
}
function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index++) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
function wavToDataUri(wav) {
  const base64 = Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength).toString("base64");
  return `data:audio/wav;base64,${base64}`;
}
function computeWaveformPeaks(pcm, bitsPerSample, channels, targetPeaks = 64) {
  if (pcm.length === 0) return Array(targetPeaks).fill(10);
  const peaks = [];
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
class MusicEngineService {
  constructor() {
    __publicField(this, "activeModelId");
    __publicField(this, "activeEngine");
    __publicField(this, "activeDitVariant");
    __publicField(this, "activeRequestIds", /* @__PURE__ */ new Map());
    // taskId -> requestId
    __publicField(this, "musicExportsDir");
    __publicField(this, "logger", MusicLoggerService.getInstance());
    var _a;
    try {
      const userData = ((_a = app) == null ? void 0 : _a.getPath) ? app.getPath("userData") : process.cwd();
      this.musicExportsDir = path.join(userData, "music-exports");
      if (!fs.existsSync(this.musicExportsDir)) {
        fs.mkdirSync(this.musicExportsDir, { recursive: true });
      }
    } catch {
      this.musicExportsDir = path.join(process.cwd(), "music-exports");
    }
  }
  getActiveModelId() {
    return this.activeModelId;
  }
  /**
   * Assess hardware and memory fit for ACE-Step or MiniMax models before loading
   */
  async assessFit(engine = "acestep", ditVariant = "turbo-q4") {
    try {
      if (engine === "acestep") {
        const ditModelSrc = this.resolveDitModelSrc(ditVariant);
        const result = await qvacSdk.assessModelFit({
          models: [
            {
              modelType: "audiogen",
              modelConfig: {
                engine: "acestep",
                textEncModelSrc: qvacSdk.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
                lmModelSrc: qvacSdk.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
                ditModelSrc,
                vaeModelSrc: qvacSdk.AUDIOGEN_VAE_BF16,
                useGPU: true
              }
            }
          ]
        });
        return { success: true, data: result };
      }
      const { lmModelSrc, synthModelSrc } = this.resolveMiniMaxModelPaths();
      if (lmModelSrc && synthModelSrc) {
        const result = await qvacSdk.assessModelFit({
          models: [
            {
              modelType: "audiogen",
              modelConfig: {
                engine: "minimax",
                lmModelSrc,
                synthModelSrc,
                useGPU: true
              }
            }
          ]
        });
        return { success: true, data: result };
      }
      return { success: true, message: "MiniMax assessment requires local model paths" };
    } catch (err) {
      this.logger.logFailure({
        taskId: "assess-fit",
        engine,
        stage: "ASSESS_FIT",
        error: err,
        options: { engine, ditVariant }
      });
      return { success: false, error: (err == null ? void 0 : err.message) || String(err) };
    }
  }
  /**
   * Discovers downloaded MiniMax-Music3 GGUF model files from disk cache (~/.qvac/models)
   */
  resolveMiniMaxModelPaths(customLm, customSynth) {
    let lmModelSrc = customLm;
    let synthModelSrc = customSynth;
    const cacheDir = path.join(os.homedir(), ".qvac", "models");
    if (fs.existsSync(cacheDir)) {
      try {
        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
          const lower = file.toLowerCase();
          if (lower.endsWith(".download") || lower.endsWith(".tmp") || lower.endsWith(".partial") || lower.endsWith(".crdownload")) {
            continue;
          }
          const fullPath = path.join(cacheDir, file);
          try {
            const st = fs.statSync(fullPath);
            if (!st.isFile() || st.size < 1024 * 1024) continue;
          } catch {
            continue;
          }
          if (!lmModelSrc && (lower.includes("mm3-lm") || lower.includes("minimax") && (lower.includes("lm") || lower.includes("transformer"))) && !lower.includes("vocoder") && !lower.includes("synth")) {
            if (file.includes("-imat.gguf")) {
              const canonicalName = file.replace("-imat.gguf", ".gguf");
              const canonicalPath = path.join(cacheDir, canonicalName);
              if (!fs.existsSync(canonicalPath)) {
                try {
                  fs.linkSync(fullPath, canonicalPath);
                  console.log(`[MusicEngineService] Created quant-matched hardlink: ${canonicalName} -> ${file}`);
                } catch {
                  try {
                    fs.symlinkSync(fullPath, canonicalPath);
                  } catch {
                  }
                }
              }
              if (fs.existsSync(canonicalPath)) {
                lmModelSrc = canonicalPath;
                continue;
              }
            }
            lmModelSrc = fullPath;
          }
          if (!synthModelSrc && (lower.includes("mm3-synth") || lower.includes("minimax") && (lower.includes("synth") || lower.includes("vocoder"))) && !lower.includes("transformer") && !lower.includes("lm")) {
            synthModelSrc = fullPath;
          }
        }
      } catch (err) {
        console.warn("[MusicEngineService] Error resolving MiniMax model paths:", err);
      }
    }
    return { lmModelSrc, synthModelSrc };
  }
  /**
   * Resolves the DiT model source constant based on user variant selection
   */
  resolveDitModelSrc(ditVariant) {
    switch (ditVariant) {
      case "turbo-q8":
        return qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q8_0;
      case "sft-q8":
        return qvacSdk.AUDIOGEN_ACESTEP_V15_SFT_Q8_0;
      case "base-q4":
        return qvacSdk.AUDIOGEN_ACESTEP_V15_BASE_Q4_K_M || qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
      case "turbo-q4":
      default:
        return qvacSdk.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
    }
  }
  /**
   * Ensures the appropriate AudioGen model is loaded in QVAC runtime
   */
  async ensureModelLoaded(options, onProgress) {
    const targetEngine = options.engine || "acestep";
    const targetDit = options.ditVariant || "turbo-q4";
    if (this.activeModelId && this.activeEngine === targetEngine && (targetEngine === "minimax" || this.activeDitVariant === targetDit)) {
      return this.activeModelId;
    }
    if (this.activeModelId) {
      try {
        await qvacSdk.unloadModel({ modelId: this.activeModelId });
      } catch (e) {
        console.warn("[MusicEngineService] Warning unloading prior model:", e);
      }
      this.activeModelId = void 0;
    }
    if (targetEngine === "acestep") {
      const ditModelSrc = this.resolveDitModelSrc(targetDit);
      onProgress == null ? void 0 : onProgress({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Preparing ACE-Step AudioGen models..."
      });
      this.logger.logMilestone("model-load", "LOAD_START", `Loading ACE-Step (${targetDit}) into QVAC runtime`);
      try {
        const modelId = await qvacSdk.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "acestep",
            textEncModelSrc: qvacSdk.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
            lmModelSrc: qvacSdk.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
            ditModelSrc,
            vaeModelSrc: qvacSdk.AUDIOGEN_VAE_BF16,
            useGPU: options.useGPU !== false,
            inferenceSteps: options.inferenceSteps || 8
          },
          onProgress: (p) => {
            var _a;
            const mb = (bytes) => (bytes / 1e6).toFixed(1);
            const filename = ((_a = p.downloadKey) == null ? void 0 : _a.split("/").pop()) || p.downloadKey || "model";
            onProgress == null ? void 0 : onProgress({
              taskId: "model-load",
              stage: "Downloading",
              step: Math.round(p.downloaded / 1e6),
              total: Math.round(p.total / 1e6),
              percentage: p.percentage,
              message: `Downloading ${filename}: ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`
            });
          }
        });
        this.activeModelId = modelId;
        this.activeEngine = "acestep";
        this.activeDitVariant = targetDit;
        this.logger.logMilestone("model-load", "LOAD_SUCCESS", `ACE-Step model loaded ID: ${modelId}`);
        return modelId;
      } catch (loadErr) {
        this.logger.logFailure({
          taskId: "model-load",
          engine: "acestep",
          stage: "LOAD_ACESTEP_RUNTIME",
          error: loadErr,
          options,
          resolvedPaths: { ditModelSrc }
        });
        throw loadErr;
      }
    } else {
      const { lmModelSrc, synthModelSrc } = this.resolveMiniMaxModelPaths(options.lmModelSrc, options.synthModelSrc);
      if (!lmModelSrc || !synthModelSrc) {
        const errMsg = "MiniMax-Music3 model files are not installed. Please download the MiniMax models first.";
        this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "RESOLVE_MINIMAX_PATHS",
          error: new Error(errMsg),
          options,
          resolvedPaths: { lmModelSrc, synthModelSrc }
        });
        console.error(`[MusicEngineService] ✖ MiniMax Model Load Failed: missing model paths`, {
          lmModelSrc,
          synthModelSrc,
          optionsLm: options.lmModelSrc,
          optionsSynth: options.synthModelSrc
        });
        throw new Error(errMsg);
      }
      onProgress == null ? void 0 : onProgress({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Loading MiniMax-Music3 local GGUF models..."
      });
      this.logger.logMilestone("model-load", "LOAD_START", `Loading MiniMax models into QVAC runtime (LM: ${lmModelSrc}, Synth: ${synthModelSrc})`);
      try {
        const modelId = await qvacSdk.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "minimax",
            lmModelSrc,
            synthModelSrc,
            device: options.useGPU === false ? "cpu" : "gpu",
            ...options.threads !== void 0 && { threads: options.threads }
          }
        });
        this.activeModelId = modelId;
        this.activeEngine = "minimax";
        this.logger.logMilestone("model-load", "LOAD_SUCCESS", `MiniMax model loaded successfully! ID: ${modelId}`);
        return modelId;
      } catch (loadErr) {
        this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "LOAD_MINIMAX_RUNTIME",
          error: loadErr,
          options,
          resolvedPaths: { lmModelSrc, synthModelSrc }
        });
        console.error(`[MusicEngineService] ✖ Failed to load MiniMax models in QVAC runtime:`, {
          error: (loadErr == null ? void 0 : loadErr.message) || String(loadErr),
          code: loadErr == null ? void 0 : loadErr.code,
          stack: loadErr == null ? void 0 : loadErr.stack,
          lmModelSrc,
          synthModelSrc
        });
        throw loadErr;
      }
    }
  }
  /**
   * Generates music track based on prompt, lyrics, and musical controls
   */
  async generate(options, onProgress, onLog, isCancelled) {
    const { taskId, caption } = options;
    if (!caption || !caption.trim()) {
      return { success: false, error: "Caption is required and cannot be empty." };
    }
    this.logger.logSessionStart({
      taskId,
      engine: options.engine || "acestep",
      caption,
      lyrics: options.lyrics,
      isInstrumental: options.isInstrumental,
      duration: options.duration,
      ditVariant: options.ditVariant,
      seed: options.seed
    });
    try {
      onLog == null ? void 0 : onLog({ text: `▸ Initializing Music Generation: "${caption}"`, stream: "system" });
      const modelId = await this.ensureModelLoaded(options, onProgress);
      if (isCancelled == null ? void 0 : isCancelled()) {
        this.logger.logMilestone(taskId, "CANCELLED", "Cancelled by user before synthesis started");
        return { success: false, error: "Cancelled by user before synthesis started." };
      }
      this.logger.logMilestone(taskId, "MODEL_READY", `Model ID: ${modelId} (${options.engine || "acestep"})`);
      onLog == null ? void 0 : onLog({ text: `▸ Model loaded successfully: ${modelId} (Engine: ${options.engine || "acestep"})`, stream: "system" });
      const engine = options.engine || "acestep";
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
        taskType: options.taskType
      });
      this.logger.logMilestone(
        taskId,
        "SANITIZED",
        `Cleaned Caption: "${sanitized.caption.slice(0, 80)}..." | Target Duration: ${sanitized.duration}s | LyricsLength: ${sanitized.lyrics.length} | Mode: ${sanitized.isInstrumental ? "INSTRUMENTAL" : "VOCAL"}${sanitized.vocalHintInjected ? ` | VocalInjected: "${sanitized.vocalHintInjected}"` : ""}`
      );
      onLog == null ? void 0 : onLog({
        text: `▸ Request Sanitized: "${sanitized.caption.slice(0, 60)}..." (Mode: ${sanitized.isInstrumental ? "Instrumental" : "Vocal"}, Duration: ${sanitized.duration}s)`,
        stream: "system"
      });
      let runParams = {
        modelId,
        caption: sanitized.caption,
        lyrics: sanitized.lyrics,
        duration: sanitized.duration
      };
      if (options.seed !== void 0) {
        runParams.seed = options.seed;
      }
      if (engine === "acestep") {
        if (options.simpleMode !== false && !sanitized.isInstrumental && !options.lyrics) {
          runParams.simpleMode = true;
          delete runParams.lyrics;
        } else if (sanitized.isInstrumental) {
          runParams.simpleMode = false;
          runParams.lyrics = "[Instrumental]";
        }
        if (!options.vocalLanguage && !sanitized.isInstrumental) {
          runParams.vocalLanguage = "en";
        }
      }
      if (engine === "acestep") {
        if (options.bpm !== void 0) runParams.bpm = options.bpm;
        if (options.keyscale) runParams.keyscale = options.keyscale;
        if (options.timesignature) runParams.timesignature = options.timesignature;
        if (options.vocalLanguage) runParams.vocalLanguage = options.vocalLanguage;
        if (options.augmentCaptionWithMetadata) runParams.augmentCaptionWithMetadata = true;
        if (runParams.simpleMode || options.simpleMode) {
          runParams.simpleMode = true;
        } else if (options.rewriteQuery) {
          runParams.rewriteQuery = true;
        }
        if (options.generateLrc) runParams.generateLrc = true;
        if (options.computeQualityScore) runParams.computeQualityScore = true;
        if (options.normalizeLoudness !== void 0) {
          runParams.normalizeLoudness = options.normalizeLoudness;
        }
        if (options.guidanceScale !== void 0) {
          runParams.guidanceScale = options.guidanceScale;
        }
        if (options.dcwEnabled !== void 0) {
          runParams.dcwEnabled = options.dcwEnabled;
        }
        if (options.dcwScaler !== void 0) {
          runParams.dcwScaler = options.dcwScaler;
        }
        if (options.dcwHighScaler !== void 0) {
          runParams.dcwHighScaler = options.dcwHighScaler;
        }
        if (options.inferenceSteps !== void 0) {
          runParams.inferenceSteps = options.inferenceSteps;
        }
        if (options.shift !== void 0) {
          runParams.shift = options.shift;
        }
        if (options.referenceAudio) {
          runParams.referenceAudio = options.referenceAudio;
        }
        if (options.taskType && options.taskType !== "text2music") {
          runParams.taskType = options.taskType;
          if (options.sourceAudio) {
            runParams.sourceAudio = options.sourceAudio;
          }
          if (options.taskType === "cover-nofsq") {
            runParams.audioCoverStrength = 1;
            runParams.coverNoiseStrength = options.coverNoiseStrength ?? 0.75;
          } else if (options.taskType === "lego") {
            if (options.track) {
              runParams.track = options.track;
            }
          }
        }
      } else {
        runParams.cfgScale = options.cfgScale !== void 0 ? options.cfgScale : 1.8;
        if (options.maxFrames !== void 0) {
          runParams.maxFrames = options.maxFrames;
          delete runParams.duration;
        }
        if (options.inferenceSteps && options.inferenceSteps >= 16) {
          runParams.inferenceSteps = options.inferenceSteps;
        } else {
          runParams.inferenceSteps = 22;
        }
      }
      onLog == null ? void 0 : onLog({ text: `▸ Starting QVAC audioGen inference run...`, stream: "system" });
      const run = qvacSdk.audioGen(runParams);
      this.activeRequestIds.set(taskId, run.requestId);
      onLog == null ? void 0 : onLog({ text: `▸ Assigned requestId: ${run.requestId}`, stream: "system" });
      (async () => {
        try {
          for await (const progress of run.progressStream) {
            if (isCancelled == null ? void 0 : isCancelled()) break;
            const pct = progress.total > 0 ? Math.round(progress.step / progress.total * 100) : 0;
            const msg = progress.total > 0 ? `${progress.stage}: step ${progress.step}/${progress.total}` : `${progress.stage}: step ${progress.step}`;
            onProgress == null ? void 0 : onProgress({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: msg
            });
            onLog == null ? void 0 : onLog({ text: `▸ [${progress.stage}] ${progress.step}/${progress.total || "?"}`, stream: "stdout" });
          }
        } catch (streamErr) {
        }
      })();
      const [audio, stats] = await Promise.all([run.audio, run.stats]);
      this.activeRequestIds.delete(taskId);
      const backendId = stats == null ? void 0 : stats.backendId;
      const backendName = backendId === 1 ? "Metal (Apple GPU)" : backendId === 2 ? "CUDA (GPU)" : backendId === 0 ? "CPU" : backendId !== void 0 ? `Backend #${backendId}` : "Metal (Apple GPU)";
      const fallbackReason = stats == null ? void 0 : stats.gpuFallbackReason;
      this.logger.logMilestone(
        taskId,
        "BACKEND_STATS",
        `Compute Backend: ${backendName}${fallbackReason && fallbackReason !== 0 ? ` (Fallback Reason: ${fallbackReason})` : ""}`
      );
      onLog == null ? void 0 : onLog({
        text: `▸ Compute Backend: ${backendName}`,
        stream: "system"
      });
      onLog == null ? void 0 : onLog({ text: `▸ Synthesis completed! Mastering ${audio.pcm.byteLength} raw PCM bytes...`, stream: "system" });
      const { masteredPcm, details: dspDetails } = MusicDspService.getInstance().masterPcm(
        audio.pcm,
        audio.sampleRate,
        audio.channels,
        audio.bitsPerSample
      );
      this.logger.logMilestone(taskId, "DSP_MASTERED", dspDetails);
      onLog == null ? void 0 : onLog({ text: `▸ Audio Mastered: ${dspDetails}`, stream: "system" });
      const wav = createWav(masteredPcm, audio.sampleRate, audio.channels, audio.bitsPerSample);
      const filename = `music-${Date.now()}-${taskId.slice(0, 8)}.wav`;
      const wavFilePath = path.join(this.musicExportsDir, filename);
      let audioUrl = "";
      try {
        fs.writeFileSync(wavFilePath, Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength));
        audioUrl = `echo-media://${wavFilePath}`;
        onLog == null ? void 0 : onLog({ text: `▸ Exported WAV saved to: ${wavFilePath}`, stream: "system" });
      } catch (writeErr) {
        console.warn("[MusicEngineService] Could not write export file, falling back to data URI:", writeErr);
        audioUrl = wavToDataUri(wav);
      }
      const waveform = computeWaveformPeaks(audio.pcm, audio.bitsPerSample, audio.channels, 64);
      const durationMs = (stats == null ? void 0 : stats.audioDurationMs) || Math.round(audio.pcm.byteLength / (audio.bitsPerSample / 8) / audio.channels / audio.sampleRate * 1e3);
      const renderedMetadata = stats == null ? void 0 : stats.metadata;
      const output = {
        id: `music_gen_${Date.now()}`,
        taskId,
        caption: (renderedMetadata == null ? void 0 : renderedMetadata.caption) || caption,
        lyrics: (renderedMetadata == null ? void 0 : renderedMetadata.lyrics) || options.lyrics,
        audioUrl,
        wavFilePath,
        durationMs,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
        bitsPerSample: audio.bitsPerSample,
        waveform,
        bpm: (renderedMetadata == null ? void 0 : renderedMetadata.bpm) ?? options.bpm,
        keyscale: (renderedMetadata == null ? void 0 : renderedMetadata.keyscale) ?? options.keyscale,
        timesignature: (renderedMetadata == null ? void 0 : renderedMetadata.beatsPerBar) ? `${renderedMetadata.beatsPerBar}/4` : options.timesignature,
        vocalLanguage: (renderedMetadata == null ? void 0 : renderedMetadata.vocalLanguage) ?? options.vocalLanguage,
        isInstrumental: options.isInstrumental ?? runParams.lyrics === "[Instrumental]",
        seed: (renderedMetadata == null ? void 0 : renderedMetadata.seed) ?? options.seed,
        taskType: options.taskType || "text2music",
        lrc: stats == null ? void 0 : stats.lrc,
        lyricsScore: stats == null ? void 0 : stats.lyricsScore,
        qualityScore: stats == null ? void 0 : stats.qualityScore,
        qualityReport: renderedMetadata == null ? void 0 : renderedMetadata.qualityReport,
        stats,
        metadata: renderedMetadata,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.logger.logSuccess(taskId, output);
      onLog == null ? void 0 : onLog({ text: `▸ Music generation finished successfully (${(durationMs / 1e3).toFixed(1)}s)`, stream: "system" });
      return { success: true, data: output };
    } catch (err) {
      this.activeRequestIds.delete(taskId);
      if (err instanceof qvacSdk.InferenceCancelledError || (isCancelled == null ? void 0 : isCancelled())) {
        console.warn(`[MusicEngineService] Generation cancelled for task ${taskId}`);
        this.logger.logMilestone(taskId, "CANCELLED", "Generation was cancelled by user");
        onLog == null ? void 0 : onLog({ text: `▸ Music generation cancelled.`, stream: "stderr" });
        return { success: false, error: "Generation was cancelled." };
      }
      const paths = options.engine === "minimax" ? this.resolveMiniMaxModelPaths(options.lmModelSrc, options.synthModelSrc) : { ditModelSrc: this.resolveDitModelSrc(options.ditVariant) };
      this.logger.logFailure({
        taskId,
        engine: options.engine || "acestep",
        stage: "INFERENCE_RUN",
        error: err,
        options,
        resolvedPaths: paths
      });
      console.error(`[MusicEngineService] ✖ Music Generation FAILED for task ${taskId}:`, {
        error: (err == null ? void 0 : err.message) || String(err),
        code: err == null ? void 0 : err.code,
        stack: err == null ? void 0 : err.stack,
        cause: err == null ? void 0 : err.cause,
        options: {
          engine: options.engine || "acestep",
          caption: options.caption,
          lyrics: options.lyrics ? `${options.lyrics.slice(0, 80)}...` : void 0,
          duration: options.duration,
          ditVariant: options.ditVariant
        }
      });
      onLog == null ? void 0 : onLog({
        text: `✖ Generation Failed: ${(err == null ? void 0 : err.message) || String(err)}${(err == null ? void 0 : err.stack) ? `
${err.stack}` : ""}`,
        stream: "stderr"
      });
      return {
        success: false,
        error: (err == null ? void 0 : err.message) || "Music generation failed.",
        errorDetails: {
          code: err == null ? void 0 : err.code,
          stage: "INFERENCE_RUN",
          engine: options.engine || "acestep",
          stack: err == null ? void 0 : err.stack,
          cause: err == null ? void 0 : err.cause
        }
      };
    }
  }
  /**
   * Edits an existing recording using ACE-Step Flow-Edit or Repaint operations
   */
  async edit(options, onProgress, onLog, isCancelled) {
    const { taskId, sourceAudio, operations } = options;
    if (!sourceAudio) {
      return { success: false, error: "sourceAudio is required for editing." };
    }
    if (!operations || operations.length === 0) {
      return { success: false, error: "At least one edit operation is required." };
    }
    try {
      onLog == null ? void 0 : onLog({ text: `▸ Starting Audio Edit with ${operations.length} operation(s)...`, stream: "system" });
      const modelId = await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4", useGPU: options.useGPU }, onProgress);
      const runParams = {
        modelId,
        sourceAudio,
        operations,
        ...options.seed !== void 0 && { seed: options.seed },
        ...options.referenceAudio && { referenceAudio: options.referenceAudio },
        ...options.vocalLanguage && { vocalLanguage: options.vocalLanguage },
        ...options.bpm !== void 0 && { bpm: options.bpm },
        ...options.keyscale && { keyscale: options.keyscale },
        ...options.timesignature && { timesignature: options.timesignature },
        ...options.augmentCaptionWithMetadata && { augmentCaptionWithMetadata: true },
        ...options.dcwEnabled !== void 0 && { dcwEnabled: options.dcwEnabled },
        ...options.dcwScaler !== void 0 && { dcwScaler: options.dcwScaler },
        ...options.dcwHighScaler !== void 0 && { dcwHighScaler: options.dcwHighScaler },
        ...options.inferenceSteps !== void 0 && { inferenceSteps: options.inferenceSteps },
        ...options.shift !== void 0 && { shift: options.shift }
      };
      const run = qvacSdk.audioEdit(runParams);
      this.activeRequestIds.set(taskId, run.requestId);
      (async () => {
        try {
          for await (const progress of run.progressStream) {
            if (isCancelled == null ? void 0 : isCancelled()) break;
            const pct = progress.total > 0 ? Math.round(progress.step / progress.total * 100) : 0;
            onProgress == null ? void 0 : onProgress({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: `${progress.stage}: ${progress.step}/${progress.total}`
            });
          }
        } catch {
        }
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
      const durationMs = (stats == null ? void 0 : stats.audioDurationMs) || Math.round(audio.pcm.byteLength / (audio.bitsPerSample / 8) / audio.channels / audio.sampleRate * 1e3);
      const output = {
        id: `music_edit_${Date.now()}`,
        taskId,
        caption: `Edit (${operations.map((op) => op.type).join(" + ")})`,
        audioUrl,
        wavFilePath,
        durationMs,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
        bitsPerSample: audio.bitsPerSample,
        waveform,
        stats,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return { success: true, data: output };
    } catch (err) {
      this.activeRequestIds.delete(taskId);
      if (err instanceof qvacSdk.InferenceCancelledError || (isCancelled == null ? void 0 : isCancelled())) {
        return { success: false, error: "Edit was cancelled." };
      }
      return { success: false, error: (err == null ? void 0 : err.message) || "Audio edit failed." };
    }
  }
  /**
   * Describes an existing recording using ACE-Step reverse analysis pipeline
   */
  async understand(options, onProgress, onLog) {
    const { taskId, sourceAudio, vocalLanguage, seed } = options;
    if (!sourceAudio) {
      return { success: false, error: "sourceAudio is required for audio understand." };
    }
    try {
      onLog == null ? void 0 : onLog({ text: `▸ Analyzing audio recording with ACE-Step AudioUnderstand...`, stream: "system" });
      const modelId = await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4" }, onProgress);
      const runParams = {
        modelId,
        sourceAudio,
        ...vocalLanguage && { vocalLanguage },
        ...seed !== void 0 && { seed },
        ...options.lmTemperature !== void 0 && { lmTemperature: options.lmTemperature },
        ...options.lmTopP !== void 0 && { lmTopP: options.lmTopP },
        ...options.lmTopK !== void 0 && { lmTopK: options.lmTopK }
      };
      const run = qvacSdk.audioUnderstand(runParams);
      this.activeRequestIds.set(taskId, run.requestId);
      (async () => {
        try {
          for await (const progress of run.progressStream) {
            const pct = progress.total > 0 ? Math.round(progress.step / progress.total * 100) : 0;
            onProgress == null ? void 0 : onProgress({
              taskId,
              stage: progress.stage,
              step: progress.step,
              total: progress.total,
              percentage: pct,
              message: `${progress.stage}: ${progress.step}/${progress.total}`
            });
          }
        } catch {
        }
      })();
      const description = await run.description;
      this.activeRequestIds.delete(taskId);
      onLog == null ? void 0 : onLog({ text: `▸ Analysis complete! Detected: ${description.bpm} BPM, ${description.keyscale}, ${description.timesignature}`, stream: "system" });
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
          seed: description.seed
        }
      };
    } catch (err) {
      this.activeRequestIds.delete(taskId);
      return { success: false, error: (err == null ? void 0 : err.message) || "Audio analysis failed." };
    }
  }
  /**
   * Hard-cancels an in-flight QVAC generation or edit task
   */
  cancel(taskId) {
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
  getStatus() {
    const models = [
      {
        id: "audiogen-qwen3-embedding",
        name: "Qwen3 Embedding Text Encoder (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0",
        sizeBytes: 784144960,
        sizeFormatted: "784 MB",
        stage: "text-encoder",
        downloaded: false,
        status: "idle"
      },
      {
        id: "audiogen-acestep-5hz-lm",
        name: "ACE-Step 5Hz Language Model (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0",
        sizeBytes: 709846656,
        sizeFormatted: "710 MB",
        stage: "lm",
        downloaded: false,
        status: "idle"
      },
      {
        id: "audiogen-acestep-turbo-dit",
        name: "ACE-Step v1.5 Turbo DiT (Q4_K_M)",
        descriptorName: "AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M",
        sizeBytes: 1445710272,
        sizeFormatted: "1.45 GB",
        stage: "dit",
        downloaded: false,
        status: "idle"
      },
      {
        id: "audiogen-vae-bf16",
        name: "ACE-Step Audio VAE (BF16)",
        descriptorName: "AUDIOGEN_VAE_BF16",
        sizeBytes: 337420928,
        sizeFormatted: "337 MB",
        stage: "vae",
        downloaded: false,
        status: "idle"
      }
    ];
    return {
      ready: !!this.activeModelId,
      activeModelId: this.activeModelId,
      engine: this.activeEngine || "acestep",
      models,
      gpuAvailable: true
    };
  }
  /**
   * Unloads active model to free GPU memory
   */
  async unload() {
    if (this.activeModelId) {
      try {
        await qvacSdk.unloadModel({ modelId: this.activeModelId });
        this.activeModelId = void 0;
        this.activeEngine = void 0;
        this.activeDitVariant = void 0;
        return true;
      } catch (err) {
        console.warn("[MusicEngineService] Error unloading model:", err);
      }
    }
    return false;
  }
  /**
   * Retrieves recent music generation logs
   */
  getRecentLogs(limitLines) {
    return this.logger.getRecentLogs(limitLines);
  }
  /**
   * Clears generation log files
   */
  clearLogs() {
    return this.logger.clearLogs();
  }
}
class MusicService {
  constructor() {
    __publicField(this, "activeTasks", /* @__PURE__ */ new Set());
    __publicField(this, "engineService");
    __publicField(this, "historyFilePath");
    __publicField(this, "historyCache", []);
    var _a;
    this.engineService = new MusicEngineService();
    try {
      const userData = ((_a = app) == null ? void 0 : _a.getPath) ? app.getPath("userData") : process.cwd();
      this.historyFilePath = path.join(userData, "music-history.json");
      this.loadHistoryFromDisk();
    } catch {
      this.historyFilePath = path.join(process.cwd(), "music-history.json");
    }
  }
  sanitizeItem(item) {
    const clean = { ...item };
    if (clean.wavFilePath && fs.existsSync(clean.wavFilePath)) {
      clean.audioUrl = `echo-media://${clean.wavFilePath}`;
    } else if (clean.audioUrl && clean.audioUrl.startsWith("data:") && clean.audioUrl.length > 5e4) {
      clean.audioUrl = "";
    }
    return clean;
  }
  loadHistoryFromDisk() {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.historyCache = parsed.map((item) => this.sanitizeItem(item));
        }
      }
    } catch (e) {
      console.warn("[MusicService] Could not read music history:", e);
      this.historyCache = [];
    }
  }
  saveHistoryToDisk() {
    try {
      const sanitized = this.historyCache.slice(0, 100).map((item) => this.sanitizeItem(item));
      fs.writeFileSync(this.historyFilePath, JSON.stringify(sanitized, null, 2), "utf-8");
    } catch (e) {
      console.warn("[MusicService] Could not write music history:", e);
    }
  }
  getModelStatus() {
    return this.engineService.getStatus();
  }
  async assessFit(engine, ditVariant) {
    return this.engineService.assessFit(engine, ditVariant);
  }
  async unloadModel() {
    return this.engineService.unload();
  }
  cancelGeneration(taskId) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      return this.engineService.cancel(taskId);
    }
    return false;
  }
  isCancelled(taskId) {
    return !this.activeTasks.has(taskId);
  }
  async generateMusic(options, onProgress, onLog) {
    const { taskId } = options;
    this.activeTasks.add(taskId);
    try {
      const result = await this.engineService.generate(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      );
      if (result.success && result.data) {
        this.historyCache.unshift(result.data);
        this.saveHistoryToDisk();
      }
      return result;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }
  async editMusic(options, onProgress, onLog) {
    const { taskId } = options;
    this.activeTasks.add(taskId);
    try {
      const result = await this.engineService.edit(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      );
      if (result.success && result.data) {
        this.historyCache.unshift(result.data);
        this.saveHistoryToDisk();
      }
      return result;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }
  async understandMusic(options, onProgress, onLog) {
    return this.engineService.understand(options, onProgress, onLog);
  }
  listHistory() {
    return this.historyCache;
  }
  getHistoryItem(id) {
    return this.historyCache.find((h) => h.id === id || h.taskId === id);
  }
  saveHistoryItem(item) {
    const index = this.historyCache.findIndex((h) => h.id === item.id);
    if (index >= 0) {
      this.historyCache[index] = item;
    } else {
      this.historyCache.unshift(item);
    }
    this.saveHistoryToDisk();
    return true;
  }
  deleteHistoryItem(id) {
    const initialLen = this.historyCache.length;
    this.historyCache = this.historyCache.filter((h) => h.id !== id);
    if (this.historyCache.length !== initialLen) {
      this.saveHistoryToDisk();
      return true;
    }
    return false;
  }
  clearHistory() {
    this.historyCache = [];
    this.saveHistoryToDisk();
    return true;
  }
  getGenerationLogs(limitLines) {
    return this.engineService.getRecentLogs(limitLines);
  }
  clearGenerationLogs() {
    return this.engineService.clearLogs();
  }
}
const _QwenLyricService = class _QwenLyricService {
  constructor() {
    __publicField(this, "activeModelId", null);
    __publicField(this, "isLoadingModel", false);
  }
  static getInstance() {
    if (!_QwenLyricService.instance) {
      _QwenLyricService.instance = new _QwenLyricService();
    }
    return _QwenLyricService.instance;
  }
  /**
   * Ensures the Qwen3-1.7B Instruct model is loaded into memory on Apple Metal GPU.
   */
  async ensureModelLoaded(onProgress) {
    if (this.activeModelId) {
      return this.activeModelId;
    }
    if (this.isLoadingModel) {
      while (this.isLoadingModel) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.activeModelId) return this.activeModelId;
    }
    this.isLoadingModel = true;
    try {
      console.log("[QwenLyricService] ▸ Loading Qwen3-1.7B Instruct LLM for lyric generation...");
      const modelId = await qvacSdk.loadModel({
        modelSrc: qvacSdk.QWEN3_1_7B_INST_Q4,
        onProgress: (p) => {
          onProgress == null ? void 0 : onProgress(p);
        }
      });
      this.activeModelId = modelId;
      console.log(`[QwenLyricService] ✓ Qwen3-1.7B loaded successfully with ID: ${modelId}`);
      return modelId;
    } catch (err) {
      console.error("[QwenLyricService] ✖ Failed to load Qwen3-1.7B:", err);
      throw err;
    } finally {
      this.isLoadingModel = false;
    }
  }
  /**
   * Generates song lyrics from a description, streaming tokens in real time.
   */
  async generateLyricsStream(prompt, onToken, onProgress) {
    const cleanPrompt = (prompt || "").trim() || "A soulful, emotional song about life and hope";
    try {
      const modelId = await this.ensureModelLoaded(onProgress);
      const systemPrompt = `You are an elite, Grammy-award winning songwriter.
Write complete, poetic, rhyming song lyrics based on the user's musical song description.

Formatting Rules:
1. Organize into canonical musical sections with tags:
[verse]
[chorus]
[verse]
[bridge]
[chorus]
[outro]
2. Output ONLY the lyrics and section tags. Never output conversational remarks, intros, or commentary.
3. Use natural rhyming (AABB or ABAB) and musical meter that is easy to sing.
4. Capture the exact mood, imagery, and style requested in the description.`;
      const userPrompt = `Write song lyrics for this description: "${cleanPrompt}"`;
      const run = qvacSdk.completion({
        modelId,
        history: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        captureThinking: true,
        stream: true
      });
      let fullLyrics = "";
      for await (const event of run.events) {
        if (event.type === "contentDelta" && event.text) {
          fullLyrics += event.text;
          onToken == null ? void 0 : onToken(event.text);
        }
      }
      const final = await run.final;
      const resultText = (final.contentText || fullLyrics).trim();
      const sanitizedResult = resultText.startsWith("[") ? resultText : `[verse]
${resultText}`;
      return { lyrics: sanitizedResult, engine: "qwen-1.7b" };
    } catch (err) {
      console.warn("[QwenLyricService] Qwen streaming failed, using fallback lyric generator:", err);
      const fallbackLyrics = this.getFallbackLyrics(cleanPrompt);
      for (const char of fallbackLyrics) {
        onToken == null ? void 0 : onToken(char);
        await new Promise((r) => setTimeout(r, 6));
      }
      return { lyrics: fallbackLyrics, engine: "fallback" };
    }
  }
  /**
   * Fast rule-based fallback if LLM is unreachable or offline
   */
  getFallbackLyrics(prompt) {
    const lower = prompt.toLowerCase();
    if (/(medieval|celtic|harp|fantasy|bard|tavern|folk)/.test(lower)) {
      return `[verse]
The banners fall beneath the crimson dawn,
A bitter wind blows through the broken shield,
The kings are buried and the armies gone,
And silence settles on the frozen field.

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[verse]
The village smokes into the autumn sky,
Cold ashes drift across the stony path,
No victor smiles beneath the raven's cry,
For who survives the fury of their wrath?

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[bridge]
Let the embers fade, let the trumpets die,
No march remains for those who could not stand,
Only the stars across the northern sky,
Watching the weeping of a weary land.

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
    }
    if (/(synthwave|retro|neon|cyberpunk|80s)/.test(lower)) {
      return `[verse]
Purple neon reflecting in the rain,
Speedometer climbing on the open lane,
Digital echoes through the midnight mist,
Chasing a future that we almost missed.

[chorus]
We ride the synthwave into the dark,
Ignite the engine, electric spark,
The grid is open, the road is clear,
Nothing can touch us while we are here!

[verse]
Chromed-out reflections in the driver side,
Running on dreams that we refuse to hide,
Flickering signals in the city breeze,
Lost in the hum of electronic keys.

[chorus]
We ride the synthwave into the dark,
Ignite the engine, electric spark,
The grid is open, the road is clear,
Nothing can touch us while we are here!

[bridge]
Accelerate past the boundary line,
Out of the shadows into the shine,
Analog pulses guiding the way,
Running forever away from the day.

[outro]
Synth pads fading into the night...
Driving forever into the light...`;
    }
    return `[verse]
Raindrops running down the window pane,
Every little memory feels so plain,
I know that tomorrow the sun will rise,
Yet all I can picture is your eyes.

[chorus]
And if you look back from where you are,
Know that I'm wishing upon that star,
That somewhere down this winding track,
The road will guide you back.

[verse]
I still find your coffee mug on the shelf,
Spending my evenings talking to myself,
The hallway echoes with the words we said,
Replaying the moments in my head.

[chorus]
And if you look back from where you are,
Know that I'm wishing upon that star,
That somewhere down this winding track,
The road will guide you back.

[bridge]
Time was supposed to heal the ache,
How much more can one spirit take?
I whisper your name into the breeze,
Begging my restless mind for peace.

[outro]
Piano notes linger soft and slow...
I loved you enough to let you go...`;
  }
};
__publicField(_QwenLyricService, "instance");
let QwenLyricService = _QwenLyricService;
class MusicController extends BaseController {
  constructor(musicService, activityRepo) {
    super();
    this.musicService = musicService;
    this.activityRepo = activityRepo;
  }
  init() {
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_GENERATE,
      async (event, options) => {
        const sendProgress = (data) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send progress event:", err);
          }
        };
        const sendLog = (log) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: "echo-ai",
                text: log.text,
                stream: log.stream,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send log event:", err);
          }
        };
        const result = await this.musicService.generateMusic(options, sendProgress, sendLog);
        if (result.success && result.data) {
          this.saveMusicActivity(result.data);
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_COMPLETE, {
                taskId: options.taskId,
                generation: result.data
              });
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send complete event:", err);
          }
        } else if (!result.success) {
          console.error(
            `[MusicController] ✖ Music generation failed for taskId ${options.taskId} (Engine: ${options.engine || "acestep"}):`,
            result.error
          );
          sendLog({
            text: `✖ Music Generation Failed: ${result.error}`,
            stream: "stderr"
          });
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_ERROR, {
                taskId: options.taskId,
                error: result.error || "Music generation failed",
                details: result.errorDetails
              });
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send error event:", err);
          }
        }
        return result;
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_CANCEL,
      async (_event, { taskId }) => {
        const cancelled = this.musicService.cancelGeneration(taskId);
        return { success: cancelled, taskId };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_EDIT,
      async (event, options) => {
        const sendProgress = (data) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send progress event:", err);
          }
        };
        const sendLog = (log) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: "echo-ai",
                text: log.text,
                stream: log.stream,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send log event:", err);
          }
        };
        const result = await this.musicService.editMusic(options, sendProgress, sendLog);
        if (result.success && result.data) {
          this.saveMusicActivity(result.data);
        }
        return result;
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_UNDERSTAND,
      async (event, options) => {
        const sendProgress = (data) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send progress event:", err);
          }
        };
        const sendLog = (log) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: "echo-ai",
                text: log.text,
                stream: log.stream,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (err) {
            console.warn("[MusicController] Failed to send log event:", err);
          }
        };
        const result = await this.musicService.understandMusic(options, sendProgress, sendLog);
        return result;
      }
    );
    ipcMain.handle(IPC_CHANNELS.MUSIC_MODEL_STATUS, async () => {
      return {
        success: true,
        data: this.musicService.getModelStatus()
      };
    });
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_ASSESS_FIT,
      async (_event, payload) => {
        return this.musicService.assessFit(payload == null ? void 0 : payload.engine, payload == null ? void 0 : payload.ditVariant);
      }
    );
    ipcMain.handle(IPC_CHANNELS.MUSIC_UNLOAD_MODEL, async () => {
      const unloaded = await this.musicService.unloadModel();
      return { success: unloaded };
    });
    ipcMain.handle(IPC_CHANNELS.MUSIC_HISTORY_LIST, async () => {
      return {
        success: true,
        data: this.musicService.listHistory()
      };
    });
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_HISTORY_SAVE,
      async (_event, item) => {
        const saved = this.musicService.saveHistoryItem(item);
        if (saved) {
          this.saveMusicActivity(item);
        }
        return { success: saved };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_HISTORY_DELETE,
      async (_event, { id }) => {
        const deleted = this.musicService.deleteHistoryItem(id);
        if (this.activityRepo) {
          this.activityRepo.deleteActivity(`act-music-${id}`).catch(console.error);
        }
        return { success: deleted };
      }
    );
    ipcMain.handle(IPC_CHANNELS.MUSIC_HISTORY_CLEAR, async () => {
      const cleared = this.musicService.clearHistory();
      return { success: cleared };
    });
    ipcMain.handle(IPC_CHANNELS.MUSIC_GET_LOGS, async (_event, limitLines) => {
      const logs = this.musicService.getGenerationLogs(limitLines);
      return { success: true, data: logs };
    });
    ipcMain.handle(IPC_CHANNELS.MUSIC_CLEAR_LOGS, async () => {
      const cleared = this.musicService.clearGenerationLogs();
      return { success: cleared };
    });
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_GENERATE_LYRICS,
      async (event, payload) => {
        const taskId = payload.taskId || `lyric_task_${Date.now()}`;
        const onToken = (token) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_LYRICS_TOKEN, { taskId, token });
            }
          } catch {
          }
        };
        try {
          const result = await QwenLyricService.getInstance().generateLyricsStream(payload.prompt, onToken);
          return { success: true, lyrics: result.lyrics, engine: result.engine, taskId };
        } catch (err) {
          console.error("[MusicController] Error generating lyrics with Qwen:", err);
          return { success: false, error: (err == null ? void 0 : err.message) || "Failed to generate lyrics", taskId };
        }
      }
    );
  }
  saveMusicActivity(item) {
    if (!this.activityRepo) return;
    const rawCaption = item.caption || "Music Track";
    const title = rawCaption.length > 50 ? `${rawCaption.slice(0, 47)}...` : rawCaption;
    const mediaAudioUrl = item.wavFilePath ? `echo-media://${item.wavFilePath}` : item.audioUrl && item.audioUrl.length > 5e4 ? "" : item.audioUrl;
    this.activityRepo.saveActivity({
      id: `act-music-${item.id}`,
      type: "music",
      title,
      description: item.lyrics ? item.lyrics.slice(0, 160) : item.caption,
      category: "Music Generation",
      subCategory: "AudioGen",
      originId: item.id,
      originType: "music",
      metadata: {
        taskId: item.taskId,
        caption: item.caption,
        lyrics: item.lyrics,
        audioUrl: mediaAudioUrl,
        wavFilePath: item.wavFilePath,
        durationMs: item.durationMs,
        duration: item.durationMs ? `${Math.round(item.durationMs / 1e3)}s` : "Audio",
        waveform: item.waveform || [],
        bpm: item.bpm,
        keyscale: item.keyscale,
        timesignature: item.timesignature,
        vocalLanguage: item.vocalLanguage,
        engine: "acestep",
        cover: "/covers/got/direwolf.jpg"
      }
    }).catch((err) => console.error("[MusicController] Failed to auto-save activity:", err));
  }
}
class ActivityRepositoryService {
  constructor(db, musicService) {
    __publicField(this, "db");
    __publicField(this, "musicService");
    this.db = db;
    this.musicService = musicService;
  }
  /**
   * Resolve origin data (TTS, Music, Story) based on activity record and relations
   */
  formatActivityRecord(a) {
    var _a;
    let parsedMetadata = void 0;
    if (a.metadata) {
      try {
        parsedMetadata = typeof a.metadata === "string" ? JSON.parse(a.metadata) : a.metadata;
        if (parsedMetadata && typeof parsedMetadata === "object") {
          const rawUrl = parsedMetadata.audioUrl;
          const wavPath = parsedMetadata.wavFilePath;
          if (wavPath) {
            parsedMetadata.audioUrl = `echo-media://${wavPath}`;
          } else if (rawUrl && rawUrl.startsWith("data:") && rawUrl.length > 5e4) {
            parsedMetadata.audioUrl = "";
          }
        }
      } catch {
        parsedMetadata = void 0;
      }
    }
    const ttsData = a.conversation ? {
      id: a.conversation.id,
      text: a.conversation.text,
      previewSnippet: a.conversation.previewSnippet || a.conversation.text,
      voiceName: a.conversation.voiceName,
      voiceColor: a.conversation.voiceColor,
      voiceAvatarUrl: a.conversation.voiceAvatarUrl,
      model: a.conversation.model,
      engine: a.conversation.engine,
      duration: a.conversation.duration,
      durationSec: a.conversation.durationSec,
      emotion: a.conversation.emotion,
      audioUrl: a.conversation.audioUrl,
      waveform: a.conversation.waveform ? JSON.parse(a.conversation.waveform) : [],
      speakerCount: a.conversation.speakerCount,
      rounds: Array.isArray(a.conversation.rounds) ? a.conversation.rounds.map((r) => ({
        id: r.id,
        roundOrder: r.roundOrder,
        voiceId: r.voiceId,
        text: r.text,
        speed: r.speed,
        emotion: r.emotion,
        pace: r.pace,
        prompt: r.prompt,
        description: r.description,
        referenceAudioSrc: r.referenceAudioSrc,
        speakerName: r.speakerName,
        speakerColor: r.speakerColor
      })) : []
    } : a.type === "tts" && parsedMetadata ? {
      id: a.originId || a.id.replace(/^act-/, ""),
      text: a.description || parsedMetadata.text || a.title,
      previewSnippet: parsedMetadata.previewSnippet || a.description || a.title,
      voiceName: parsedMetadata.voiceName || a.subCategory || "Speech Synthesis",
      voiceColor: parsedMetadata.voiceColor || "#38bdf8",
      voiceAvatarUrl: parsedMetadata.voiceAvatarUrl || "/voices/sterling.jpg",
      model: parsedMetadata.model || "cosyvoice-v1",
      engine: parsedMetadata.engine || "cosyvoice3",
      duration: parsedMetadata.duration || "Audio",
      durationSec: parsedMetadata.durationSec || 0,
      emotion: parsedMetadata.emotion || void 0,
      audioUrl: parsedMetadata.audioUrl || void 0,
      waveform: Array.isArray(parsedMetadata.waveform) ? parsedMetadata.waveform : [],
      speakerCount: parsedMetadata.speakerCount || 1,
      rounds: Array.isArray(parsedMetadata.rounds) ? parsedMetadata.rounds : []
    } : void 0;
    let musicData = void 0;
    if (a.type === "music") {
      const musicId = a.originId || a.id.replace(/^act-music-/, "").replace(/^act-/, "");
      const cached = (_a = this.musicService) == null ? void 0 : _a.getHistoryItem(musicId);
      const wavPath = (cached == null ? void 0 : cached.wavFilePath) || (parsedMetadata == null ? void 0 : parsedMetadata.wavFilePath);
      let resolvedAudioUrl = wavPath ? `echo-media://${wavPath}` : (cached == null ? void 0 : cached.audioUrl) || (parsedMetadata == null ? void 0 : parsedMetadata.audioUrl);
      if (resolvedAudioUrl && resolvedAudioUrl.startsWith("data:") && resolvedAudioUrl.length > 5e4) {
        resolvedAudioUrl = void 0;
      }
      musicData = {
        id: musicId,
        taskId: (cached == null ? void 0 : cached.taskId) || (parsedMetadata == null ? void 0 : parsedMetadata.taskId) || void 0,
        title: a.title,
        caption: (cached == null ? void 0 : cached.caption) || (parsedMetadata == null ? void 0 : parsedMetadata.caption) || a.title,
        lyrics: (cached == null ? void 0 : cached.lyrics) || (parsedMetadata == null ? void 0 : parsedMetadata.lyrics) || void 0,
        audioUrl: resolvedAudioUrl,
        wavFilePath: wavPath || void 0,
        duration: (parsedMetadata == null ? void 0 : parsedMetadata.duration) || ((cached == null ? void 0 : cached.durationMs) ? `${Math.round(cached.durationMs / 1e3)}s` : "Audio"),
        durationMs: (cached == null ? void 0 : cached.durationMs) || (parsedMetadata == null ? void 0 : parsedMetadata.durationMs) || void 0,
        waveform: (cached == null ? void 0 : cached.waveform) || (parsedMetadata == null ? void 0 : parsedMetadata.waveform) || [],
        bpm: (cached == null ? void 0 : cached.bpm) || (parsedMetadata == null ? void 0 : parsedMetadata.bpm) || void 0,
        keyscale: (cached == null ? void 0 : cached.keyscale) || (parsedMetadata == null ? void 0 : parsedMetadata.keyscale) || void 0,
        timesignature: (cached == null ? void 0 : cached.timesignature) || (parsedMetadata == null ? void 0 : parsedMetadata.timesignature) || void 0,
        vocalLanguage: (cached == null ? void 0 : cached.vocalLanguage) || (parsedMetadata == null ? void 0 : parsedMetadata.vocalLanguage) || void 0,
        seed: (cached == null ? void 0 : cached.seed) || (parsedMetadata == null ? void 0 : parsedMetadata.seed) || void 0,
        taskType: (cached == null ? void 0 : cached.taskType) || (parsedMetadata == null ? void 0 : parsedMetadata.taskType) || void 0,
        lrc: (cached == null ? void 0 : cached.lrc) || (parsedMetadata == null ? void 0 : parsedMetadata.lrc) || void 0,
        qualityScore: (cached == null ? void 0 : cached.qualityScore) || (parsedMetadata == null ? void 0 : parsedMetadata.qualityScore) || void 0,
        engine: (parsedMetadata == null ? void 0 : parsedMetadata.engine) || "acestep",
        cover: (parsedMetadata == null ? void 0 : parsedMetadata.cover) || "/covers/got/direwolf.jpg",
        createdAt: (cached == null ? void 0 : cached.createdAt) || (a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt)
      };
    }
    let storyData = void 0;
    if (a.type === "story" || a.type === "stories") {
      const storyId = a.originId || a.id.replace(/^act-story-/, "").replace(/^act-/, "");
      storyData = {
        id: storyId,
        title: a.title,
        subtitle: (parsedMetadata == null ? void 0 : parsedMetadata.subtitle) || a.description || void 0,
        narrator: (parsedMetadata == null ? void 0 : parsedMetadata.narrator) || a.subCategory || "Narrator",
        duration: (parsedMetadata == null ? void 0 : parsedMetadata.duration) || "Story",
        audioUrl: (parsedMetadata == null ? void 0 : parsedMetadata.audioUrl) || void 0,
        cover: (parsedMetadata == null ? void 0 : parsedMetadata.cover) || "/covers/got/winterfell.jpg",
        text: a.description || (parsedMetadata == null ? void 0 : parsedMetadata.text) || void 0,
        chapters: Array.isArray(parsedMetadata == null ? void 0 : parsedMetadata.chapters) ? parsedMetadata.chapters : [],
        model: (parsedMetadata == null ? void 0 : parsedMetadata.model) || void 0,
        engine: (parsedMetadata == null ? void 0 : parsedMetadata.engine) || void 0,
        characterVoices: Array.isArray(parsedMetadata == null ? void 0 : parsedMetadata.characterVoices) ? parsedMetadata.characterVoices : void 0,
        backgroundMusicUrl: (parsedMetadata == null ? void 0 : parsedMetadata.backgroundMusicUrl) || void 0,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt
      };
    }
    const relatedData = ttsData || musicData || storyData || (parsedMetadata ? { ...parsedMetadata } : void 0);
    return {
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description || void 0,
      category: a.category || void 0,
      subCategory: a.subCategory || void 0,
      originId: a.originId || void 0,
      originType: a.originType || void 0,
      conversationId: a.conversationId || void 0,
      metadata: parsedMetadata,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
      // Related origin data returned when fetching activities
      data: relatedData,
      origin: relatedData,
      tts: ttsData,
      music: musicData,
      story: storyData
    };
  }
  /**
   * Automatically ensure all origins (e.g. Conversation, Music) have corresponding 1-to-1 Activity records
   */
  async syncMissingOrigins() {
    try {
      const existingActivities = await this.db.client.activity.findMany({
        where: {
          OR: [{ conversationId: { not: null } }, { type: "tts" }]
        },
        select: {
          conversationId: true,
          originId: true
        }
      });
      const linkedIds = /* @__PURE__ */ new Set();
      for (const act of existingActivities) {
        const item = act;
        if (item.conversationId) linkedIds.add(item.conversationId);
        if (item.originId) linkedIds.add(item.originId);
      }
      const unlinkedConversations = await this.db.client.conversation.findMany({
        where: linkedIds.size > 0 ? {
          id: {
            notIn: Array.from(linkedIds)
          }
        } : void 0,
        include: {
          rounds: {
            orderBy: { roundOrder: "asc" }
          }
        }
      });
      for (const conv of unlinkedConversations) {
        const rawSnippet = conv.previewSnippet || conv.text || "";
        const cleanSnippet = rawSnippet.replace(/\s+/g, " ").trim();
        const baseTitle = cleanSnippet ? cleanSnippet.length > 55 ? `${cleanSnippet.slice(0, 52)}...` : cleanSnippet : `${conv.voiceName || "Speech Synthesis"} Turn`;
        let uniqueTitle = baseTitle;
        let counter = 1;
        while (await this.db.client.activity.findUnique({ where: { title: uniqueTitle } })) {
          counter++;
          uniqueTitle = `${baseTitle} #${counter}`;
        }
        const activityMetadata = JSON.stringify({
          model: conv.model,
          engine: conv.engine,
          duration: conv.duration,
          durationSec: conv.durationSec,
          emotion: conv.emotion,
          audioUrl: conv.audioUrl,
          waveform: conv.waveform ? JSON.parse(conv.waveform) : [],
          speakerCount: conv.speakerCount
        });
        await this.db.client.activity.create({
          data: {
            id: `act-${conv.id}`,
            type: "tts",
            title: uniqueTitle,
            category: "Text to Speech",
            subCategory: conv.speakerCount > 1 ? `${conv.speakerCount} Speakers Diarized` : conv.voiceName,
            description: cleanSnippet ? cleanSnippet.slice(0, 160) : null,
            originId: conv.id,
            originType: "conversation",
            conversationId: conv.id,
            metadata: activityMetadata
          }
        });
      }
      if (this.musicService) {
        const history = this.musicService.listHistory();
        for (const item of history) {
          const actId = `act-music-${item.id}`;
          const existing = await this.db.client.activity.findFirst({
            where: {
              OR: [{ id: actId }, { originId: item.id }]
            }
          });
          if (!existing) {
            const rawCaption = item.caption || "Music Track";
            const baseTitle = rawCaption.length > 50 ? `${rawCaption.slice(0, 47)}...` : rawCaption;
            let uniqueTitle = baseTitle;
            let counter = 1;
            while (await this.db.client.activity.findUnique({ where: { title: uniqueTitle } })) {
              counter++;
              uniqueTitle = `${baseTitle} #${counter}`;
            }
            const mediaAudioUrl = item.wavFilePath ? `echo-media://${item.wavFilePath}` : item.audioUrl && item.audioUrl.length > 5e4 ? "" : item.audioUrl;
            await this.db.client.activity.create({
              data: {
                id: actId,
                type: "music",
                title: uniqueTitle,
                description: item.lyrics ? item.lyrics.slice(0, 160) : item.caption,
                category: "Music Generation",
                subCategory: "AudioGen",
                originId: item.id,
                originType: "music",
                metadata: JSON.stringify({
                  taskId: item.taskId,
                  caption: item.caption,
                  lyrics: item.lyrics,
                  audioUrl: mediaAudioUrl,
                  wavFilePath: item.wavFilePath,
                  durationMs: item.durationMs,
                  duration: item.durationMs ? `${Math.round(item.durationMs / 1e3)}s` : "Audio",
                  waveform: item.waveform || [],
                  bpm: item.bpm,
                  keyscale: item.keyscale,
                  timesignature: item.timesignature,
                  vocalLanguage: item.vocalLanguage
                })
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn("[ActivityRepositoryService] Error syncing missing origins:", err);
    }
  }
  /**
   * Query all activities ordered by latest creation date, including origin relations
   */
  async listActivities() {
    await this.db.init();
    try {
      await this.syncMissingOrigins();
      const records = await this.db.client.activity.findMany({
        include: {
          conversation: {
            include: {
              rounds: {
                orderBy: { roundOrder: "asc" }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      return records.map((a) => this.formatActivityRecord(a));
    } catch (err) {
      console.error("[ActivityRepositoryService] Failed to query activities:", err);
      return [];
    }
  }
  /**
   * Find an activity by ID including related origin data
   */
  async getActivityById(id) {
    await this.db.init();
    try {
      const record = await this.db.client.activity.findUnique({
        where: { id },
        include: {
          conversation: {
            include: {
              rounds: {
                orderBy: { roundOrder: "asc" }
              }
            }
          }
        }
      });
      if (!record) return null;
      return this.formatActivityRecord(record);
    } catch (err) {
      console.error("[ActivityRepositoryService] Failed to find activity by ID:", err);
      return null;
    }
  }
  /**
   * Find an activity by origin ID (e.g. conversationId) including related origin data
   */
  async getActivityByOrigin(originId) {
    await this.db.init();
    try {
      const record = await this.db.client.activity.findFirst({
        where: {
          OR: [{ conversationId: originId }, { originId }]
        },
        include: {
          conversation: {
            include: {
              rounds: {
                orderBy: { roundOrder: "asc" }
              }
            }
          }
        }
      });
      if (!record) return null;
      return this.formatActivityRecord(record);
    } catch (err) {
      console.error("[ActivityRepositoryService] Failed to find activity by origin:", err);
      return null;
    }
  }
  /**
   * Save or update an activity in SQLite
   */
  async saveActivity(data) {
    await this.db.init();
    try {
      const metadataStr = data.metadata ? typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata) : null;
      let finalTitle = data.title.trim();
      let counter = 1;
      let isUnique = false;
      while (!isUnique) {
        const existing = await this.db.client.activity.findUnique({
          where: { title: finalTitle }
        });
        if (!existing || existing.id === data.id) {
          isUnique = true;
        } else {
          counter++;
          finalTitle = `${data.title.trim()} #${counter}`;
        }
      }
      const defaultCategory = data.category || (data.type === "music" ? "Music Generation" : "Text to Speech");
      const record = await this.db.client.activity.upsert({
        where: { id: data.id },
        update: {
          type: data.type,
          title: finalTitle,
          description: data.description || null,
          category: defaultCategory,
          subCategory: data.subCategory || null,
          originId: data.originId || data.conversationId || null,
          originType: data.originType || (data.conversationId ? "conversation" : data.type),
          conversationId: data.conversationId || null,
          metadata: metadataStr
        },
        create: {
          id: data.id,
          type: data.type,
          title: finalTitle,
          description: data.description || null,
          category: defaultCategory,
          subCategory: data.subCategory || null,
          originId: data.originId || data.conversationId || null,
          originType: data.originType || (data.conversationId ? "conversation" : data.type),
          conversationId: data.conversationId || null,
          metadata: metadataStr
        }
      });
      return { success: true, data: this.formatActivityRecord(record) };
    } catch (err) {
      console.error("[ActivityRepositoryService] Failed to save activity:", err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
  /**
   * Delete an activity by ID
   */
  async deleteActivity(id) {
    await this.db.init();
    try {
      await this.db.client.activity.delete({
        where: { id }
      });
      return { success: true };
    } catch (err) {
      console.error("[ActivityRepositoryService] Failed to delete activity:", err);
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
class ActivityController extends BaseController {
  constructor(activityRepo) {
    super();
    this.activityRepo = activityRepo;
  }
  init() {
    ipcMain.handle(IPC_CHANNELS.ACTIVITY_LIST, async () => {
      try {
        const list = await this.activityRepo.listActivities();
        return { success: true, data: list };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    });
    ipcMain.handle(IPC_CHANNELS.ACTIVITY_GET, async (_event, payload) => {
      try {
        const id = typeof payload === "string" ? payload : payload.id;
        const item = await this.activityRepo.getActivityById(id);
        return { success: true, data: item };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    });
    ipcMain.handle(
      IPC_CHANNELS.ACTIVITY_GET_BY_ORIGIN,
      async (_event, payload) => {
        try {
          const originId = typeof payload === "string" ? payload : payload.originId;
          const item = await this.activityRepo.getActivityByOrigin(originId);
          return { success: true, data: item };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, error: message };
        }
      }
    );
    ipcMain.handle(IPC_CHANNELS.ACTIVITY_SAVE, async (_event, data) => {
      try {
        const res = await this.activityRepo.saveActivity(data);
        return res;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    });
    ipcMain.handle(IPC_CHANNELS.ACTIVITY_DELETE, async (_event, payload) => {
      try {
        const id = typeof payload === "string" ? payload : payload.id;
        const res = await this.activityRepo.deleteActivity(id);
        return res;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    });
  }
}
class DatabaseService {
  constructor() {
    __publicField(this, "prisma");
    __publicField(this, "initialized", false);
    __publicField(this, "initPromise", null);
    const isPackaged = app ? app.isPackaged : false;
    const dbDir = isPackaged ? app.getPath("userData") : path.join(process.cwd(), "prisma");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, "echo.db");
    const dbUrl = `file:${dbPath}`;
    process.env.DATABASE_URL = dbUrl;
    console.log(`[DatabaseService] SQLite DB initialized at: ${dbPath}`);
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      },
      log: ["warn", "error"]
    });
  }
  /**
   * Access the shared PrismaClient instance for module-specific repositories
   */
  get client() {
    return this.prisma;
  }
  /**
   * Verify and initialize core schema tables on application startup
   */
  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "conversations" (
          "id" TEXT PRIMARY KEY,
          "text" TEXT NOT NULL,
          "previewSnippet" TEXT,
          "voiceName" TEXT NOT NULL,
          "voiceColor" TEXT NOT NULL,
          "voiceAvatarUrl" TEXT,
          "dateGroup" TEXT NOT NULL,
          "timeAgo" TEXT NOT NULL,
          "timestamp" BIGINT,
          "model" TEXT NOT NULL,
          "engine" TEXT NOT NULL DEFAULT 'cosyvoice3',
          "duration" TEXT NOT NULL,
          "durationSec" REAL,
          "emotion" TEXT,
          "audioUrl" TEXT,
          "waveform" TEXT,
          "voicePrompt" TEXT,
          "language" TEXT,
          "speakerCount" INTEGER NOT NULL DEFAULT 1,
          "generationId" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
        await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "speech_rounds" (
          "id" TEXT PRIMARY KEY,
          "conversationId" TEXT NOT NULL,
          "roundOrder" INTEGER NOT NULL DEFAULT 0,
          "voiceId" TEXT NOT NULL,
          "text" TEXT NOT NULL,
          "speed" REAL NOT NULL DEFAULT 1.0,
          "emotion" TEXT,
          "pace" TEXT,
          "prompt" TEXT,
          "description" TEXT,
          "referenceAudioSrc" TEXT,
          "speakerName" TEXT,
          "speakerColor" TEXT,
          FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE
        );
      `);
        await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "custom_voices" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "category" TEXT NOT NULL DEFAULT 'cloned',
          "color" TEXT NOT NULL DEFAULT '#38bdf8',
          "avatarUrl" TEXT NOT NULL DEFAULT '/voices/sterling.jpg',
          "initials" TEXT NOT NULL DEFAULT 'CV',
          "gender" TEXT NOT NULL DEFAULT 'Neutral',
          "tags" TEXT NOT NULL DEFAULT '[]',
          "referenceAudioName" TEXT,
          "sampleUrl" TEXT,
          "languageCode" TEXT,
          "languageName" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
        await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_preferences" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
        await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "activities" (
          "id" TEXT PRIMARY KEY,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "category" TEXT DEFAULT 'Text to Speech',
          "subCategory" TEXT,
          "originId" TEXT,
          "originType" TEXT,
          "metadata" TEXT,
          "conversationId" TEXT UNIQUE,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE
        );
      `);
        this.initialized = true;
        console.log("[DatabaseService] SQLite database schema initialized");
      } catch (err) {
        console.error("[DatabaseService] Error verifying SQLite tables:", err);
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }
  /**
   * Graceful disconnect on application exit
   */
  async close() {
    try {
      await this.prisma.$disconnect();
    } catch (err) {
      console.warn("[DatabaseService] Failed to disconnect cleanly:", err);
    }
  }
}
function bootstrapCore() {
  const dbService = new DatabaseService();
  const systemService = new SystemService();
  const modelsService = new ModelsService();
  const musicService = new MusicService();
  const voiceRepository = new VoiceRepositoryService(dbService);
  const conversationRepository = new ConversationRepositoryService(dbService);
  const activityRepository = new ActivityRepositoryService(dbService, musicService);
  const voiceService = new VoiceService(voiceRepository);
  const ttsService = new TtsService(modelsService, conversationRepository);
  const controllers = [
    new SystemController(systemService),
    new ModelsController(modelsService),
    new VoiceController(voiceService),
    new TtsController(ttsService),
    new MusicController(musicService, activityRepository),
    new ActivityController(activityRepository)
  ];
  for (const controller of controllers) {
    controller.init();
  }
  return {
    systemService,
    modelsService,
    voiceService,
    ttsService,
    musicService,
    activityRepository,
    dbService,
    controllers
  };
}
protocol.registerSchemesAsPrivileged([
  {
    scheme: "echo-media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
]);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const core = bootstrapCore();
let win = null;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("console-message", (event, ...args) => {
    if (typeof event === "object" && event !== null && "message" in event) {
      const src = event.sourceId ? path.basename(event.sourceId) : "renderer";
      console.log(`[Renderer ${src}:${event.lineNumber}] ${event.message}`);
    } else {
      const [_level, message, line, sourceId] = args;
      const src = sourceId ? path.basename(sourceId) : "renderer";
      console.log(`[Renderer ${src}:${line}] ${message}`);
    }
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[Renderer Crashed]:", details);
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  protocol.handle("echo-media", async (request) => {
    try {
      const raw = request.url.replace(/^echo-media:\/\//, "");
      let filePath = decodeURIComponent(raw.startsWith("/") ? raw : "/" + raw);
      if (process.platform === "win32" && filePath.startsWith("/")) {
        filePath = filePath.slice(1);
      }
      if (!fs.existsSync(filePath)) {
        return new Response("Media not found", { status: 404 });
      }
      const total = fs.statSync(filePath).size;
      const contentType = filePath.endsWith(".mp3") ? "audio/mpeg" : filePath.endsWith(".wav") ? "audio/wav" : "application/octet-stream";
      const headers = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Accept-Ranges": "bytes",
        "Content-Type": contentType
      });
      const rangeHeader = request.headers.get("range");
      const match = rangeHeader ? /bytes=(\d*)-(\d*)/.exec(rangeHeader) : null;
      let start = 0;
      let end = total - 1;
      let status = 200;
      if (match && (match[1] !== "" || match[2] !== "")) {
        if (match[1] === "") {
          start = Math.max(0, total - parseInt(match[2], 10));
        } else {
          start = parseInt(match[1], 10);
          if (match[2] !== "") end = Math.min(end, parseInt(match[2], 10));
        }
        if (start >= total || start > end) {
          headers.set("Content-Range", `bytes */${total}`);
          return new Response(null, { status: 416, headers });
        }
        status = 206;
        headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
      }
      headers.set("Content-Length", String(end - start + 1));
      if (request.method === "HEAD") {
        return new Response(null, { status, headers });
      }
      const stream = Readable.toWeb(
        fs.createReadStream(filePath, { start, end })
      );
      return new Response(stream, { status, headers });
    } catch (err) {
      console.error("[echo-media protocol] Error loading media:", err);
      return new Response("Error loading media", { status: 500 });
    }
  });
  createWindow();
});
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL,
  core
};
