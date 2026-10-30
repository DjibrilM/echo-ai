var je = Object.defineProperty;
var He = (m, e, t) => e in m ? je(m, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : m[e] = t;
var A = (m, e, t) => He(m, typeof e != "symbol" ? e + "" : e, t);
import y from "node:path";
import g from "node:fs";
import { app as O, shell as We, ipcMain as C, protocol as Ne, BrowserWindow as Ue } from "electron";
import { fileURLToPath as Qe } from "node:url";
import { Readable as Ye } from "node:stream";
import R from "node:os";
import * as v from "@qvac/sdk";
import { execFileSync as Xe } from "node:child_process";
import { createRequire as Ke } from "node:module";
process.env.QVAC_RPC_INIT_TIMEOUT_MS || (process.env.QVAC_RPC_INIT_TIMEOUT_MS = "120000");
const Je = [
  y.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js")
];
for (const m of Je)
  if (g.existsSync(m)) {
    try {
      process.env.QVAC_WORKER_PATH = g.realpathSync(m);
    } catch {
      process.env.QVAC_WORKER_PATH = m;
    }
    break;
  }
class Ze {
  constructor() {
    A(this, "prevCpuTimes", null);
  }
  /**
   * Calculate live CPU usage from os.cpus()
   */
  getCpuUsage() {
    const e = R.cpus();
    let t = 0, i = 0;
    for (const n of e) {
      for (const a of Object.keys(n.times))
        i += n.times[a];
      t += n.times.idle;
    }
    if (!this.prevCpuTimes)
      return this.prevCpuTimes = { idle: t, total: i }, 14;
    const s = t - this.prevCpuTimes.idle, r = i - this.prevCpuTimes.total;
    if (this.prevCpuTimes = { idle: t, total: i }, r <= 0) return 14;
    const o = Math.round((r - s) / r * 100);
    return Math.max(1, Math.min(100, o));
  }
  /**
   * Query full hardware telemetry (RAM, CPU, GPU)
   */
  getMetrics() {
    var u;
    const e = R.totalmem(), t = R.freemem(), i = Math.max(0, e - t), s = i / e * 100, r = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2), o = Math.max(5, Math.min(99, Math.round(s + r))), n = this.getCpuUsage(), a = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1)), c = Math.max(3, Math.min(98, Math.round(n + a)));
    let l = 12;
    try {
      const f = O.getAppMetrics().find((p) => p.type === "GPU");
      if (f)
        l = Math.min(100, Math.max(8, Math.round(f.cpu.percentCPUUsage * 2 + 10)));
      else {
        const p = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
        l = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8 + p)));
      }
    } catch {
      l = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8)));
    }
    return {
      ram: {
        usedGB: (i / (1024 * 1024 * 1024) + r * 0.1).toFixed(1),
        totalGB: (e / (1024 * 1024 * 1024)).toFixed(1),
        percent: o
      },
      cpu: {
        percent: c,
        cores: R.cpus().length,
        model: ((u = R.cpus()[0]) == null ? void 0 : u.model) || "Processor"
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
      const e = y.join(O.getPath("documents"), "Echo", "Exports");
      return g.existsSync(e) || g.mkdirSync(e, { recursive: !0 }), await We.openPath(e), { success: !0, path: e };
    } catch (e) {
      return console.error("[SystemService] Failed to open exports directory:", e), { success: !1, error: String(e) };
    }
  }
}
class ne {
}
const S = {
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
class et extends ne {
  constructor(e) {
    super(), this.systemService = e;
  }
  init() {
    C.handle(S.SYSTEM_GET_METRICS, async () => this.systemService.getMetrics()), C.handle(S.LEGACY_GET_SYSTEM_METRICS, async () => this.systemService.getMetrics()), C.handle(S.SYSTEM_OPEN_EXPORTS, async () => this.systemService.openExportsFolder()), C.handle(S.LEGACY_OPEN_EXPORTS_FOLDER, async () => this.systemService.openExportsFolder());
  }
}
class Ie {
  constructor() {
    A(this, "cacheDir");
    A(this, "stateFilePath");
    A(this, "downloadedModelIds", /* @__PURE__ */ new Set());
    A(this, "activeDownloads", /* @__PURE__ */ new Map());
    // Full specification of neural TTS voice models
    A(this, "modelDefinitions", [
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
      },
      {
        id: "qwen3-1.7b-lyric-generator",
        name: "Qwen3-1.7B Lyric Generator (Q4_0 GGUF)",
        descriptorName: "QWEN3_1_7B_INST_Q4",
        sizeBytes: 1056782912,
        sizeFormatted: "1.05 GB",
        description: "Local 1.7B Instruct LLM for composing rhyming song lyrics, verse/chorus structures, and stylistic themes from prompts.",
        category: "lm",
        engine: "minimax",
        required: !0
      }
    ]);
    this.cacheDir = y.join(R.homedir(), ".qvac", "models");
    const e = O ? O.getPath("userData") : y.join(R.homedir(), ".echo-ai");
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
        const t = /* @__PURE__ */ new Set(), i = (o, n) => {
          const a = n.toLowerCase();
          if (a.endsWith(".download") || a.endsWith(".tmp") || a.endsWith(".partial") || a.endsWith(".crdownload"))
            return;
          let c = null;
          try {
            c = g.statSync(o);
          } catch {
            return;
          }
          c.isFile() && c.size > 1024 * 1024 && (a.includes("parler-large-v1-f16") || a.includes("parler-large-v1-fp16") ? t.add("chatterbox-t3-turbo-q8_0") : a.includes("chatterbox-s3gen-q8") || a.includes("chatterbox-s3gen") ? t.add("chatterbox-s3gen-q8_0") : a.includes("chatterbox-t3-multilingual") ? t.add("chatterbox-t3-multilingual-q8_0") : a.includes("chatterbox-s3gen-multilingual") ? t.add("chatterbox-s3gen-multilingual-q8_0") : (a.includes("chatterbox-t3") || a.includes("chatterbox")) && t.add("chatterbox-t3-turbo-q8_0"), (a.includes("cosyvoice3-llm") || a.includes("cosy_voice")) && t.add("cosyvoice3-llm-q8_0"), (a.includes("cosyvoice3-flow-f16") || a.includes("cosyvoice3-flow-fp16") || a.includes("cosyvoice3-flow-f32") || a.includes("cosyvoice3-flow")) && t.add("cosyvoice3-flow-fp16"), (a.includes("lavasr") || a.includes("enhancer")) && t.add("lavasr-enhancer"), (a.includes("cosyvoice3-s3tok") || a.includes("s3tok")) && t.add("cosyvoice3-s3tok-fp16"), (a.includes("cosyvoice3-campplus") || a.includes("campplus")) && t.add("cosyvoice3-campplus-fp32"), (a.includes("qwen3-embedding") || a.includes("qwen3_embedding")) && t.add("audiogen-qwen3-embedding"), (a.includes("acestep-5hz") || a.includes("acestep_5hz")) && t.add("audiogen-acestep-5hz-lm"), (a.includes("acestep-v15-turbo") || a.includes("acestep_v15_turbo") || a.includes("turbo-q4_k_m")) && t.add("audiogen-acestep-turbo-dit"), (a.includes("vae-bf16") || a.includes("audiogen-vae") || a.includes("audiogen_vae")) && t.add("audiogen-vae-bf16"), (a.includes("mm3-lm") || a.includes("minimax") && (a.includes("transformer") || a.includes("lm"))) && !a.includes("vocoder") && !a.includes("synth") && t.add("minimax-music-v3-transformer"), (a.includes("mm3-synth") || a.includes("minimax") && (a.includes("vocoder") || a.includes("synth"))) && !a.includes("transformer") && !a.includes("lm") && t.add("minimax-music-vocoder"), (a.includes("qwen3-1.7b") || a.includes("qwen3_1.7b") || a.includes("qwen3-1_7b") || a.includes("qwen3-1-7b")) && a.endsWith(".gguf") && t.add("qwen3-1.7b-lyric-generator"));
        }, s = g.readdirSync(this.cacheDir);
        for (const o of s) {
          const n = y.join(this.cacheDir, o);
          i(n, o);
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
                  i(d, l);
                }
              }
            } catch {
            }
          }
        }
        for (const o of t)
          this.downloadedModelIds.has(o) || (this.downloadedModelIds.add(o), e = !0);
        for (const o of Array.from(this.downloadedModelIds))
          (o.startsWith("minimax-") || o.startsWith("audiogen-") || o.startsWith("qwen3-")) && !t.has(o) && (this.downloadedModelIds.delete(o), e = !0);
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
    const t = this.modelDefinitions.map((s) => {
      const r = this.downloadedModelIds.has(s.id), o = this.activeDownloads.has(s.id), n = e ? e === "cosyvoice3" ? s.engine === "cosyvoice3" && s.id !== "cosyvoice3-flow-fp16" || s.engine === "shared" : e === "chatterbox" ? s.engine === "chatterbox" && (s.id === "chatterbox-t3-turbo-q8_0" || s.id === "chatterbox-s3gen-q8_0") : s.engine === e : s.category === "backbone";
      return {
        ...s,
        required: n,
        downloaded: r,
        status: o ? "downloading" : r ? "ready" : "idle"
      };
    });
    let i = !1;
    if (e === "chatterbox") {
      const s = t.some(
        (o) => o.engine === "chatterbox" && o.category === "backbone" && o.downloaded
      ), r = t.some(
        (o) => o.engine === "chatterbox" && o.category === "vocoder" && o.downloaded
      );
      i = s && r;
    } else {
      const s = e ? t.filter((r) => r.required) : t.filter((r) => r.category === "backbone");
      i = s.length > 0 && s.every((r) => r.downloaded);
    }
    return {
      ready: i,
      allRequiredDownloaded: i,
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
    const i = this.modelDefinitions.find((n) => n.id === e);
    if (!i)
      return { success: !1, modelId: e, error: `Unknown model ID: ${e}` };
    if (this.syncCacheFromDisk(), this.downloadedModelIds.has(e))
      return t == null || t({
        modelId: e,
        percentage: 100,
        downloaded: i.sizeBytes,
        total: i.sizeBytes,
        speed: "Ready"
      }), { success: !0, modelId: e };
    if (i.engine === "minimax")
      return await this.downloadMiniMaxModel(e, i, t);
    let s = !1, r = 0, o = i.sizeBytes;
    this.activeDownloads.set(e, {
      cancel: () => {
        s = !0;
      }
    });
    try {
      const a = v[i.descriptorName] || null;
      if (!a || typeof v.downloadAsset != "function")
        return {
          success: !1,
          modelId: e,
          error: `No asset descriptor found for ${e} (${i.descriptorName})`
        };
      let c = null;
      for (let l = 1; l <= 2; l++)
        try {
          const d = v.downloadAsset({
            assetSrc: a,
            onProgress: (u) => {
              var x, _, I, $, T, E, L, w;
              if (s) return;
              const h = ((x = u.fileSetInfo) == null ? void 0 : x.overallPercentage) ?? ((_ = u.shardInfo) == null ? void 0 : _.overallPercentage) ?? (u.fileSetInfo || u.shardInfo ? 0 : u.percentage ?? 0), f = ((I = u.fileSetInfo) == null ? void 0 : I.overallTotal) ?? (($ = u.shardInfo) == null ? void 0 : $.overallTotal) ?? u.total ?? i.sizeBytes;
              o = f;
              const p = ((T = u.fileSetInfo) == null ? void 0 : T.overallDownloaded) ?? ((E = u.shardInfo) == null ? void 0 : E.overallDownloaded) ?? u.downloaded ?? Math.round((h || 0) / 100 * f), b = Math.min(99, Math.max(1, Math.round(h || 0)));
              r = Math.max(r, b);
              let M = u.speed || "Downloading...";
              (L = u.fileSetInfo) != null && L.currentFile ? M = `${u.fileSetInfo.currentFile} (${u.fileSetInfo.fileIndex}/${u.fileSetInfo.totalFiles})` : (w = u.shardInfo) != null && w.shardName && (M = `${u.shardInfo.shardName} (${u.shardInfo.currentShard}/${u.shardInfo.totalShards})`);
              const N = p >= f && f > 0 || h >= 100;
              N && (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState()), t == null || t({
                modelId: e,
                percentage: N ? 100 : r,
                downloaded: p,
                total: f,
                speed: N ? "Completed" : M
              });
            }
          });
          d && d.requestId && this.activeDownloads.set(e, {
            cancel: () => {
              s = !0;
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
          if (c = d, String((d == null ? void 0 : d.message) || d).includes("could not be locked") && l === 1 && !s) {
            console.warn(`[ModelsService] Registry lock conflict for ${e}. Retrying in 1.2s...`), await new Promise((h) => setTimeout(h, 1200));
            continue;
          }
          throw d;
        }
      if (c) throw c;
      return s ? { success: !1, modelId: e, error: "Download cancelled" } : (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), t == null || t({
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
          const i = y.join(this.cacheDir, t);
          try {
            g.statSync(i).isDirectory() ? g.rmSync(i, { recursive: !0, force: !0 }) : g.unlinkSync(i);
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
  async downloadMiniMaxModel(e, t, i) {
    const r = {
      "minimax-music-v3-transformer": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-lm-Q4_K_M-imat.gguf",
        filename: "mm3-lm-Q4_K_M-imat.gguf"
      },
      "minimax-music-vocoder": {
        url: "https://huggingface.co/scragnog/MiniMax-Music3-GGUF/resolve/main/mm3-synth-Q4_K_M.gguf",
        filename: "mm3-synth-Q4_K_M.gguf"
      },
      "qwen3-1.7b-lyric-generator": {
        url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_0.gguf",
        filename: "Qwen3-1.7B-Q4_0.gguf"
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
        const h = g.statSync(o);
        if (h.size > 1024 * 1024)
          return this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), i == null || i({
            modelId: e,
            percentage: 100,
            downloaded: h.size,
            total: h.size,
            speed: "Ready"
          }), { success: !0, modelId: e };
      }
      const u = g.readdirSync(this.cacheDir).find((h) => h.toLowerCase().endsWith(r.filename.toLowerCase()));
      if (u) {
        const h = g.statSync(y.join(this.cacheDir, u));
        if (h.size > 1024 * 1024)
          return this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), i == null || i({
            modelId: e,
            percentage: 100,
            downloaded: h.size,
            total: h.size,
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
      const u = d.headers.get("content-length"), h = u ? parseInt(u, 10) : t.sizeBytes;
      l = g.createWriteStream(n);
      const f = d.body.getReader();
      let p = 0, b = Date.now(), M = 0, N = "Starting...";
      for (i == null || i({
        modelId: e,
        percentage: 1,
        downloaded: 0,
        total: h,
        speed: N
      }); ; ) {
        if (c)
          throw new Error("Download cancelled");
        const { done: $, value: T } = await f.read();
        if ($) break;
        if (T && T.length > 0) {
          const E = l.write(Buffer.from(T));
          p += T.length, E || await new Promise((U) => l.once("drain", U));
          const L = Date.now(), w = L - b;
          if (w >= 400 || p >= h) {
            const U = p - M, D = w / 1e3;
            N = `${(U / Math.max(0.1, D) / (1024 * 1024)).toFixed(1)} MB/s`, b = L, M = p;
            const F = h > 0 ? Math.min(99, Math.max(1, Math.round(p / h * 100))) : 0;
            i == null || i({
              modelId: e,
              percentage: F,
              downloaded: p,
              total: h,
              speed: N
            });
          }
        }
      }
      if (await new Promise(($, T) => {
        if (!l) return $();
        l.on("finish", $), l.on("error", T), l.end();
      }), l = null, c)
        throw new Error("Download cancelled");
      const x = g.statSync(n);
      if (x.size < 1024 * 1024)
        throw new Error(`Downloaded file size (${x.size} bytes) is too small. Corrupt or incomplete download.`);
      const _ = g.openSync(n, "r"), I = Buffer.alloc(4);
      if (g.readSync(_, I, 0, 4, 0), g.closeSync(_), I.toString("ascii") !== "GGUF")
        throw new Error(`Downloaded file is not a valid GGUF binary (magic: ${I.toString("ascii")})`);
      if (g.existsSync(o))
        try {
          g.unlinkSync(o);
        } catch {
        }
      return g.renameSync(n, o), this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), i == null || i({
        modelId: e,
        percentage: 100,
        downloaded: h,
        total: h,
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
class tt extends ne {
  constructor(e) {
    super(), this.modelsService = e;
  }
  init() {
    C.handle(
      S.MODELS_GET_STATUS,
      async (e, t) => {
        try {
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        } catch (i) {
          return { success: !1, error: String(i) };
        }
      }
    ), C.handle(
      S.MODELS_DOWNLOAD,
      async (e, t) => {
        const i = (s) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MODELS_DOWNLOAD_PROGRESS, s);
          } catch (r) {
            console.warn("[ModelsController] Failed to send download progress:", r);
          }
        };
        if (t != null && t.allRequired) {
          const r = this.modelsService.getStatus(t == null ? void 0 : t.engine).models.filter((o) => o.required && !o.downloaded);
          for (const o of r)
            await this.modelsService.downloadModel(o.id, i);
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        }
        return t != null && t.modelId ? { ...await this.modelsService.downloadModel(t.modelId, i), data: this.modelsService.getStatus(t == null ? void 0 : t.engine) } : { success: !1, error: "No modelId or allRequired flag specified" };
      }
    ), C.handle(
      S.MODELS_CANCEL_DOWNLOAD,
      async (e, { modelId: t }) => ({ success: this.modelsService.cancelDownload(t), modelId: t })
    ), C.handle(
      S.MODELS_GET_INFO,
      async (e, { name: t }) => {
        try {
          return { success: !0, data: await this.modelsService.getModelInfo(t) };
        } catch (i) {
          return { success: !1, error: String(i) };
        }
      }
    ), C.handle(S.MODELS_DELETE_ALL, async () => {
      try {
        return await this.modelsService.deleteAllModels(), { success: !0 };
      } catch (e) {
        return { success: !1, error: String(e) };
      }
    });
  }
}
class it {
  constructor(e) {
    A(this, "repository");
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
      y.join(O.getAppPath(), "public", "voices", "samples"),
      y.join(O.getAppPath(), "dist", "voices", "samples")
    ];
    for (const i of t)
      if (g.existsSync(i))
        return i;
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
      const t = g.readdirSync(e, { withFileTypes: !0 }), i = [];
      for (const s of t) {
        if (!s.isDirectory()) continue;
        const r = y.join(e, s.name), o = y.join(r, "info.json"), n = y.join(r, "json.info"), a = g.existsSync(o) ? o : g.existsSync(n) ? n : null;
        if (a)
          try {
            const c = g.readFileSync(a, "utf-8"), l = JSON.parse(c), d = l.list || l.location || (g.existsSync(y.join(r, "json", "voices.json")) ? "json/voices.json" : "voices.json");
            i.push({
              folder: s.name,
              language: l.language || s.name,
              name: l.name || l.language || s.name,
              flag: l.flag || "🌐",
              code: l.code || s.name,
              nativeName: l.nativeName || l.name || l.language,
              list: d,
              location: d,
              listUrl: `/voices/samples/${s.name}/${d.replace(/^\//, "")}`,
              count: l.count || 0
            });
          } catch (c) {
            console.warn(`[VoiceService] Failed to parse info.json in ${r}:`, c);
          }
      }
      return { success: !0, packages: i };
    } catch (e) {
      return console.error("[VoiceService] Failed to scan voice samples:", e), { success: !1, packages: [], error: String(e) };
    }
  }
  /**
   * Load voices directly from disk for a given language folder
   */
  loadVoicesForPackage(e, t = "json/voices.json") {
    try {
      const i = this.getSamplesDirectory();
      if (!i)
        return { success: !1, voices: [], error: "Samples directory not found" };
      const s = t.replace(/^\//, ""), o = [
        y.join(i, e, s),
        y.join(i, e, "json", "voices.json"),
        y.join(i, e, "voices.json")
      ].find((l) => g.existsSync(l));
      if (!o)
        return { success: !1, voices: [], error: `Voice list not found for folder ${e}` };
      const n = g.readFileSync(o, "utf-8"), a = JSON.parse(n);
      return { success: !0, voices: Array.isArray(a) ? a : a.voices || [] };
    } catch (i) {
      return console.error(`[VoiceService] Failed to load voices for ${e}:`, i), { success: !1, voices: [], error: String(i) };
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
      const t = this.getCustomVoicesDirectory(), i = (e.fileName || "sample.wav").replace(/[^a-zA-Z0-9._-]/g, "_"), s = y.extname(i).toLowerCase() || ".wav", r = Date.now(), o = `voice_${e.voiceId}_${r}${s}`, n = y.join(t, o), a = Buffer.isBuffer(e.audioBuffer) ? e.audioBuffer : Buffer.from(e.audioBuffer);
      g.writeFileSync(n, a);
      let c = n, l = `/voices/custom/${o}`;
      if (s !== ".wav") {
        const u = `voice_${e.voiceId}_${r}.wav`, h = y.join(t, u);
        try {
          const { execFileSync: f } = await import("node:child_process");
          f("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", n, h]), g.existsSync(h) && g.statSync(h).size > 100 && (c = h, l = `/voices/custom/${u}`);
        } catch (f) {
          console.warn("[VoiceService] Audio conversion fallback, using original file:", f);
        }
      }
      let d;
      if (e.avatarBuffer) {
        const u = Buffer.isBuffer(e.avatarBuffer) ? e.avatarBuffer : Buffer.from(e.avatarBuffer);
        if (u.byteLength > 0) {
          const h = y.extname(e.avatarFileName || ".jpg").toLowerCase() || ".jpg", f = `avatar_${e.voiceId}_${r}${h}`, p = y.join(t, f);
          g.writeFileSync(p, u), d = `/voices/custom/${f}`;
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
        const i = g.readdirSync(t);
        for (const s of i)
          if (s.includes(`_${e}_`))
            try {
              g.unlinkSync(y.join(t, s));
            } catch {
            }
      }
      return { success: !0 };
    } catch (t) {
      return console.error("[VoiceService] Failed to delete custom voice files:", t), { success: !1, error: String(t) };
    }
  }
}
class st {
  constructor(e) {
    A(this, "db");
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
class rt extends ne {
  constructor(e) {
    super(), this.voiceService = e;
  }
  init() {
    C.handle(S.VOICES_SCAN, async () => this.voiceService.scanVoicePackages()), C.handle(S.LEGACY_SCAN_VOICE_SAMPLES, async () => this.voiceService.scanVoicePackages()), C.handle(
      S.VOICES_LOAD,
      async (e, { folder: t, list: i }) => this.voiceService.loadVoicesForPackage(t, i)
    ), C.handle(
      S.VOICES_SAVE_CUSTOM,
      async (e, t) => this.voiceService.saveCustomVoice(t)
    ), C.handle(
      S.VOICES_DELETE_CUSTOM,
      async (e, { voiceId: t }) => this.voiceService.deleteCustomVoice(t)
    ), C.handle(S.VOICES_LIST_CUSTOM, async () => {
      try {
        return { success: !0, data: await this.voiceService.listCustomVoices() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
function nt(m, e) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const t = m.length, i = 44, s = t * 2, r = Buffer.alloc(i + s);
  r.write("RIFF", 0), r.writeUInt32LE(i + s - 8, 4), r.write("WAVE", 8), r.write("fmt ", 12), r.writeUInt32LE(16, 16), r.writeUInt16LE(1, 20), r.writeUInt16LE(1, 22), r.writeUInt32LE(e, 24), r.writeUInt32LE(e * 2, 28), r.writeUInt16LE(2, 32), r.writeUInt16LE(16, 34), r.write("data", 36), r.writeUInt32LE(s, 40);
  for (let o = 0; o < t; o++) {
    const n = Number.isFinite(m[o]) ? Math.round(m[o]) : 0, a = Math.max(-32768, Math.min(32767, n));
    r.writeInt16LE(a, i + o * 2);
  }
  return `data:audio/wav;base64,${r.toString("base64")}`;
}
function ot(m, e) {
  if (e = Math.max(1, Math.floor(e)), m.length === 0) return Array(e).fill(4);
  const t = [], i = Math.max(1, Math.floor(m.length / e));
  for (let s = 0; s < e; s++) {
    let r = 0;
    const o = s * i, n = Math.min(m.length, o + i);
    for (let a = o; a < n; a += Math.max(1, Math.floor((n - o) / 40))) {
      const c = Math.abs(m[a] / 32768);
      c > r && (r = c);
    }
    t.push(Math.max(4, Math.min(98, Math.round(r * 100))));
  }
  return t;
}
function De(m, e, t) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const i = m.length, s = 44, r = i * 2, o = Buffer.alloc(s + r);
  o.write("RIFF", 0), o.writeUInt32LE(s + r - 8, 4), o.write("WAVE", 8), o.write("fmt ", 12), o.writeUInt32LE(16, 16), o.writeUInt16LE(1, 20), o.writeUInt16LE(1, 22), o.writeUInt32LE(e, 24), o.writeUInt32LE(e * 2, 28), o.writeUInt16LE(2, 32), o.writeUInt16LE(16, 34), o.write("data", 36), o.writeUInt32LE(r, 40);
  for (let d = 0; d < i; d++) {
    const u = Number.isFinite(m[d]) ? Math.round(m[d]) : 0, h = Math.max(-32768, Math.min(32767, u));
    o.writeInt16LE(h, s + d * 2);
  }
  const n = m.reduce((d, u) => Math.max(d, Math.abs(u)), 0), a = y.resolve(process.cwd(), "assets/testing-voice-output");
  g.mkdirSync(a, { recursive: !0 });
  const c = `${t}-${Date.now()}.wav`, l = y.join(a, c);
  return g.writeFileSync(l, o), console.log(
    `[TTS Debug] Saved PCM to ${l} (${i} samples @ ${e}Hz, maxAbs=${n.toFixed(4)})`
  ), l;
}
function Te(m, e) {
  const t = Math.floor(e * Math.max(0.015, m)), i = new Array(t);
  let s = 0;
  for (let o = 0; o < t; o++) {
    const n = (Math.random() * 2 - 1) * 5;
    s = s * 0.85 + n * 0.15, i[o] = s;
  }
  const r = Math.min(Math.floor(e * 8e-3), Math.floor(t / 2));
  for (let o = 0; o < r; o++) {
    const n = 0.5 * (1 - Math.cos(Math.PI * o / r));
    i[o] *= n;
    const a = 0.5 * (1 - Math.cos(Math.PI * (r - o) / r));
    i[t - 1 - o] *= a;
  }
  return i;
}
function at(m, e, t = 18, i = 28) {
  if (m.length === 0) return m;
  let s = 0;
  for (let l = 0; l < m.length; l++) {
    const d = Math.abs(m[l]);
    d > s && (s = d);
  }
  if (s === 0) return m;
  const r = Math.max(s * 8e-3, s > 2 ? 60 : 2e-3), o = Math.floor(e * t / 1e3), n = Math.floor(e * i / 1e3);
  let a = 0;
  for (let l = 0; l < m.length; l++)
    if (Math.abs(m[l]) > r) {
      a = Math.max(0, l - o);
      break;
    }
  let c = m.length;
  for (let l = m.length - 1; l >= a; l--)
    if (Math.abs(m[l]) > r) {
      c = Math.min(m.length, l + 1 + n);
      break;
    }
  return a >= c || c - a < e * 0.08 ? m : m.slice(a, c);
}
function me(m, e, t, i = 12) {
  if (e.length === 0) return;
  if (m.length === 0) {
    for (let o = 0; o < e.length; o++) m.push(e[o]);
    return;
  }
  const s = Math.min(
    Math.floor(t * i / 1e3),
    Math.floor(m.length / 2),
    Math.floor(e.length / 2)
  );
  if (s <= 0) {
    for (let o = 0; o < e.length; o++) m.push(e[o]);
    return;
  }
  const r = m.length - s;
  for (let o = 0; o < s; o++) {
    const n = o / s, a = Math.cos(n * (Math.PI / 2)), c = Math.sin(n * (Math.PI / 2));
    m[r + o] = m[r + o] * a + e[o] * c;
  }
  for (let o = s; o < e.length; o++)
    m.push(e[o]);
}
function ct(m, e, t = "normal") {
  let i = m, s = t;
  const r = [];
  if ((s === "whisper" || /\[(?:whisper|soft)\]/i.test(i)) && (s = "whisper", r.push("whisper"), i = i.replace(/\[\/?(?:whisper|soft)\]/gi, " ")), s === "yell" || /\[(?:yell|shout|loud)\]/i.test(i)) {
    s = "yell", r.push("yell"), i = i.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ");
    const o = i.trim(), n = /[!?]$/.test(o) ? "" : "!";
    i = `${o.toUpperCase()}${n}`;
  }
  return (s === "raise" || /\[(?:raise|emphasis)\]/i.test(i) || /<\/?strong>/i.test(i)) && (s = "raise", r.push("raise")), i = i.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " "), i = i.replace(/<\/?laughter>/gi, " "), (/\[(?:sigh|breath)\]/i.test(i) || /<\/?breath>/i.test(i)) && r.push("breath"), /\[(?:hmm+|thinking)\]/i.test(i) && r.push("hmm"), /\[gasp\]/i.test(i) && r.push("gasp"), e === "cosyvoice3" ? (i = i.replace(/\[(?:breath|sigh)\]/gi, " <breath> "), i = i.replace(
    /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
    "<strong>$1</strong>"
  ), s === "raise" && !/<strong>[\s\S]*?<\/strong>/i.test(i) && (i = `<strong>${i.trim()}</strong>`), i = i.replace(/\[\/?(?:raise|emphasis)\]/gi, " "), i = i.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... "), i = i.replace(/\[gasp\]/gi, "<breath> "), i = i.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim(), s === "whisper" && i.length > 0 && (i = `<breath> ${i.toLowerCase()} <breath>`)) : (i = i.replace(/<\/?(?:laughter|strong|breath)>/gi, " "), i = i.replace(
    /\[\/?(?:laugh|laughter|giggle|chuckle|breath|sigh|gasp|whisper|soft|yell|shout|loud|raise|emphasis)\]/gi,
    " "
  ), r.includes("hmm") && (i = i.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ")), (r.includes("breath") || r.includes("sigh") || r.includes("gasp")) && (i = i.replace(/\[(?:breath|sigh|gasp)\]/gi, "... ")), s === "raise" && (i = i.toUpperCase()), i = i.replace(/\s+/g, " ").replace(/\.{4,}/g, "...").trim(), s === "whisper" && i.length > 0 && (i = `... ${i.toLowerCase()} ...`)), { cleanedText: i, detectedCues: r, tone: s };
}
function lt(m, e = 36) {
  const t = m.trim();
  if (!t) return [];
  const i = t.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim();
  if (i.split(/\s+/).filter(Boolean).length <= e) {
    const a = /[.!?]$/.test(i);
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
        const h = n.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), f = /[.!?]$/.test(h);
        o.push({ text: n, isSentenceEnd: f });
      }
      if (c.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length > e) {
        const h = c.match(/(?:<[^>]+>|[^,;:—-])+([,;:—-]+(?=[\s<]|$)|$)/g) || [c];
        let f = "";
        for (const p of h) {
          const b = p.trim();
          if (!b) continue;
          const M = f ? `${f} ${b}` : b;
          M.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e ? f = M : (f && o.push({ text: f, isSentenceEnd: !1 }), f = b);
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
function dt(m) {
  let e = m.replace(
    /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi,
    (n, a) => {
      const c = parseFloat(a);
      return Number.isFinite(c) && c <= 1.2 ? "... " : n;
    }
  );
  e = e.replace(/\[(whisper|soft|yell|shout|loud|raise|emphasis)\]\s*\[\/\1\]/gi, "");
  const t = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]|\[(whisper|soft|yell|shout|loud|raise|emphasis)\]([\s\S]*?)\[\/\2\]/gi, i = [];
  let s = 0, r;
  for (; (r = t.exec(e)) !== null; ) {
    const n = e.slice(s, r.index).trim();
    if (n && i.push({ type: "speech", text: n, tone: "normal" }), r[1] !== void 0) {
      const a = parseFloat(r[1]);
      Number.isFinite(a) && a > 0 && i.push({ type: "pause", pauseSec: Math.min(a, 30) });
    } else if (r[2] !== void 0) {
      const a = r[2].toLowerCase(), c = (r[3] || "").trim();
      if (c) {
        let l = "normal";
        a === "whisper" || a === "soft" ? l = "whisper" : a === "yell" || a === "shout" || a === "loud" ? l = "yell" : (a === "raise" || a === "emphasis") && (l = "raise"), i.push({ type: "speech", text: c, tone: l });
      }
    }
    s = r.index + r[0].length;
  }
  const o = e.slice(s).trim();
  return o && i.push({ type: "speech", text: o, tone: "normal" }), i;
}
function Oe(m) {
  if (!m || typeof m != "string") return;
  let e = m;
  if (!g.existsSync(e)) {
    const n = y.resolve(process.cwd(), "public", m.replace(/^\//, ""));
    g.existsSync(n) && (e = n);
  }
  if (!g.existsSync(e)) {
    const n = y.resolve(process.cwd(), m);
    g.existsSync(n) && (e = n);
  }
  if (!g.existsSync(e)) return;
  const t = y.extname(e).toLowerCase();
  if (t === ".wav") return e;
  const i = y.join(R.tmpdir(), "echo-voice-cache");
  g.mkdirSync(i, { recursive: !0 });
  const s = g.statSync(e), r = `${y.basename(e, t)}_${s.size}_${Math.floor(s.mtimeMs)}.wav`, o = y.join(i, r);
  if (g.existsSync(o) && g.statSync(o).size > 1e3)
    return o;
  try {
    if (Xe("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", e, o]), g.existsSync(o) && g.statSync(o).size > 1e3)
      return o;
  } catch (n) {
    console.warn(`[Echo Voice Engine] Audio conversion failed for ${e}:`, n);
  }
}
function ke(m) {
  if (m) {
    const e = Oe(m);
    if (e) return e;
  }
}
class ut {
  constructor(e) {
    A(this, "modelsService");
    A(this, "loadedModels", /* @__PURE__ */ new Map());
    A(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    this.modelsService = e || new Ie();
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
    const t = e.engine || "cosyvoice3", i = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), s = v.TTS_ENHANCER_LAVASR_FP16;
    if (t === "chatterbox") {
      const l = e.language && e.language !== "en" && this.modelsService.isModelDownloaded("chatterbox-t3-multilingual-q8_0") && this.modelsService.isModelDownloaded("chatterbox-s3gen-multilingual-q8_0");
      let d = l ? v.TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_T3_TURBO_EN_CHATTERBOX_Q8_0, u = l ? v.TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_S3GEN_EN_CHATTERBOX_Q8_0;
      const h = l ? "Chatterbox T3 Multilingual (Q8_0 GGUF)" : "Chatterbox T3 Turbo EN (Q8_0 GGUF)";
      if (!d || !u)
        throw new Error("QVAC Chatterbox descriptors (T3 and/or S3Gen) missing from SDK");
      let f = ke(e.referenceAudioSrc);
      if (!f) {
        const x = y.resolve(process.cwd(), "public", "voices", "samples", "en", "voice_en_male_1.mp3");
        g.existsSync(x) && (f = Oe(x));
      }
      const p = [
        "chatterbox",
        l ? "multilingual" : "en",
        f ? y.basename(f) : "default",
        i ? "lavasr48k" : "native24k",
        process.arch === "arm64" ? "metal" : "cpu"
      ].join("|"), b = this.loadedModels.get(p);
      if (b)
        return { modelId: b, engine: "chatterbox" };
      (r = e.onLog) == null || r.call(e, {
        text: `[Echo Voice Engine] Loading ${h} + S3Gen Vocoder (${i ? "48kHz LavaSR" : "24kHz native"}${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const M = {
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
        ...i && s ? { lavasrEnhancerModelSrc: s } : {}
      }, N = await v.loadModel({
        modelSrc: d,
        modelType: "tts",
        modelConfig: M,
        onProgress: (x) => {
          var I;
          const _ = Math.round((x == null ? void 0 : x.percentage) ?? 0);
          (I = e.onProgress) == null || I.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(_ * 0.4)),
            message: `Loading ${h} weights ${_}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const x = this.loadedModels.keys().next().value;
        if (x) {
          const _ = this.loadedModels.get(x);
          if (_)
            try {
              await ((o = v.unloadModel) == null ? void 0 : o.call(v, { modelId: _ }));
            } catch {
            }
          this.loadedModels.delete(x);
        }
      }
      return this.loadedModels.set(p, N), { modelId: N, engine: "chatterbox" };
    } else {
      const l = v.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || v.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!l)
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      const d = ((n = e.emotion) == null ? void 0 : n.toLowerCase()) || "", h = ["anger", "happy", "neutral", "sad"].includes(d) ? d : void 0, f = ke(e.referenceAudioSrc), p = (this.modelsService.isModelDownloaded("cosyvoice3-s3tok-fp16") || this.modelsService.isModelDownloaded("cosyvoice3-s3tok")) && (this.modelsService.isModelDownloaded("cosyvoice3-campplus-fp32") || this.modelsService.isModelDownloaded("cosyvoice3-campplus"));
      console.log(
        `[Echo Voice Engine] CosyVoice 3 setup: refWavPath=${f}, hasCloningModels=${p}`
      );
      const b = [
        "cosyvoice3",
        f || "native",
        h || "none",
        i ? "lavasr48k" : "native24k"
      ].join("|"), M = this.loadedModels.get(b);
      if (M)
        return { modelId: M, engine: "cosyvoice3" };
      const N = f ? ` voice="${y.basename(f)}"` : " (native studio voice)", x = h ? ` emotion="${h}"` : "";
      (a = e.onLog) == null || a.call(e, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0 [FP32 Flow Matching]${i ? " +LavaSR 48kHz" : ""}${N}${x})...`,
        stream: "stdout"
      });
      const _ = {
        ttsEngine: "cosyvoice3",
        useGPU: !0,
        seed: 42,
        ...f && p ? {
          cosyvoice3S3tokModelSrc: v.TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16,
          cosyvoice3CampplusModelSrc: v.TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32,
          referenceAudioSrc: f
        } : {},
        ...i && s ? { lavasrEnhancerModelSrc: s } : {},
        ...h ? { emotion: h } : {}
      }, I = await v.loadModel({
        modelSrc: l,
        modelType: "tts",
        modelConfig: _,
        onProgress: ($) => {
          var E;
          const T = Math.round(($ == null ? void 0 : $.percentage) ?? 0);
          (E = e.onProgress) == null || E.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(T * 0.4)),
            message: `Loading CosyVoice 3 weights ${T}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const $ = this.loadedModels.keys().next().value;
        if ($) {
          const T = this.loadedModels.get($);
          if (T)
            try {
              await ((c = v.unloadModel) == null ? void 0 : c.call(v, { modelId: T }));
            } catch {
            }
          this.loadedModels.delete($);
        }
      }
      return this.loadedModels.set(b, I), { modelId: I, engine: "cosyvoice3" };
    }
  }
  cancelSynthesis(e) {
    var i;
    const t = this.activeTtsRequestIds.get(e);
    if (t) {
      try {
        (i = v.cancel) == null || i.call(v, { requestId: t });
      } catch {
      }
      this.activeTtsRequestIds.delete(e);
    }
  }
  /**
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Chatterbox T3)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  async synthesize(e, t, i, s) {
    var d, u, h, f, p, b, M, N, x;
    const { taskId: r, rounds: o } = e, n = e.engine || "cosyvoice3", a = o.filter((_) => _.text.trim().length > 0);
    if (a.length === 0)
      return { success: !1, error: "No active speech rounds to synthesize" };
    const c = a[0], l = e.speakerName || "Selected Speaker";
    i == null || i({
      text: `[Echo Voice Engine] Synthesis task ${r} engine="${n}" voice="${l}" turns=${a.length}...`,
      stream: "system"
    });
    try {
      if (s != null && s()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: r,
        progress: 8,
        message: `Loading ${n === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const _ = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), I = e.voicePrompt || e.prompt || e.description || c.prompt || c.description, $ = ((d = c.emotion) == null ? void 0 : d.toLowerCase()) || "", T = [
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
      ], E = T.includes($) ? $ : void 0, L = c.referenceAudioSrc || e.referenceAudioSrc, { engine: w } = await this.ensureModelLoaded({
        engine: n,
        language: e.language || "en",
        lavaSrEnabled: _,
        instruct: I || void 0,
        emotion: E,
        pace: (u = c.pace) == null ? void 0 : u.toLowerCase(),
        referenceAudioSrc: L,
        taskId: r,
        onProgress: t,
        onLog: i
      });
      if (s != null && s()) return { success: !1, error: "Cancelled" };
      const U = [];
      let D = _ ? 48e3 : 24e3;
      for (let V = 0; V < a.length; V++) {
        if (s != null && s()) {
          const H = this.activeTtsRequestIds.get(r);
          if (H)
            try {
              await ((h = v.cancel) == null ? void 0 : h.call(v, { requestId: H }));
            } catch {
            }
          return { success: !1, error: "Cancelled" };
        }
        const G = a[V], ue = G.referenceAudioSrc || e.referenceAudioSrc, Ae = ((f = G.emotion) == null ? void 0 : f.toLowerCase()) || "", Ve = T.includes(Ae) ? Ae : E, { modelId: Be } = await this.ensureModelLoaded({
          engine: n,
          language: e.language || "en",
          lavaSrEnabled: _,
          instruct: G.prompt || G.description || I || void 0,
          emotion: Ve,
          pace: (p = G.pace) == null ? void 0 : p.toLowerCase(),
          referenceAudioSrc: ue,
          taskId: r,
          onProgress: t,
          onLog: i
        });
        if (t == null || t({
          taskId: r,
          progress: 40 + Math.round(V / a.length * 50),
          message: `Synthesizing turn ${V + 1}/${a.length}${G.speakerName ? ` (${G.speakerName})` : ""}...`,
          phase: "synthesis"
        }), V > 0 && U.length > 0) {
          const H = Te(0.2, D);
          me(U, H, D, 14);
        }
        const Ce = dt(G.text);
        let Ge = 0;
        for (let H = 0; H < Ce.length; H++) {
          const Y = Ce[H];
          if (s != null && s()) {
            const X = this.activeTtsRequestIds.get(r);
            if (X)
              try {
                await ((b = v.cancel) == null ? void 0 : b.call(v, { requestId: X }));
              } catch {
              }
            return { success: !1, error: "Cancelled" };
          }
          if (Y.type === "pause" && Y.pauseSec) {
            const X = Te(Y.pauseSec, D);
            me(U, X, D, 14);
            continue;
          }
          if (Y.type === "speech" && Y.text) {
            const { cleanedText: X, detectedCues: ae, tone: ve } = ct(Y.text, w, Y.tone);
            if (!X) continue;
            const he = lt(X, 36);
            for (let W = 0; W < he.length; W++) {
              const pe = he[W].text;
              if (!pe) continue;
              if (s != null && s()) {
                const B = this.activeTtsRequestIds.get(r);
                if (B)
                  try {
                    await ((M = v.cancel) == null ? void 0 : M.call(v, { requestId: B }));
                  } catch {
                  }
                return { success: !1, error: "Cancelled" };
              }
              if (U.length > 0) {
                const J = W > 0 && !he[W - 1].isSentenceEnd ? 0.035 : W > 0 ? 0.09 : 0.08, q = Te(J, D);
                me(U, q, D, 10);
              }
              Ge++;
              const Q = {
                modelId: Be,
                text: pe,
                inputType: "text",
                stream: !1
              };
              if (w === "cosyvoice3") {
                const B = (((N = G.emotion) == null ? void 0 : N.toLowerCase()) || E || "").trim(), J = ["anger", "happy", "neutral", "sad"];
                if (ve === "whisper" || ae.includes("whisper"))
                  Q.volume = "soft", Q.pace = "slow";
                else if (ve === "yell" || ae.includes("yell"))
                  Q.volume = "loud", Q.emotion = "anger";
                else if (ve === "raise" || ae.includes("raise"))
                  Q.volume = "loud";
                else {
                  let q = J.includes(B) ? B : void 0;
                  if ((ae.includes("sigh") || ae.includes("breath")) && !q && (q = "sad"), q && q !== "neutral")
                    Q.emotion = q;
                  else {
                    const le = (((x = G.pace) == null ? void 0 : x.toLowerCase()) || "").trim();
                    ["slow", "moderate", "fast"].includes(le) && le !== "moderate" && (Q.pace = le);
                  }
                }
              }
              const K = v.textToSpeech(Q);
              K != null && K.requestId && this.activeTtsRequestIds.set(r, K.requestId);
              const z = await K.buffer ?? [], ze = await K.done, Se = await K.sampleRate, ce = typeof Se == "number" && Se > 0 ? Se : _ ? 48e3 : 24e3;
              if (D = ce, this.activeTtsRequestIds.delete(r), z.length > 0) {
                let B = 0, J = 1 / 0, q = -1 / 0;
                for (const re of z) {
                  const we = Number.isFinite(re) ? re : 0;
                  B = Math.max(B, Math.abs(we)), J = Math.min(J, we), q = Math.max(q, we);
                }
                const le = z.every((re) => re === 0), _e = z.every((re) => re === z[0]);
                console.log(
                  `[TTS Debug] Turn ${V + 1} Chunk ${W + 1}/${he.length}: PCM length=${z.length}, maxAbs=${B.toFixed(4)}, min=${J.toFixed(4)}, max=${q.toFixed(4)}, allZero=${le}, allSame=${_e}, sampleRate=${ce}`
                );
              }
              if (z.length > 0) {
                const B = pe.replace(/[^a-z0-9]/gi, "_").slice(0, 30) || `round-${V}-chunk-${W}`;
                De(z, ce, `segment-${V}-${B}`);
              }
              if (!ze || !z || z.length === 0)
                throw new Error(
                  `${w === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} returned no audio for turn ${V + 1}`
                );
              const qe = at(z, ce);
              me(U, qe, ce, 12);
            }
          }
        }
      }
      if (s != null && s()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: r,
        progress: 95,
        message: `Finalizing ${D}Hz WAV & waveform...`,
        phase: "finalizing"
      }), U.length > 0 && De(U, D, "combined-output");
      const P = nt(U, D), k = ot(U, 38), F = Math.round(U.length / D * 10) / 10, se = a[0].text.trim(), de = se.length > 55 ? `${se.slice(0, 52)}...` : se, oe = {
        id: `gen-${r}`,
        roundIndex: e.historyIndex || 0,
        title: `Generation ${(e.historyIndex || 0) + 1}`,
        textSnippet: de,
        speakerName: a.length > 1 ? `${a.length} Speakers` : e.speakerName || "Sterling Rhodes",
        speakerColor: a.length > 1 ? "#10b981" : e.speakerColor || "#38bdf8",
        speakerAvatarUrl: e.speakerAvatarUrl || "/voices/sterling.jpg",
        duration: F,
        audioUrl: P,
        waveform: k,
        timestamp: "Just now",
        emotion: c.emotion || "Neutral"
      };
      return t == null || t({
        taskId: r,
        progress: 100,
        message: `${w === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} synthesis complete`,
        phase: "complete"
      }), i == null || i({
        text: `[Echo Voice Engine] Synthesis complete (${F}s @ ${D}Hz, ${U.length} samples).`,
        stream: "stdout"
      }), { success: !0, data: oe };
    } catch (_) {
      this.activeTtsRequestIds.delete(r);
      const I = _ != null && _.message ? String(_.message) : String(_);
      return i == null || i({
        text: `[Echo Voice Engine] Synthesis failed: ${I}`,
        stream: "stderr"
      }), { success: !1, error: I };
    }
  }
}
class ht {
  constructor(e, t) {
    A(this, "activeTasks", /* @__PURE__ */ new Set());
    A(this, "voiceEngine");
    A(this, "modelsService");
    A(this, "conversationRepo");
    this.modelsService = e || new Ie(), this.voiceEngine = new ut(this.modelsService), this.conversationRepo = t;
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
    var t, i;
    if (this.activeTasks.has(e)) {
      this.activeTasks.delete(e);
      try {
        (i = (t = this.voiceEngine).cancelSynthesis) == null || i.call(t, e);
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
  async generateSpeech(e, t, i) {
    const { taskId: s } = e;
    this.activeTasks.add(s);
    try {
      return await this.voiceEngine.synthesize(
        e,
        t,
        i,
        () => this.isCancelled(s)
      );
    } finally {
      this.activeTasks.delete(s);
    }
  }
}
class mt {
  constructor(e) {
    A(this, "db");
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
        roundsData: t.rounds.map((i) => ({
          id: i.id,
          voiceId: i.voiceId,
          text: i.text,
          speed: i.speed,
          emotion: i.emotion || void 0,
          pace: i.pace || void 0,
          prompt: i.prompt || void 0,
          description: i.description || void 0,
          referenceAudioSrc: i.referenceAudioSrc || void 0,
          speakerName: i.speakerName || void 0,
          speakerColor: i.speakerColor || void 0
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
      const t = e.waveform ? JSON.stringify(e.waveform) : "[]", i = e.timestamp ? BigInt(Math.floor(e.timestamp)) : BigInt(Date.now());
      return await this.db.client.$transaction(async (s) => {
        if (await s.conversation.upsert({
          where: { id: e.id },
          update: {
            text: e.text,
            previewSnippet: e.previewSnippet || e.text,
            voiceName: e.voiceName,
            voiceColor: e.voiceColor,
            voiceAvatarUrl: e.voiceAvatarUrl,
            dateGroup: e.dateGroup,
            timeAgo: e.timeAgo,
            timestamp: i,
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
            timestamp: i,
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
        }), await s.speechRound.deleteMany({
          where: { conversationId: e.id }
        }), e.roundsData && Array.isArray(e.roundsData) && e.roundsData.length > 0) {
          const u = e.roundsData.map((h, f) => ({
            id: h.id || `${e.id}-round-${f}`,
            conversationId: e.id,
            roundOrder: f,
            voiceId: h.voiceId || "voice-en-male-1",
            text: h.text || "",
            speed: typeof h.speed == "number" ? h.speed : 1,
            emotion: h.emotion || null,
            pace: h.pace || null,
            prompt: h.prompt || null,
            description: h.description || null,
            referenceAudioSrc: h.referenceAudioSrc || null,
            speakerName: h.speakerName || null,
            speakerColor: h.speakerColor || null
          }));
          for (const h of u)
            await s.speechRound.create({ data: h });
        }
        const o = (e.previewSnippet || e.text || "").replace(/\s+/g, " ").trim(), n = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${e.voiceName || "Speech Synthesis"} Turn`, a = await s.activity.findUnique({
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
          await s.activity.update({
            where: { conversationId: e.id },
            data: {
              category: c,
              subCategory: l,
              description: o ? o.slice(0, 160) : null,
              metadata: d
            }
          });
        else {
          let u = n, h = 1;
          for (; await s.activity.findUnique({ where: { title: u } }); )
            h++, u = `${n} #${h}`;
          await s.activity.create({
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
class gt extends ne {
  constructor(e) {
    super(), this.ttsService = e;
  }
  init() {
    C.handle(
      S.TTS_GENERATE,
      async (e, t) => {
        const i = t.engine || "cosyvoice3", r = this.ttsService.getModelStatus(i).models.filter((c) => c.required && !c.downloaded);
        if (r.length > 0)
          return {
            success: !1,
            error: `Required voice engine models not downloaded: ${r.map((c) => c.name).join(", ")}`
          };
        const o = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TTS_PROGRESS, c);
          } catch (l) {
            console.warn("[TtsController] Failed to send progress event:", l);
          }
        }, n = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TERMINAL_LOG, {
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
            e.sender.isDestroyed() || e.sender.send(S.TTS_COMPLETE, {
              taskId: t.taskId,
              generation: a.data
            });
          } catch (c) {
            console.warn("[TtsController] Failed to send complete event:", c);
          }
        else if (!a.success)
          try {
            e.sender.isDestroyed() || e.sender.send(S.TTS_ERROR, {
              taskId: t.taskId,
              error: a.error || "Generation failed"
            });
          } catch (c) {
            console.warn("[TtsController] Failed to send error event:", c);
          }
        return a;
      }
    ), C.handle(
      S.TTS_CANCEL,
      async (e, { taskId: t }) => ({ success: this.ttsService.cancelGeneration(t), taskId: t })
    ), C.handle(S.TTS_HISTORY_LIST, async () => {
      try {
        return { success: !0, data: await this.ttsService.listConversations() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    }), C.handle(S.TTS_HISTORY_SAVE, async (e, t) => {
      try {
        return await this.ttsService.saveConversation(t);
      } catch (i) {
        return { success: !1, error: (i == null ? void 0 : i.message) || String(i) };
      }
    }), C.handle(S.TTS_HISTORY_DELETE, async (e, t) => {
      try {
        const i = typeof t == "string" ? t : t.id;
        return await this.ttsService.deleteConversation(i);
      } catch (i) {
        return { success: !1, error: (i == null ? void 0 : i.message) || String(i) };
      }
    }), C.handle(S.TTS_HISTORY_CLEAR, async () => {
      try {
        return await this.ttsService.clearConversations();
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
const Z = class Z {
  constructor() {
    A(this, "primaryLogPath");
    A(this, "mirrorLogPath");
    var s;
    let e;
    try {
      e = (s = O) != null && s.getPath ? O.getPath("userData") : process.cwd();
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
    const i = y.join(process.cwd(), "logs");
    if (!g.existsSync(i))
      try {
        g.mkdirSync(i, { recursive: !0 });
      } catch {
      }
    this.mirrorLogPath = y.join(i, "music-generation.log"), this.rotateIfNecessary(this.primaryLogPath), this.rotateIfNecessary(this.mirrorLogPath), this.writeRaw(`
=== Music Logger Initialized [${(/* @__PURE__ */ new Date()).toISOString()}] ===
Primary Log: ${this.primaryLogPath}
Mirror Log: ${this.mirrorLogPath}
`);
  }
  static getInstance() {
    return Z.instance || (Z.instance = new Z()), Z.instance;
  }
  rotateIfNecessary(e) {
    try {
      if (g.existsSync(e) && g.statSync(e).size > 15 * 1024 * 1024) {
        const i = `${e}.${Date.now()}.bak`;
        g.renameSync(e, i);
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
    let s = `[${(/* @__PURE__ */ new Date()).toISOString()}] [INFO] ${e}`;
    t && (s += `
  Metadata: ${JSON.stringify(t, null, 2)}`), s += `
`, this.writeRaw(s), console.log(`[MusicLogger] ${e}`);
  }
  logSessionStart(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), i = "=".repeat(80), s = `
${i}
[${t}] ▸ STARTING MUSIC GENERATION
TaskId:         ${e.taskId}
Engine:         ${e.engine}
Caption:        "${e.caption}"
Lyrics:         ${e.lyrics ? `"${e.lyrics.slice(0, 100)}${e.lyrics.length > 100 ? "..." : ""}"` : "(none)"}
Instrumental:   ${!!e.isInstrumental}
Duration:       ${e.duration || 30}s
DiT Variant:    ${e.ditVariant || "n/a"}
Seed:           ${e.seed ?? -1}
${i}
`;
    this.writeRaw(s), console.log(`[MusicLogger] ▸ Generation Started for task: ${e.taskId} (Engine: ${e.engine})`);
  }
  logMilestone(e, t, i) {
    const r = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [${t}] ${i || ""}
`;
    this.writeRaw(r), console.log(`[MusicLogger] [${e}] [${t}] ${i || ""}`);
  }
  logProgress(e, t, i, s, r) {
    const n = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [PROGRESS] ${t}: ${r}% (${i}/${s})
`;
    this.writeRaw(n);
  }
  logSuccess(e, t) {
    const i = (/* @__PURE__ */ new Date()).toISOString(), s = "-".repeat(80), r = `
${s}
[${i}] ✓ MUSIC GENERATION SUCCEEDED
TaskId:         ${e}
Duration:       ${(t.durationMs / 1e3).toFixed(2)}s
Format:         ${t.sampleRate} Hz, ${t.channels} ch
Output WAV:     ${t.wavFilePath}
${s}
`;
    this.writeRaw(r), console.log(`[MusicLogger] ✓ Generation Succeeded: ${e} -> ${t.wavFilePath}`);
  }
  logFailure(e) {
    const t = (/* @__PURE__ */ new Date()).toISOString(), i = "#".repeat(80), s = e.error, r = (s == null ? void 0 : s.message) || String(s), o = (s == null ? void 0 : s.code) || (s == null ? void 0 : s.errCode) || "UNKNOWN", n = (s == null ? void 0 : s.stack) || "(No stack trace available)", a = s != null && s.cause ? JSON.stringify(s.cause, null, 2) : void 0, c = s == null ? void 0 : s.adds;
    let l = [];
    const d = y.join(R.homedir(), ".qvac", "models");
    try {
      g.existsSync(d) && (l = g.readdirSync(d).map((p) => {
        try {
          const M = (g.statSync(y.join(d, p)).size / (1024 * 1024)).toFixed(1);
          return `${p} (${M} MB)`;
        } catch {
          return p;
        }
      }));
    } catch {
    }
    const u = Math.round(R.freemem() / (1024 * 1024)), h = Math.round(R.totalmem() / (1024 * 1024)), f = `
${i}
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
${l.length > 0 ? l.map((p) => `  - ${p}`).join(`
`) : "  (Directory empty or inaccessible)"}

System Resources:
  Platform:       ${R.platform()}-${R.arch()}
  Free Memory:    ${u} MB / ${h} MB (${Math.round(u / h * 100)}% free)
  Node Version:   ${process.version}
${i}
`;
    this.writeRaw(f), console.error(`[MusicLogger] ✖ Generation Failed for ${e.taskId} (Engine: ${e.engine}, Stage: ${e.stage}): ${r}`), console.error(n);
  }
  getRecentLogs(e = 200) {
    try {
      if (!g.existsSync(this.primaryLogPath))
        return "No music generation logs recorded yet.";
      const t = g.readFileSync(this.primaryLogPath, "utf-8"), i = t.split(`
`);
      return i.length <= e ? t : i.slice(i.length - e).join(`
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
A(Z, "instance");
let Me = Z;
const ee = class ee {
  static getInstance() {
    return ee.instance || (ee.instance = new ee()), ee.instance;
  }
  /**
   * Sanitizes prompt, lyrics, and arrangements incorporating all selected UI options
   * (vocalMode, BPM, keyscale, time signature, duration, vocal language, etc.).
   */
  sanitize(e) {
    var d;
    const t = e.caption || "", i = e.engine || "acestep", s = e.duration && e.duration > 0 ? e.duration : 30, r = /\b(instrumental|no vocals?|no singing|without vocals?|backing track|karaoke|pure instrumental|solo piano|solo guitar|acoustic instrumental)\b/i.test(t), o = !!(e.vocalMode === "instrumental" || e.isInstrumental || ((d = e.lyrics) == null ? void 0 : d.trim()) === "[Instrumental]" || r);
    let n = this.stripConversationalMeta(t), a, c;
    if (o ? (n = n.replace(/\b(?:with\s+)?(?:clear\s+melodic\s+)?(?:singing\s+vocals?|singing|lead\s+vocals?|vocalist|singer|soprano|baritone|tenor|choir|voice)\b/gi, "").replace(/\b(?:with\s+lyrics?|lyrics?)\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /\b(instrumental|backing track|no vocals)\b/i.test(n) ? /\bno vocals\b/i.test(n) || (n = `${n}, no vocals`) : n = `${n}, instrumental backing track, no vocals, rich melodic instruments`, i === "acestep" && !/(studio quality|clean mix|crisp|high fidelity|mastered|clear audio)/i.test(n) && (n = `${n}, studio quality mix, crisp clear audio, punchy transients`), c = "[Instrumental]", a = void 0) : (n = n.replace(/\b(?:pure\s+)?instrumental(?:\s+track|\s+version)?\b/gi, "").replace(/\b(?:without|no)\s+vocals?\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /(vocal|singer|voice|singing|choir|soprano|baritone|tenor|lead vocals|vocalist|harmony)/i.test(n) || (a = this.inferVocalTimbre(n, e.vocalLanguage), n = `${n}, ${a}`), e.vocalMode === "manual" && e.lyrics && e.lyrics.trim() && e.lyrics.trim() !== "[Instrumental]" ? c = this.formatLyricsForDuration(e.lyrics, n, s) : i === "acestep" && !e.lyrics ? c = "" : c = this.formatLyricsForDuration(e.lyrics, n, s)), e.bpm && e.bpm > 0 && (/\b\d+\s*(?:bpm|beats\s+per\s+minute)\b/i.test(n) || (n = `${n}, ${e.bpm} BPM`)), e.keyscale && e.keyscale.trim() && e.keyscale.toLowerCase() !== "none") {
      const u = e.keyscale.trim(), h = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      new RegExp(`\\b${h}\\b`, "i").test(n) || /\b(?:in\s+key\s+of|key\s+of)\b/i.test(n) || (n = `${n}, in ${u}`);
    }
    if (e.timesignature && e.timesignature.trim() && e.timesignature !== "4/4") {
      const u = e.timesignature.trim();
      n.includes(u) || (n = `${n}, ${u} time signature`);
    }
    if (!o && e.vocalLanguage && e.vocalLanguage !== "en") {
      const h = {
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
      h && !new RegExp(`\\b${h}\\b`, "i").test(n) && (n = `${n}, ${h} vocals`);
    }
    if (s >= 120 ? /(extended|full-length|progression|arrangement|complete song)/i.test(n) || (n = `${n}, full-length structured arrangement with progression`) : s >= 60 && (/(progression|arrangement|structured)/i.test(n) || (n = `${n}, structured track progression`)), n = n.replace(/\s*,\s*,+/g, ", ").replace(/,\s*$/g, "").replace(/\s{2,}/g, " ").trim(), i === "acestep" && n.length > 450) {
      const u = n.slice(0, 450), h = u.lastIndexOf(",");
      n = (h > 250 ? u.slice(0, h) : u).trim(), o && !/\b(instrumental|no vocals)\b/i.test(n) && (n = `${n}, instrumental, no vocals`);
    }
    const l = i === "minimax" ? Math.max(750, Math.round(s * 25)) : void 0;
    return {
      caption: n.trim(),
      lyrics: c.trim(),
      duration: s,
      maxFrames: l,
      vocalHintInjected: a,
      isInstrumental: o
    };
  }
  /**
   * Strips conversational filler like "generate a...", "make a song about..."
   * as well as markdown formatting, bullet points, and LLM-generated section headers.
   */
  stripConversationalMeta(e) {
    let t = e.trim();
    t = t.replace(/\*\*(.*?)\*\*/g, "$1"), t = t.replace(/\*(.*?)\*/g, "$1"), t = t.replace(/#{1,6}\s*/g, ""), t = t.replace(/^\s*\d+\.\s+/gm, ""), t = t.replace(/^\s*[-*•]\s+/gm, ""), t = t.replace(/(?:Musical arrangement and instrumentation|Composition and progression|Performance and sound characteristics|Production quality|Instrumentation|Arrangement|Sound characteristics|Style and mood)\s*:\s*/gi, ""), t = t.replace(/\b(?:The composition should sound like|The final composition should sound like|Build the composition around|Keep the arrangement entirely|Develop the musical theme|Begin with a|Include several)\b[^.,;\n]*/gi, "");
    const i = [
      /^(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|write|compose|produce)\s+(?:me\s+)?(?:a|an|the|some)?\s+/i,
      /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+have\s+)?(?:a|an|the|some)?\s+)/i,
      /^(?:give\s+me\s+(?:a|an|the)?\s+)/i,
      /^(?:song\s+about\s+)/i,
      /^(?:track\s+about\s+)/i
    ];
    for (const s of i)
      t = t.replace(s, "");
    return t = t.replace(/[\r\n]+/g, ", "), t = t.replace(/\s*,\s*,+/g, ", ").replace(/,\s*,/g, ", ").replace(/\s{2,}/g, " ").trim(), t = t.replace(/^,\s*/, "").replace(/,\s*$/, ""), t.length > 0 && (t = t.charAt(0).toUpperCase() + t.slice(1)), t;
  }
  /**
   * Infers the best vocal timbre matching the musical genre/theme and optional language
   */
  inferVocalTimbre(e, t) {
    const i = e.toLowerCase(), s = {
      es: "Spanish",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian"
    }, r = t && t !== "en" && s[t.toLowerCase()] ? `${s[t.toLowerCase()]} ` : "";
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk|ancient|kingdom)/.test(i) ? `${r}haunting bard vocals, clear close-mic singing, natural human vibrato, acoustic studio production` : /(synthwave|retrowave|cyberpunk|80s|neon|electro)/.test(i) ? `${r}crisp 80s gated reverb male vocals, polished lead vocal, punchy melodic synth hook` : /(lo-fi|lofi|chillhop|coffee|relax|bedroom)/.test(i) ? `${r}soft breathy female vocals, intimate close-mic acoustic presence, clear pronunciation` : /(rock|metal|punk|grunge|electric guitar|heavy)/.test(i) ? `${r}raw energetic rock vocals, powerful singing voice, clear vocal consonants` : /(cinematic|epic|orchestral|orchestra|trailer|hero)/.test(i) ? `${r}soaring dramatic vocals, rich choral harmonies, expansive dynamic range` : /(ballad|piano|sad|emotional|heartbreak|acoustic|love|romance|romantic)/.test(i) ? `${r}heartfelt emotional solo vocals, warm studio acoustic presence, intimate vocal nuance, close-mic singing` : /(pop|dance|disco|summer|happy|party)/.test(i) ? `${r}bright modern pop vocals, crisp high-end clarity, infectious melodic chorus` : /(r&b|soul|jazz|blues)/.test(i) ? `${r}smooth soulful vocals, rich vocal harmonics, clear diction` : `${r}expressive lead singing vocals, crisp close-mic presence, natural human vibrato, studio vocal clarity`;
  }
  /**
   * Formats, tags, and extends lyrics according to duration so the model
   * doesn't stop prematurely at ~20 seconds.
   */
  formatLyricsForDuration(e, t, i) {
    let s = (e || "").trim();
    if (!s)
      return this.generateDefaultLyricsForTheme(t, i);
    s = s.replace(/\[?(?:verse\s*\d*|\(verse\s*\d*\)|verse\s*\d*:)\]?/gi, "[verse]"), s = s.replace(/\[?(?:chorus|\(chorus\)|chorus:)\]?/gi, "[chorus]"), s = s.replace(/\[?(?:bridge|\(bridge\)|bridge:)\]?/gi, "[bridge]"), s = s.replace(/\[?(?:outro|\(outro\)|outro:)\]?/gi, "[outro]"), s = s.replace(/\[?(?:intro|\(intro\)|intro:)\]?/gi, "[intro]"), s = s.replace(/\*\*(.*?)\*\*/g, "$1"), s = s.replace(/#{1,6}\s*/g, ""), s.startsWith("[") || (s = `[verse]
${s}`);
    const r = s.match(/\[(verse|chorus|bridge|outro|intro)\]/gi) || [];
    if (i >= 120 && r.length < 3) {
      const o = s.split(`
`).filter((n) => n.trim() && !n.startsWith("["));
      if (o.length > 0) {
        const n = o.slice(0, Math.min(4, o.length)).join(`
`), a = o.length > 4 ? o.slice(4).join(`
`) : n;
        s = [
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
    } else i >= 60 && r.length < 2 && (s = `${s}

[chorus]
${s.replace(/\[verse\]/g, "").trim()}

[outro]
Fading with the music...`);
    return s;
  }
  /**
   * Generates a complete, multi-section lyric sheet tailored to the duration.
   */
  generateDefaultLyricsForTheme(e, t) {
    const i = e.toLowerCase();
    return /(medieval|war|harp|battle|castle)/.test(i) ? t >= 120 ? `[verse]
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
A(ee, "instance");
let Ee = ee;
const te = class te {
  static getInstance() {
    return te.instance || (te.instance = new te()), te.instance;
  }
  /**
   * Post-processes raw interleaved PCM audio buffer into studio-mastered audio.
   * Returns a new Uint8Array with the mastered PCM samples.
   */
  masterPcm(e, t, i, s, r = {}) {
    if (!e || e.byteLength === 0 || i <= 0 || t <= 0)
      return { masteredPcm: e, peakBeforeDb: -99, peakAfterDb: -99, details: "empty pcm" };
    const {
      enableHighPass: o = !0,
      highPassHz: n = 32,
      enableAirShelf: a = !0,
      airShelfHz: c = 9500,
      airShelfGainDb: l = 2.2,
      enableNormalize: d = !0,
      targetPeakDb: u = -0.5,
      enableSoftLimiter: h = !0
    } = r, f = Math.floor(s === 16 ? e.byteLength / 2 : e.byteLength / 4), p = new Float32Array(f);
    if (s === 16) {
      const T = new Int16Array(e.buffer, e.byteOffset, f);
      for (let E = 0; E < f; E++)
        p[E] = T[E] / 32768;
    } else if (s === 32) {
      const T = new Float32Array(e.buffer, e.byteOffset, f);
      p.set(T);
    } else
      return { masteredPcm: e, peakBeforeDb: 0, peakAfterDb: 0, details: "unsupported bit depth" };
    let b = 1e-5;
    for (let T = 0; T < f; T++) {
      const E = Math.abs(p[T]);
      E > b && (b = E);
    }
    const M = 20 * Math.log10(b);
    o && n > 0 && n < t / 2 && this.applyHighPassFilter(p, t, i, n), a && l !== 0 && c < t / 2 && this.applyHighShelfFilter(p, t, i, c, l);
    let N = 1e-5;
    for (let T = 0; T < f; T++) {
      const E = Math.abs(p[T]);
      E > N && (N = E);
    }
    if (d && N > 1e-4) {
      const E = Math.pow(10, u / 20) / N;
      for (let L = 0; L < f; L++)
        p[L] *= E;
    }
    if (h) {
      const E = 0.06000000000000005;
      for (let L = 0; L < f; L++) {
        const w = p[L];
        w > 0.94 ? p[L] = 0.94 + E * Math.tanh((w - 0.94) / E) : w < -0.94 && (p[L] = -0.94 + E * Math.tanh((w + 0.94) / E));
      }
    }
    let x = 1e-5;
    for (let T = 0; T < f; T++) {
      const E = Math.abs(p[T]);
      E > x && (x = E);
    }
    const _ = 20 * Math.log10(x), I = new Uint8Array(e.byteLength);
    if (s === 16) {
      const T = new Int16Array(I.buffer, I.byteOffset, f);
      for (let E = 0; E < f; E++) {
        const L = Math.max(-1, Math.min(1, p[E]));
        T[E] = L < 0 ? Math.round(L * 32768) : Math.round(L * 32767);
      }
    } else s === 32 && new Float32Array(I.buffer, I.byteOffset, f).set(p);
    const $ = `HighPass: ${n}Hz | AirShelf: +${l}dB @ ${c}Hz | Peak: ${M.toFixed(1)}dBFS -> ${_.toFixed(1)}dBFS`;
    return { masteredPcm: I, peakBeforeDb: M, peakAfterDb: _, details: $ };
  }
  /**
   * Applies a 2nd-order Butterworth High-Pass Biquad Filter per channel
   */
  applyHighPassFilter(e, t, i, s) {
    const r = 2 * Math.PI * s / t, o = Math.cos(r), c = Math.sin(r) / (2 * 0.70710678), l = (1 + o) / 2, d = -(1 + o), u = (1 + o) / 2, h = 1 + c, f = -2 * o, p = 1 - c, b = l / h, M = d / h, N = u / h, x = f / h, _ = p / h;
    for (let I = 0; I < i; I++) {
      let $ = 0, T = 0, E = 0, L = 0;
      for (let w = I; w < e.length; w += i) {
        const U = e[w], D = b * U + M * $ + N * T - x * E - _ * L;
        T = $, $ = U, L = E, E = D, e[w] = D;
      }
    }
  }
  /**
   * Applies a High-Shelf Presence / Vocal Air Biquad Filter per channel
   */
  applyHighShelfFilter(e, t, i, s, r) {
    const o = Math.pow(10, r / 40), n = 2 * Math.PI * s / t, a = Math.cos(n), d = Math.sin(n) / 2 * Math.sqrt((o + 1 / o) * (1 / 1 - 1) + 2), u = 2 * Math.sqrt(o) * d, h = o * (o + 1 + (o - 1) * a + u), f = -2 * o * (o - 1 + (o + 1) * a), p = o * (o + 1 + (o - 1) * a - u), b = o + 1 - (o - 1) * a + u, M = 2 * (o - 1 - (o + 1) * a), N = o + 1 - (o - 1) * a - u, x = h / b, _ = f / b, I = p / b, $ = M / b, T = N / b;
    for (let E = 0; E < i; E++) {
      let L = 0, w = 0, U = 0, D = 0;
      for (let P = E; P < e.length; P += i) {
        const k = e[P], F = x * k + _ * L + I * w - $ * U - T * D;
        w = L, L = k, D = U, U = F, e[P] = F;
      }
    }
  }
};
A(te, "instance");
let fe = te;
const ie = class ie {
  constructor() {
    A(this, "activeModelId", null);
    A(this, "isLoadingModel", !1);
    A(this, "idleUnloadTimer", null);
  }
  static getInstance() {
    return ie.instance || (ie.instance = new ie()), ie.instance;
  }
  /**
   * Resets the idle unload timer to keep model in unified memory across iterative prompt adjustments.
   * Auto-unloads after 4 minutes of inactivity.
   */
  touchActivity() {
    this.idleUnloadTimer && (clearTimeout(this.idleUnloadTimer), this.idleUnloadTimer = null), this.idleUnloadTimer = setTimeout(() => {
      console.log("[QwenLyricService] Idle timeout reached (4m), releasing model memory"), this.unload().catch(() => {
      });
    }, 4 * 60 * 1e3);
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
        onProgress: (i) => {
          e == null || e(i);
        }
      });
      return this.activeModelId = t, console.log(`[QwenLyricService] ✓ Qwen3-1.7B loaded successfully with ID: ${t}`), this.touchActivity(), t;
    } catch (t) {
      throw console.error("[QwenLyricService] ✖ Failed to load Qwen3-1.7B:", t), t;
    } finally {
      this.isLoadingModel = !1;
    }
  }
  /**
   * Unloads the Qwen lyric model to release unified memory.
   * Called before heavy MiniMax runs or on idle timeout.
   */
  async unload() {
    this.idleUnloadTimer && (clearTimeout(this.idleUnloadTimer), this.idleUnloadTimer = null);
    const e = this.activeModelId;
    if (e) {
      this.activeModelId = null;
      try {
        await v.unloadModel({ modelId: e }), console.log("[QwenLyricService] ✓ Qwen3-1.7B unloaded to free memory");
      } catch (t) {
        console.warn("[QwenLyricService] Warning unloading Qwen3-1.7B:", t);
      }
    }
  }
  /**
   * Generates song lyrics from a description, streaming tokens in real time.
   */
  async generateLyricsStream(e, t, i) {
    this.touchActivity();
    const s = (e || "").trim() || "A soulful, emotional song about life and hope";
    try {
      const r = await this.ensureModelLoaded(i), o = `You are a professional hit songwriter.
Write structured, rhyming song lyrics based on the musical prompt.

Formatting Rules:
1. Immediately start outputting lyrics using standard section headers:
[verse]
[chorus]
[verse]
[chorus]
[bridge]
[outro]
2. Output ONLY the song lyrics and section tags. Never output conversational remarks, intros, or explanations.
3. Keep verses and chorus punchy, rhyming, and easy to sing.`, n = `Write song lyrics for: "${s}". Output only the lyrics starting with [verse].`, a = v.completion({
        modelId: r,
        history: [
          { role: "system", content: o },
          { role: "user", content: n }
        ],
        captureThinking: !1,
        stream: !0,
        generationParams: {
          reasoning_budget: 0,
          predict: 420,
          temp: 0.75,
          top_p: 0.9,
          repeat_penalty: 1.15,
          frequency_penalty: 0.25,
          presence_penalty: 0.25
        }
      });
      let c = "", l = !1, d = !1;
      const u = setTimeout(() => {
        if (!l) {
          d = !0, console.warn("[QwenLyricService] First token watchdog timed out (7s). Canceling run & activating fast synthesizer.");
          try {
            v.cancel({ requestId: a.requestId }).catch(() => {
            });
          } catch {
          }
        }
      }, 7e3);
      try {
        for await (const p of a.events) {
          if (d) break;
          if (p.type === "contentDelta" && p.text) {
            const b = p.text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "");
            b && (l || (l = !0, clearTimeout(u)), c += b, t == null || t(b));
          }
        }
      } catch (p) {
        console.warn("[QwenLyricService] Stream iteration warning/end:", p);
      } finally {
        clearTimeout(u);
      }
      const h = c.trim();
      if (!l || h.length < 30) {
        console.warn("[QwenLyricService] LLM output insufficient or timed out, synthesizing genre-tailored lyrics.");
        const p = this.getFallbackLyrics(s);
        for (const b of p)
          t == null || t(b), await new Promise((M) => setTimeout(M, 4));
        return this.touchActivity(), { lyrics: p, engine: "fallback" };
      }
      const f = h.startsWith("[") ? h : `[verse]
${h}`;
      return this.touchActivity(), { lyrics: f, engine: "qwen-1.7b" };
    } catch (r) {
      console.warn("[QwenLyricService] Qwen lyric generation failed, activating fallback:", r);
      const o = this.getFallbackLyrics(s);
      for (const n of o)
        t == null || t(n), await new Promise((a) => setTimeout(a, 4));
      return this.touchActivity(), { lyrics: o, engine: "fallback" };
    }
  }
  /**
   * Fast rule-based genre-tailored lyrical synthesizer
   */
  getFallbackLyrics(e) {
    const t = e.toLowerCase();
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk|acoustic|woodland|castle)/.test(t) ? `[verse]
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
Peace to the fallen, beyond despair...` : /(synthwave|retro|neon|cyberpunk|80s|electronic|dance|edm|techno|club|future)/.test(t) ? `[verse]
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
Driving forever into the light...` : /(hip hop|hip-hop|rap|trap|drill|urban|rhyme|beats|808|freestyle)/.test(t) ? `[verse]
Step on the pavement, concrete cold,
Writing out stories that were never told,
Mic in my hand and the bassline deep,
Counting my blessings while the city sleep.
Came from the bottom with a vision in sight,
Turning every shadow into blinding light.

[chorus]
Turn up the sound, let the rhythm ignite,
We taking over in the dead of the night,
They counted us out, but we rewriting the game,
Nothing is ever gonna feel the same!

[verse]
Heavy 808s bumping through the avenue,
Staying focused on the things I gotta do,
Stacking up the bars like a fortress wall,
Never gonna buckle, never gonna fall.

[chorus]
Turn up the sound, let the rhythm ignite,
We taking over in the dead of the night,
They counted us out, but we rewriting the game,
Nothing is ever gonna feel the same!

[bridge]
From the underground straight to the top,
This momentum is never gonna stop,
Hands to the ceiling, let the speakers blow,
Everything we got is on the show.

[outro]
Yeah... city lights fading out slow...
Turn the volume down low...` : /(rock|metal|punk|grunge|guitar|heavy|distortion|electric)/.test(t) ? `[verse]
Feedback screaming through an ancient amp,
Damp dirty basement by a single lamp,
Calloused fingers digging in the wire,
Spitting out sparks to a roaring fire.

[chorus]
Tear down the walls, let the thunder roll,
Something inside is taking full control,
Turn it to eleven, break the master key,
Tonight we're screaming till we set it free!

[verse]
Cracked leather jackets in the pouring storm,
Breaking the mold of what they call the norm,
Heartbeat pounding like a double kick drum,
Waiting for the promised day to come.

[chorus]
Tear down the walls, let the thunder roll,
Something inside is taking full control,
Turn it to eleven, break the master key,
Tonight we're screaming till we set it free!

[bridge]
No surrender, no giving in,
This is where the revolution begins!
Hear the distortion tearing the sky,
We were born to live, not just survive!

[outro]
Power chords ring until the lights go out...
This is what rock and roll is all about!` : /(pop|upbeat|happy|joy|bright|fun|summer|danceable)/.test(t) ? `[verse]
Sunlight breaking through the morning trees,
Walking down the sidewalk with a summer breeze,
Got a brand new melody inside my head,
Dancing through the words that we left unsaid.

[chorus]
Oh, can you feel that vibrant beat?
Lifting everybody right up off their feet!
Shining like gold in the afternoon sun,
The good times have only just begun!

[verse]
Window rolled down singing every line,
Everything is falling right in line,
Catching your smile across the room,
Chasing away every ounce of gloom.

[chorus]
Oh, can you feel that vibrant beat?
Lifting everybody right up off their feet!
Shining like gold in the afternoon sun,
The good times have only just begun!

[bridge]
Spin me around, don't let it end,
Here with my lover and my best friend,
Higher and higher we're taking flight,
We're glowing brighter than the stars tonight!

[outro]
Yeah, keep that feeling in your heart...
A beautiful ending to a brand new start...` : `[verse]
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
A(ie, "instance");
let ye = ie;
function xe(m, e, t, i) {
  const s = new ArrayBuffer(44), r = new DataView(s), o = t * (i / 8);
  ge(r, 0, "RIFF"), r.setUint32(4, 36 + m.byteLength, !0), ge(r, 8, "WAVE"), ge(r, 12, "fmt "), r.setUint32(16, 16, !0), r.setUint16(20, 1, !0), r.setUint16(22, t, !0), r.setUint32(24, e, !0), r.setUint32(28, e * o, !0), r.setUint16(32, o, !0), r.setUint16(34, i, !0), ge(r, 36, "data"), r.setUint32(40, m.byteLength, !0);
  const n = new Uint8Array(44 + m.byteLength);
  return n.set(new Uint8Array(s)), n.set(m, 44), n;
}
function ge(m, e, t) {
  for (let i = 0; i < t.length; i++)
    m.setUint8(e + i, t.charCodeAt(i));
}
function $e(m) {
  return `data:audio/wav;base64,${Buffer.from(m.buffer, m.byteOffset, m.byteLength).toString("base64")}`;
}
function Le(m, e, t, i = 64) {
  if (m.length === 0) return Array(i).fill(10);
  const s = [];
  if (e === 16) {
    const r = new Int16Array(m.buffer, m.byteOffset, Math.floor(m.byteLength / 2)), o = Math.max(1, Math.floor(r.length / i));
    for (let n = 0; n < i; n++) {
      let a = 0;
      const c = n * o, l = Math.min(r.length, c + o);
      for (let d = c; d < l; d += t) {
        const u = Math.abs(r[d]) / 32768;
        u > a && (a = u);
      }
      s.push(Math.max(6, Math.min(98, Math.round(a * 100))));
    }
  } else if (e === 32) {
    const r = new Float32Array(m.buffer, m.byteOffset, Math.floor(m.byteLength / 4)), o = Math.max(1, Math.floor(r.length / i));
    for (let n = 0; n < i; n++) {
      let a = 0;
      const c = n * o, l = Math.min(r.length, c + o);
      for (let d = c; d < l; d += t) {
        const u = Math.abs(r[d]);
        u > a && (a = u);
      }
      s.push(Math.max(6, Math.min(98, Math.round(a * 100))));
    }
  } else
    for (let r = 0; r < i; r++)
      s.push(Math.round(20 + Math.sin(r / 4) * 15));
  return s;
}
class ft {
  constructor() {
    A(this, "activeModelId");
    A(this, "activeEngine");
    A(this, "activeDitVariant");
    A(this, "activeRequestIds", /* @__PURE__ */ new Map());
    // taskId -> requestId
    A(this, "musicExportsDir");
    A(this, "logger", Me.getInstance());
    var e;
    try {
      const t = (e = O) != null && e.getPath ? O.getPath("userData") : process.cwd();
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
      const { lmModelSrc: i, synthModelSrc: s } = this.resolveMiniMaxModelPaths();
      return i && s ? { success: !0, data: await v.assessModelFit({
        models: [
          {
            modelType: "audiogen",
            modelConfig: {
              engine: "minimax",
              lmModelSrc: i,
              synthModelSrc: s,
              useGPU: !0
            }
          }
        ]
      }) } : { success: !0, message: "MiniMax assessment requires local model paths" };
    } catch (i) {
      return this.logger.logFailure({
        taskId: "assess-fit",
        engine: e,
        stage: "ASSESS_FIT",
        error: i,
        options: { engine: e, ditVariant: t }
      }), { success: !1, error: (i == null ? void 0 : i.message) || String(i) };
    }
  }
  /**
   * Discovers downloaded MiniMax-Music3 GGUF model files from disk cache (~/.qvac/models)
   */
  resolveMiniMaxModelPaths(e, t) {
    let i = e, s = t;
    const r = y.join(R.homedir(), ".qvac", "models");
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
          if (!i && (a.includes("mm3-lm") || a.includes("minimax") && (a.includes("lm") || a.includes("transformer"))) && !a.includes("vocoder") && !a.includes("synth")) {
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
                i = d;
                continue;
              }
            }
            i = c;
          }
          !s && (a.includes("mm3-synth") || a.includes("minimax") && (a.includes("synth") || a.includes("vocoder"))) && !a.includes("transformer") && !a.includes("lm") && (s = c);
        }
      } catch (o) {
        console.warn("[MusicEngineService] Error resolving MiniMax model paths:", o);
      }
    return { lmModelSrc: i, synthModelSrc: s };
  }
  /**
   * Checks whether MiniMax Music-v3 models are installed and accessible on disk
   */
  areMiniMaxModelsAvailable() {
    const { lmModelSrc: e, synthModelSrc: t } = this.resolveMiniMaxModelPaths();
    return !!(e && t);
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
    const i = e.engine || "acestep", s = e.ditVariant || "turbo-q4";
    if (this.activeModelId && this.activeEngine === i && (i === "minimax" || this.activeDitVariant === s))
      return this.activeModelId;
    if (this.activeModelId) {
      try {
        await v.unloadModel({ modelId: this.activeModelId });
      } catch (r) {
        console.warn("[MusicEngineService] Warning unloading prior model:", r);
      }
      this.activeModelId = void 0;
    }
    if (i === "acestep") {
      const r = this.resolveDitModelSrc(s);
      t == null || t({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Preparing ACE-Step AudioGen models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading ACE-Step (${s}) into QVAC runtime`);
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
        return this.activeModelId = o, this.activeEngine = "acestep", this.activeDitVariant = s, this.logger.logMilestone("model-load", "LOAD_SUCCESS", `ACE-Step model loaded ID: ${o}`), o;
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
        const a = "MiniMax-Music3 model files are not installed. Please download the MiniMax models first.";
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "RESOLVE_MINIMAX_PATHS",
          error: new Error(a),
          options: e,
          resolvedPaths: { lmModelSrc: r, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ MiniMax Model Load Failed: missing model paths", {
          lmModelSrc: r,
          synthModelSrc: o,
          optionsLm: e.lmModelSrc,
          optionsSynth: e.synthModelSrc
        }), new Error(a);
      }
      t == null || t({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Loading MiniMax-Music3 local GGUF models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading MiniMax models into QVAC runtime (LM: ${r}, Synth: ${o})`), await ye.getInstance().unload();
      const n = R.freemem() / 1024 ** 3;
      n < 8 && (this.logger.logMilestone(
        "model-load",
        "LOW_MEMORY",
        `Only ${n.toFixed(1)} GB reported free before MiniMax load; generation may be slow. Close heavy apps for best speed.`
      ), console.warn(`[MusicEngineService] Low free memory before MiniMax load: ${n.toFixed(1)} GB`));
      try {
        const a = await v.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "minimax",
            lmModelSrc: r,
            synthModelSrc: o,
            device: e.useGPU === !1 ? "cpu" : "gpu",
            ...e.threads !== void 0 && { threads: e.threads }
          }
        });
        return this.activeModelId = a, this.activeEngine = "minimax", this.logger.logMilestone("model-load", "LOAD_SUCCESS", `MiniMax model loaded successfully! ID: ${a}`), a;
      } catch (a) {
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "LOAD_MINIMAX_RUNTIME",
          error: a,
          options: e,
          resolvedPaths: { lmModelSrc: r, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ Failed to load MiniMax models in QVAC runtime:", {
          error: (a == null ? void 0 : a.message) || String(a),
          code: a == null ? void 0 : a.code,
          stack: a == null ? void 0 : a.stack,
          lmModelSrc: r,
          synthModelSrc: o
        }), a;
      }
    }
  }
  /**
   * Generates music track based on prompt, lyrics, and musical controls
   */
  async generate(e, t, i, s) {
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
      i == null || i({ text: `▸ Initializing Music Generation: "${o}"`, stream: "system" });
      const n = await this.ensureModelLoaded(e, t);
      if (s != null && s())
        return this.logger.logMilestone(r, "CANCELLED", "Cancelled by user before synthesis started"), { success: !1, error: "Cancelled by user before synthesis started." };
      this.logger.logMilestone(r, "MODEL_READY", `Model ID: ${n} (${e.engine || "acestep"})`), i == null || i({ text: `▸ Model loaded successfully: ${n} (Engine: ${e.engine || "acestep"})`, stream: "system" });
      const a = e.engine || "acestep", c = Ee.getInstance().sanitize({
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
      ), i == null || i({
        text: `▸ Request Sanitized: "${c.caption.slice(0, 60)}..." (Mode: ${c.isInstrumental ? "Instrumental" : "Vocal"}, Duration: ${c.duration}s)`,
        stream: "system"
      });
      let l = {
        modelId: n,
        caption: c.caption,
        lyrics: c.lyrics,
        duration: c.duration
      };
      if (e.seed !== void 0 && (l.seed = e.seed), a === "acestep") {
        if (c.duration > 60) {
          if (this.areMiniMaxModelsAvailable())
            return this.logger.logMilestone(
              r,
              "ENGINE_ELEVATED",
              `Extended duration (${c.duration}s) exceeds ACE-Step's 60s window. Seamlessly routing to MiniMax Music-v3 Global LM.`
            ), await this.generate({
              ...e,
              engine: "minimax"
            }, t, i, s);
          this.logger.logMilestone(
            r,
            "DURATION_CLAMPED",
            `ACE-Step 5Hz LM natively supports up to 60s. Clamping from ${c.duration}s to 60s to ensure successful synthesis.`
          ), c.duration = 60, l.duration = 60;
        }
        e.simpleMode !== !1 && !c.isInstrumental && !e.lyrics ? (l.simpleMode = !0, delete l.lyrics) : c.isInstrumental && (l.simpleMode = !1, l.lyrics = "[Instrumental]"), !e.vocalLanguage && !c.isInstrumental && (l.vocalLanguage = "en");
      }
      if (a === "acestep") {
        e.bpm !== void 0 && (l.bpm = e.bpm), e.keyscale && (l.keyscale = e.keyscale), e.timesignature && (l.timesignature = e.timesignature), e.vocalLanguage && (l.vocalLanguage = e.vocalLanguage), e.augmentCaptionWithMetadata && (l.augmentCaptionWithMetadata = !0), l.simpleMode || e.simpleMode ? l.simpleMode = !0 : e.rewriteQuery && (l.rewriteQuery = !0), e.generateLrc && (l.generateLrc = !0), e.computeQualityScore && (l.computeQualityScore = !0), e.normalizeLoudness !== void 0 ? l.normalizeLoudness = e.normalizeLoudness : l.normalizeLoudness = !0;
        const D = !e.ditVariant || e.ditVariant.includes("turbo");
        D ? e.guidanceScale && e.guidanceScale > 1.5 ? (console.warn(`[MusicEngineService] Clamping high guidanceScale (${e.guidanceScale}) to 1.0 on turbo DiT to prevent distortion.`), l.guidanceScale = 1) : l.guidanceScale = e.guidanceScale !== void 0 ? e.guidanceScale : 0 : l.guidanceScale = e.guidanceScale !== void 0 ? e.guidanceScale : 7, D ? e.shift && e.shift < 2 ? (console.warn(`[MusicEngineService] Correcting low shift (${e.shift}) to 3.0 on turbo DiT for acoustic clarity.`), l.shift = 3) : l.shift = e.shift !== void 0 ? e.shift : 3 : l.shift = e.shift !== void 0 ? e.shift : 1, l.dcwEnabled = e.dcwEnabled !== void 0 ? e.dcwEnabled : !0, l.dcwScaler = e.dcwScaler !== void 0 ? e.dcwScaler : 0.05, l.dcwHighScaler = e.dcwHighScaler !== void 0 ? e.dcwHighScaler : 0.02, e.inferenceSteps ? l.inferenceSteps = Math.max(D ? 8 : 30, e.inferenceSteps) : l.inferenceSteps = D ? 10 : 50, e.referenceAudio && (l.referenceAudio = e.referenceAudio), e.taskType && e.taskType !== "text2music" && (l.taskType = e.taskType, e.sourceAudio && (l.sourceAudio = e.sourceAudio), e.taskType === "cover-nofsq" ? (l.audioCoverStrength = 1, l.coverNoiseStrength = e.coverNoiseStrength ?? 0.75) : e.taskType === "lego" && e.track && (l.track = e.track));
      } else
        l.cfgScale = e.cfgScale !== void 0 ? e.cfgScale : 1.8, e.maxFrames !== void 0 && (l.maxFrames = e.maxFrames, delete l.duration), e.inferenceSteps && e.inferenceSteps >= 16 ? l.inferenceSteps = e.inferenceSteps : l.inferenceSteps = 22;
      i == null || i({ text: "▸ Starting QVAC audioGen inference run...", stream: "system" });
      const d = v.audioGen(l);
      this.activeRequestIds.set(r, d.requestId), i == null || i({ text: `▸ Assigned requestId: ${d.requestId}`, stream: "system" }), (async () => {
        const D = /* @__PURE__ */ new Map(), P = (k) => {
          const F = Math.max(0, Math.round(k / 1e3));
          return F >= 60 ? `${Math.floor(F / 60)}m ${F % 60}s` : `${F}s`;
        };
        try {
          for await (const k of d.progressStream) {
            if (s != null && s()) break;
            const F = k.total > 0 ? Math.round(k.step / k.total * 100) : 0;
            let se = k.total > 0 ? `${k.stage}: step ${k.step}/${k.total}` : `${k.stage}: step ${k.step}`;
            D.has(k.stage) || D.set(k.stage, Date.now());
            let de, oe;
            const V = k.total > 12 ? 5 : 2;
            if (k.total > 0 && k.step >= V && k.step < k.total) {
              const ue = (Date.now() - D.get(k.stage)) / k.step * (k.total - k.step);
              de = Math.max(1, Math.round(ue / 1e3)), oe = P(ue), se += ` · ~${oe} remaining`;
            }
            t == null || t({
              taskId: r,
              stage: k.stage,
              step: k.step,
              total: k.total,
              percentage: F,
              message: se,
              etaSeconds: de,
              etaFormatted: oe
            }), i == null || i({ text: `▸ [${k.stage}] ${k.step}/${k.total || "?"}`, stream: "stdout" });
          }
        } catch {
        }
      })();
      const [u, h] = await Promise.all([d.audio, d.stats]);
      this.activeRequestIds.delete(r);
      const f = h == null ? void 0 : h.backendId, p = f === 1 ? "Metal (Apple GPU)" : f === 2 ? "CUDA (GPU)" : f === 0 ? "CPU" : f !== void 0 ? `Backend #${f}` : "Metal (Apple GPU)", b = h == null ? void 0 : h.gpuFallbackReason;
      this.logger.logMilestone(
        r,
        "BACKEND_STATS",
        `Compute Backend: ${p}${b && b !== 0 ? ` (Fallback Reason: ${b})` : ""}`
      ), i == null || i({
        text: `▸ Compute Backend: ${p}`,
        stream: "system"
      });
      const M = h;
      if (M && (M.arMs !== void 0 || M.flowMs !== void 0 || M.totalTimeMs !== void 0)) {
        const D = (k) => typeof k == "number" ? `${(k / 1e3).toFixed(1)}s` : "n/a", P = `total=${D(M.totalTimeMs)} | AR=${D(M.arMs)} | condition=${D(M.conditionMs)} | flow=${D(M.flowMs)} | vocoder=${D(M.vocoderMs)} | frames=${M.emittedFrames ?? "n/a"}${M.emittedFrames ? ` (~${(M.emittedFrames / 25).toFixed(0)}s audio)` : ""} | RTF=${typeof M.realTimeFactor == "number" ? M.realTimeFactor.toFixed(2) : "n/a"}`;
        this.logger.logMilestone(r, "STAGE_TIMINGS", P), i == null || i({ text: `▸ Stage timings: ${P}`, stream: "system" });
      }
      i == null || i({ text: `▸ Synthesis completed! Mastering ${u.pcm.byteLength} raw PCM bytes...`, stream: "system" });
      const { masteredPcm: N, details: x } = fe.getInstance().masterPcm(
        u.pcm,
        u.sampleRate,
        u.channels,
        u.bitsPerSample
      );
      this.logger.logMilestone(r, "DSP_MASTERED", x), i == null || i({ text: `▸ Audio Mastered: ${x}`, stream: "system" });
      const _ = xe(N, u.sampleRate, u.channels, u.bitsPerSample), I = `music-${Date.now()}-${r.slice(0, 8)}.wav`, $ = y.join(this.musicExportsDir, I);
      let T = "";
      try {
        g.writeFileSync($, Buffer.from(_.buffer, _.byteOffset, _.byteLength)), T = `echo-media://${$}`, i == null || i({ text: `▸ Exported WAV saved to: ${$}`, stream: "system" });
      } catch (D) {
        console.warn("[MusicEngineService] Could not write export file, falling back to data URI:", D), T = $e(_);
      }
      const E = Le(u.pcm, u.bitsPerSample, u.channels, 64), L = (h == null ? void 0 : h.audioDurationMs) || Math.round(u.pcm.byteLength / (u.bitsPerSample / 8) / u.channels / u.sampleRate * 1e3), w = h == null ? void 0 : h.metadata, U = {
        id: `music_gen_${Date.now()}`,
        taskId: r,
        caption: (w == null ? void 0 : w.caption) || o,
        lyrics: (w == null ? void 0 : w.lyrics) || e.lyrics,
        audioUrl: T,
        wavFilePath: $,
        durationMs: L,
        sampleRate: u.sampleRate,
        channels: u.channels,
        bitsPerSample: u.bitsPerSample,
        waveform: E,
        bpm: (w == null ? void 0 : w.bpm) ?? e.bpm,
        keyscale: (w == null ? void 0 : w.keyscale) ?? e.keyscale,
        timesignature: w != null && w.beatsPerBar ? `${w.beatsPerBar}/4` : e.timesignature,
        vocalLanguage: (w == null ? void 0 : w.vocalLanguage) ?? e.vocalLanguage,
        isInstrumental: e.isInstrumental ?? l.lyrics === "[Instrumental]",
        seed: (w == null ? void 0 : w.seed) ?? e.seed,
        taskType: e.taskType || "text2music",
        lrc: h == null ? void 0 : h.lrc,
        lyricsScore: h == null ? void 0 : h.lyricsScore,
        qualityScore: h == null ? void 0 : h.qualityScore,
        qualityReport: w == null ? void 0 : w.qualityReport,
        stats: h,
        metadata: w,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return this.logger.logSuccess(r, U), i == null || i({ text: `▸ Music generation finished successfully (${(L / 1e3).toFixed(1)}s)`, stream: "system" }), { success: !0, data: U };
    } catch (n) {
      if (this.activeRequestIds.delete(r), n instanceof v.InferenceCancelledError || s != null && s())
        return console.warn(`[MusicEngineService] Generation cancelled for task ${r}`), this.logger.logMilestone(r, "CANCELLED", "Generation was cancelled by user"), i == null || i({ text: "▸ Music generation cancelled.", stream: "stderr" }), { success: !1, error: "Generation was cancelled." };
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
      }), i == null || i({
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
  async edit(e, t, i, s) {
    const { taskId: r, sourceAudio: o, operations: n } = e;
    if (!o)
      return { success: !1, error: "sourceAudio is required for editing." };
    if (!n || n.length === 0)
      return { success: !1, error: "At least one edit operation is required." };
    try {
      i == null || i({ text: `▸ Starting Audio Edit with ${n.length} operation(s)...`, stream: "system" });
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
          for await (const I of l.progressStream) {
            if (s != null && s()) break;
            const $ = I.total > 0 ? Math.round(I.step / I.total * 100) : 0;
            t == null || t({
              taskId: r,
              stage: I.stage,
              step: I.step,
              total: I.total,
              percentage: $,
              message: `${I.stage}: ${I.step}/${I.total}`
            });
          }
        } catch {
        }
      })();
      const [d, u] = await Promise.all([l.audio, l.stats]);
      this.activeRequestIds.delete(r);
      const { masteredPcm: h } = fe.getInstance().masterPcm(
        d.pcm,
        d.sampleRate,
        d.channels,
        d.bitsPerSample
      ), f = xe(h, d.sampleRate, d.channels, d.bitsPerSample), p = `music-edit-${Date.now()}-${r.slice(0, 8)}.wav`, b = y.join(this.musicExportsDir, p);
      let M = "";
      try {
        g.writeFileSync(b, Buffer.from(f.buffer, f.byteOffset, f.byteLength)), M = `echo-media://${b}`;
      } catch {
        M = $e(f);
      }
      const N = Le(d.pcm, d.bitsPerSample, d.channels, 64), x = (u == null ? void 0 : u.audioDurationMs) || Math.round(d.pcm.byteLength / (d.bitsPerSample / 8) / d.channels / d.sampleRate * 1e3);
      return { success: !0, data: {
        id: `music_edit_${Date.now()}`,
        taskId: r,
        caption: `Edit (${n.map((I) => I.type).join(" + ")})`,
        audioUrl: M,
        wavFilePath: b,
        durationMs: x,
        sampleRate: d.sampleRate,
        channels: d.channels,
        bitsPerSample: d.bitsPerSample,
        waveform: N,
        stats: u,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      } };
    } catch (a) {
      return this.activeRequestIds.delete(r), a instanceof v.InferenceCancelledError || s != null && s() ? { success: !1, error: "Edit was cancelled." } : { success: !1, error: (a == null ? void 0 : a.message) || "Audio edit failed." };
    }
  }
  /**
   * Describes an existing recording using ACE-Step reverse analysis pipeline
   */
  async understand(e, t, i) {
    const { taskId: s, sourceAudio: r, vocalLanguage: o, seed: n } = e;
    if (!r)
      return { success: !1, error: "sourceAudio is required for audio understand." };
    try {
      i == null || i({ text: "▸ Analyzing audio recording with ACE-Step AudioUnderstand...", stream: "system" });
      const c = {
        modelId: await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4" }, t),
        sourceAudio: r,
        ...o && { vocalLanguage: o },
        ...n !== void 0 && { seed: n },
        ...e.lmTemperature !== void 0 && { lmTemperature: e.lmTemperature },
        ...e.lmTopP !== void 0 && { lmTopP: e.lmTopP },
        ...e.lmTopK !== void 0 && { lmTopK: e.lmTopK }
      }, l = v.audioUnderstand(c);
      this.activeRequestIds.set(s, l.requestId), (async () => {
        try {
          for await (const u of l.progressStream) {
            const h = u.total > 0 ? Math.round(u.step / u.total * 100) : 0;
            t == null || t({
              taskId: s,
              stage: u.stage,
              step: u.step,
              total: u.total,
              percentage: h,
              message: `${u.stage}: ${u.step}/${u.total}`
            });
          }
        } catch {
        }
      })();
      const d = await l.description;
      return this.activeRequestIds.delete(s), i == null || i({ text: `▸ Analysis complete! Detected: ${d.bpm} BPM, ${d.keyscale}, ${d.timesignature}`, stream: "system" }), {
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
      return this.activeRequestIds.delete(s), { success: !1, error: (a == null ? void 0 : a.message) || "Audio analysis failed." };
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
      } catch (i) {
        console.warn(`[MusicEngineService] Failed to cancel request ${t}:`, i);
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
    A(this, "activeTasks", /* @__PURE__ */ new Set());
    A(this, "engineService");
    A(this, "historyFilePath");
    A(this, "historyCache", []);
    var e;
    this.engineService = new ft();
    try {
      const t = (e = O) != null && e.getPath ? O.getPath("userData") : process.cwd();
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
        Array.isArray(t) && (this.historyCache = t.map((i) => this.sanitizeItem(i)));
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
  async generateMusic(e, t, i) {
    const { taskId: s } = e;
    this.activeTasks.add(s);
    try {
      const r = await this.engineService.generate(
        e,
        t,
        i,
        () => this.isCancelled(s)
      );
      return r.success && r.data && (this.historyCache.unshift(r.data), this.saveHistoryToDisk()), r;
    } finally {
      this.activeTasks.delete(s);
    }
  }
  async editMusic(e, t, i) {
    const { taskId: s } = e;
    this.activeTasks.add(s);
    try {
      const r = await this.engineService.edit(
        e,
        t,
        i,
        () => this.isCancelled(s)
      );
      return r.success && r.data && (this.historyCache.unshift(r.data), this.saveHistoryToDisk()), r;
    } finally {
      this.activeTasks.delete(s);
    }
  }
  async understandMusic(e, t, i) {
    return this.engineService.understand(e, t, i);
  }
  listHistory() {
    return this.historyCache;
  }
  getHistoryItem(e) {
    return this.historyCache.find((t) => t.id === e || t.taskId === e);
  }
  saveHistoryItem(e) {
    const t = this.historyCache.findIndex((i) => i.id === e.id);
    return t >= 0 ? this.historyCache[t] = e : this.historyCache.unshift(e), this.saveHistoryToDisk(), !0;
  }
  deleteHistoryItem(e) {
    const t = this.historyCache.length;
    return this.historyCache = this.historyCache.filter((i) => i.id !== e), this.historyCache.length !== t ? (this.saveHistoryToDisk(), !0) : !1;
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
class vt extends ne {
  constructor(e, t) {
    super(), this.musicService = e, this.activityRepo = t;
  }
  init() {
    C.handle(
      S.MUSIC_GENERATE,
      async (e, t) => {
        const i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        }, r = await this.musicService.generateMusic(t, i, s);
        if (r.success && r.data) {
          this.saveMusicActivity(r.data);
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_COMPLETE, {
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
          ), s({
            text: `✖ Music Generation Failed: ${r.error}`,
            stream: "stderr"
          });
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_ERROR, {
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
    ), C.handle(
      S.MUSIC_CANCEL,
      async (e, { taskId: t }) => ({ success: this.musicService.cancelGeneration(t), taskId: t })
    ), C.handle(
      S.MUSIC_EDIT,
      async (e, t) => {
        const i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        }, r = await this.musicService.editMusic(t, i, s);
        return r.success && r.data && this.saveMusicActivity(r.data), r;
      }
    ), C.handle(
      S.MUSIC_UNDERSTAND,
      async (e, t) => {
        const i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_PROGRESS, o);
          } catch (n) {
            console.warn("[MusicController] Failed to send progress event:", n);
          }
        }, s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (n) {
            console.warn("[MusicController] Failed to send log event:", n);
          }
        };
        return await this.musicService.understandMusic(t, i, s);
      }
    ), C.handle(S.MUSIC_MODEL_STATUS, async () => ({
      success: !0,
      data: this.musicService.getModelStatus()
    })), C.handle(
      S.MUSIC_ASSESS_FIT,
      async (e, t) => this.musicService.assessFit(t == null ? void 0 : t.engine, t == null ? void 0 : t.ditVariant)
    ), C.handle(S.MUSIC_UNLOAD_MODEL, async () => ({ success: await this.musicService.unloadModel() })), C.handle(S.MUSIC_HISTORY_LIST, async () => ({
      success: !0,
      data: this.musicService.listHistory()
    })), C.handle(
      S.MUSIC_HISTORY_SAVE,
      async (e, t) => {
        const i = this.musicService.saveHistoryItem(t);
        return i && this.saveMusicActivity(t), { success: i };
      }
    ), C.handle(
      S.MUSIC_HISTORY_DELETE,
      async (e, { id: t }) => {
        const i = this.musicService.deleteHistoryItem(t);
        return this.activityRepo && this.activityRepo.deleteActivity(`act-music-${t}`).catch(console.error), { success: i };
      }
    ), C.handle(S.MUSIC_HISTORY_CLEAR, async () => ({ success: this.musicService.clearHistory() })), C.handle(S.MUSIC_GET_LOGS, async (e, t) => ({ success: !0, data: this.musicService.getGenerationLogs(t) })), C.handle(S.MUSIC_CLEAR_LOGS, async () => ({ success: this.musicService.clearGenerationLogs() })), C.handle(
      S.MUSIC_GENERATE_LYRICS,
      async (e, t) => {
        const i = t.taskId || `lyric_task_${Date.now()}`, s = (r) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MUSIC_LYRICS_TOKEN, { taskId: i, token: r });
          } catch {
          }
        };
        try {
          const r = await ye.getInstance().generateLyricsStream(t.prompt, s);
          return { success: !0, lyrics: r.lyrics, engine: r.engine, taskId: i };
        } catch (r) {
          return console.error("[MusicController] Error generating lyrics with Qwen:", r), { success: !1, error: (r == null ? void 0 : r.message) || "Failed to generate lyrics", taskId: i };
        }
      }
    );
  }
  saveMusicActivity(e) {
    if (!this.activityRepo) return;
    const t = e.caption || "Music Track", i = t.length > 50 ? `${t.slice(0, 47)}...` : t, s = e.wavFilePath ? `echo-media://${e.wavFilePath}` : e.audioUrl && e.audioUrl.length > 5e4 ? "" : e.audioUrl;
    this.activityRepo.saveActivity({
      id: `act-music-${e.id}`,
      type: "music",
      title: i,
      description: e.lyrics ? e.lyrics.slice(0, 160) : e.caption,
      category: "Music Generation",
      subCategory: "AudioGen",
      originId: e.id,
      originType: "music",
      metadata: {
        taskId: e.taskId,
        caption: e.caption,
        lyrics: e.lyrics,
        audioUrl: s,
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
class pt {
  constructor(e, t) {
    A(this, "db");
    A(this, "musicService");
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
    const i = e.conversation ? {
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
    let s;
    if (e.type === "music") {
      const a = e.originId || e.id.replace(/^act-music-/, "").replace(/^act-/, ""), c = (n = this.musicService) == null ? void 0 : n.getHistoryItem(a), l = (c == null ? void 0 : c.wavFilePath) || (t == null ? void 0 : t.wavFilePath);
      let d = l ? `echo-media://${l}` : (c == null ? void 0 : c.audioUrl) || (t == null ? void 0 : t.audioUrl);
      d && d.startsWith("data:") && d.length > 5e4 && (d = void 0), s = {
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
    const o = i || s || r || (t ? { ...t } : void 0);
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
      tts: i,
      music: s,
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
      for (const s of e) {
        const r = s;
        r.conversationId && t.add(r.conversationId), r.originId && t.add(r.originId);
      }
      const i = await this.db.client.conversation.findMany({
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
      for (const s of i) {
        const o = (s.previewSnippet || s.text || "").replace(/\s+/g, " ").trim(), n = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${s.voiceName || "Speech Synthesis"} Turn`;
        let a = n, c = 1;
        for (; await this.db.client.activity.findUnique({ where: { title: a } }); )
          c++, a = `${n} #${c}`;
        const l = JSON.stringify({
          model: s.model,
          engine: s.engine,
          duration: s.duration,
          durationSec: s.durationSec,
          emotion: s.emotion,
          audioUrl: s.audioUrl,
          waveform: s.waveform ? JSON.parse(s.waveform) : [],
          speakerCount: s.speakerCount
        });
        await this.db.client.activity.create({
          data: {
            id: `act-${s.id}`,
            type: "tts",
            title: a,
            category: "Text to Speech",
            subCategory: s.speakerCount > 1 ? `${s.speakerCount} Speakers Diarized` : s.voiceName,
            description: o ? o.slice(0, 160) : null,
            originId: s.id,
            originType: "conversation",
            conversationId: s.id,
            metadata: l
          }
        });
      }
      if (this.musicService) {
        const s = this.musicService.listHistory();
        for (const r of s) {
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
      let i = e.title.trim(), s = 1, r = !1;
      for (; !r; ) {
        const a = await this.db.client.activity.findUnique({
          where: { title: i }
        });
        !a || a.id === e.id ? r = !0 : (s++, i = `${e.title.trim()} #${s}`);
      }
      const o = e.category || (e.type === "music" ? "Music Generation" : "Text to Speech"), n = await this.db.client.activity.upsert({
        where: { id: e.id },
        update: {
          type: e.type,
          title: i,
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
          title: i,
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
class St extends ne {
  constructor(e) {
    super(), this.activityRepo = e;
  }
  init() {
    C.handle(S.ACTIVITY_LIST, async () => {
      try {
        return { success: !0, data: await this.activityRepo.listActivities() };
      } catch (e) {
        return { success: !1, error: e instanceof Error ? e.message : String(e) };
      }
    }), C.handle(S.ACTIVITY_GET, async (e, t) => {
      try {
        const i = typeof t == "string" ? t : t.id;
        return { success: !0, data: await this.activityRepo.getActivityById(i) };
      } catch (i) {
        return { success: !1, error: i instanceof Error ? i.message : String(i) };
      }
    }), C.handle(
      S.ACTIVITY_GET_BY_ORIGIN,
      async (e, t) => {
        try {
          const i = typeof t == "string" ? t : t.originId;
          return { success: !0, data: await this.activityRepo.getActivityByOrigin(i) };
        } catch (i) {
          return { success: !1, error: i instanceof Error ? i.message : String(i) };
        }
      }
    ), C.handle(S.ACTIVITY_SAVE, async (e, t) => {
      try {
        return await this.activityRepo.saveActivity(t);
      } catch (i) {
        return { success: !1, error: i instanceof Error ? i.message : String(i) };
      }
    }), C.handle(S.ACTIVITY_DELETE, async (e, t) => {
      try {
        const i = typeof t == "string" ? t : t.id;
        return await this.activityRepo.deleteActivity(i);
      } catch (i) {
        return { success: !1, error: i instanceof Error ? i.message : String(i) };
      }
    });
  }
}
const wt = Ke(import.meta.url), { PrismaClient: Tt } = wt("@prisma/client");
class Mt {
  constructor() {
    A(this, "prisma");
    A(this, "initialized", !1);
    A(this, "initPromise", null);
    const t = (O ? O.isPackaged : !1) ? O.getPath("userData") : y.join(process.cwd(), "prisma");
    g.existsSync(t) || g.mkdirSync(t, { recursive: !0 });
    const i = y.join(t, "echo.db"), s = `file:${i}`;
    process.env.DATABASE_URL = s, console.log(`[DatabaseService] SQLite DB initialized at: ${i}`), this.prisma = new Tt({
      datasources: {
        db: {
          url: s
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
function Et() {
  const m = new Mt(), e = new Ze(), t = new Ie(), i = new yt(), s = new st(m), r = new mt(m), o = new pt(m, i), n = new it(s), a = new ht(t, r), c = [
    new et(e),
    new tt(t),
    new rt(n),
    new gt(a),
    new vt(i, o),
    new St(o)
  ];
  for (const l of c)
    l.init();
  return {
    systemService: e,
    modelsService: t,
    voiceService: n,
    ttsService: a,
    musicService: i,
    activityRepository: o,
    dbService: m,
    controllers: c
  };
}
Ne.registerSchemesAsPrivileged([
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
const Re = y.dirname(Qe(import.meta.url));
process.env.APP_ROOT = y.join(Re, "..");
const be = process.env.VITE_DEV_SERVER_URL, Nt = y.join(process.env.APP_ROOT, "dist-electron"), Fe = y.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = be ? y.join(process.env.APP_ROOT, "public") : Fe;
const Ut = Et();
let j = null;
function Pe() {
  j = new Ue({
    icon: y.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: y.join(Re, "preload.mjs")
    }
  }), j.webContents.on("console-message", (m, ...e) => {
    if (typeof m == "object" && m !== null && "message" in m) {
      const t = m.sourceId ? y.basename(m.sourceId) : "renderer";
      console.log(`[Renderer ${t}:${m.lineNumber}] ${m.message}`);
    } else {
      const [t, i, s, r] = e, o = r ? y.basename(r) : "renderer";
      console.log(`[Renderer ${o}:${s}] ${i}`);
    }
  }), j.webContents.on("render-process-gone", (m, e) => {
    console.error("[Renderer Crashed]:", e);
  }), j.webContents.on("did-finish-load", () => {
    j == null || j.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), be ? j.loadURL(be) : j.loadFile(y.join(Fe, "index.html"));
}
O.on("window-all-closed", () => {
  process.platform !== "darwin" && (O.quit(), j = null);
});
O.on("activate", () => {
  Ue.getAllWindows().length === 0 && Pe();
});
O.whenReady().then(() => {
  Ne.handle("echo-media", async (m) => {
    try {
      const e = m.url.replace(/^echo-media:\/\//, "");
      let t = decodeURIComponent(e.startsWith("/") ? e : "/" + e);
      if (process.platform === "win32" && t.startsWith("/") && (t = t.slice(1)), !g.existsSync(t))
        return new Response("Media not found", { status: 404 });
      const i = g.statSync(t).size, s = t.endsWith(".mp3") ? "audio/mpeg" : t.endsWith(".wav") ? "audio/wav" : "application/octet-stream", r = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Accept-Ranges": "bytes",
        "Content-Type": s
      }), o = m.headers.get("range"), n = o ? /bytes=(\d*)-(\d*)/.exec(o) : null;
      let a = 0, c = i - 1, l = 200;
      if (n && (n[1] !== "" || n[2] !== "")) {
        if (n[1] === "" ? a = Math.max(0, i - parseInt(n[2], 10)) : (a = parseInt(n[1], 10), n[2] !== "" && (c = Math.min(c, parseInt(n[2], 10)))), a >= i || a > c)
          return r.set("Content-Range", `bytes */${i}`), new Response(null, { status: 416, headers: r });
        l = 206, r.set("Content-Range", `bytes ${a}-${c}/${i}`);
      }
      if (r.set("Content-Length", String(c - a + 1)), m.method === "HEAD")
        return new Response(null, { status: l, headers: r });
      const d = Ye.toWeb(
        g.createReadStream(t, { start: a, end: c })
      );
      return new Response(d, { status: l, headers: r });
    } catch (e) {
      return console.error("[echo-media protocol] Error loading media:", e), new Response("Error loading media", { status: 500 });
    }
  }), Pe();
});
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  Nt as MAIN_DIST,
  Fe as RENDERER_DIST,
  be as VITE_DEV_SERVER_URL,
  Ut as core
};
