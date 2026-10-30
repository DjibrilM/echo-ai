var je = Object.defineProperty;
var He = (h, e, t) => e in h ? je(h, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : h[e] = t;
var b = (h, e, t) => He(h, typeof e != "symbol" ? e + "" : e, t);
import y from "node:path";
import g from "node:fs";
import { app as U, shell as We, ipcMain as A, protocol as xe, BrowserWindow as Ne } from "electron";
import { fileURLToPath as Qe } from "node:url";
import { Readable as Ye } from "node:stream";
import O from "node:os";
import * as v from "@qvac/sdk";
import { execFileSync as Xe } from "node:child_process";
import { createRequire as Ke } from "node:module";
process.env.QVAC_RPC_INIT_TIMEOUT_MS || (process.env.QVAC_RPC_INIT_TIMEOUT_MS = "120000");
const Je = [
  y.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js")
];
for (const h of Je)
  if (g.existsSync(h)) {
    try {
      process.env.QVAC_WORKER_PATH = g.realpathSync(h);
    } catch {
      process.env.QVAC_WORKER_PATH = h;
    }
    break;
  }
class Ze {
  constructor() {
    b(this, "prevCpuTimes", null);
  }
  /**
   * Calculate live CPU usage from os.cpus()
   */
  getCpuUsage() {
    const e = O.cpus();
    let t = 0, s = 0;
    for (const n of e) {
      for (const a of Object.keys(n.times))
        s += n.times[a];
      t += n.times.idle;
    }
    if (!this.prevCpuTimes)
      return this.prevCpuTimes = { idle: t, total: s }, 14;
    const i = t - this.prevCpuTimes.idle, r = s - this.prevCpuTimes.total;
    if (this.prevCpuTimes = { idle: t, total: s }, r <= 0) return 14;
    const o = Math.round((r - i) / r * 100);
    return Math.max(1, Math.min(100, o));
  }
  /**
   * Query full hardware telemetry (RAM, CPU, GPU)
   */
  getMetrics() {
    var u;
    const e = O.totalmem(), t = O.freemem(), s = Math.max(0, e - t), i = s / e * 100, r = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2), o = Math.max(5, Math.min(99, Math.round(i + r))), n = this.getCpuUsage(), a = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1)), c = Math.max(3, Math.min(98, Math.round(n + a)));
    let l = 12;
    try {
      const f = U.getAppMetrics().find((S) => S.type === "GPU");
      if (f)
        l = Math.min(100, Math.max(8, Math.round(f.cpu.percentCPUUsage * 2 + 10)));
      else {
        const S = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
        l = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8 + S)));
      }
    } catch {
      l = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8)));
    }
    return {
      ram: {
        usedGB: (s / (1024 * 1024 * 1024) + r * 0.1).toFixed(1),
        totalGB: (e / (1024 * 1024 * 1024)).toFixed(1),
        percent: o
      },
      cpu: {
        percent: c,
        cores: O.cpus().length,
        model: ((u = O.cpus()[0]) == null ? void 0 : u.model) || "Processor"
      },
      gpu: {
        percent: l,
        name: process.platform === "darwin" ? "Apple Silicon GPU" : "GPU Compute"
      }
    };
  }
  /**
   * Ensure exports directory exists and reveal it in native file manager
   */
  async openExportsFolder() {
    try {
      const e = y.join(U.getPath("documents"), "Echo", "Exports");
      return g.existsSync(e) || g.mkdirSync(e, { recursive: !0 }), await We.openPath(e), { success: !0, path: e };
    } catch (e) {
      return console.error("[SystemService] Failed to open exports directory:", e), { success: !1, error: String(e) };
    }
  }
}
class ie {
}
const w = {
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
class et extends ie {
  constructor(e) {
    super(), this.systemService = e;
  }
  init() {
    A.handle(w.SYSTEM_GET_METRICS, async () => this.systemService.getMetrics()), A.handle(w.LEGACY_GET_SYSTEM_METRICS, async () => this.systemService.getMetrics()), A.handle(w.SYSTEM_OPEN_EXPORTS, async () => this.systemService.openExportsFolder()), A.handle(w.LEGACY_OPEN_EXPORTS_FOLDER, async () => this.systemService.openExportsFolder());
  }
}
class Te {
  constructor() {
    b(this, "cacheDir");
    b(this, "stateFilePath");
    b(this, "downloadedModelIds", /* @__PURE__ */ new Set());
    b(this, "activeDownloads", /* @__PURE__ */ new Map());
    // Full specification of neural TTS voice models
    b(this, "modelDefinitions", [
      {
        id: "chatterbox-t3-turbo-q8_0",
        name: "Chatterbox T3 Turbo Backbone (Q8_0 GGUF)",
        descriptorName: "TTS_T3_TURBO_EN_CHATTERBOX_Q8_0",
        sizeBytes: 487091392,
        sizeFormatted: "487 MB",
        description: "Fast and expressive autoregressive T3 speech backbone with high dynamic range and instant voice cloning.",
        category: "backbone",
        engine: "chatterbox",
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !1
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
        required: !0
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
        required: !0
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
        required: !0
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
        required: !0
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
        required: !0
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
        required: !0
      }
    ]);
    this.cacheDir = y.join(O.homedir(), ".qvac", "models");
    const e = U ? U.getPath("userData") : y.join(O.homedir(), ".echo-ai");
    if (!g.existsSync(e))
      try {
        g.mkdirSync(e, { recursive: !0 });
      } catch {
      }
    this.stateFilePath = y.join(e, "voice_engine_state.json"), this.loadState();
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
  isModelDownloaded(e) {
    if (this.downloadedModelIds.has(e)) return !0;
    for (const t of this.downloadedModelIds)
      if (t === e || t.startsWith(e) || e.startsWith(t) && !e.startsWith("minimax-"))
        return !0;
    return !1;
  }
  /**
   * Load persisted downloaded model status and discover cached weights
   */
  loadState() {
    try {
      if (g.existsSync(this.stateFilePath)) {
        const e = g.readFileSync(this.stateFilePath, "utf-8"), t = JSON.parse(e);
        Array.isArray(t.downloadedModelIds) && (this.downloadedModelIds = new Set(t.downloadedModelIds));
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
      const e = {
        downloadedModelIds: Array.from(this.downloadedModelIds),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      g.writeFileSync(this.stateFilePath, JSON.stringify(e, null, 2), "utf-8");
    } catch (e) {
      console.warn("[ModelsService] Could not save state file:", e);
    }
  }
  /**
   * Scan disk cache directory for downloaded models and verify their file presence/integrity
   */
  syncCacheFromDisk() {
    let e = !1;
    try {
      if (g.existsSync(this.cacheDir)) {
        const t = /* @__PURE__ */ new Set(), s = (o, n) => {
          const a = n.toLowerCase();
          if (a.endsWith(".download") || a.endsWith(".tmp") || a.endsWith(".partial") || a.endsWith(".crdownload"))
            return;
          let c = null;
          try {
            c = g.statSync(o);
          } catch {
            return;
          }
          c.isFile() && c.size > 1024 * 1024 && (a.includes("parler-large-v1-f16") || a.includes("parler-large-v1-fp16") ? t.add("chatterbox-t3-turbo-q8_0") : a.includes("chatterbox-s3gen-q8") || a.includes("chatterbox-s3gen") ? t.add("chatterbox-s3gen-q8_0") : a.includes("chatterbox-t3-multilingual") ? t.add("chatterbox-t3-multilingual-q8_0") : a.includes("chatterbox-s3gen-multilingual") ? t.add("chatterbox-s3gen-multilingual-q8_0") : (a.includes("chatterbox-t3") || a.includes("chatterbox")) && t.add("chatterbox-t3-turbo-q8_0"), (a.includes("cosyvoice3-llm") || a.includes("cosy_voice")) && t.add("cosyvoice3-llm-q8_0"), (a.includes("cosyvoice3-flow-f16") || a.includes("cosyvoice3-flow-fp16") || a.includes("cosyvoice3-flow-f32") || a.includes("cosyvoice3-flow")) && t.add("cosyvoice3-flow-fp16"), (a.includes("lavasr") || a.includes("enhancer")) && t.add("lavasr-enhancer"), (a.includes("cosyvoice3-s3tok") || a.includes("s3tok")) && t.add("cosyvoice3-s3tok-fp16"), (a.includes("cosyvoice3-campplus") || a.includes("campplus")) && t.add("cosyvoice3-campplus-fp32"), (a.includes("qwen3-embedding") || a.includes("qwen3_embedding")) && t.add("audiogen-qwen3-embedding"), (a.includes("acestep-5hz") || a.includes("acestep_5hz")) && t.add("audiogen-acestep-5hz-lm"), (a.includes("acestep-v15-turbo") || a.includes("acestep_v15_turbo") || a.includes("turbo-q4_k_m")) && t.add("audiogen-acestep-turbo-dit"), (a.includes("vae-bf16") || a.includes("audiogen-vae") || a.includes("audiogen_vae")) && t.add("audiogen-vae-bf16"), (a.includes("mm3-lm") || a.includes("minimax") && (a.includes("transformer") || a.includes("lm"))) && !a.includes("vocoder") && !a.includes("synth") && t.add("minimax-music-v3-transformer"), (a.includes("mm3-synth") || a.includes("minimax") && (a.includes("vocoder") || a.includes("synth"))) && !a.includes("transformer") && !a.includes("lm") && t.add("minimax-music-vocoder"));
        }, i = g.readdirSync(this.cacheDir);
        for (const o of i) {
          const n = y.join(this.cacheDir, o);
          s(n, o);
        }
        const r = y.join(this.cacheDir, "sets");
        if (g.existsSync(r)) {
          const o = g.readdirSync(r);
          for (const n of o) {
            const a = y.join(r, n);
            try {
              if (g.existsSync(a)) {
                const c = g.readdirSync(a);
                for (const l of c) {
                  const d = y.join(a, l);
                  s(d, l);
                }
              }
            } catch {
            }
          }
        }
        for (const o of t)
          this.downloadedModelIds.has(o) || (this.downloadedModelIds.add(o), e = !0);
        for (const o of Array.from(this.downloadedModelIds))
          (o.startsWith("minimax-") || o.startsWith("audiogen-")) && !t.has(o) && (this.downloadedModelIds.delete(o), e = !0);
      }
    } catch (t) {
      console.warn("[ModelsService] Error syncing cache from disk:", t);
    }
    e && this.saveState();
  }
  /**
   * Get complete status of all voice engine models scoped to the selected engine.
   * CosyVoice 3 requires: backbone, enhancer, s3tok, campplus (flow is optional high precision).
   * Parler requires any downloaded Parler backbone model.
   */
  getStatus(e) {
    this.syncCacheFromDisk();
    const t = this.modelDefinitions.map((i) => {
      const r = this.downloadedModelIds.has(i.id), o = this.activeDownloads.has(i.id), n = e ? e === "cosyvoice3" ? i.engine === "cosyvoice3" && i.id !== "cosyvoice3-flow-fp16" || i.engine === "shared" : e === "chatterbox" ? i.engine === "chatterbox" && (i.id === "chatterbox-t3-turbo-q8_0" || i.id === "chatterbox-s3gen-q8_0") : i.engine === e : i.category === "backbone";
      return {
        ...i,
        required: n,
        downloaded: r,
        status: o ? "downloading" : r ? "ready" : "idle"
      };
    });
    let s = !1;
    if (e === "chatterbox") {
      const i = t.some(
        (o) => o.engine === "chatterbox" && o.category === "backbone" && o.downloaded
      ), r = t.some(
        (o) => o.engine === "chatterbox" && o.category === "vocoder" && o.downloaded
      );
      s = i && r;
    } else {
      const i = e ? t.filter((r) => r.required) : t.filter((r) => r.category === "backbone");
      s = i.length > 0 && i.every((r) => r.downloaded);
    }
    return {
      ready: s,
      allRequiredDownloaded: s,
      models: t,
      cacheDirectory: this.cacheDir
    };
  }
  /**
   * Helper to check if an engine is fully ready for speech synthesis
   */
  areAllRequiredModelsDownloaded(e = "cosyvoice3") {
    return this.getStatus(e).allRequiredDownloaded;
  }
  /**
   * Download a single model with live progress updates.
   * Correctly handles single-file, sharded, and companion set downloads with smooth monotonic percentages.
   */
  async downloadModel(e, t) {
    const s = this.modelDefinitions.find((n) => n.id === e);
    if (!s)
      return { success: !1, modelId: e, error: `Unknown model ID: ${e}` };
    if (this.syncCacheFromDisk(), this.downloadedModelIds.has(e))
      return t == null || t({
        modelId: e,
        percentage: 100,
        downloaded: s.sizeBytes,
        total: s.sizeBytes,
        speed: "Ready"
      }), { success: !0, modelId: e };
    if (s.engine === "minimax")
      return await this.downloadMiniMaxModel(e, s, t);
    let i = !1, r = 0, o = s.sizeBytes;
    this.activeDownloads.set(e, {
      cancel: () => {
        i = !0;
      }
    });
    try {
      const a = v[s.descriptorName] || null;
      if (!a || typeof v.downloadAsset != "function")
        return {
          success: !1,
          modelId: e,
          error: `No asset descriptor found for ${e} (${s.descriptorName})`
        };
      let c = null;
      for (let l = 1; l <= 2; l++)
        try {
          const d = v.downloadAsset({
            assetSrc: a,
            onProgress: (u) => {
              var _, D, T, x, M, E, p, $;
              if (i) return;
              const m = ((_ = u.fileSetInfo) == null ? void 0 : _.overallPercentage) ?? ((D = u.shardInfo) == null ? void 0 : D.overallPercentage) ?? (u.fileSetInfo || u.shardInfo ? 0 : u.percentage ?? 0), f = ((T = u.fileSetInfo) == null ? void 0 : T.overallTotal) ?? ((x = u.shardInfo) == null ? void 0 : x.overallTotal) ?? u.total ?? s.sizeBytes;
              o = f;
              const S = ((M = u.fileSetInfo) == null ? void 0 : M.overallDownloaded) ?? ((E = u.shardInfo) == null ? void 0 : E.overallDownloaded) ?? u.downloaded ?? Math.round((m || 0) / 100 * f), C = Math.min(99, Math.max(1, Math.round(m || 0)));
              r = Math.max(r, C);
              let L = u.speed || "Downloading...";
              (p = u.fileSetInfo) != null && p.currentFile ? L = `${u.fileSetInfo.currentFile} (${u.fileSetInfo.fileIndex}/${u.fileSetInfo.totalFiles})` : ($ = u.shardInfo) != null && $.shardName && (L = `${u.shardInfo.shardName} (${u.shardInfo.currentShard}/${u.shardInfo.totalShards})`);
              const N = S >= f && f > 0 || m >= 100;
              N && (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState()), t == null || t({
                modelId: e,
                percentage: N ? 100 : r,
                downloaded: S,
                total: f,
                speed: N ? "Completed" : L
              });
            }
          });
          d && d.requestId && this.activeDownloads.set(e, {
            cancel: () => {
              i = !0;
              try {
                typeof v.cancel == "function" && v.cancel({
                  requestId: d.requestId
                });
              } catch {
              }
            }
          }), await d, c = null;
          break;
        } catch (d) {
          if (c = d, String((d == null ? void 0 : d.message) || d).includes("could not be locked") && l === 1 && !i) {
            console.warn(`[ModelsService] Registry lock conflict for ${e}. Retrying in 1.2s...`), await new Promise((m) => setTimeout(m, 1200));
            continue;
          }
          throw d;
        }
      if (c) throw c;
      return i ? { success: !1, modelId: e, error: "Download cancelled" } : (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), t == null || t({
        modelId: e,
        percentage: 100,
        downloaded: o,
        total: o,
        speed: "Completed"
      }), { success: !0, modelId: e });
    } catch (n) {
      return console.error(`[ModelsService] Download error for ${e}:`, n), { success: !1, modelId: e, error: String(n) };
    } finally {
      this.activeDownloads.delete(e);
    }
  }
  /**
   * Cancel an in-flight download
   */
  cancelDownload(e) {
    const t = this.activeDownloads.get(e);
    return t ? (t.cancel(), this.activeDownloads.delete(e), !0) : !1;
  }
  /**
   * Delete all installed models from disk and reset internal state
   */
  async deleteAllModels() {
    for (const [e, t] of this.activeDownloads.entries()) {
      try {
        t.cancel();
      } catch {
      }
      this.activeDownloads.delete(e);
    }
    this.downloadedModelIds.clear(), this.saveState();
    try {
      if (g.existsSync(this.cacheDir)) {
        const e = g.readdirSync(this.cacheDir);
        for (const t of e) {
          const s = y.join(this.cacheDir, t);
          try {
            g.statSync(s).isDirectory() ? g.rmSync(s, { recursive: !0, force: !0 }) : g.unlinkSync(s);
          } catch {
          }
        }
      }
    } catch (e) {
      console.warn("[ModelsService] Error deleting cache directory:", e);
    }
    return !0;
  }
  /**
   * Query QVAC model info using @qvac/sdk getModelInfo
   */
  async getModelInfo(e) {
    return v.getModelInfo({ name: e });
  }
  /**
   * Directly downloads MiniMax-Music3 GGUF models from Hugging Face repository
   * with streaming progress, real byte metrics, and cancellation support.
   */
  async downloadMiniMaxModel(e, t, s) {
    const r = {
      "minimax-music-v3-transformer": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-lm-Q4_K_M-imat.gguf",
        filename: "mm3-lm-Q4_K_M-imat.gguf"
      },
      "minimax-music-vocoder": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-synth-Q4_K_M.gguf",
        filename: "mm3-synth-Q4_K_M.gguf"
      }
    }[e];
    if (!r)
      return { success: !1, modelId: e, error: `Unknown MiniMax model: ${e}` };
    if (!g.existsSync(this.cacheDir))
      try {
        g.mkdirSync(this.cacheDir, { recursive: !0 });
      } catch (d) {
        return { success: !1, modelId: e, error: `Failed to create cache directory: ${d}` };
      }
    const o = y.join(this.cacheDir, r.filename), n = y.join(this.cacheDir, `${r.filename}.download`);
    try {
      if (g.existsSync(o)) {
        const d = g.statSync(o);
        if (d.size > 1024 * 1024)
          return this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), s == null || s({
            modelId: e,
            percentage: 100,
            downloaded: d.size,
            total: d.size,
            speed: "Ready"
          }), { success: !0, modelId: e };
      }
    } catch {
    }
    const a = new AbortController();
    let c = !1;
    if (this.activeDownloads.set(e, {
      cancel: () => {
        c = !0, a.abort();
      }
    }), g.existsSync(n))
      try {
        g.unlinkSync(n);
      } catch {
      }
    let l = null;
    try {
      const d = await fetch(r.url, {
        signal: a.signal,
        redirect: "follow"
      });
      if (!d.ok || !d.body)
        throw new Error(`Failed to fetch ${r.url}: HTTP ${d.status} ${d.statusText}`);
      const u = d.headers.get("content-length"), m = u ? parseInt(u, 10) : t.sizeBytes;
      l = g.createWriteStream(n);
      const f = d.body.getReader();
      let S = 0, C = Date.now(), L = 0, N = "Starting...";
      for (s == null || s({
        modelId: e,
        percentage: 1,
        downloaded: 0,
        total: m,
        speed: N
      }); ; ) {
        if (c)
          throw new Error("Download cancelled");
        const { done: x, value: M } = await f.read();
        if (x) break;
        if (M && M.length > 0) {
          const E = l.write(Buffer.from(M));
          S += M.length, E || await new Promise((I) => l.once("drain", I));
          const p = Date.now(), $ = p - C;
          if ($ >= 400 || S >= m) {
            const I = S - L, k = $ / 1e3;
            N = `${(I / Math.max(0.1, k) / (1024 * 1024)).toFixed(1)} MB/s`, C = p, L = S;
            const W = m > 0 ? Math.min(99, Math.max(1, Math.round(S / m * 100))) : 0;
            s == null || s({
              modelId: e,
              percentage: W,
              downloaded: S,
              total: m,
              speed: N
            });
          }
        }
      }
      if (await new Promise((x, M) => {
        if (!l) return x();
        l.on("finish", x), l.on("error", M), l.end();
      }), l = null, c)
        throw new Error("Download cancelled");
      const _ = g.statSync(n);
      if (_.size < 1024 * 1024)
        throw new Error(`Downloaded file size (${_.size} bytes) is too small. Corrupt or incomplete download.`);
      const D = g.openSync(n, "r"), T = Buffer.alloc(4);
      if (g.readSync(D, T, 0, 4, 0), g.closeSync(D), T.toString("ascii") !== "GGUF")
        throw new Error(`Downloaded file is not a valid GGUF binary (magic: ${T.toString("ascii")})`);
      if (g.existsSync(o))
        try {
          g.unlinkSync(o);
        } catch {
        }
      return g.renameSync(n, o), this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), s == null || s({
        modelId: e,
        percentage: 100,
        downloaded: m,
        total: m,
        speed: "Completed"
      }), { success: !0, modelId: e };
    } catch (d) {
      if (l)
        try {
          l.destroy();
        } catch {
        }
      if (g.existsSync(n))
        try {
          g.unlinkSync(n);
        } catch {
        }
      this.downloadedModelIds.delete(e), this.saveState();
      const u = c || (d == null ? void 0 : d.name) === "AbortError" || String(d).includes("cancelled");
      return {
        success: !1,
        modelId: e,
        error: u ? "Download cancelled" : (d == null ? void 0 : d.message) || String(d)
      };
    } finally {
      this.activeDownloads.delete(e);
    }
  }
}
class tt extends ie {
  constructor(e) {
    super(), this.modelsService = e;
  }
  init() {
    A.handle(
      w.MODELS_GET_STATUS,
      async (e, t) => {
        try {
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        } catch (s) {
          return { success: !1, error: String(s) };
        }
      }
    ), A.handle(
      w.MODELS_DOWNLOAD,
      async (e, t) => {
        const s = (i) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.MODELS_DOWNLOAD_PROGRESS, i);
          } catch (r) {
            console.warn("[ModelsController] Failed to send download progress:", r);
          }
        };
        if (t != null && t.allRequired) {
          const r = this.modelsService.getStatus(t == null ? void 0 : t.engine).models.filter((o) => o.required && !o.downloaded);
          for (const o of r)
            await this.modelsService.downloadModel(o.id, s);
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        }
        return t != null && t.modelId ? { ...await this.modelsService.downloadModel(t.modelId, s), data: this.modelsService.getStatus(t == null ? void 0 : t.engine) } : { success: !1, error: "No modelId or allRequired flag specified" };
      }
    ), A.handle(
      w.MODELS_CANCEL_DOWNLOAD,
      async (e, { modelId: t }) => ({ success: this.modelsService.cancelDownload(t), modelId: t })
    ), A.handle(
      w.MODELS_GET_INFO,
      async (e, { name: t }) => {
        try {
          return { success: !0, data: await this.modelsService.getModelInfo(t) };
        } catch (s) {
          return { success: !1, error: String(s) };
        }
      }
    ), A.handle(w.MODELS_DELETE_ALL, async () => {
      try {
        return await this.modelsService.deleteAllModels(), { success: !0 };
      } catch (e) {
        return { success: !1, error: String(e) };
      }
    });
  }
}
class st {
  constructor(e) {
    b(this, "repository");
    this.repository = e;
  }
  getRepository() {
    return this.repository;
  }
  async listCustomVoices() {
    return this.repository ? this.repository.listCustomVoices() : [];
  }
  /**
   * Resolve root samples directory across dev server and production builds
   */
  getSamplesDirectory() {
    const e = process.env.VITE_PUBLIC || y.join(process.cwd(), "public"), t = [
      y.join(e, "voices", "samples"),
      y.join(process.cwd(), "public", "voices", "samples"),
      y.join(U.getAppPath(), "public", "voices", "samples"),
      y.join(U.getAppPath(), "dist", "voices", "samples")
    ];
    for (const s of t)
      if (g.existsSync(s))
        return s;
    return null;
  }
  /**
   * Scan voices/samples directory, detecting all self-contained language folders
   * and reading their header file info.json
   */
  scanVoicePackages() {
    try {
      const e = this.getSamplesDirectory();
      if (!e)
        return console.warn("[VoiceService] Samples directory not found"), { success: !1, packages: [], error: "Samples folder not found" };
      const t = g.readdirSync(e, { withFileTypes: !0 }), s = [];
      for (const i of t) {
        if (!i.isDirectory()) continue;
        const r = y.join(e, i.name), o = y.join(r, "info.json"), n = y.join(r, "json.info"), a = g.existsSync(o) ? o : g.existsSync(n) ? n : null;
        if (a)
          try {
            const c = g.readFileSync(a, "utf-8"), l = JSON.parse(c), d = l.list || l.location || (g.existsSync(y.join(r, "json", "voices.json")) ? "json/voices.json" : "voices.json");
            s.push({
              folder: i.name,
              language: l.language || i.name,
              name: l.name || l.language || i.name,
              flag: l.flag || "🌐",
              code: l.code || i.name,
              nativeName: l.nativeName || l.name || l.language,
              list: d,
              location: d,
              listUrl: `/voices/samples/${i.name}/${d.replace(/^\//, "")}`,
              count: l.count || 0
            });
          } catch (c) {
            console.warn(`[VoiceService] Failed to parse info.json in ${r}:`, c);
          }
      }
      return { success: !0, packages: s };
    } catch (e) {
      return console.error("[VoiceService] Failed to scan voice samples:", e), { success: !1, packages: [], error: String(e) };
    }
  }
  /**
   * Load voices directly from disk for a given language folder
   */
  loadVoicesForPackage(e, t = "json/voices.json") {
    try {
      const s = this.getSamplesDirectory();
      if (!s)
        return { success: !1, voices: [], error: "Samples directory not found" };
      const i = t.replace(/^\//, ""), o = [
        y.join(s, e, i),
        y.join(s, e, "json", "voices.json"),
        y.join(s, e, "voices.json")
      ].find((l) => g.existsSync(l));
      if (!o)
        return { success: !1, voices: [], error: `Voice list not found for folder ${e}` };
      const n = g.readFileSync(o, "utf-8"), a = JSON.parse(n);
      return { success: !0, voices: Array.isArray(a) ? a : a.voices || [] };
    } catch (s) {
      return console.error(`[VoiceService] Failed to load voices for ${e}:`, s), { success: !1, voices: [], error: String(s) };
    }
  }
  /**
   * Resolve or create the custom voices directory inside public/voices/custom
   */
  getCustomVoicesDirectory() {
    const e = process.env.VITE_PUBLIC || y.join(process.cwd(), "public"), t = y.join(e, "voices", "custom");
    return g.existsSync(t) || g.mkdirSync(t, { recursive: !0 }), t;
  }
  /**
   * Saves an imported or microphone-recorded voice audio sample directly to disk
   * and converts it to a standard 24kHz mono WAV for CosyVoice 3 reference conditioning.
   */
  async saveCustomVoice(e) {
    try {
      const t = this.getCustomVoicesDirectory(), s = (e.fileName || "sample.wav").replace(/[^a-zA-Z0-9._-]/g, "_"), i = y.extname(s).toLowerCase() || ".wav", r = Date.now(), o = `voice_${e.voiceId}_${r}${i}`, n = y.join(t, o), a = Buffer.isBuffer(e.audioBuffer) ? e.audioBuffer : Buffer.from(e.audioBuffer);
      g.writeFileSync(n, a);
      let c = n, l = `/voices/custom/${o}`;
      if (i !== ".wav") {
        const u = `voice_${e.voiceId}_${r}.wav`, m = y.join(t, u);
        try {
          const { execFileSync: f } = await import("node:child_process");
          f("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", n, m]), g.existsSync(m) && g.statSync(m).size > 100 && (c = m, l = `/voices/custom/${u}`);
        } catch (f) {
          console.warn("[VoiceService] Audio conversion fallback, using original file:", f);
        }
      }
      let d;
      if (e.avatarBuffer) {
        const u = Buffer.isBuffer(e.avatarBuffer) ? e.avatarBuffer : Buffer.from(e.avatarBuffer);
        if (u.byteLength > 0) {
          const m = y.extname(e.avatarFileName || ".jpg").toLowerCase() || ".jpg", f = `avatar_${e.voiceId}_${r}${m}`, S = y.join(t, f);
          g.writeFileSync(S, u), d = `/voices/custom/${f}`;
        }
      }
      return this.repository && await this.repository.saveCustomVoice({
        id: e.voiceId,
        name: e.name,
        category: "cloned",
        avatarUrl: d || "/voices/sterling.jpg",
        sampleUrl: l,
        referenceAudioName: y.basename(c)
      }), {
        success: !0,
        filePath: c,
        sampleUrl: l,
        avatarUrl: d
      };
    } catch (t) {
      return console.error("[VoiceService] Failed to save custom voice:", t), { success: !1, error: String(t) };
    }
  }
  /**
   * Delete a custom voice from disk and SQLite
   */
  async deleteCustomVoice(e) {
    try {
      this.repository && await this.repository.deleteCustomVoice(e);
      const t = this.getCustomVoicesDirectory();
      if (g.existsSync(t)) {
        const s = g.readdirSync(t);
        for (const i of s)
          if (i.includes(`_${e}_`))
            try {
              g.unlinkSync(y.join(t, i));
            } catch {
            }
      }
      return { success: !0 };
    } catch (t) {
      return console.error("[VoiceService] Failed to delete custom voice files:", t), { success: !1, error: String(t) };
    }
  }
}
class it {
  constructor(e) {
    b(this, "db");
    this.db = e;
  }
  /**
   * Query all custom cloned voices from SQLite
   */
  async listCustomVoices() {
    await this.db.init();
    try {
      return (await this.db.client.customVoice.findMany({
        orderBy: { createdAt: "desc" }
      })).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        color: t.color,
        avatarUrl: t.avatarUrl,
        initials: t.initials,
        gender: t.gender,
        tags: t.tags ? JSON.parse(t.tags) : [],
        referenceAudioName: t.referenceAudioName || void 0,
        sampleUrl: t.sampleUrl || void 0,
        languageCode: t.languageCode || void 0,
        languageName: t.languageName || void 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }));
    } catch (e) {
      return console.error("[VoiceRepositoryService] Failed to query custom voices:", e), [];
    }
  }
  /**
   * Save or update a custom voice record in SQLite
   */
  async saveCustomVoice(e) {
    await this.db.init();
    try {
      return await this.db.client.customVoice.upsert({
        where: { id: e.id },
        update: {
          name: e.name,
          description: e.description || "",
          category: e.category || "cloned",
          color: e.color || "#38bdf8",
          avatarUrl: e.avatarUrl || "/voices/sterling.jpg",
          initials: e.initials || e.name.slice(0, 2).toUpperCase(),
          gender: e.gender || "Neutral",
          tags: JSON.stringify(e.tags || []),
          referenceAudioName: e.referenceAudioName,
          sampleUrl: e.sampleUrl,
          languageCode: e.languageCode,
          languageName: e.languageName
        },
        create: {
          id: e.id,
          name: e.name,
          description: e.description || "",
          category: e.category || "cloned",
          color: e.color || "#38bdf8",
          avatarUrl: e.avatarUrl || "/voices/sterling.jpg",
          initials: e.initials || e.name.slice(0, 2).toUpperCase(),
          gender: e.gender || "Neutral",
          tags: JSON.stringify(e.tags || []),
          referenceAudioName: e.referenceAudioName,
          sampleUrl: e.sampleUrl,
          languageCode: e.languageCode,
          languageName: e.languageName
        }
      }), { success: !0 };
    } catch (t) {
      return console.error("[VoiceRepositoryService] Failed to save custom voice:", t), { success: !1, error: (t == null ? void 0 : t.message) || String(t) };
    }
  }
  /**
   * Delete a custom voice from SQLite
   */
  async deleteCustomVoice(e) {
    await this.db.init();
    try {
      return await this.db.client.customVoice.delete({
        where: { id: e }
      }), { success: !0 };
    } catch (t) {
      return console.error("[VoiceRepositoryService] Failed to delete custom voice:", t), { success: !1, error: (t == null ? void 0 : t.message) || String(t) };
    }
  }
}
class rt extends ie {
  constructor(e) {
    super(), this.voiceService = e;
  }
  init() {
    A.handle(w.VOICES_SCAN, async () => this.voiceService.scanVoicePackages()), A.handle(w.LEGACY_SCAN_VOICE_SAMPLES, async () => this.voiceService.scanVoicePackages()), A.handle(
      w.VOICES_LOAD,
      async (e, { folder: t, list: s }) => this.voiceService.loadVoicesForPackage(t, s)
    ), A.handle(
      w.VOICES_SAVE_CUSTOM,
      async (e, t) => this.voiceService.saveCustomVoice(t)
    ), A.handle(
      w.VOICES_DELETE_CUSTOM,
      async (e, { voiceId: t }) => this.voiceService.deleteCustomVoice(t)
    ), A.handle(w.VOICES_LIST_CUSTOM, async () => {
      try {
        return { success: !0, data: await this.voiceService.listCustomVoices() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
function nt(h, e) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const t = h.length, s = 44, i = t * 2, r = Buffer.alloc(s + i);
  r.write("RIFF", 0), r.writeUInt32LE(s + i - 8, 4), r.write("WAVE", 8), r.write("fmt ", 12), r.writeUInt32LE(16, 16), r.writeUInt16LE(1, 20), r.writeUInt16LE(1, 22), r.writeUInt32LE(e, 24), r.writeUInt32LE(e * 2, 28), r.writeUInt16LE(2, 32), r.writeUInt16LE(16, 34), r.write("data", 36), r.writeUInt32LE(i, 40);
  for (let o = 0; o < t; o++) {
    const n = Number.isFinite(h[o]) ? Math.round(h[o]) : 0, a = Math.max(-32768, Math.min(32767, n));
    r.writeInt16LE(a, s + o * 2);
  }
  return `data:audio/wav;base64,${r.toString("base64")}`;
}
function ot(h, e) {
  if (e = Math.max(1, Math.floor(e)), h.length === 0) return Array(e).fill(4);
  const t = [], s = Math.max(1, Math.floor(h.length / e));
  for (let i = 0; i < e; i++) {
    let r = 0;
    const o = i * s, n = Math.min(h.length, o + s);
    for (let a = o; a < n; a += Math.max(1, Math.floor((n - o) / 40))) {
      const c = Math.abs(h[a] / 32768);
      c > r && (r = c);
    }
    t.push(Math.max(4, Math.min(98, Math.round(r * 100))));
  }
  return t;
}
function Ae(h, e, t) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const s = h.length, i = 44, r = s * 2, o = Buffer.alloc(i + r);
  o.write("RIFF", 0), o.writeUInt32LE(i + r - 8, 4), o.write("WAVE", 8), o.write("fmt ", 12), o.writeUInt32LE(16, 16), o.writeUInt16LE(1, 20), o.writeUInt16LE(1, 22), o.writeUInt32LE(e, 24), o.writeUInt32LE(e * 2, 28), o.writeUInt16LE(2, 32), o.writeUInt16LE(16, 34), o.write("data", 36), o.writeUInt32LE(r, 40);
  for (let d = 0; d < s; d++) {
    const u = Number.isFinite(h[d]) ? Math.round(h[d]) : 0, m = Math.max(-32768, Math.min(32767, u));
    o.writeInt16LE(m, i + d * 2);
  }
  const n = h.reduce((d, u) => Math.max(d, Math.abs(u)), 0), a = y.resolve(process.cwd(), "assets/testing-voice-output");
  g.mkdirSync(a, { recursive: !0 });
  const c = `${t}-${Date.now()}.wav`, l = y.join(a, c);
  return g.writeFileSync(l, o), console.log(
    `[TTS Debug] Saved PCM to ${l} (${s} samples @ ${e}Hz, maxAbs=${n.toFixed(4)})`
  ), l;
}
function ve(h, e) {
  const t = Math.floor(e * Math.max(0.015, h)), s = new Array(t);
  let i = 0;
  for (let o = 0; o < t; o++) {
    const n = (Math.random() * 2 - 1) * 5;
    i = i * 0.85 + n * 0.15, s[o] = i;
  }
  const r = Math.min(Math.floor(e * 8e-3), Math.floor(t / 2));
  for (let o = 0; o < r; o++) {
    const n = 0.5 * (1 - Math.cos(Math.PI * o / r));
    s[o] *= n;
    const a = 0.5 * (1 - Math.cos(Math.PI * (r - o) / r));
    s[t - 1 - o] *= a;
  }
  return s;
}
function at(h, e, t = 18, s = 28) {
  if (h.length === 0) return h;
  let i = 0;
  for (let l = 0; l < h.length; l++) {
    const d = Math.abs(h[l]);
    d > i && (i = d);
  }
  if (i === 0) return h;
  const r = Math.max(i * 8e-3, i > 2 ? 60 : 2e-3), o = Math.floor(e * t / 1e3), n = Math.floor(e * s / 1e3);
  let a = 0;
  for (let l = 0; l < h.length; l++)
    if (Math.abs(h[l]) > r) {
      a = Math.max(0, l - o);
      break;
    }
  let c = h.length;
  for (let l = h.length - 1; l >= a; l--)
    if (Math.abs(h[l]) > r) {
      c = Math.min(h.length, l + 1 + n);
      break;
    }
  return a >= c || c - a < e * 0.08 ? h : h.slice(a, c);
}
function le(h, e, t, s = 12) {
  if (e.length === 0) return;
  if (h.length === 0) {
    for (let o = 0; o < e.length; o++) h.push(e[o]);
    return;
  }
  const i = Math.min(
    Math.floor(t * s / 1e3),
    Math.floor(h.length / 2),
    Math.floor(e.length / 2)
  );
  if (i <= 0) {
    for (let o = 0; o < e.length; o++) h.push(e[o]);
    return;
  }
  const r = h.length - i;
  for (let o = 0; o < i; o++) {
    const n = o / i, a = Math.cos(n * (Math.PI / 2)), c = Math.sin(n * (Math.PI / 2));
    h[r + o] = h[r + o] * a + e[o] * c;
  }
  for (let o = i; o < e.length; o++)
    h.push(e[o]);
}
function ct(h, e, t = "normal") {
  let s = h, i = t;
  const r = [];
  if ((i === "whisper" || /\[(?:whisper|soft)\]/i.test(s)) && (i = "whisper", r.push("whisper"), s = s.replace(/\[\/?(?:whisper|soft)\]/gi, " ")), i === "yell" || /\[(?:yell|shout|loud)\]/i.test(s)) {
    i = "yell", r.push("yell"), s = s.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ");
    const o = s.trim(), n = /[!?]$/.test(o) ? "" : "!";
    s = `${o.toUpperCase()}${n}`;
  }
  return (i === "raise" || /\[(?:raise|emphasis)\]/i.test(s) || /<\/?strong>/i.test(s)) && (i = "raise", r.push("raise")), s = s.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " "), s = s.replace(/<\/?laughter>/gi, " "), (/\[(?:sigh|breath)\]/i.test(s) || /<\/?breath>/i.test(s)) && r.push("breath"), /\[(?:hmm+|thinking)\]/i.test(s) && r.push("hmm"), /\[gasp\]/i.test(s) && r.push("gasp"), e === "cosyvoice3" ? (s = s.replace(/\[(?:breath|sigh)\]/gi, " <breath> "), s = s.replace(
    /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
    "<strong>$1</strong>"
  ), i === "raise" && !/<strong>[\s\S]*?<\/strong>/i.test(s) && (s = `<strong>${s.trim()}</strong>`), s = s.replace(/\[\/?(?:raise|emphasis)\]/gi, " "), s = s.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... "), s = s.replace(/\[gasp\]/gi, "<breath> "), s = s.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim(), i === "whisper" && s.length > 0 && (s = `<breath> ${s.toLowerCase()} <breath>`)) : (s = s.replace(/<\/?(?:laughter|strong|breath)>/gi, " "), s = s.replace(
    /\[\/?(?:laugh|laughter|giggle|chuckle|breath|sigh|gasp|whisper|soft|yell|shout|loud|raise|emphasis)\]/gi,
    " "
  ), r.includes("hmm") && (s = s.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ")), (r.includes("breath") || r.includes("sigh") || r.includes("gasp")) && (s = s.replace(/\[(?:breath|sigh|gasp)\]/gi, "... ")), i === "raise" && (s = s.toUpperCase()), s = s.replace(/\s+/g, " ").replace(/\.{4,}/g, "...").trim(), i === "whisper" && s.length > 0 && (s = `... ${s.toLowerCase()} ...`)), { cleanedText: s, detectedCues: r, tone: i };
}
function lt(h, e = 36) {
  const t = h.trim();
  if (!t) return [];
  const s = t.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim();
  if (s.split(/\s+/).filter(Boolean).length <= e) {
    const a = /[.!?]$/.test(s);
    return [{ text: t, isSentenceEnd: a }];
  }
  const r = t.match(/(?:<[^>]+>|[^.!?\n])+([.!?\n]+(?=[\s<]|$)|$)/g) || [t], o = [];
  let n = "";
  for (const a of r) {
    const c = a.trim();
    if (!c) continue;
    const l = n ? `${n} ${c}` : c;
    if (l.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e)
      n = l;
    else {
      if (n) {
        const m = n.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), f = /[.!?]$/.test(m);
        o.push({ text: n, isSentenceEnd: f });
      }
      if (c.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length > e) {
        const m = c.match(/(?:<[^>]+>|[^,;:—-])+([,;:—-]+(?=[\s<]|$)|$)/g) || [c];
        let f = "";
        for (const S of m) {
          const C = S.trim();
          if (!C) continue;
          const L = f ? `${f} ${C}` : C;
          L.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e ? f = L : (f && o.push({ text: f, isSentenceEnd: !1 }), f = C);
        }
        f ? n = f : n = "";
      } else
        n = c;
    }
  }
  if (n.trim()) {
    const a = n.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), c = /[.!?]$/.test(a);
    o.push({ text: n.trim(), isSentenceEnd: c });
  }
  return o.filter((a) => a.text.length > 0);
}
function dt(h) {
  let e = h.replace(
    /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi,
    (n, a) => {
      const c = parseFloat(a);
      return Number.isFinite(c) && c <= 1.2 ? "... " : n;
    }
  );
  e = e.replace(/\[(whisper|soft|yell|shout|loud|raise|emphasis)\]\s*\[\/\1\]/gi, "");
  const t = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]|\[(whisper|soft|yell|shout|loud|raise|emphasis)\]([\s\S]*?)\[\/\2\]/gi, s = [];
  let i = 0, r;
  for (; (r = t.exec(e)) !== null; ) {
    const n = e.slice(i, r.index).trim();
    if (n && s.push({ type: "speech", text: n, tone: "normal" }), r[1] !== void 0) {
      const a = parseFloat(r[1]);
      Number.isFinite(a) && a > 0 && s.push({ type: "pause", pauseSec: Math.min(a, 30) });
    } else if (r[2] !== void 0) {
      const a = r[2].toLowerCase(), c = (r[3] || "").trim();
      if (c) {
        let l = "normal";
        a === "whisper" || a === "soft" ? l = "whisper" : a === "yell" || a === "shout" || a === "loud" ? l = "yell" : (a === "raise" || a === "emphasis") && (l = "raise"), s.push({ type: "speech", text: c, tone: l });
      }
    }
    i = r.index + r[0].length;
  }
  const o = e.slice(i).trim();
  return o && s.push({ type: "speech", text: o, tone: "normal" }), s;
}
function $e(h) {
  if (!h || typeof h != "string") return;
  let e = h;
  if (!g.existsSync(e)) {
    const n = y.resolve(process.cwd(), "public", h.replace(/^\//, ""));
    g.existsSync(n) && (e = n);
  }
  if (!g.existsSync(e)) {
    const n = y.resolve(process.cwd(), h);
    g.existsSync(n) && (e = n);
  }
  if (!g.existsSync(e)) return;
  const t = y.extname(e).toLowerCase();
  if (t === ".wav") return e;
  const s = y.join(O.tmpdir(), "echo-voice-cache");
  g.mkdirSync(s, { recursive: !0 });
  const i = g.statSync(e), r = `${y.basename(e, t)}_${i.size}_${Math.floor(i.mtimeMs)}.wav`, o = y.join(s, r);
  if (g.existsSync(o) && g.statSync(o).size > 1e3)
    return o;
  try {
    if (Xe("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", e, o]), g.existsSync(o) && g.statSync(o).size > 1e3)
      return o;
  } catch (n) {
    console.warn(`[Echo Voice Engine] Audio conversion failed for ${e}:`, n);
  }
}
function Ce(h) {
  if (h) {
    const e = $e(h);
    if (e) return e;
  }
}
class ut {
  constructor(e) {
    b(this, "modelsService");
    b(this, "loadedModels", /* @__PURE__ */ new Map());
    b(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    this.modelsService = e || new Te();
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
    var e;
    for (const t of this.loadedModels.values())
      try {
        await ((e = v.unloadModel) == null ? void 0 : e.call(v, {
          modelId: t
        }));
      } catch {
      }
    return this.loadedModels.clear(), this.modelsService.deleteAllModels();
  }
  /**
   * Get complete status of all voice engine models
   */
  getStatus(e) {
    return this.modelsService.getStatus(e);
  }
  /**
   * Download a single model with live progress updates
   */
  async downloadModel(e, t) {
    return this.modelsService.downloadModel(e, t);
  }
  /**
   * Cancel an active model download
   */
  cancelDownload(e) {
    return this.modelsService.cancelDownload(e);
  }
  /**
   * Ensures the requested engine (CosyVoice 3 or Chatterbox T3) is loaded with configuration.
   */
  async ensureModelLoaded(e) {
    var r, o, n, a, c;
    const t = e.engine || "cosyvoice3", s = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), i = v.TTS_ENHANCER_LAVASR_FP16;
    if (t === "chatterbox") {
      const l = e.language && e.language !== "en" && this.modelsService.isModelDownloaded("chatterbox-t3-multilingual-q8_0") && this.modelsService.isModelDownloaded("chatterbox-s3gen-multilingual-q8_0");
      let d = l ? v.TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_T3_TURBO_EN_CHATTERBOX_Q8_0, u = l ? v.TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_S3GEN_EN_CHATTERBOX_Q8_0;
      const m = l ? "Chatterbox T3 Multilingual (Q8_0 GGUF)" : "Chatterbox T3 Turbo EN (Q8_0 GGUF)";
      if (!d || !u)
        throw new Error("QVAC Chatterbox descriptors (T3 and/or S3Gen) missing from SDK");
      let f = Ce(e.referenceAudioSrc);
      if (!f) {
        const _ = y.resolve(process.cwd(), "public", "voices", "samples", "en", "voice_en_male_1.mp3");
        g.existsSync(_) && (f = $e(_));
      }
      const S = [
        "chatterbox",
        l ? "multilingual" : "en",
        f ? y.basename(f) : "default",
        s ? "lavasr48k" : "native24k",
        process.arch === "arm64" ? "metal" : "cpu"
      ].join("|"), C = this.loadedModels.get(S);
      if (C)
        return { modelId: C, engine: "chatterbox" };
      (r = e.onLog) == null || r.call(e, {
        text: `[Echo Voice Engine] Loading ${m} + S3Gen Vocoder (${s ? "48kHz LavaSR" : "24kHz native"}${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const L = {
        ttsEngine: "chatterbox",
        language: e.language || "en",
        s3genModelSrc: (u == null ? void 0 : u.src) || u,
        streamChunkTokens: 25,
        streamFirstChunkTokens: 10,
        cfmSteps: 1,
        threads: 8,
        useGPU: process.arch === "arm64",
        seed: 42,
        ...f ? { referenceAudioSrc: f } : {},
        ...s && i ? { lavasrEnhancerModelSrc: i } : {}
      }, N = await v.loadModel({
        modelSrc: d,
        modelType: "tts",
        modelConfig: L,
        onProgress: (_) => {
          var T;
          const D = Math.round((_ == null ? void 0 : _.percentage) ?? 0);
          (T = e.onProgress) == null || T.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(D * 0.4)),
            message: `Loading ${m} weights ${D}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const _ = this.loadedModels.keys().next().value;
        if (_) {
          const D = this.loadedModels.get(_);
          if (D)
            try {
              await ((o = v.unloadModel) == null ? void 0 : o.call(v, { modelId: D }));
            } catch {
            }
          this.loadedModels.delete(_);
        }
      }
      return this.loadedModels.set(S, N), { modelId: N, engine: "chatterbox" };
    } else {
      const l = v.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || v.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!l)
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      const d = ((n = e.emotion) == null ? void 0 : n.toLowerCase()) || "", m = ["anger", "happy", "neutral", "sad"].includes(d) ? d : void 0, f = Ce(e.referenceAudioSrc), S = (this.modelsService.isModelDownloaded("cosyvoice3-s3tok-fp16") || this.modelsService.isModelDownloaded("cosyvoice3-s3tok")) && (this.modelsService.isModelDownloaded("cosyvoice3-campplus-fp32") || this.modelsService.isModelDownloaded("cosyvoice3-campplus"));
      console.log(
        `[Echo Voice Engine] CosyVoice 3 setup: refWavPath=${f}, hasCloningModels=${S}`
      );
      const C = [
        "cosyvoice3",
        f || "native",
        m || "none",
        s ? "lavasr48k" : "native24k"
      ].join("|"), L = this.loadedModels.get(C);
      if (L)
        return { modelId: L, engine: "cosyvoice3" };
      const N = f ? ` voice="${y.basename(f)}"` : " (native studio voice)", _ = m ? ` emotion="${m}"` : "";
      (a = e.onLog) == null || a.call(e, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0 [FP32 Flow Matching]${s ? " +LavaSR 48kHz" : ""}${N}${_})...`,
        stream: "stdout"
      });
      const D = {
        ttsEngine: "cosyvoice3",
        useGPU: !0,
        seed: 42,
        ...f && S ? {
          cosyvoice3S3tokModelSrc: v.TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16,
          cosyvoice3CampplusModelSrc: v.TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32,
          referenceAudioSrc: f
        } : {},
        ...s && i ? { lavasrEnhancerModelSrc: i } : {},
        ...m ? { emotion: m } : {}
      }, T = await v.loadModel({
        modelSrc: l,
        modelType: "tts",
        modelConfig: D,
        onProgress: (x) => {
          var E;
          const M = Math.round((x == null ? void 0 : x.percentage) ?? 0);
          (E = e.onProgress) == null || E.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(M * 0.4)),
            message: `Loading CosyVoice 3 weights ${M}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const x = this.loadedModels.keys().next().value;
        if (x) {
          const M = this.loadedModels.get(x);
          if (M)
            try {
              await ((c = v.unloadModel) == null ? void 0 : c.call(v, { modelId: M }));
            } catch {
            }
          this.loadedModels.delete(x);
        }
      }
      return this.loadedModels.set(C, T), { modelId: T, engine: "cosyvoice3" };
    }
  }
  cancelSynthesis(e) {
    var s;
    const t = this.activeTtsRequestIds.get(e);
    if (t) {
      try {
        (s = v.cancel) == null || s.call(v, { requestId: t });
      } catch {
      }
      this.activeTtsRequestIds.delete(e);
    }
  }
  /**
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Chatterbox T3)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  async synthesize(e, t, s, i) {
    var d, u, m, f, S, C, L, N, _;
    const { taskId: r, rounds: o } = e, n = e.engine || "cosyvoice3", a = o.filter((D) => D.text.trim().length > 0);
    if (a.length === 0)
      return { success: !1, error: "No active speech rounds to synthesize" };
    const c = a[0], l = e.speakerName || "Selected Speaker";
    s == null || s({
      text: `[Echo Voice Engine] Synthesis task ${r} engine="${n}" voice="${l}" turns=${a.length}...`,
      stream: "system"
    });
    try {
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: r,
        progress: 8,
        message: `Loading ${n === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const D = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), T = e.voicePrompt || e.prompt || e.description || c.prompt || c.description, x = ((d = c.emotion) == null ? void 0 : d.toLowerCase()) || "", M = [
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
      ], E = M.includes(x) ? x : void 0, p = c.referenceAudioSrc || e.referenceAudioSrc, { engine: $ } = await this.ensureModelLoaded({
        engine: n,
        language: e.language || "en",
        lavaSrEnabled: D,
        instruct: T || void 0,
        emotion: E,
        pace: (u = c.pace) == null ? void 0 : u.toLowerCase(),
        referenceAudioSrc: p,
        taskId: r,
        onProgress: t,
        onLog: s
      });
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      const I = [];
      let k = D ? 48e3 : 24e3;
      for (let V = 0; V < a.length; V++) {
        if (i != null && i()) {
          const q = this.activeTtsRequestIds.get(r);
          if (q)
            try {
              await ((m = v.cancel) == null ? void 0 : m.call(v, { requestId: q }));
            } catch {
            }
          return { success: !1, error: "Cancelled" };
        }
        const B = a[V], Pe = B.referenceAudioSrc || e.referenceAudioSrc, Me = ((f = B.emotion) == null ? void 0 : f.toLowerCase()) || "", Ve = M.includes(Me) ? Me : E, { modelId: Be } = await this.ensureModelLoaded({
          engine: n,
          language: e.language || "en",
          lavaSrEnabled: D,
          instruct: B.prompt || B.description || T || void 0,
          emotion: Ve,
          pace: (S = B.pace) == null ? void 0 : S.toLowerCase(),
          referenceAudioSrc: Pe,
          taskId: r,
          onProgress: t,
          onLog: s
        });
        if (t == null || t({
          taskId: r,
          progress: 40 + Math.round(V / a.length * 50),
          message: `Synthesizing turn ${V + 1}/${a.length}${B.speakerName ? ` (${B.speakerName})` : ""}...`,
          phase: "synthesis"
        }), V > 0 && I.length > 0) {
          const q = ve(0.2, k);
          le(I, q, k, 14);
        }
        const Ie = dt(B.text);
        let Ge = 0;
        for (let q = 0; q < Ie.length; q++) {
          const Q = Ie[q];
          if (i != null && i()) {
            const Y = this.activeTtsRequestIds.get(r);
            if (Y)
              try {
                await ((C = v.cancel) == null ? void 0 : C.call(v, { requestId: Y }));
              } catch {
              }
            return { success: !1, error: "Cancelled" };
          }
          if (Q.type === "pause" && Q.pauseSec) {
            const Y = ve(Q.pauseSec, k);
            le(I, Y, k, 14);
            continue;
          }
          if (Q.type === "speech" && Q.text) {
            const { cleanedText: Y, detectedCues: ne, tone: me } = ct(Q.text, $, Q.tone);
            if (!Y) continue;
            const ce = lt(Y, 36);
            for (let j = 0; j < ce.length; j++) {
              const ge = ce[j].text;
              if (!ge) continue;
              if (i != null && i()) {
                const R = this.activeTtsRequestIds.get(r);
                if (R)
                  try {
                    await ((L = v.cancel) == null ? void 0 : L.call(v, { requestId: R }));
                  } catch {
                  }
                return { success: !1, error: "Cancelled" };
              }
              if (I.length > 0) {
                const K = j > 0 && !ce[j - 1].isSentenceEnd ? 0.035 : j > 0 ? 0.09 : 0.08, P = ve(K, k);
                le(I, P, k, 10);
              }
              Ge++;
              const H = {
                modelId: Be,
                text: ge,
                inputType: "text",
                stream: !1
              };
              if ($ === "cosyvoice3") {
                const R = (((N = B.emotion) == null ? void 0 : N.toLowerCase()) || E || "").trim(), K = ["anger", "happy", "neutral", "sad"];
                if (me === "whisper" || ne.includes("whisper"))
                  H.volume = "soft", H.pace = "slow";
                else if (me === "yell" || ne.includes("yell"))
                  H.volume = "loud", H.emotion = "anger";
                else if (me === "raise" || ne.includes("raise"))
                  H.volume = "loud";
                else {
                  let P = K.includes(R) ? R : void 0;
                  if ((ne.includes("sigh") || ne.includes("breath")) && !P && (P = "sad"), P && P !== "neutral")
                    H.emotion = P;
                  else {
                    const ae = (((_ = B.pace) == null ? void 0 : _.toLowerCase()) || "").trim();
                    ["slow", "moderate", "fast"].includes(ae) && ae !== "moderate" && (H.pace = ae);
                  }
                }
              }
              const X = v.textToSpeech(H);
              X != null && X.requestId && this.activeTtsRequestIds.set(r, X.requestId);
              const F = await X.buffer ?? [], ze = await X.done, fe = await X.sampleRate, oe = typeof fe == "number" && fe > 0 ? fe : D ? 48e3 : 24e3;
              if (k = oe, this.activeTtsRequestIds.delete(r), F.length > 0) {
                let R = 0, K = 1 / 0, P = -1 / 0;
                for (const se of F) {
                  const ye = Number.isFinite(se) ? se : 0;
                  R = Math.max(R, Math.abs(ye)), K = Math.min(K, ye), P = Math.max(P, ye);
                }
                const ae = F.every((se) => se === 0), be = F.every((se) => se === F[0]);
                console.log(
                  `[TTS Debug] Turn ${V + 1} Chunk ${j + 1}/${ce.length}: PCM length=${F.length}, maxAbs=${R.toFixed(4)}, min=${K.toFixed(4)}, max=${P.toFixed(4)}, allZero=${ae}, allSame=${be}, sampleRate=${oe}`
                );
              }
              if (F.length > 0) {
                const R = ge.replace(/[^a-z0-9]/gi, "_").slice(0, 30) || `round-${V}-chunk-${j}`;
                Ae(F, oe, `segment-${V}-${R}`);
              }
              if (!ze || !F || F.length === 0)
                throw new Error(
                  `${$ === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} returned no audio for turn ${V + 1}`
                );
              const qe = at(F, oe);
              le(I, qe, oe, 12);
            }
          }
        }
      }
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: r,
        progress: 95,
        message: `Finalizing ${k}Hz WAV & waveform...`,
        phase: "finalizing"
      }), I.length > 0 && Ae(I, k, "combined-output");
      const z = nt(I, k), re = ot(I, 38), W = Math.round(I.length / k * 10) / 10, he = a[0].text.trim(), Re = he.length > 55 ? `${he.slice(0, 52)}...` : he, Fe = {
        id: `gen-${r}`,
        roundIndex: e.historyIndex || 0,
        title: `Generation ${(e.historyIndex || 0) + 1}`,
        textSnippet: Re,
        speakerName: a.length > 1 ? `${a.length} Speakers` : e.speakerName || "Sterling Rhodes",
        speakerColor: a.length > 1 ? "#10b981" : e.speakerColor || "#38bdf8",
        speakerAvatarUrl: e.speakerAvatarUrl || "/voices/sterling.jpg",
        duration: W,
        audioUrl: z,
        waveform: re,
        timestamp: "Just now",
        emotion: c.emotion || "Neutral"
      };
      return t == null || t({
        taskId: r,
        progress: 100,
        message: `${$ === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} synthesis complete`,
        phase: "complete"
      }), s == null || s({
        text: `[Echo Voice Engine] Synthesis complete (${W}s @ ${k}Hz, ${I.length} samples).`,
        stream: "stdout"
      }), { success: !0, data: Fe };
    } catch (D) {
      this.activeTtsRequestIds.delete(r);
      const T = D != null && D.message ? String(D.message) : String(D);
      return s == null || s({
        text: `[Echo Voice Engine] Synthesis failed: ${T}`,
        stream: "stderr"
      }), { success: !1, error: T };
    }
  }
}
class ht {
  constructor(e, t) {
    b(this, "activeTasks", /* @__PURE__ */ new Set());
    b(this, "voiceEngine");
    b(this, "modelsService");
    b(this, "conversationRepo");
    this.modelsService = e || new Te(), this.voiceEngine = new ut(this.modelsService), this.conversationRepo = t;
  }
  /** Access conversation persistence repository */
  getConversationRepository() {
    return this.conversationRepo;
  }
  /** Query all persisted conversations from SQLite */
  async listConversations() {
    return this.conversationRepo ? this.conversationRepo.listConversations() : [];
  }
  /** Save conversation and dialogue rounds to SQLite */
  async saveConversation(e) {
    return this.conversationRepo ? this.conversationRepo.saveConversation(e) : { success: !1, error: "Conversation repository unavailable" };
  }
  /** Delete conversation from SQLite */
  async deleteConversation(e) {
    return this.conversationRepo ? this.conversationRepo.deleteConversation(e) : { success: !1, error: "Conversation repository unavailable" };
  }
  /** Clear all conversations from SQLite */
  async clearConversations() {
    return this.conversationRepo ? this.conversationRepo.clearConversations() : { success: !1, error: "Conversation repository unavailable" };
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
  getModelStatus(e) {
    return this.modelsService.getStatus(e);
  }
  /** Download a specific model */
  async downloadModel(e, t) {
    return this.modelsService.downloadModel(e, t);
  }
  /** Cancel an in-flight model download */
  cancelModelDownload(e) {
    return this.modelsService.cancelDownload(e);
  }
  /** Delete all installed models from disk and reset engine state */
  async deleteAllModels() {
    return this.voiceEngine.deleteAllModels();
  }
  /** Cancel an active generation task + underlying QVAC request */
  cancelGeneration(e) {
    var t, s;
    if (this.activeTasks.has(e)) {
      this.activeTasks.delete(e);
      try {
        (s = (t = this.voiceEngine).cancelSynthesis) == null || s.call(t, e);
      } catch {
      }
      return !0;
    }
    return !1;
  }
  /** Check if a task was cancelled */
  isCancelled(e) {
    return !this.activeTasks.has(e);
  }
  /** High-fidelity speech synthesis pipeline using Echo Voice Engine prompt-driven voice design */
  async generateSpeech(e, t, s) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      return await this.voiceEngine.synthesize(
        e,
        t,
        s,
        () => this.isCancelled(i)
      );
    } finally {
      this.activeTasks.delete(i);
    }
  }
}
class mt {
  constructor(e) {
    b(this, "db");
    this.db = e;
  }
  /**
   * Query all conversations and dialogue rounds from SQLite
   */
  async listConversations() {
    await this.db.init();
    try {
      return (await this.db.client.conversation.findMany({
        include: {
          rounds: {
            orderBy: {
              roundOrder: "asc"
            }
          },
          activity: !0
        },
        orderBy: {
          createdAt: "desc"
        }
      })).map((t) => ({
        id: t.id,
        text: t.text,
        previewSnippet: t.previewSnippet || t.text,
        voiceName: t.voiceName,
        voiceColor: t.voiceColor,
        voiceAvatarUrl: t.voiceAvatarUrl || "/voices/sterling.jpg",
        dateGroup: t.dateGroup,
        timeAgo: t.timeAgo,
        timestamp: t.timestamp ? Number(t.timestamp) : t.createdAt.getTime(),
        model: t.model,
        engine: t.engine,
        duration: t.duration,
        durationSec: t.durationSec || 0,
        emotion: t.emotion || void 0,
        audioUrl: t.audioUrl || void 0,
        waveform: t.waveform ? JSON.parse(t.waveform) : [],
        voicePrompt: t.voicePrompt || void 0,
        language: t.language || void 0,
        speakerCount: t.speakerCount,
        generationId: t.generationId || void 0,
        activity: t.activity ? {
          id: t.activity.id,
          type: t.activity.type,
          title: t.activity.title,
          category: t.activity.category,
          subCategory: t.activity.subCategory,
          description: t.activity.description
        } : void 0,
        roundsData: t.rounds.map((s) => ({
          id: s.id,
          voiceId: s.voiceId,
          text: s.text,
          speed: s.speed,
          emotion: s.emotion || void 0,
          pace: s.pace || void 0,
          prompt: s.prompt || void 0,
          description: s.description || void 0,
          referenceAudioSrc: s.referenceAudioSrc || void 0,
          speakerName: s.speakerName || void 0,
          speakerColor: s.speakerColor || void 0
        }))
      }));
    } catch (e) {
      return console.error("[ConversationRepositoryService] Failed to query conversations:", e), [];
    }
  }
  /**
   * Save or update a conversation with all dialogue rounds in SQLite
   */
  async saveConversation(e) {
    await this.db.init();
    try {
      const t = e.waveform ? JSON.stringify(e.waveform) : "[]", s = e.timestamp ? BigInt(Math.floor(e.timestamp)) : BigInt(Date.now());
      return await this.db.client.$transaction(async (i) => {
        if (await i.conversation.upsert({
          where: { id: e.id },
          update: {
            text: e.text,
            previewSnippet: e.previewSnippet || e.text,
            voiceName: e.voiceName,
            voiceColor: e.voiceColor,
            voiceAvatarUrl: e.voiceAvatarUrl,
            dateGroup: e.dateGroup,
            timeAgo: e.timeAgo,
            timestamp: s,
            model: e.model,
            engine: e.engine || "cosyvoice3",
            duration: e.duration,
            durationSec: e.durationSec,
            emotion: e.emotion,
            audioUrl: e.audioUrl,
            waveform: t,
            voicePrompt: e.voicePrompt,
            language: e.language,
            speakerCount: e.speakerCount || 1,
            generationId: e.generationId
          },
          create: {
            id: e.id,
            text: e.text,
            previewSnippet: e.previewSnippet || e.text,
            voiceName: e.voiceName,
            voiceColor: e.voiceColor,
            voiceAvatarUrl: e.voiceAvatarUrl,
            dateGroup: e.dateGroup,
            timeAgo: e.timeAgo,
            timestamp: s,
            model: e.model,
            engine: e.engine || "cosyvoice3",
            duration: e.duration,
            durationSec: e.durationSec,
            emotion: e.emotion,
            audioUrl: e.audioUrl,
            waveform: t,
            voicePrompt: e.voicePrompt,
            language: e.language,
            speakerCount: e.speakerCount || 1,
            generationId: e.generationId
          }
        }), await i.speechRound.deleteMany({
          where: { conversationId: e.id }
        }), e.roundsData && Array.isArray(e.roundsData) && e.roundsData.length > 0) {
          const u = e.roundsData.map((m, f) => ({
            id: m.id || `${e.id}-round-${f}`,
            conversationId: e.id,
            roundOrder: f,
            voiceId: m.voiceId || "voice-en-male-1",
            text: m.text || "",
            speed: typeof m.speed == "number" ? m.speed : 1,
            emotion: m.emotion || null,
            pace: m.pace || null,
            prompt: m.prompt || null,
            description: m.description || null,
            referenceAudioSrc: m.referenceAudioSrc || null,
            speakerName: m.speakerName || null,
            speakerColor: m.speakerColor || null
          }));
          for (const m of u)
            await i.speechRound.create({ data: m });
        }
        const o = (e.previewSnippet || e.text || "").replace(/\s+/g, " ").trim(), n = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${e.voiceName || "Speech Synthesis"} Turn`, a = await i.activity.findUnique({
          where: { conversationId: e.id }
        }), c = "Text to Speech", l = e.speakerCount && e.speakerCount > 1 ? `${e.speakerCount} Speakers Diarized` : e.voiceName || "Single Speaker", d = JSON.stringify({
          model: e.model,
          engine: e.engine || "cosyvoice3",
          duration: e.duration,
          durationSec: e.durationSec,
          emotion: e.emotion,
          audioUrl: e.audioUrl,
          waveform: e.waveform || [],
          speakerCount: e.speakerCount || 1
        });
        if (a)
          await i.activity.update({
            where: { conversationId: e.id },
            data: {
              category: c,
              subCategory: l,
              description: o ? o.slice(0, 160) : null,
              metadata: d
            }
          });
        else {
          let u = n, m = 1;
          for (; await i.activity.findUnique({ where: { title: u } }); )
            m++, u = `${n} #${m}`;
          await i.activity.create({
            data: {
              id: `act-${e.id}`,
              type: "tts",
              title: u,
              category: c,
              subCategory: l,
              description: o ? o.slice(0, 160) : null,
              originId: e.id,
              originType: "conversation",
              conversationId: e.id,
              metadata: d
            }
          });
        }
      }), { success: !0 };
    } catch (t) {
      return console.error("[ConversationRepositoryService] Failed to save conversation:", t), { success: !1, error: t instanceof Error ? t.message : String(t) };
    }
  }
  /**
   * Delete a conversation from SQLite
   */
  async deleteConversation(e) {
    await this.db.init();
    try {
      return await this.db.client.conversation.delete({
        where: { id: e }
      }), { success: !0 };
    } catch (t) {
      return console.error("[ConversationRepositoryService] Failed to delete conversation:", t), { success: !1, error: t instanceof Error ? t.message : String(t) };
    }
  }
  /**
   * Delete all conversations from SQLite
   */
  async clearConversations() {
    await this.db.init();
    try {
      return await this.db.client.conversation.deleteMany({}), { success: !0 };
    } catch (e) {
      return console.error("[ConversationRepositoryService] Failed to clear conversations:", e), { success: !1, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
class gt extends ie {
  constructor(e) {
    super(), this.ttsService = e;
  }
  init() {
    A.handle(
      w.TTS_GENERATE,
      async (e, t) => {
        const s = t.engine || "cosyvoice3", r = this.ttsService.getModelStatus(s).models.filter((c) => c.required && !c.downloaded);
        if (r.length > 0)
          return {
            success: !1,
            error: `Required voice engine models not downloaded: ${r.map((c) => c.name).join(", ")}`
          };
        const o = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.TTS_PROGRESS, c);
          } catch (l) {
            console.warn("[TtsController] Failed to send progress event:", l);
          }
        }, n = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: c.text,
              stream: c.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (l) {
            console.warn("[TtsController] Failed to send log event:", l);
          }
        }, a = await this.ttsService.generateSpeech(t, o, n);
        if (a.success && a.data)
          try {
            e.sender.isDestroyed() || e.sender.send(w.TTS_COMPLETE, {
              taskId: t.taskId,
              generation: a.data
            });
          } catch (c) {
            console.warn("[TtsController] Failed to send complete event:", c);
          }
        else if (!a.success)
          try {
            e.sender.isDestroyed() || e.sender.send(w.TTS_ERROR, {
              taskId: t.taskId,
              error: a.error || "Generation failed"
            });
          } catch (c) {
            console.warn("[TtsController] Failed to send error event:", c);
          }
        return a;
      }
    ), A.handle(
      w.TTS_CANCEL,
      async (e, { taskId: t }) => ({ success: this.ttsService.cancelGeneration(t), taskId: t })
    ), A.handle(w.TTS_HISTORY_LIST, async () => {
      try {
        return { success: !0, data: await this.ttsService.listConversations() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    }), A.handle(w.TTS_HISTORY_SAVE, async (e, t) => {
      try {
        return await this.ttsService.saveConversation(t);
      } catch (s) {
        return { success: !1, error: (s == null ? void 0 : s.message) || String(s) };
      }
    }), A.handle(w.TTS_HISTORY_DELETE, async (e, t) => {
      try {
        const s = typeof t == "string" ? t : t.id;
        return await this.ttsService.deleteConversation(s);
      } catch (s) {
        return { success: !1, error: (s == null ? void 0 : s.message) || String(s) };
      }
    }), A.handle(w.TTS_HISTORY_CLEAR, async () => {
      try {
        return await this.ttsService.clearConversations();
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
const J = class J {
  constructor() {
    b(this, "primaryLogPath");
    b(this, "mirrorLogPath");
    var i;
    let e;
    try {
      e = (i = U) != null && i.getPath ? U.getPath("userData") : process.cwd();
    } catch {
      e = process.cwd();
    }
    const t = y.join(e, "logs");
    if (!g.existsSync(t))
      try {
        g.mkdirSync(t, { recursive: !0 });
      } catch {
      }
    this.primaryLogPath = y.join(t, "music-generation.log");
    const s = y.join(process.cwd(), "logs");
    if (!g.existsSync(s))
      try {
        g.mkdirSync(s, { recursive: !0 });
      } catch {
      }
    this.mirrorLogPath = y.join(s, "music-generation.log"), this.rotateIfNecessary(this.primaryLogPath), this.rotateIfNecessary(this.mirrorLogPath), this.writeRaw(`
=== Music Logger Initialized [${(/* @__PURE__ */ new Date()).toISOString()}] ===
Primary Log: ${this.primaryLogPath}
Mirror Log: ${this.mirrorLogPath}
`);
  }
  static getInstance() {
    return J.instance || (J.instance = new J()), J.instance;
  }
  rotateIfNecessary(e) {
    try {
      if (g.existsSync(e) && g.statSync(e).size > 15 * 1024 * 1024) {
        const s = `${e}.${Date.now()}.bak`;
        g.renameSync(e, s);
      }
    } catch {
    }
  }
  writeRaw(e) {
    try {
      g.appendFileSync(this.primaryLogPath, e, "utf-8");
    } catch (t) {
      console.warn("[MusicLogger] Failed to write primary log:", t);
    }
    if (this.mirrorLogPath !== this.primaryLogPath)
      try {
        g.appendFileSync(this.mirrorLogPath, e, "utf-8");
      } catch {
      }
  }
  logInfo(e, t) {
    let i = `[${(/* @__PURE__ */ new Date()).toISOString()}] [INFO] ${e}`;
    t && (i += `
  Metadata: ${JSON.stringify(t, null, 2)}`), i += `
`, this.writeRaw(i), console.log(`[MusicLogger] ${e}`);
  }
  logSessionStart(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), s = "=".repeat(80), i = `
${s}
[${t}] ▸ STARTING MUSIC GENERATION
TaskId:         ${e.taskId}
Engine:         ${e.engine}
Caption:        "${e.caption}"
Lyrics:         ${e.lyrics ? `"${e.lyrics.slice(0, 100)}${e.lyrics.length > 100 ? "..." : ""}"` : "(none)"}
Instrumental:   ${!!e.isInstrumental}
Duration:       ${e.duration || 30}s
DiT Variant:    ${e.ditVariant || "n/a"}
Seed:           ${e.seed ?? -1}
${s}
`;
    this.writeRaw(i), console.log(`[MusicLogger] ▸ Generation Started for task: ${e.taskId} (Engine: ${e.engine})`);
  }
  logMilestone(e, t, s) {
    const r = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [${t}] ${s || ""}
`;
    this.writeRaw(r), console.log(`[MusicLogger] [${e}] [${t}] ${s || ""}`);
  }
  logProgress(e, t, s, i, r) {
    const n = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [PROGRESS] ${t}: ${r}% (${s}/${i})
`;
    this.writeRaw(n);
  }
  logSuccess(e, t) {
    const s = (/* @__PURE__ */ new Date()).toISOString(), i = "-".repeat(80), r = `
${i}
[${s}] ✓ MUSIC GENERATION SUCCEEDED
TaskId:         ${e}
Duration:       ${(t.durationMs / 1e3).toFixed(2)}s
Format:         ${t.sampleRate} Hz, ${t.channels} ch
Output WAV:     ${t.wavFilePath}
${i}
`;
    this.writeRaw(r), console.log(`[MusicLogger] ✓ Generation Succeeded: ${e} -> ${t.wavFilePath}`);
  }
  logFailure(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), s = "#".repeat(80), i = e.error, r = (i == null ? void 0 : i.message) || String(i), o = (i == null ? void 0 : i.code) || (i == null ? void 0 : i.errCode) || "UNKNOWN", n = (i == null ? void 0 : i.stack) || "(No stack trace available)", a = i != null && i.cause ? JSON.stringify(i.cause, null, 2) : void 0, c = i == null ? void 0 : i.adds;
    let l = [];
    const d = y.join(O.homedir(), ".qvac", "models");
    try {
      g.existsSync(d) && (l = g.readdirSync(d).map((S) => {
        try {
          const L = (g.statSync(y.join(d, S)).size / (1024 * 1024)).toFixed(1);
          return `${S} (${L} MB)`;
        } catch {
          return S;
        }
      }));
    } catch {
    }
    const u = Math.round(O.freemem() / (1024 * 1024)), m = Math.round(O.totalmem() / (1024 * 1024)), f = `
${s}
[${t}] ✖ MUSIC GENERATION FAILED
TaskId:           ${e.taskId}
Engine:           ${e.engine}
Failure Stage:    ${e.stage}
Error Code:       ${o}
Error Message:    ${r}
${c ? `Error Adds:       ${c}
` : ""}${a ? `Error Cause:      ${a}
` : ""}
Stack Trace:
${n}

Options Provided:
${JSON.stringify(e.options || {}, null, 2)}

Resolved Model Paths:
${JSON.stringify(e.resolvedPaths || {}, null, 2)}

Models Cache Directory (${d}):
${l.length > 0 ? l.map((S) => `  - ${S}`).join(`
`) : "  (Directory empty or inaccessible)"}

System Resources:
  Platform:       ${O.platform()}-${O.arch()}
  Free Memory:    ${u} MB / ${m} MB (${Math.round(u / m * 100)}% free)
  Node Version:   ${process.version}
${s}
`;
    this.writeRaw(f), console.error(`[MusicLogger] ✖ Generation Failed for ${e.taskId} (Engine: ${e.engine}, Stage: ${e.stage}): ${r}`), console.error(n);
  }
  getRecentLogs(e = 200) {
    try {
      if (!g.existsSync(this.primaryLogPath))
        return "No music generation logs recorded yet.";
      const t = g.readFileSync(this.primaryLogPath, "utf-8"), s = t.split(`
`);
      return s.length <= e ? t : s.slice(s.length - e).join(`
`);
    } catch (t) {
      return `Failed to read logs: ${(t == null ? void 0 : t.message) || String(t)}`;
    }
  }
  clearLogs() {
    try {
      return g.existsSync(this.primaryLogPath) && g.writeFileSync(this.primaryLogPath, "", "utf-8"), g.existsSync(this.mirrorLogPath) && this.mirrorLogPath !== this.primaryLogPath && g.writeFileSync(this.mirrorLogPath, "", "utf-8"), !0;
    } catch {
      return !1;
    }
  }
  getLogFilePaths() {
    return {
      primary: this.primaryLogPath,
      mirror: this.mirrorLogPath !== this.primaryLogPath ? this.mirrorLogPath : void 0
    };
  }
};
b(J, "instance");
let Se = J;
const Z = class Z {
  static getInstance() {
    return Z.instance || (Z.instance = new Z()), Z.instance;
  }
  /**
   * Sanitizes prompt, lyrics, and arrangements incorporating all selected UI options
   * (vocalMode, BPM, keyscale, time signature, duration, vocal language, etc.).
   */
  sanitize(e) {
    var d;
    const t = e.caption || "", s = e.engine || "acestep", i = e.duration && e.duration > 0 ? e.duration : 30, r = /\b(instrumental|no vocals?|no singing|without vocals?|backing track|karaoke|pure instrumental|solo piano|solo guitar|acoustic instrumental)\b/i.test(t), o = !!(e.vocalMode === "instrumental" || e.isInstrumental || ((d = e.lyrics) == null ? void 0 : d.trim()) === "[Instrumental]" || r);
    let n = this.stripConversationalMeta(t), a, c;
    if (o ? (n = n.replace(/\b(?:with\s+)?(?:clear\s+melodic\s+)?(?:singing\s+vocals?|singing|lead\s+vocals?|vocalist|singer|soprano|baritone|tenor|choir|voice)\b/gi, "").replace(/\b(?:with\s+lyrics?|lyrics?)\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /\b(instrumental|backing track|no vocals)\b/i.test(n) ? /\bno vocals\b/i.test(n) || (n = `${n}, no vocals`) : n = `${n}, instrumental backing track, no vocals, rich melodic instruments`, c = "[Instrumental]", a = void 0) : (n = n.replace(/\b(?:pure\s+)?instrumental(?:\s+track|\s+version)?\b/gi, "").replace(/\b(?:without|no)\s+vocals?\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /(vocal|singer|voice|singing|choir|soprano|baritone|tenor|lead vocals|vocalist|harmony)/i.test(n) || (a = this.inferVocalTimbre(n, e.vocalLanguage), n = `${n}, ${a}`), e.vocalMode === "manual" && e.lyrics && e.lyrics.trim() && e.lyrics.trim() !== "[Instrumental]" ? c = this.formatLyricsForDuration(e.lyrics, n, i) : s === "acestep" && !e.lyrics ? c = "" : c = this.formatLyricsForDuration(e.lyrics, n, i)), e.bpm && e.bpm > 0 && (/\b\d+\s*(?:bpm|beats\s+per\s+minute)\b/i.test(n) || (n = `${n}, ${e.bpm} BPM`)), e.keyscale && e.keyscale.trim() && e.keyscale.toLowerCase() !== "none") {
      const u = e.keyscale.trim(), m = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      new RegExp(`\\b${m}\\b`, "i").test(n) || /\b(?:in\s+key\s+of|key\s+of)\b/i.test(n) || (n = `${n}, in ${u}`);
    }
    if (e.timesignature && e.timesignature.trim() && e.timesignature !== "4/4") {
      const u = e.timesignature.trim();
      n.includes(u) || (n = `${n}, ${u} time signature`);
    }
    if (!o && e.vocalLanguage && e.vocalLanguage !== "en") {
      const m = {
        es: "Spanish",
        zh: "Chinese",
        ja: "Japanese",
        ko: "Korean",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        ru: "Russian"
      }[e.vocalLanguage.toLowerCase()];
      m && !new RegExp(`\\b${m}\\b`, "i").test(n) && (n = `${n}, ${m} vocals`);
    }
    i >= 120 ? /(extended|full-length|progression|arrangement|complete song)/i.test(n) || (n = `${n}, full-length structured arrangement with progression`) : i >= 60 && (/(progression|arrangement|structured)/i.test(n) || (n = `${n}, structured track progression`)), n = n.replace(/\s*,\s*,+/g, ",").replace(/,\s*$/g, "").replace(/\s{2,}/g, " ").trim();
    const l = s === "minimax" ? Math.max(750, Math.round(i * 25)) : void 0;
    return {
      caption: n.trim(),
      lyrics: c.trim(),
      duration: i,
      maxFrames: l,
      vocalHintInjected: a,
      isInstrumental: o
    };
  }
  /**
   * Strips conversational filler like "generate a...", "make a song about..."
   */
  stripConversationalMeta(e) {
    let t = e.trim();
    const s = [
      /^(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|write|compose|produce)\s+(?:me\s+)?(?:a|an|the|some)?\s+/i,
      /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+have\s+)?(?:a|an|the|some)?\s+)/i,
      /^(?:give\s+me\s+(?:a|an|the)?\s+)/i,
      /^(?:song\s+about\s+)/i,
      /^(?:track\s+about\s+)/i
    ];
    for (const i of s)
      t = t.replace(i, "");
    return t.length > 0 && (t = t.charAt(0).toUpperCase() + t.slice(1)), t = t.replace(/\s*,\s*,+/g, ",").replace(/\s{2,}/g, " "), t;
  }
  /**
   * Infers the best vocal timbre matching the musical genre/theme and optional language
   */
  inferVocalTimbre(e, t) {
    const s = e.toLowerCase(), i = {
      es: "Spanish",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian"
    }, r = t && t !== "en" && i[t.toLowerCase()] ? `${i[t.toLowerCase()]} ` : "";
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk|ancient|kingdom)/.test(s) ? `${r}haunting bard vocals, clear close-mic singing, natural human vibrato, acoustic studio production` : /(synthwave|retrowave|cyberpunk|80s|neon|electro)/.test(s) ? `${r}crisp 80s gated reverb male vocals, polished lead vocal, punchy melodic synth hook` : /(lo-fi|lofi|chillhop|coffee|relax|bedroom)/.test(s) ? `${r}soft breathy female vocals, intimate close-mic acoustic presence, clear pronunciation` : /(rock|metal|punk|grunge|electric guitar|heavy)/.test(s) ? `${r}raw energetic rock vocals, powerful singing voice, clear vocal consonants` : /(cinematic|epic|orchestral|orchestra|trailer|hero)/.test(s) ? `${r}soaring dramatic vocals, rich choral harmonies, expansive dynamic range` : /(ballad|piano|sad|emotional|heartbreak|acoustic|love|romance|romantic)/.test(s) ? `${r}heartfelt emotional solo vocals, warm studio acoustic presence, intimate vocal nuance, close-mic singing` : /(pop|dance|disco|summer|happy|party)/.test(s) ? `${r}bright modern pop vocals, crisp high-end clarity, infectious melodic chorus` : /(r&b|soul|jazz|blues)/.test(s) ? `${r}smooth soulful vocals, rich vocal harmonics, clear diction` : `${r}expressive lead singing vocals, crisp close-mic presence, natural human vibrato, studio vocal clarity`;
  }
  /**
   * Formats, tags, and extends lyrics according to duration so the model
   * doesn't stop prematurely at ~20 seconds.
   */
  formatLyricsForDuration(e, t, s) {
    let i = (e || "").trim();
    if (!i)
      return this.generateDefaultLyricsForTheme(t, s);
    i = i.replace(/\[?(?:verse\s*\d*|\(verse\s*\d*\)|verse\s*\d*:)\]?/gi, "[verse]"), i = i.replace(/\[?(?:chorus|\(chorus\)|chorus:)\]?/gi, "[chorus]"), i = i.replace(/\[?(?:bridge|\(bridge\)|bridge:)\]?/gi, "[bridge]"), i = i.replace(/\[?(?:outro|\(outro\)|outro:)\]?/gi, "[outro]"), i = i.replace(/\[?(?:intro|\(intro\)|intro:)\]?/gi, "[intro]"), i = i.replace(/\*\*(.*?)\*\*/g, "$1"), i = i.replace(/#{1,6}\s*/g, ""), i.startsWith("[") || (i = `[verse]
${i}`);
    const r = i.match(/\[(verse|chorus|bridge|outro|intro)\]/gi) || [];
    if (s >= 120 && r.length < 3) {
      const o = i.split(`
`).filter((n) => n.trim() && !n.startsWith("["));
      if (o.length > 0) {
        const n = o.slice(0, Math.min(4, o.length)).join(`
`), a = o.length > 4 ? o.slice(4).join(`
`) : n;
        i = [
          `[verse]
${n}`,
          `[chorus]
${a}`,
          `[verse]
${n}`,
          `[chorus]
${a}`,
          `[bridge]
Carried on the melody, through the passing time...`,
          `[chorus]
${a}`,
          `[outro]
Fading softly into the end...`
        ].join(`

`);
      }
    } else s >= 60 && r.length < 2 && (i = `${i}

[chorus]
${i.replace(/\[verse\]/g, "").trim()}

[outro]
Fading with the music...`);
    return i;
  }
  /**
   * Generates a complete, multi-section lyric sheet tailored to the duration.
   */
  generateDefaultLyricsForTheme(e, t) {
    const s = e.toLowerCase();
    return /(medieval|war|harp|battle|castle)/.test(s) ? t >= 120 ? `[verse]
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
Peace to the fallen, beyond despair...` : `[verse]
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
Peace to the fallen, beyond despair...` : `[verse]
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
b(Z, "instance");
let pe = Z;
const ee = class ee {
  static getInstance() {
    return ee.instance || (ee.instance = new ee()), ee.instance;
  }
  /**
   * Post-processes raw interleaved PCM audio buffer into studio-mastered audio.
   * Returns a new Uint8Array with the mastered PCM samples.
   */
  masterPcm(e, t, s, i, r = {}) {
    if (!e || e.byteLength === 0 || s <= 0 || t <= 0)
      return { masteredPcm: e, peakBeforeDb: -99, peakAfterDb: -99, details: "empty pcm" };
    const {
      enableHighPass: o = !0,
      highPassHz: n = 32,
      enableAirShelf: a = !0,
      airShelfHz: c = 9500,
      airShelfGainDb: l = 2.2,
      enableNormalize: d = !0,
      targetPeakDb: u = -0.5,
      enableSoftLimiter: m = !0
    } = r, f = Math.floor(i === 16 ? e.byteLength / 2 : e.byteLength / 4), S = new Float32Array(f);
    if (i === 16) {
      const M = new Int16Array(e.buffer, e.byteOffset, f);
      for (let E = 0; E < f; E++)
        S[E] = M[E] / 32768;
    } else if (i === 32) {
      const M = new Float32Array(e.buffer, e.byteOffset, f);
      S.set(M);
    } else
      return { masteredPcm: e, peakBeforeDb: 0, peakAfterDb: 0, details: "unsupported bit depth" };
    let C = 1e-5;
    for (let M = 0; M < f; M++) {
      const E = Math.abs(S[M]);
      E > C && (C = E);
    }
    const L = 20 * Math.log10(C);
    o && n > 0 && n < t / 2 && this.applyHighPassFilter(S, t, s, n), a && l !== 0 && c < t / 2 && this.applyHighShelfFilter(S, t, s, c, l);
    let N = 1e-5;
    for (let M = 0; M < f; M++) {
      const E = Math.abs(S[M]);
      E > N && (N = E);
    }
    if (d && N > 1e-4) {
      const E = Math.pow(10, u / 20) / N;
      for (let p = 0; p < f; p++)
        S[p] *= E;
    }
    if (m) {
      const E = 0.06000000000000005;
      for (let p = 0; p < f; p++) {
        const $ = S[p];
        $ > 0.94 ? S[p] = 0.94 + E * Math.tanh(($ - 0.94) / E) : $ < -0.94 && (S[p] = -0.94 + E * Math.tanh(($ + 0.94) / E));
      }
    }
    let _ = 1e-5;
    for (let M = 0; M < f; M++) {
      const E = Math.abs(S[M]);
      E > _ && (_ = E);
    }
    const D = 20 * Math.log10(_), T = new Uint8Array(e.byteLength);
    if (i === 16) {
      const M = new Int16Array(T.buffer, T.byteOffset, f);
      for (let E = 0; E < f; E++) {
        const p = Math.max(-1, Math.min(1, S[E]));
        M[E] = p < 0 ? Math.round(p * 32768) : Math.round(p * 32767);
      }
    } else i === 32 && new Float32Array(T.buffer, T.byteOffset, f).set(S);
    const x = `HighPass: ${n}Hz | AirShelf: +${l}dB @ ${c}Hz | Peak: ${L.toFixed(1)}dBFS -> ${D.toFixed(1)}dBFS`;
    return { masteredPcm: T, peakBeforeDb: L, peakAfterDb: D, details: x };
  }
  /**
   * Applies a 2nd-order Butterworth High-Pass Biquad Filter per channel
   */
  applyHighPassFilter(e, t, s, i) {
    const r = 2 * Math.PI * i / t, o = Math.cos(r), c = Math.sin(r) / (2 * 0.70710678), l = (1 + o) / 2, d = -(1 + o), u = (1 + o) / 2, m = 1 + c, f = -2 * o, S = 1 - c, C = l / m, L = d / m, N = u / m, _ = f / m, D = S / m;
    for (let T = 0; T < s; T++) {
      let x = 0, M = 0, E = 0, p = 0;
      for (let $ = T; $ < e.length; $ += s) {
        const I = e[$], k = C * I + L * x + N * M - _ * E - D * p;
        M = x, x = I, p = E, E = k, e[$] = k;
      }
    }
  }
  /**
   * Applies a High-Shelf Presence / Vocal Air Biquad Filter per channel
   */
  applyHighShelfFilter(e, t, s, i, r) {
    const o = Math.pow(10, r / 40), n = 2 * Math.PI * i / t, a = Math.cos(n), d = Math.sin(n) / 2 * Math.sqrt((o + 1 / o) * (1 / 1 - 1) + 2), u = 2 * Math.sqrt(o) * d, m = o * (o + 1 + (o - 1) * a + u), f = -2 * o * (o - 1 + (o + 1) * a), S = o * (o + 1 + (o - 1) * a - u), C = o + 1 - (o - 1) * a + u, L = 2 * (o - 1 - (o + 1) * a), N = o + 1 - (o - 1) * a - u, _ = m / C, D = f / C, T = S / C, x = L / C, M = N / C;
    for (let E = 0; E < s; E++) {
      let p = 0, $ = 0, I = 0, k = 0;
      for (let z = E; z < e.length; z += s) {
        const re = e[z], W = _ * re + D * p + T * $ - x * I - M * k;
        $ = p, p = re, k = I, I = W, e[z] = W;
      }
    }
  }
};
b(ee, "instance");
let ue = ee;
function _e(h, e, t, s) {
  const i = new ArrayBuffer(44), r = new DataView(i), o = t * (s / 8);
  de(r, 0, "RIFF"), r.setUint32(4, 36 + h.byteLength, !0), de(r, 8, "WAVE"), de(r, 12, "fmt "), r.setUint32(16, 16, !0), r.setUint16(20, 1, !0), r.setUint16(22, t, !0), r.setUint32(24, e, !0), r.setUint32(28, e * o, !0), r.setUint16(32, o, !0), r.setUint16(34, s, !0), de(r, 36, "data"), r.setUint32(40, h.byteLength, !0);
  const n = new Uint8Array(44 + h.byteLength);
  return n.set(new Uint8Array(i)), n.set(h, 44), n;
}
function de(h, e, t) {
  for (let s = 0; s < t.length; s++)
    h.setUint8(e + s, t.charCodeAt(s));
}
function De(h) {
  return `data:audio/wav;base64,${Buffer.from(h.buffer, h.byteOffset, h.byteLength).toString("base64")}`;
}
function Le(h, e, t, s = 64) {
  if (h.length === 0) return Array(s).fill(10);
  const i = [];
  if (e === 16) {
    const r = new Int16Array(h.buffer, h.byteOffset, Math.floor(h.byteLength / 2)), o = Math.max(1, Math.floor(r.length / s));
    for (let n = 0; n < s; n++) {
      let a = 0;
      const c = n * o, l = Math.min(r.length, c + o);
      for (let d = c; d < l; d += t) {
        const u = Math.abs(r[d]) / 32768;
        u > a && (a = u);
      }
      i.push(Math.max(6, Math.min(98, Math.round(a * 100))));
    }
  } else if (e === 32) {
    const r = new Float32Array(h.buffer, h.byteOffset, Math.floor(h.byteLength / 4)), o = Math.max(1, Math.floor(r.length / s));
    for (let n = 0; n < s; n++) {
      let a = 0;
      const c = n * o, l = Math.min(r.length, c + o);
      for (let d = c; d < l; d += t) {
        const u = Math.abs(r[d]);
        u > a && (a = u);
      }
      i.push(Math.max(6, Math.min(98, Math.round(a * 100))));
    }
  } else
    for (let r = 0; r < s; r++)
      i.push(Math.round(20 + Math.sin(r / 4) * 15));
  return i;
}
class ft {
  constructor() {
    b(this, "activeModelId");
    b(this, "activeEngine");
    b(this, "activeDitVariant");
    b(this, "activeRequestIds", /* @__PURE__ */ new Map());
    // taskId -> requestId
    b(this, "musicExportsDir");
    b(this, "logger", Se.getInstance());
    var e;
    try {
      const t = (e = U) != null && e.getPath ? U.getPath("userData") : process.cwd();
      this.musicExportsDir = y.join(t, "music-exports"), g.existsSync(this.musicExportsDir) || g.mkdirSync(this.musicExportsDir, { recursive: !0 });
    } catch {
      this.musicExportsDir = y.join(process.cwd(), "music-exports");
    }
  }
  getActiveModelId() {
    return this.activeModelId;
  }
  /**
   * Assess hardware and memory fit for ACE-Step or MiniMax models before loading
   */
  async assessFit(e = "acestep", t = "turbo-q4") {
    try {
      if (e === "acestep") {
        const r = this.resolveDitModelSrc(t);
        return { success: !0, data: await v.assessModelFit({
          models: [
            {
              modelType: "audiogen",
              modelConfig: {
                engine: "acestep",
                textEncModelSrc: v.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
                lmModelSrc: v.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
                ditModelSrc: r,
                vaeModelSrc: v.AUDIOGEN_VAE_BF16,
                useGPU: !0
              }
            }
          ]
        }) };
      }
      const { lmModelSrc: s, synthModelSrc: i } = this.resolveMiniMaxModelPaths();
      return s && i ? { success: !0, data: await v.assessModelFit({
        models: [
          {
            modelType: "audiogen",
            modelConfig: {
              engine: "minimax",
              lmModelSrc: s,
              synthModelSrc: i,
              useGPU: !0
            }
          }
        ]
      }) } : { success: !0, message: "MiniMax assessment requires local model paths" };
    } catch (s) {
      return this.logger.logFailure({
        taskId: "assess-fit",
        engine: e,
        stage: "ASSESS_FIT",
        error: s,
        options: { engine: e, ditVariant: t }
      }), { success: !1, error: (s == null ? void 0 : s.message) || String(s) };
    }
  }
  /**
   * Discovers downloaded MiniMax-Music3 GGUF model files from disk cache (~/.qvac/models)
   */
  resolveMiniMaxModelPaths(e, t) {
    let s = e, i = t;
    const r = y.join(O.homedir(), ".qvac", "models");
    if (g.existsSync(r))
      try {
        const o = g.readdirSync(r);
        for (const n of o) {
          const a = n.toLowerCase();
          if (a.endsWith(".download") || a.endsWith(".tmp") || a.endsWith(".partial") || a.endsWith(".crdownload"))
            continue;
          const c = y.join(r, n);
          try {
            const l = g.statSync(c);
            if (!l.isFile() || l.size < 1024 * 1024) continue;
          } catch {
            continue;
          }
          if (!s && (a.includes("mm3-lm") || a.includes("minimax") && (a.includes("lm") || a.includes("transformer"))) && !a.includes("vocoder") && !a.includes("synth")) {
            if (n.includes("-imat.gguf")) {
              const l = n.replace("-imat.gguf", ".gguf"), d = y.join(r, l);
              if (!g.existsSync(d))
                try {
                  g.linkSync(c, d), console.log(`[MusicEngineService] Created quant-matched hardlink: ${l} -> ${n}`);
                } catch {
                  try {
                    g.symlinkSync(c, d);
                  } catch {
                  }
                }
              if (g.existsSync(d)) {
                s = d;
                continue;
              }
            }
            s = c;
          }
          !i && (a.includes("mm3-synth") || a.includes("minimax") && (a.includes("synth") || a.includes("vocoder"))) && !a.includes("transformer") && !a.includes("lm") && (i = c);
        }
      } catch (o) {
        console.warn("[MusicEngineService] Error resolving MiniMax model paths:", o);
      }
    return { lmModelSrc: s, synthModelSrc: i };
  }
  /**
   * Resolves the DiT model source constant based on user variant selection
   */
  resolveDitModelSrc(e) {
    switch (e) {
      case "turbo-q8":
        return v.AUDIOGEN_ACESTEP_V15_TURBO_Q8_0;
      case "sft-q8":
        return v.AUDIOGEN_ACESTEP_V15_SFT_Q8_0;
      case "base-q4":
        return v.AUDIOGEN_ACESTEP_V15_BASE_Q4_K_M || v.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
      case "turbo-q4":
      default:
        return v.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
    }
  }
  /**
   * Ensures the appropriate AudioGen model is loaded in QVAC runtime
   */
  async ensureModelLoaded(e, t) {
    const s = e.engine || "acestep", i = e.ditVariant || "turbo-q4";
    if (this.activeModelId && this.activeEngine === s && (s === "minimax" || this.activeDitVariant === i))
      return this.activeModelId;
    if (this.activeModelId) {
      try {
        await v.unloadModel({ modelId: this.activeModelId });
      } catch (r) {
        console.warn("[MusicEngineService] Warning unloading prior model:", r);
      }
      this.activeModelId = void 0;
    }
    if (s === "acestep") {
      const r = this.resolveDitModelSrc(i);
      t == null || t({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Preparing ACE-Step AudioGen models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading ACE-Step (${i}) into QVAC runtime`);
      try {
        const o = await v.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "acestep",
            textEncModelSrc: v.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
            lmModelSrc: v.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
            ditModelSrc: r,
            vaeModelSrc: v.AUDIOGEN_VAE_BF16,
            useGPU: e.useGPU !== !1,
            inferenceSteps: e.inferenceSteps || 8
          },
          onProgress: (n) => {
            var l;
            const a = (d) => (d / 1e6).toFixed(1), c = ((l = n.downloadKey) == null ? void 0 : l.split("/").pop()) || n.downloadKey || "model";
            t == null || t({
              taskId: "model-load",
              stage: "Downloading",
              step: Math.round(n.downloaded / 1e6),
              total: Math.round(n.total / 1e6),
              percentage: n.percentage,
              message: `Downloading ${c}: ${n.percentage.toFixed(0)}% (${a(n.downloaded)}/${a(n.total)} MB)`
            });
          }
        });
        return this.activeModelId = o, this.activeEngine = "acestep", this.activeDitVariant = i, this.logger.logMilestone("model-load", "LOAD_SUCCESS", `ACE-Step model loaded ID: ${o}`), o;
      } catch (o) {
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "acestep",
          stage: "LOAD_ACESTEP_RUNTIME",
          error: o,
          options: e,
          resolvedPaths: { ditModelSrc: r }
        }), o;
      }
    } else {
      const { lmModelSrc: r, synthModelSrc: o } = this.resolveMiniMaxModelPaths(e.lmModelSrc, e.synthModelSrc);
      if (!r || !o) {
        const n = "MiniMax-Music3 model files are not installed. Please download the MiniMax models first.";
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "RESOLVE_MINIMAX_PATHS",
          error: new Error(n),
          options: e,
          resolvedPaths: { lmModelSrc: r, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ MiniMax Model Load Failed: missing model paths", {
          lmModelSrc: r,
          synthModelSrc: o,
          optionsLm: e.lmModelSrc,
          optionsSynth: e.synthModelSrc
        }), new Error(n);
      }
      t == null || t({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Loading MiniMax-Music3 local GGUF models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading MiniMax models into QVAC runtime (LM: ${r}, Synth: ${o})`);
      try {
        const n = await v.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "minimax",
            lmModelSrc: r,
            synthModelSrc: o,
            device: e.useGPU === !1 ? "cpu" : "gpu",
            ...e.threads !== void 0 && { threads: e.threads }
          }
        });
        return this.activeModelId = n, this.activeEngine = "minimax", this.logger.logMilestone("model-load", "LOAD_SUCCESS", `MiniMax model loaded successfully! ID: ${n}`), n;
      } catch (n) {
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "LOAD_MINIMAX_RUNTIME",
          error: n,
          options: e,
          resolvedPaths: { lmModelSrc: r, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ Failed to load MiniMax models in QVAC runtime:", {
          error: (n == null ? void 0 : n.message) || String(n),
          code: n == null ? void 0 : n.code,
          stack: n == null ? void 0 : n.stack,
          lmModelSrc: r,
          synthModelSrc: o
        }), n;
      }
    }
  }
  /**
   * Generates music track based on prompt, lyrics, and musical controls
   */
  async generate(e, t, s, i) {
    const { taskId: r, caption: o } = e;
    if (!o || !o.trim())
      return { success: !1, error: "Caption is required and cannot be empty." };
    this.logger.logSessionStart({
      taskId: r,
      engine: e.engine || "acestep",
      caption: o,
      lyrics: e.lyrics,
      isInstrumental: e.isInstrumental,
      duration: e.duration,
      ditVariant: e.ditVariant,
      seed: e.seed
    });
    try {
      s == null || s({ text: `▸ Initializing Music Generation: "${o}"`, stream: "system" });
      const n = await this.ensureModelLoaded(e, t);
      if (i != null && i())
        return this.logger.logMilestone(r, "CANCELLED", "Cancelled by user before synthesis started"), { success: !1, error: "Cancelled by user before synthesis started." };
      this.logger.logMilestone(r, "MODEL_READY", `Model ID: ${n} (${e.engine || "acestep"})`), s == null || s({ text: `▸ Model loaded successfully: ${n} (Engine: ${e.engine || "acestep"})`, stream: "system" });
      const a = e.engine || "acestep", c = pe.getInstance().sanitize({
        caption: e.caption,
        lyrics: e.lyrics,
        isInstrumental: e.isInstrumental,
        vocalMode: e.vocalMode,
        duration: e.duration,
        engine: a,
        bpm: e.bpm,
        keyscale: e.keyscale,
        timesignature: e.timesignature,
        vocalLanguage: e.vocalLanguage,
        ditVariant: e.ditVariant,
        simpleMode: e.simpleMode,
        taskType: e.taskType
      });
      this.logger.logMilestone(
        r,
        "SANITIZED",
        `Cleaned Caption: "${c.caption.slice(0, 80)}..." | Target Duration: ${c.duration}s | LyricsLength: ${c.lyrics.length} | Mode: ${c.isInstrumental ? "INSTRUMENTAL" : "VOCAL"}${c.vocalHintInjected ? ` | VocalInjected: "${c.vocalHintInjected}"` : ""}`
      ), s == null || s({
        text: `▸ Request Sanitized: "${c.caption.slice(0, 60)}..." (Mode: ${c.isInstrumental ? "Instrumental" : "Vocal"}, Duration: ${c.duration}s)`,
        stream: "system"
      });
      let l = {
        modelId: n,
        caption: c.caption,
        lyrics: c.lyrics,
        duration: c.duration
      };
      e.seed !== void 0 && (l.seed = e.seed), a === "acestep" && (e.simpleMode !== !1 && !c.isInstrumental && !e.lyrics ? (l.simpleMode = !0, delete l.lyrics) : c.isInstrumental && (l.simpleMode = !1, l.lyrics = "[Instrumental]"), !e.vocalLanguage && !c.isInstrumental && (l.vocalLanguage = "en")), a === "acestep" ? (e.bpm !== void 0 && (l.bpm = e.bpm), e.keyscale && (l.keyscale = e.keyscale), e.timesignature && (l.timesignature = e.timesignature), e.vocalLanguage && (l.vocalLanguage = e.vocalLanguage), e.augmentCaptionWithMetadata && (l.augmentCaptionWithMetadata = !0), l.simpleMode || e.simpleMode ? l.simpleMode = !0 : e.rewriteQuery && (l.rewriteQuery = !0), e.generateLrc && (l.generateLrc = !0), e.computeQualityScore && (l.computeQualityScore = !0), e.normalizeLoudness !== void 0 && (l.normalizeLoudness = e.normalizeLoudness), e.guidanceScale !== void 0 && (l.guidanceScale = e.guidanceScale), e.dcwEnabled !== void 0 && (l.dcwEnabled = e.dcwEnabled), e.dcwScaler !== void 0 && (l.dcwScaler = e.dcwScaler), e.dcwHighScaler !== void 0 && (l.dcwHighScaler = e.dcwHighScaler), e.inferenceSteps !== void 0 && (l.inferenceSteps = e.inferenceSteps), e.shift !== void 0 && (l.shift = e.shift), e.referenceAudio && (l.referenceAudio = e.referenceAudio), e.taskType && e.taskType !== "text2music" && (l.taskType = e.taskType, e.sourceAudio && (l.sourceAudio = e.sourceAudio), e.taskType === "cover-nofsq" ? (l.audioCoverStrength = 1, l.coverNoiseStrength = e.coverNoiseStrength ?? 0.75) : e.taskType === "lego" && e.track && (l.track = e.track))) : (l.cfgScale = e.cfgScale !== void 0 ? e.cfgScale : 1.8, e.maxFrames !== void 0 && (l.maxFrames = e.maxFrames, delete l.duration), e.inferenceSteps && e.inferenceSteps >= 16 ? l.inferenceSteps = e.inferenceSteps : l.inferenceSteps = 22), s == null || s({ text: "▸ Starting QVAC audioGen inference run...", stream: "system" });
      const d = v.audioGen(l);
      this.activeRequestIds.set(r, d.requestId), s == null || s({ text: `▸ Assigned requestId: ${d.requestId}`, stream: "system" }), (async () => {
        try {
          for await (const I of d.progressStream) {
            if (i != null && i()) break;
            const k = I.total > 0 ? Math.round(I.step / I.total * 100) : 0, z = I.total > 0 ? `${I.stage}: step ${I.step}/${I.total}` : `${I.stage}: step ${I.step}`;
            t == null || t({
              taskId: r,
              stage: I.stage,
              step: I.step,
              total: I.total,
              percentage: k,
              message: z
            }), s == null || s({ text: `▸ [${I.stage}] ${I.step}/${I.total || "?"}`, stream: "stdout" });
          }
        } catch {
        }
      })();
      const [u, m] = await Promise.all([d.audio, d.stats]);
      this.activeRequestIds.delete(r);
      const f = m == null ? void 0 : m.backendId, S = f === 1 ? "Metal (Apple GPU)" : f === 2 ? "CUDA (GPU)" : f === 0 ? "CPU" : f !== void 0 ? `Backend #${f}` : "Metal (Apple GPU)", C = m == null ? void 0 : m.gpuFallbackReason;
      this.logger.logMilestone(
        r,
        "BACKEND_STATS",
        `Compute Backend: ${S}${C && C !== 0 ? ` (Fallback Reason: ${C})` : ""}`
      ), s == null || s({
        text: `▸ Compute Backend: ${S}`,
        stream: "system"
      }), s == null || s({ text: `▸ Synthesis completed! Mastering ${u.pcm.byteLength} raw PCM bytes...`, stream: "system" });
      const { masteredPcm: L, details: N } = ue.getInstance().masterPcm(
        u.pcm,
        u.sampleRate,
        u.channels,
        u.bitsPerSample
      );
      this.logger.logMilestone(r, "DSP_MASTERED", N), s == null || s({ text: `▸ Audio Mastered: ${N}`, stream: "system" });
      const _ = _e(L, u.sampleRate, u.channels, u.bitsPerSample), D = `music-${Date.now()}-${r.slice(0, 8)}.wav`, T = y.join(this.musicExportsDir, D);
      let x = "";
      try {
        g.writeFileSync(T, Buffer.from(_.buffer, _.byteOffset, _.byteLength)), x = `echo-media://${T}`, s == null || s({ text: `▸ Exported WAV saved to: ${T}`, stream: "system" });
      } catch (I) {
        console.warn("[MusicEngineService] Could not write export file, falling back to data URI:", I), x = De(_);
      }
      const M = Le(u.pcm, u.bitsPerSample, u.channels, 64), E = (m == null ? void 0 : m.audioDurationMs) || Math.round(u.pcm.byteLength / (u.bitsPerSample / 8) / u.channels / u.sampleRate * 1e3), p = m == null ? void 0 : m.metadata, $ = {
        id: `music_gen_${Date.now()}`,
        taskId: r,
        caption: (p == null ? void 0 : p.caption) || o,
        lyrics: (p == null ? void 0 : p.lyrics) || e.lyrics,
        audioUrl: x,
        wavFilePath: T,
        durationMs: E,
        sampleRate: u.sampleRate,
        channels: u.channels,
        bitsPerSample: u.bitsPerSample,
        waveform: M,
        bpm: (p == null ? void 0 : p.bpm) ?? e.bpm,
        keyscale: (p == null ? void 0 : p.keyscale) ?? e.keyscale,
        timesignature: p != null && p.beatsPerBar ? `${p.beatsPerBar}/4` : e.timesignature,
        vocalLanguage: (p == null ? void 0 : p.vocalLanguage) ?? e.vocalLanguage,
        isInstrumental: e.isInstrumental ?? l.lyrics === "[Instrumental]",
        seed: (p == null ? void 0 : p.seed) ?? e.seed,
        taskType: e.taskType || "text2music",
        lrc: m == null ? void 0 : m.lrc,
        lyricsScore: m == null ? void 0 : m.lyricsScore,
        qualityScore: m == null ? void 0 : m.qualityScore,
        qualityReport: p == null ? void 0 : p.qualityReport,
        stats: m,
        metadata: p,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return this.logger.logSuccess(r, $), s == null || s({ text: `▸ Music generation finished successfully (${(E / 1e3).toFixed(1)}s)`, stream: "system" }), { success: !0, data: $ };
    } catch (n) {
      if (this.activeRequestIds.delete(r), n instanceof v.InferenceCancelledError || i != null && i())
        return console.warn(`[MusicEngineService] Generation cancelled for task ${r}`), this.logger.logMilestone(r, "CANCELLED", "Generation was cancelled by user"), s == null || s({ text: "▸ Music generation cancelled.", stream: "stderr" }), { success: !1, error: "Generation was cancelled." };
      const a = e.engine === "minimax" ? this.resolveMiniMaxModelPaths(e.lmModelSrc, e.synthModelSrc) : { ditModelSrc: this.resolveDitModelSrc(e.ditVariant) };
      return this.logger.logFailure({
        taskId: r,
        engine: e.engine || "acestep",
        stage: "INFERENCE_RUN",
        error: n,
        options: e,
        resolvedPaths: a
      }), console.error(`[MusicEngineService] ✖ Music Generation FAILED for task ${r}:`, {
        error: (n == null ? void 0 : n.message) || String(n),
        code: n == null ? void 0 : n.code,
        stack: n == null ? void 0 : n.stack,
        cause: n == null ? void 0 : n.cause,
        options: {
          engine: e.engine || "acestep",
          caption: e.caption,
          lyrics: e.lyrics ? `${e.lyrics.slice(0, 80)}...` : void 0,
          duration: e.duration,
          ditVariant: e.ditVariant
        }
      }), s == null || s({
        text: `✖ Generation Failed: ${(n == null ? void 0 : n.message) || String(n)}${n != null && n.stack ? `
${n.stack}` : ""}`,
        stream: "stderr"
      }), {
        success: !1,
        error: (n == null ? void 0 : n.message) || "Music generation failed.",
        errorDetails: {
          code: n == null ? void 0 : n.code,
          stage: "INFERENCE_RUN",
          engine: e.engine || "acestep",
          stack: n == null ? void 0 : n.stack,
          cause: n == null ? void 0 : n.cause
        }
      };
    }
  }
  /**
   * Edits an existing recording using ACE-Step Flow-Edit or Repaint operations
   */
  async edit(e, t, s, i) {
    const { taskId: r, sourceAudio: o, operations: n } = e;
    if (!o)
      return { success: !1, error: "sourceAudio is required for editing." };
    if (!n || n.length === 0)
      return { success: !1, error: "At least one edit operation is required." };
    try {
      s == null || s({ text: `▸ Starting Audio Edit with ${n.length} operation(s)...`, stream: "system" });
      const c = {
        modelId: await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4", useGPU: e.useGPU }, t),
        sourceAudio: o,
        operations: n,
        ...e.seed !== void 0 && { seed: e.seed },
        ...e.referenceAudio && { referenceAudio: e.referenceAudio },
        ...e.vocalLanguage && { vocalLanguage: e.vocalLanguage },
        ...e.bpm !== void 0 && { bpm: e.bpm },
        ...e.keyscale && { keyscale: e.keyscale },
        ...e.timesignature && { timesignature: e.timesignature },
        ...e.augmentCaptionWithMetadata && { augmentCaptionWithMetadata: !0 },
        ...e.dcwEnabled !== void 0 && { dcwEnabled: e.dcwEnabled },
        ...e.dcwScaler !== void 0 && { dcwScaler: e.dcwScaler },
        ...e.dcwHighScaler !== void 0 && { dcwHighScaler: e.dcwHighScaler },
        ...e.inferenceSteps !== void 0 && { inferenceSteps: e.inferenceSteps },
        ...e.shift !== void 0 && { shift: e.shift }
      }, l = v.audioEdit(c);
      this.activeRequestIds.set(r, l.requestId), (async () => {
        try {
          for await (const T of l.progressStream) {
            if (i != null && i()) break;
            const x = T.total > 0 ? Math.round(T.step / T.total * 100) : 0;
            t == null || t({
              taskId: r,
              stage: T.stage,
              step: T.step,
              total: T.total,
              percentage: x,
              message: `${T.stage}: ${T.step}/${T.total}`
            });
          }
        } catch {
        }
      })();
      const [d, u] = await Promise.all([l.audio, l.stats]);
      this.activeRequestIds.delete(r);
      const { masteredPcm: m } = ue.getInstance().masterPcm(
        d.pcm,
        d.sampleRate,
        d.channels,
        d.bitsPerSample
      ), f = _e(m, d.sampleRate, d.channels, d.bitsPerSample), S = `music-edit-${Date.now()}-${r.slice(0, 8)}.wav`, C = y.join(this.musicExportsDir, S);
      let L = "";
      try {
        g.writeFileSync(C, Buffer.from(f.buffer, f.byteOffset, f.byteLength)), L = `echo-media://${C}`;
      } catch {
        L = De(f);
      }
      const N = Le(d.pcm, d.bitsPerSample, d.channels, 64), _ = (u == null ? void 0 : u.audioDurationMs) || Math.round(d.pcm.byteLength / (d.bitsPerSample / 8) / d.channels / d.sampleRate * 1e3);
      return { success: !0, data: {
        id: `music_edit_${Date.now()}`,
        taskId: r,
        caption: `Edit (${n.map((T) => T.type).join(" + ")})`,
        audioUrl: L,
        wavFilePath: C,
        durationMs: _,
        sampleRate: d.sampleRate,
        channels: d.channels,
        bitsPerSample: d.bitsPerSample,
        waveform: N,
        stats: u,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      } };
    } catch (a) {
      return this.activeRequestIds.delete(r), a instanceof v.InferenceCancelledError || i != null && i() ? { success: !1, error: "Edit was cancelled." } : { success: !1, error: (a == null ? void 0 : a.message) || "Audio edit failed." };
    }
  }
  /**
   * Describes an existing recording using ACE-Step reverse analysis pipeline
   */
  async understand(e, t, s) {
    const { taskId: i, sourceAudio: r, vocalLanguage: o, seed: n } = e;
    if (!r)
      return { success: !1, error: "sourceAudio is required for audio understand." };
    try {
      s == null || s({ text: "▸ Analyzing audio recording with ACE-Step AudioUnderstand...", stream: "system" });
      const c = {
        modelId: await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4" }, t),
        sourceAudio: r,
        ...o && { vocalLanguage: o },
        ...n !== void 0 && { seed: n },
        ...e.lmTemperature !== void 0 && { lmTemperature: e.lmTemperature },
        ...e.lmTopP !== void 0 && { lmTopP: e.lmTopP },
        ...e.lmTopK !== void 0 && { lmTopK: e.lmTopK }
      }, l = v.audioUnderstand(c);
      this.activeRequestIds.set(i, l.requestId), (async () => {
        try {
          for await (const u of l.progressStream) {
            const m = u.total > 0 ? Math.round(u.step / u.total * 100) : 0;
            t == null || t({
              taskId: i,
              stage: u.stage,
              step: u.step,
              total: u.total,
              percentage: m,
              message: `${u.stage}: ${u.step}/${u.total}`
            });
          }
        } catch {
        }
      })();
      const d = await l.description;
      return this.activeRequestIds.delete(i), s == null || s({ text: `▸ Analysis complete! Detected: ${d.bpm} BPM, ${d.keyscale}, ${d.timesignature}`, stream: "system" }), {
        success: !0,
        data: {
          caption: d.caption,
          bpm: d.bpm,
          keyscale: d.keyscale,
          timesignature: d.timesignature,
          vocalLanguage: d.vocalLanguage,
          duration: d.duration,
          audioCodes: Array.from(d.audioCodes || []),
          seed: d.seed
        }
      };
    } catch (a) {
      return this.activeRequestIds.delete(i), { success: !1, error: (a == null ? void 0 : a.message) || "Audio analysis failed." };
    }
  }
  /**
   * Hard-cancels an in-flight QVAC generation or edit task
   */
  cancel(e) {
    const t = this.activeRequestIds.get(e);
    if (t)
      try {
        return v.cancel({ requestId: t }), this.activeRequestIds.delete(e), !0;
      } catch (s) {
        console.warn(`[MusicEngineService] Failed to cancel request ${t}:`, s);
      }
    return !1;
  }
  /**
   * Checks current model download and load status for UI indicators
   */
  getStatus() {
    const e = [
      {
        id: "audiogen-qwen3-embedding",
        name: "Qwen3 Embedding Text Encoder (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0",
        sizeBytes: 784144960,
        sizeFormatted: "784 MB",
        stage: "text-encoder",
        downloaded: !1,
        status: "idle"
      },
      {
        id: "audiogen-acestep-5hz-lm",
        name: "ACE-Step 5Hz Language Model (0.6B Q8_0)",
        descriptorName: "AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0",
        sizeBytes: 709846656,
        sizeFormatted: "710 MB",
        stage: "lm",
        downloaded: !1,
        status: "idle"
      },
      {
        id: "audiogen-acestep-turbo-dit",
        name: "ACE-Step v1.5 Turbo DiT (Q4_K_M)",
        descriptorName: "AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M",
        sizeBytes: 1445710272,
        sizeFormatted: "1.45 GB",
        stage: "dit",
        downloaded: !1,
        status: "idle"
      },
      {
        id: "audiogen-vae-bf16",
        name: "ACE-Step Audio VAE (BF16)",
        descriptorName: "AUDIOGEN_VAE_BF16",
        sizeBytes: 337420928,
        sizeFormatted: "337 MB",
        stage: "vae",
        downloaded: !1,
        status: "idle"
      }
    ];
    return {
      ready: !!this.activeModelId,
      activeModelId: this.activeModelId,
      engine: this.activeEngine || "acestep",
      models: e,
      gpuAvailable: !0
    };
  }
  /**
   * Unloads active model to free GPU memory
   */
  async unload() {
    if (this.activeModelId)
      try {
        return await v.unloadModel({ modelId: this.activeModelId }), this.activeModelId = void 0, this.activeEngine = void 0, this.activeDitVariant = void 0, !0;
      } catch (e) {
        console.warn("[MusicEngineService] Error unloading model:", e);
      }
    return !1;
  }
  /**
   * Retrieves recent music generation logs
   */
  getRecentLogs(e) {
    return this.logger.getRecentLogs(e);
  }
  /**
   * Clears generation log files
   */
  clearLogs() {
    return this.logger.clearLogs();
  }
}
class yt {
  constructor() {
    b(this, "activeTasks", /* @__PURE__ */ new Set());
    b(this, "engineService");
    b(this, "historyFilePath");
    b(this, "historyCache", []);
    var e;
    this.engineService = new ft();
    try {
      const t = (e = U) != null && e.getPath ? U.getPath("userData") : process.cwd();
      this.historyFilePath = y.join(t, "music-history.json"), this.loadHistoryFromDisk();
    } catch {
      this.historyFilePath = y.join(process.cwd(), "music-history.json");
    }
  }
  sanitizeItem(e) {
    const t = { ...e };
    return t.wavFilePath && g.existsSync(t.wavFilePath) ? t.audioUrl = `echo-media://${t.wavFilePath}` : t.audioUrl && t.audioUrl.startsWith("data:") && t.audioUrl.length > 5e4 && (t.audioUrl = ""), t;
  }
  loadHistoryFromDisk() {
    try {
      if (g.existsSync(this.historyFilePath)) {
        const e = g.readFileSync(this.historyFilePath, "utf-8"), t = JSON.parse(e);
        Array.isArray(t) && (this.historyCache = t.map((s) => this.sanitizeItem(s)));
      }
    } catch (e) {
      console.warn("[MusicService] Could not read music history:", e), this.historyCache = [];
    }
  }
  saveHistoryToDisk() {
    try {
      const e = this.historyCache.slice(0, 100).map((t) => this.sanitizeItem(t));
      g.writeFileSync(this.historyFilePath, JSON.stringify(e, null, 2), "utf-8");
    } catch (e) {
      console.warn("[MusicService] Could not write music history:", e);
    }
  }
  getModelStatus() {
    return this.engineService.getStatus();
  }
  async assessFit(e, t) {
    return this.engineService.assessFit(e, t);
  }
  async unloadModel() {
    return this.engineService.unload();
  }
  cancelGeneration(e) {
    return this.activeTasks.has(e) ? (this.activeTasks.delete(e), this.engineService.cancel(e)) : !1;
  }
  isCancelled(e) {
    return !this.activeTasks.has(e);
  }
  async generateMusic(e, t, s) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      const r = await this.engineService.generate(
        e,
        t,
        s,
        () => this.isCancelled(i)
      );
      return r.success && r.data && (this.historyCache.unshift(r.data), this.saveHistoryToDisk()), r;
    } finally {
      this.activeTasks.delete(i);
    }
  }
  async editMusic(e, t, s) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      const r = await this.engineService.edit(
        e,
        t,
        s,
        () => this.isCancelled(i)
      );
      return r.success && r.data && (this.historyCache.unshift(r.data), this.saveHistoryToDisk()), r;
    } finally {
      this.activeTasks.delete(i);
    }
  }
  async understandMusic(e, t, s) {
    return this.engineService.understand(e, t, s);
  }
  listHistory() {
    return this.historyCache;
  }
  getHistoryItem(e) {
    return this.historyCache.find((t) => t.id === e || t.taskId === e);
  }
  saveHistoryItem(e) {
    const t = this.historyCache.findIndex((s) => s.id === e.id);
    return t >= 0 ? this.historyCache[t] = e : this.historyCache.unshift(e), this.saveHistoryToDisk(), !0;
  }
  deleteHistoryItem(e) {
    const t = this.historyCache.length;
    return this.historyCache = this.historyCache.filter((s) => s.id !== e), this.historyCache.length !== t ? (this.saveHistoryToDisk(), !0) : !1;
  }
  clearHistory() {
    return this.historyCache = [], this.saveHistoryToDisk(), !0;
  }
  getGenerationLogs(e) {
    return this.engineService.getRecentLogs(e);
  }
  clearGenerationLogs() {
    return this.engineService.clearLogs();
  }
}
const te = class te {
  constructor() {
    b(this, "activeModelId", null);
    b(this, "isLoadingModel", !1);
  }
  static getInstance() {
    return te.instance || (te.instance = new te()), te.instance;
  }
  /**
   * Ensures the Qwen3-1.7B Instruct model is loaded into memory on Apple Metal GPU.
   */
  async ensureModelLoaded(e) {
    if (this.activeModelId)
      return this.activeModelId;
    if (this.isLoadingModel) {
      for (; this.isLoadingModel; )
        await new Promise((t) => setTimeout(t, 100));
      if (this.activeModelId) return this.activeModelId;
    }
    this.isLoadingModel = !0;
    try {
      console.log("[QwenLyricService] ▸ Loading Qwen3-1.7B Instruct LLM for lyric generation...");
      const t = await v.loadModel({
        modelSrc: v.QWEN3_1_7B_INST_Q4,
        onProgress: (s) => {
          e == null || e(s);
        }
      });
      return this.activeModelId = t, console.log(`[QwenLyricService] ✓ Qwen3-1.7B loaded successfully with ID: ${t}`), t;
    } catch (t) {
      throw console.error("[QwenLyricService] ✖ Failed to load Qwen3-1.7B:", t), t;
    } finally {
      this.isLoadingModel = !1;
    }
  }
  /**
   * Generates song lyrics from a description, streaming tokens in real time.
   */
  async generateLyricsStream(e, t, s) {
    const i = (e || "").trim() || "A soulful, emotional song about life and hope";
    try {
      const r = await this.ensureModelLoaded(s), o = `You are an elite, Grammy-award winning songwriter.
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
4. Capture the exact mood, imagery, and style requested in the description.`, n = `Write song lyrics for this description: "${i}"`, a = v.completion({
        modelId: r,
        history: [
          { role: "system", content: o },
          { role: "user", content: n }
        ],
        captureThinking: !0,
        stream: !0
      });
      let c = "";
      for await (const m of a.events)
        m.type === "contentDelta" && m.text && (c += m.text, t == null || t(m.text));
      const d = ((await a.final).contentText || c).trim();
      return { lyrics: d.startsWith("[") ? d : `[verse]
${d}`, engine: "qwen-1.7b" };
    } catch (r) {
      console.warn("[QwenLyricService] Qwen streaming failed, using fallback lyric generator:", r);
      const o = this.getFallbackLyrics(i);
      for (const n of o)
        t == null || t(n), await new Promise((a) => setTimeout(a, 6));
      return { lyrics: o, engine: "fallback" };
    }
  }
  /**
   * Fast rule-based fallback if LLM is unreachable or offline
   */
  getFallbackLyrics(e) {
    const t = e.toLowerCase();
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk)/.test(t) ? `[verse]
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
Peace to the fallen, beyond despair...` : /(synthwave|retro|neon|cyberpunk|80s)/.test(t) ? `[verse]
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
Driving forever into the light...` : `[verse]
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
b(te, "instance");
let we = te;
class vt extends ie {
  constructor(e, t) {
    super(), this.musicService = e, this.activityRepo = t;
  }
  init() {
    A.handle(
      w.MUSIC_GENERATE,
      async (e, t) => {
        const s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        }, r = await this.musicService.generateMusic(t, s, i);
        if (r.success && r.data) {
          this.saveMusicActivity(r.data);
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_COMPLETE, {
              taskId: t.taskId,
              generation: r.data
            });
          } catch (o) {
            console.warn("[MusicController] Failed to send complete event:", o);
          }
        } else if (!r.success) {
          console.error(
            `[MusicController] ✖ Music generation failed for taskId ${t.taskId} (Engine: ${t.engine || "acestep"}):`,
            r.error
          ), i({
            text: `✖ Music Generation Failed: ${r.error}`,
            stream: "stderr"
          });
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_ERROR, {
              taskId: t.taskId,
              error: r.error || "Music generation failed",
              details: r.errorDetails
            });
          } catch (o) {
            console.warn("[MusicController] Failed to send error event:", o);
          }
        }
        return r;
      }
    ), A.handle(
      w.MUSIC_CANCEL,
      async (e, { taskId: t }) => ({ success: this.musicService.cancelGeneration(t), taskId: t })
    ), A.handle(
      w.MUSIC_EDIT,
      async (e, t) => {
        const s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        }, r = await this.musicService.editMusic(t, s, i);
        return r.success && r.data && this.saveMusicActivity(r.data), r;
      }
    ), A.handle(
      w.MUSIC_UNDERSTAND,
      async (e, t) => {
        const s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        };
        return await this.musicService.understandMusic(t, s, i);
      }
    ), A.handle(w.MUSIC_MODEL_STATUS, async () => ({
      success: !0,
      data: this.musicService.getModelStatus()
    })), A.handle(
      w.MUSIC_ASSESS_FIT,
      async (e, t) => this.musicService.assessFit(t == null ? void 0 : t.engine, t == null ? void 0 : t.ditVariant)
    ), A.handle(w.MUSIC_UNLOAD_MODEL, async () => ({ success: await this.musicService.unloadModel() })), A.handle(w.MUSIC_HISTORY_LIST, async () => ({
      success: !0,
      data: this.musicService.listHistory()
    })), A.handle(
      w.MUSIC_HISTORY_SAVE,
      async (e, t) => {
        const s = this.musicService.saveHistoryItem(t);
        return s && this.saveMusicActivity(t), { success: s };
      }
    ), A.handle(
      w.MUSIC_HISTORY_DELETE,
      async (e, { id: t }) => {
        const s = this.musicService.deleteHistoryItem(t);
        return this.activityRepo && this.activityRepo.deleteActivity(`act-music-${t}`).catch(console.error), { success: s };
      }
    ), A.handle(w.MUSIC_HISTORY_CLEAR, async () => ({ success: this.musicService.clearHistory() })), A.handle(w.MUSIC_GET_LOGS, async (e, t) => ({ success: !0, data: this.musicService.getGenerationLogs(t) })), A.handle(w.MUSIC_CLEAR_LOGS, async () => ({ success: this.musicService.clearGenerationLogs() })), A.handle(
      w.MUSIC_GENERATE_LYRICS,
      async (e, t) => {
        const s = t.taskId || `lyric_task_${Date.now()}`, i = (r) => {
          try {
            e.sender.isDestroyed() || e.sender.send(w.MUSIC_LYRICS_TOKEN, { taskId: s, token: r });
          } catch {
          }
        };
        try {
          const r = await we.getInstance().generateLyricsStream(t.prompt, i);
          return { success: !0, lyrics: r.lyrics, engine: r.engine, taskId: s };
        } catch (r) {
          return console.error("[MusicController] Error generating lyrics with Qwen:", r), { success: !1, error: (r == null ? void 0 : r.message) || "Failed to generate lyrics", taskId: s };
        }
      }
    );
  }
  saveMusicActivity(e) {
    if (!this.activityRepo) return;
    const t = e.caption || "Music Track", s = t.length > 50 ? `${t.slice(0, 47)}...` : t, i = e.wavFilePath ? `echo-media://${e.wavFilePath}` : e.audioUrl && e.audioUrl.length > 5e4 ? "" : e.audioUrl;
    this.activityRepo.saveActivity({
      id: `act-music-${e.id}`,
      type: "music",
      title: s,
      description: e.lyrics ? e.lyrics.slice(0, 160) : e.caption,
      category: "Music Generation",
      subCategory: "AudioGen",
      originId: e.id,
      originType: "music",
      metadata: {
        taskId: e.taskId,
        caption: e.caption,
        lyrics: e.lyrics,
        audioUrl: i,
        wavFilePath: e.wavFilePath,
        durationMs: e.durationMs,
        duration: e.durationMs ? `${Math.round(e.durationMs / 1e3)}s` : "Audio",
        waveform: e.waveform || [],
        bpm: e.bpm,
        keyscale: e.keyscale,
        timesignature: e.timesignature,
        vocalLanguage: e.vocalLanguage,
        engine: "acestep",
        cover: "/covers/got/direwolf.jpg"
      }
    }).catch((r) => console.error("[MusicController] Failed to auto-save activity:", r));
  }
}
class St {
  constructor(e, t) {
    b(this, "db");
    b(this, "musicService");
    this.db = e, this.musicService = t;
  }
  /**
   * Resolve origin data (TTS, Music, Story) based on activity record and relations
   */
  formatActivityRecord(e) {
    var n;
    let t;
    if (e.metadata)
      try {
        if (t = typeof e.metadata == "string" ? JSON.parse(e.metadata) : e.metadata, t && typeof t == "object") {
          const a = t.audioUrl, c = t.wavFilePath;
          c ? t.audioUrl = `echo-media://${c}` : a && a.startsWith("data:") && a.length > 5e4 && (t.audioUrl = "");
        }
      } catch {
        t = void 0;
      }
    const s = e.conversation ? {
      id: e.conversation.id,
      text: e.conversation.text,
      previewSnippet: e.conversation.previewSnippet || e.conversation.text,
      voiceName: e.conversation.voiceName,
      voiceColor: e.conversation.voiceColor,
      voiceAvatarUrl: e.conversation.voiceAvatarUrl,
      model: e.conversation.model,
      engine: e.conversation.engine,
      duration: e.conversation.duration,
      durationSec: e.conversation.durationSec,
      emotion: e.conversation.emotion,
      audioUrl: e.conversation.audioUrl,
      waveform: e.conversation.waveform ? JSON.parse(e.conversation.waveform) : [],
      speakerCount: e.conversation.speakerCount,
      rounds: Array.isArray(e.conversation.rounds) ? e.conversation.rounds.map((a) => ({
        id: a.id,
        roundOrder: a.roundOrder,
        voiceId: a.voiceId,
        text: a.text,
        speed: a.speed,
        emotion: a.emotion,
        pace: a.pace,
        prompt: a.prompt,
        description: a.description,
        referenceAudioSrc: a.referenceAudioSrc,
        speakerName: a.speakerName,
        speakerColor: a.speakerColor
      })) : []
    } : e.type === "tts" && t ? {
      id: e.originId || e.id.replace(/^act-/, ""),
      text: e.description || t.text || e.title,
      previewSnippet: t.previewSnippet || e.description || e.title,
      voiceName: t.voiceName || e.subCategory || "Speech Synthesis",
      voiceColor: t.voiceColor || "#38bdf8",
      voiceAvatarUrl: t.voiceAvatarUrl || "/voices/sterling.jpg",
      model: t.model || "cosyvoice-v1",
      engine: t.engine || "cosyvoice3",
      duration: t.duration || "Audio",
      durationSec: t.durationSec || 0,
      emotion: t.emotion || void 0,
      audioUrl: t.audioUrl || void 0,
      waveform: Array.isArray(t.waveform) ? t.waveform : [],
      speakerCount: t.speakerCount || 1,
      rounds: Array.isArray(t.rounds) ? t.rounds : []
    } : void 0;
    let i;
    if (e.type === "music") {
      const a = e.originId || e.id.replace(/^act-music-/, "").replace(/^act-/, ""), c = (n = this.musicService) == null ? void 0 : n.getHistoryItem(a), l = (c == null ? void 0 : c.wavFilePath) || (t == null ? void 0 : t.wavFilePath);
      let d = l ? `echo-media://${l}` : (c == null ? void 0 : c.audioUrl) || (t == null ? void 0 : t.audioUrl);
      d && d.startsWith("data:") && d.length > 5e4 && (d = void 0), i = {
        id: a,
        taskId: (c == null ? void 0 : c.taskId) || (t == null ? void 0 : t.taskId) || void 0,
        title: e.title,
        caption: (c == null ? void 0 : c.caption) || (t == null ? void 0 : t.caption) || e.title,
        lyrics: (c == null ? void 0 : c.lyrics) || (t == null ? void 0 : t.lyrics) || void 0,
        audioUrl: d,
        wavFilePath: l || void 0,
        duration: (t == null ? void 0 : t.duration) || (c != null && c.durationMs ? `${Math.round(c.durationMs / 1e3)}s` : "Audio"),
        durationMs: (c == null ? void 0 : c.durationMs) || (t == null ? void 0 : t.durationMs) || void 0,
        waveform: (c == null ? void 0 : c.waveform) || (t == null ? void 0 : t.waveform) || [],
        bpm: (c == null ? void 0 : c.bpm) || (t == null ? void 0 : t.bpm) || void 0,
        keyscale: (c == null ? void 0 : c.keyscale) || (t == null ? void 0 : t.keyscale) || void 0,
        timesignature: (c == null ? void 0 : c.timesignature) || (t == null ? void 0 : t.timesignature) || void 0,
        vocalLanguage: (c == null ? void 0 : c.vocalLanguage) || (t == null ? void 0 : t.vocalLanguage) || void 0,
        seed: (c == null ? void 0 : c.seed) || (t == null ? void 0 : t.seed) || void 0,
        taskType: (c == null ? void 0 : c.taskType) || (t == null ? void 0 : t.taskType) || void 0,
        lrc: (c == null ? void 0 : c.lrc) || (t == null ? void 0 : t.lrc) || void 0,
        qualityScore: (c == null ? void 0 : c.qualityScore) || (t == null ? void 0 : t.qualityScore) || void 0,
        engine: (t == null ? void 0 : t.engine) || "acestep",
        cover: (t == null ? void 0 : t.cover) || "/covers/got/direwolf.jpg",
        createdAt: (c == null ? void 0 : c.createdAt) || (e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt)
      };
    }
    let r;
    (e.type === "story" || e.type === "stories") && (r = {
      id: e.originId || e.id.replace(/^act-story-/, "").replace(/^act-/, ""),
      title: e.title,
      subtitle: (t == null ? void 0 : t.subtitle) || e.description || void 0,
      narrator: (t == null ? void 0 : t.narrator) || e.subCategory || "Narrator",
      duration: (t == null ? void 0 : t.duration) || "Story",
      audioUrl: (t == null ? void 0 : t.audioUrl) || void 0,
      cover: (t == null ? void 0 : t.cover) || "/covers/got/winterfell.jpg",
      text: e.description || (t == null ? void 0 : t.text) || void 0,
      chapters: Array.isArray(t == null ? void 0 : t.chapters) ? t.chapters : [],
      model: (t == null ? void 0 : t.model) || void 0,
      engine: (t == null ? void 0 : t.engine) || void 0,
      characterVoices: Array.isArray(t == null ? void 0 : t.characterVoices) ? t.characterVoices : void 0,
      backgroundMusicUrl: (t == null ? void 0 : t.backgroundMusicUrl) || void 0,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt
    });
    const o = s || i || r || (t ? { ...t } : void 0);
    return {
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description || void 0,
      category: e.category || void 0,
      subCategory: e.subCategory || void 0,
      originId: e.originId || void 0,
      originType: e.originType || void 0,
      conversationId: e.conversationId || void 0,
      metadata: t,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
      // Related origin data returned when fetching activities
      data: o,
      origin: o,
      tts: s,
      music: i,
      story: r
    };
  }
  /**
   * Automatically ensure all origins (e.g. Conversation, Music) have corresponding 1-to-1 Activity records
   */
  async syncMissingOrigins() {
    try {
      const e = await this.db.client.activity.findMany({
        where: {
          OR: [{ conversationId: { not: null } }, { type: "tts" }]
        },
        select: {
          conversationId: !0,
          originId: !0
        }
      }), t = /* @__PURE__ */ new Set();
      for (const i of e) {
        const r = i;
        r.conversationId && t.add(r.conversationId), r.originId && t.add(r.originId);
      }
      const s = await this.db.client.conversation.findMany({
        where: t.size > 0 ? {
          id: {
            notIn: Array.from(t)
          }
        } : void 0,
        include: {
          rounds: {
            orderBy: { roundOrder: "asc" }
          }
        }
      });
      for (const i of s) {
        const o = (i.previewSnippet || i.text || "").replace(/\s+/g, " ").trim(), n = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${i.voiceName || "Speech Synthesis"} Turn`;
        let a = n, c = 1;
        for (; await this.db.client.activity.findUnique({ where: { title: a } }); )
          c++, a = `${n} #${c}`;
        const l = JSON.stringify({
          model: i.model,
          engine: i.engine,
          duration: i.duration,
          durationSec: i.durationSec,
          emotion: i.emotion,
          audioUrl: i.audioUrl,
          waveform: i.waveform ? JSON.parse(i.waveform) : [],
          speakerCount: i.speakerCount
        });
        await this.db.client.activity.create({
          data: {
            id: `act-${i.id}`,
            type: "tts",
            title: a,
            category: "Text to Speech",
            subCategory: i.speakerCount > 1 ? `${i.speakerCount} Speakers Diarized` : i.voiceName,
            description: o ? o.slice(0, 160) : null,
            originId: i.id,
            originType: "conversation",
            conversationId: i.id,
            metadata: l
          }
        });
      }
      if (this.musicService) {
        const i = this.musicService.listHistory();
        for (const r of i) {
          const o = `act-music-${r.id}`;
          if (!await this.db.client.activity.findFirst({
            where: {
              OR: [{ id: o }, { originId: r.id }]
            }
          })) {
            const a = r.caption || "Music Track", c = a.length > 50 ? `${a.slice(0, 47)}...` : a;
            let l = c, d = 1;
            for (; await this.db.client.activity.findUnique({ where: { title: l } }); )
              d++, l = `${c} #${d}`;
            const u = r.wavFilePath ? `echo-media://${r.wavFilePath}` : r.audioUrl && r.audioUrl.length > 5e4 ? "" : r.audioUrl;
            await this.db.client.activity.create({
              data: {
                id: o,
                type: "music",
                title: l,
                description: r.lyrics ? r.lyrics.slice(0, 160) : r.caption,
                category: "Music Generation",
                subCategory: "AudioGen",
                originId: r.id,
                originType: "music",
                metadata: JSON.stringify({
                  taskId: r.taskId,
                  caption: r.caption,
                  lyrics: r.lyrics,
                  audioUrl: u,
                  wavFilePath: r.wavFilePath,
                  durationMs: r.durationMs,
                  duration: r.durationMs ? `${Math.round(r.durationMs / 1e3)}s` : "Audio",
                  waveform: r.waveform || [],
                  bpm: r.bpm,
                  keyscale: r.keyscale,
                  timesignature: r.timesignature,
                  vocalLanguage: r.vocalLanguage
                })
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn("[ActivityRepositoryService] Error syncing missing origins:", e);
    }
  }
  /**
   * Query all activities ordered by latest creation date, including origin relations
   */
  async listActivities() {
    await this.db.init();
    try {
      return await this.syncMissingOrigins(), (await this.db.client.activity.findMany({
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
      })).map((t) => this.formatActivityRecord(t));
    } catch (e) {
      return console.error("[ActivityRepositoryService] Failed to query activities:", e), [];
    }
  }
  /**
   * Find an activity by ID including related origin data
   */
  async getActivityById(e) {
    await this.db.init();
    try {
      const t = await this.db.client.activity.findUnique({
        where: { id: e },
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
      return t ? this.formatActivityRecord(t) : null;
    } catch (t) {
      return console.error("[ActivityRepositoryService] Failed to find activity by ID:", t), null;
    }
  }
  /**
   * Find an activity by origin ID (e.g. conversationId) including related origin data
   */
  async getActivityByOrigin(e) {
    await this.db.init();
    try {
      const t = await this.db.client.activity.findFirst({
        where: {
          OR: [{ conversationId: e }, { originId: e }]
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
      return t ? this.formatActivityRecord(t) : null;
    } catch (t) {
      return console.error("[ActivityRepositoryService] Failed to find activity by origin:", t), null;
    }
  }
  /**
   * Save or update an activity in SQLite
   */
  async saveActivity(e) {
    await this.db.init();
    try {
      const t = e.metadata ? typeof e.metadata == "string" ? e.metadata : JSON.stringify(e.metadata) : null;
      let s = e.title.trim(), i = 1, r = !1;
      for (; !r; ) {
        const a = await this.db.client.activity.findUnique({
          where: { title: s }
        });
        !a || a.id === e.id ? r = !0 : (i++, s = `${e.title.trim()} #${i}`);
      }
      const o = e.category || (e.type === "music" ? "Music Generation" : "Text to Speech"), n = await this.db.client.activity.upsert({
        where: { id: e.id },
        update: {
          type: e.type,
          title: s,
          description: e.description || null,
          category: o,
          subCategory: e.subCategory || null,
          originId: e.originId || e.conversationId || null,
          originType: e.originType || (e.conversationId ? "conversation" : e.type),
          conversationId: e.conversationId || null,
          metadata: t
        },
        create: {
          id: e.id,
          type: e.type,
          title: s,
          description: e.description || null,
          category: o,
          subCategory: e.subCategory || null,
          originId: e.originId || e.conversationId || null,
          originType: e.originType || (e.conversationId ? "conversation" : e.type),
          conversationId: e.conversationId || null,
          metadata: t
        }
      });
      return { success: !0, data: this.formatActivityRecord(n) };
    } catch (t) {
      return console.error("[ActivityRepositoryService] Failed to save activity:", t), { success: !1, error: t instanceof Error ? t.message : String(t) };
    }
  }
  /**
   * Delete an activity by ID
   */
  async deleteActivity(e) {
    await this.db.init();
    try {
      return await this.db.client.activity.delete({
        where: { id: e }
      }), { success: !0 };
    } catch (t) {
      return console.error("[ActivityRepositoryService] Failed to delete activity:", t), { success: !1, error: t instanceof Error ? t.message : String(t) };
    }
  }
}
class pt extends ie {
  constructor(e) {
    super(), this.activityRepo = e;
  }
  init() {
    A.handle(w.ACTIVITY_LIST, async () => {
      try {
        return { success: !0, data: await this.activityRepo.listActivities() };
      } catch (e) {
        return { success: !1, error: e instanceof Error ? e.message : String(e) };
      }
    }), A.handle(w.ACTIVITY_GET, async (e, t) => {
      try {
        const s = typeof t == "string" ? t : t.id;
        return { success: !0, data: await this.activityRepo.getActivityById(s) };
      } catch (s) {
        return { success: !1, error: s instanceof Error ? s.message : String(s) };
      }
    }), A.handle(
      w.ACTIVITY_GET_BY_ORIGIN,
      async (e, t) => {
        try {
          const s = typeof t == "string" ? t : t.originId;
          return { success: !0, data: await this.activityRepo.getActivityByOrigin(s) };
        } catch (s) {
          return { success: !1, error: s instanceof Error ? s.message : String(s) };
        }
      }
    ), A.handle(w.ACTIVITY_SAVE, async (e, t) => {
      try {
        return await this.activityRepo.saveActivity(t);
      } catch (s) {
        return { success: !1, error: s instanceof Error ? s.message : String(s) };
      }
    }), A.handle(w.ACTIVITY_DELETE, async (e, t) => {
      try {
        const s = typeof t == "string" ? t : t.id;
        return await this.activityRepo.deleteActivity(s);
      } catch (s) {
        return { success: !1, error: s instanceof Error ? s.message : String(s) };
      }
    });
  }
}
const wt = Ke(import.meta.url), { PrismaClient: Et } = wt("@prisma/client");
class Tt {
  constructor() {
    b(this, "prisma");
    b(this, "initialized", !1);
    b(this, "initPromise", null);
    const t = (U ? U.isPackaged : !1) ? U.getPath("userData") : y.join(process.cwd(), "prisma");
    g.existsSync(t) || g.mkdirSync(t, { recursive: !0 });
    const s = y.join(t, "echo.db"), i = `file:${s}`;
    process.env.DATABASE_URL = i, console.log(`[DatabaseService] SQLite DB initialized at: ${s}`), this.prisma = new Et({
      datasources: {
        db: {
          url: i
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
    if (!this.initialized)
      return this.initPromise ? this.initPromise : (this.initPromise = (async () => {
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
      `), await this.prisma.$executeRawUnsafe(`
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
      `), await this.prisma.$executeRawUnsafe(`
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
      `), await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_preferences" (
          "key" TEXT PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `), await this.prisma.$executeRawUnsafe(`
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
      `), this.initialized = !0, console.log("[DatabaseService] SQLite database schema initialized");
        } catch (e) {
          console.error("[DatabaseService] Error verifying SQLite tables:", e);
        } finally {
          this.initPromise = null;
        }
      })(), this.initPromise);
  }
  /**
   * Graceful disconnect on application exit
   */
  async close() {
    try {
      await this.prisma.$disconnect();
    } catch (e) {
      console.warn("[DatabaseService] Failed to disconnect cleanly:", e);
    }
  }
}
function Mt() {
  const h = new Tt(), e = new Ze(), t = new Te(), s = new yt(), i = new it(h), r = new mt(h), o = new St(h, s), n = new st(i), a = new ht(t, r), c = [
    new et(e),
    new tt(t),
    new rt(n),
    new gt(a),
    new vt(s, o),
    new pt(o)
  ];
  for (const l of c)
    l.init();
  return {
    systemService: e,
    modelsService: t,
    voiceService: n,
    ttsService: a,
    musicService: s,
    activityRepository: o,
    dbService: h,
    controllers: c
  };
}
xe.registerSchemesAsPrivileged([
  {
    scheme: "echo-media",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      stream: !0,
      bypassCSP: !0,
      corsEnabled: !0
    }
  }
]);
const ke = y.dirname(Qe(import.meta.url));
process.env.APP_ROOT = y.join(ke, "..");
const Ee = process.env.VITE_DEV_SERVER_URL, kt = y.join(process.env.APP_ROOT, "dist-electron"), Ue = y.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Ee ? y.join(process.env.APP_ROOT, "public") : Ue;
const Ut = Mt();
let G = null;
function Oe() {
  G = new Ne({
    icon: y.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: y.join(ke, "preload.mjs")
    }
  }), G.webContents.on("console-message", (h, ...e) => {
    if (typeof h == "object" && h !== null && "message" in h) {
      const t = h.sourceId ? y.basename(h.sourceId) : "renderer";
      console.log(`[Renderer ${t}:${h.lineNumber}] ${h.message}`);
    } else {
      const [t, s, i, r] = e, o = r ? y.basename(r) : "renderer";
      console.log(`[Renderer ${o}:${i}] ${s}`);
    }
  }), G.webContents.on("render-process-gone", (h, e) => {
    console.error("[Renderer Crashed]:", e);
  }), G.webContents.on("did-finish-load", () => {
    G == null || G.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Ee ? G.loadURL(Ee) : G.loadFile(y.join(Ue, "index.html"));
}
U.on("window-all-closed", () => {
  process.platform !== "darwin" && (U.quit(), G = null);
});
U.on("activate", () => {
  Ne.getAllWindows().length === 0 && Oe();
});
U.whenReady().then(() => {
  xe.handle("echo-media", async (h) => {
    try {
      const e = h.url.replace(/^echo-media:\/\//, "");
      let t = decodeURIComponent(e.startsWith("/") ? e : "/" + e);
      if (process.platform === "win32" && t.startsWith("/") && (t = t.slice(1)), !g.existsSync(t))
        return new Response("Media not found", { status: 404 });
      const s = g.statSync(t).size, i = t.endsWith(".mp3") ? "audio/mpeg" : t.endsWith(".wav") ? "audio/wav" : "application/octet-stream", r = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Accept-Ranges": "bytes",
        "Content-Type": i
      }), o = h.headers.get("range"), n = o ? /bytes=(\d*)-(\d*)/.exec(o) : null;
      let a = 0, c = s - 1, l = 200;
      if (n && (n[1] !== "" || n[2] !== "")) {
        if (n[1] === "" ? a = Math.max(0, s - parseInt(n[2], 10)) : (a = parseInt(n[1], 10), n[2] !== "" && (c = Math.min(c, parseInt(n[2], 10)))), a >= s || a > c)
          return r.set("Content-Range", `bytes */${s}`), new Response(null, { status: 416, headers: r });
        l = 206, r.set("Content-Range", `bytes ${a}-${c}/${s}`);
      }
      if (r.set("Content-Length", String(c - a + 1)), h.method === "HEAD")
        return new Response(null, { status: l, headers: r });
      const d = Ye.toWeb(
        g.createReadStream(t, { start: a, end: c })
      );
      return new Response(d, { status: l, headers: r });
    } catch (e) {
      return console.error("[echo-media protocol] Error loading media:", e), new Response("Error loading media", { status: 500 });
    }
  }), Oe();
});
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  kt as MAIN_DIST,
  Ue as RENDERER_DIST,
  Ee as VITE_DEV_SERVER_URL,
  Ut as core
};
