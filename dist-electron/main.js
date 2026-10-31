var Ri = Object.defineProperty;
var Pi = (t, e, r) => e in t ? Ri(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r;
var b = (t, e, r) => Pi(t, typeof e != "symbol" ? e + "" : e, r);
import E from "node:path";
import y from "node:fs";
import { app as Y, shell as Di, ipcMain as z, protocol as yn, BrowserWindow as vn } from "electron";
import { fileURLToPath as Li } from "node:url";
import { Readable as xi } from "node:stream";
import X from "node:os";
import * as A from "@qvac/sdk";
import { GEMMA4_4B_MULTIMODAL_Q6_K as zi, loadModel as mt, getModelInfo as pt, completion as Ui, unloadModel as Cr, GEMMA4_2B_MULTIMODAL_Q6_K as Fi, TTS_ENHANCER_LAVASR_FP16 as Ar, TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32 as ji, TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16 as Bi, TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 as Gi, textToSpeech as Mr } from "@qvac/sdk";
import { execFileSync as Vi } from "node:child_process";
import { createRequire as Zi } from "node:module";
process.env.QVAC_RPC_INIT_TIMEOUT_MS || (process.env.QVAC_RPC_INIT_TIMEOUT_MS = "120000");
const Wi = [
  E.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js")
];
for (const t of Wi)
  if (y.existsSync(t)) {
    try {
      process.env.QVAC_WORKER_PATH = y.realpathSync(t);
    } catch {
      process.env.QVAC_WORKER_PATH = t;
    }
    break;
  }
class qi {
  constructor() {
    b(this, "prevCpuTimes", null);
  }
  /**
   * Calculate live CPU usage from os.cpus()
   */
  getCpuUsage() {
    const e = X.cpus();
    let r = 0, n = 0;
    for (const a of e) {
      for (const c of Object.keys(a.times))
        n += a.times[c];
      r += a.times.idle;
    }
    if (!this.prevCpuTimes)
      return this.prevCpuTimes = { idle: r, total: n }, 14;
    const i = r - this.prevCpuTimes.idle, s = n - this.prevCpuTimes.total;
    if (this.prevCpuTimes = { idle: r, total: n }, s <= 0) return 14;
    const o = Math.round((s - i) / s * 100);
    return Math.max(1, Math.min(100, o));
  }
  /**
   * Query full hardware telemetry (RAM, CPU, GPU)
   */
  getMetrics() {
    var h;
    const e = X.totalmem(), r = X.freemem(), n = Math.max(0, e - r), i = n / e * 100, s = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2), o = Math.max(5, Math.min(99, Math.round(i + s))), a = this.getCpuUsage(), c = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1)), l = Math.max(3, Math.min(98, Math.round(a + c)));
    let u = 12;
    try {
      const p = Y.getAppMetrics().find((g) => g.type === "GPU");
      if (p)
        u = Math.min(100, Math.max(8, Math.round(p.cpu.percentCPUUsage * 2 + 10)));
      else {
        const g = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
        u = Math.max(6, Math.min(94, Math.round(l * 0.7 + 8 + g)));
      }
    } catch {
      u = Math.max(6, Math.min(94, Math.round(l * 0.7 + 8)));
    }
    return {
      ram: {
        usedGB: (n / (1024 * 1024 * 1024) + s * 0.1).toFixed(1),
        totalGB: (e / (1024 * 1024 * 1024)).toFixed(1),
        percent: o
      },
      cpu: {
        percent: l,
        cores: X.cpus().length,
        model: ((h = X.cpus()[0]) == null ? void 0 : h.model) || "Processor"
      },
      gpu: {
        percent: u,
        name: process.platform === "darwin" ? "Apple Silicon GPU" : "GPU Compute"
      }
    };
  }
  /**
   * Ensure exports directory exists and reveal it in native file manager
   */
  async openExportsFolder() {
    try {
      const e = E.join(Y.getPath("documents"), "Echo", "Exports");
      return y.existsSync(e) || y.mkdirSync(e, { recursive: !0 }), await Di.openPath(e), { success: !0, path: e };
    } catch (e) {
      return console.error("[SystemService] Failed to open exports directory:", e), { success: !1, error: String(e) };
    }
  }
}
class Le {
}
const $ = {
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
  // Story generation domain (Gemma 4 narrative orchestration & CosyVoice 3 natural audio)
  STORY_GENERATE: "story:generate",
  STORY_CANCEL: "story:cancel",
  STORY_PROGRESS: "story:progress",
  STORY_COMPLETE: "story:complete",
  STORY_ERROR: "story:error",
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
class Yi extends Le {
  constructor(e) {
    super(), this.systemService = e;
  }
  init() {
    z.handle($.SYSTEM_GET_METRICS, async () => this.systemService.getMetrics()), z.handle($.LEGACY_GET_SYSTEM_METRICS, async () => this.systemService.getMetrics()), z.handle($.SYSTEM_OPEN_EXPORTS, async () => this.systemService.openExportsFolder()), z.handle($.LEGACY_OPEN_EXPORTS_FOLDER, async () => this.systemService.openExportsFolder());
  }
}
class ir {
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
      },
      // Story Generation & Narrative Engine Models
      {
        id: "gemma-4-4b-multimodal-q6_k",
        name: "Gemma 4 Multimodal 4B (Q6_K GGUF)",
        descriptorName: "GEMMA4_4B_MULTIMODAL_Q6_K",
        sizeBytes: 341e7,
        sizeFormatted: "3.41 GB",
        description: "Local Gemma 4 multimodal model for multi-agent narrative orchestration, world building, and dialogue generation.",
        category: "lm",
        engine: "story",
        required: !0
      }
    ]);
    this.cacheDir = E.join(X.homedir(), ".qvac", "models");
    const e = Y ? Y.getPath("userData") : E.join(X.homedir(), ".echo-ai");
    if (!y.existsSync(e))
      try {
        y.mkdirSync(e, { recursive: !0 });
      } catch {
      }
    this.stateFilePath = E.join(e, "voice_engine_state.json"), this.loadState();
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
    for (const r of this.downloadedModelIds)
      if (r === e || r.startsWith(e) || e.startsWith(r) && !e.startsWith("minimax-"))
        return !0;
    return !1;
  }
  /**
   * Load persisted downloaded model status and discover cached weights
   */
  loadState() {
    try {
      if (y.existsSync(this.stateFilePath)) {
        const e = y.readFileSync(this.stateFilePath, "utf-8"), r = JSON.parse(e);
        Array.isArray(r.downloadedModelIds) && (this.downloadedModelIds = new Set(r.downloadedModelIds));
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
      y.writeFileSync(this.stateFilePath, JSON.stringify(e, null, 2), "utf-8");
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
      if (y.existsSync(this.cacheDir)) {
        const r = /* @__PURE__ */ new Set(), n = (o, a) => {
          const c = a.toLowerCase();
          if (c.endsWith(".download") || c.endsWith(".tmp") || c.endsWith(".partial") || c.endsWith(".crdownload"))
            return;
          let l = null;
          try {
            l = y.statSync(o);
          } catch {
            return;
          }
          l.isFile() && l.size > 1024 * 1024 && (c.includes("parler-large-v1-f16") || c.includes("parler-large-v1-fp16") ? r.add("chatterbox-t3-turbo-q8_0") : c.includes("chatterbox-s3gen-q8") || c.includes("chatterbox-s3gen") ? r.add("chatterbox-s3gen-q8_0") : c.includes("chatterbox-t3-multilingual") ? r.add("chatterbox-t3-multilingual-q8_0") : c.includes("chatterbox-s3gen-multilingual") ? r.add("chatterbox-s3gen-multilingual-q8_0") : (c.includes("chatterbox-t3") || c.includes("chatterbox")) && r.add("chatterbox-t3-turbo-q8_0"), (c.includes("cosyvoice3-llm") || c.includes("cosy_voice")) && r.add("cosyvoice3-llm-q8_0"), (c.includes("cosyvoice3-flow-f16") || c.includes("cosyvoice3-flow-fp16") || c.includes("cosyvoice3-flow-f32") || c.includes("cosyvoice3-flow")) && r.add("cosyvoice3-flow-fp16"), (c.includes("lavasr") || c.includes("enhancer")) && r.add("lavasr-enhancer"), (c.includes("cosyvoice3-s3tok") || c.includes("s3tok")) && r.add("cosyvoice3-s3tok-fp16"), (c.includes("cosyvoice3-campplus") || c.includes("campplus")) && r.add("cosyvoice3-campplus-fp32"), (c.includes("qwen3-embedding") || c.includes("qwen3_embedding")) && r.add("audiogen-qwen3-embedding"), (c.includes("acestep-5hz") || c.includes("acestep_5hz")) && r.add("audiogen-acestep-5hz-lm"), (c.includes("acestep-v15-turbo") || c.includes("acestep_v15_turbo") || c.includes("turbo-q4_k_m")) && r.add("audiogen-acestep-turbo-dit"), (c.includes("vae-bf16") || c.includes("audiogen-vae") || c.includes("audiogen_vae")) && r.add("audiogen-vae-bf16"), (c.includes("mm3-lm") || c.includes("minimax") && (c.includes("transformer") || c.includes("lm"))) && !c.includes("vocoder") && !c.includes("synth") && r.add("minimax-music-v3-transformer"), (c.includes("mm3-synth") || c.includes("minimax") && (c.includes("vocoder") || c.includes("synth"))) && !c.includes("transformer") && !c.includes("lm") && r.add("minimax-music-vocoder"), (c.includes("qwen3-1.7b") || c.includes("qwen3_1.7b") || c.includes("qwen3-1_7b") || c.includes("qwen3-1-7b")) && c.endsWith(".gguf") && r.add("qwen3-1.7b-lyric-generator"));
        }, i = y.readdirSync(this.cacheDir);
        for (const o of i) {
          const a = E.join(this.cacheDir, o);
          n(a, o);
        }
        const s = E.join(this.cacheDir, "sets");
        if (y.existsSync(s)) {
          const o = y.readdirSync(s);
          for (const a of o) {
            const c = E.join(s, a);
            try {
              if (y.existsSync(c)) {
                const l = y.readdirSync(c);
                for (const u of l) {
                  const d = E.join(c, u);
                  n(d, u);
                }
              }
            } catch {
            }
          }
        }
        for (const o of r)
          this.downloadedModelIds.has(o) || (this.downloadedModelIds.add(o), e = !0);
        for (const o of Array.from(this.downloadedModelIds))
          (o.startsWith("minimax-") || o.startsWith("audiogen-") || o.startsWith("qwen3-")) && !r.has(o) && (this.downloadedModelIds.delete(o), e = !0);
      }
    } catch (r) {
      console.warn("[ModelsService] Error syncing cache from disk:", r);
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
    const r = this.modelDefinitions.map((i) => {
      const s = this.downloadedModelIds.has(i.id), o = this.activeDownloads.has(i.id), a = e ? e === "story" ? i.engine === "story" || i.engine === "cosyvoice3" && i.id !== "cosyvoice3-flow-fp16" || i.id === "lavasr-enhancer" : e === "cosyvoice3" ? i.engine === "cosyvoice3" && i.id !== "cosyvoice3-flow-fp16" || i.engine === "shared" : e === "chatterbox" ? i.engine === "chatterbox" && (i.id === "chatterbox-t3-turbo-q8_0" || i.id === "chatterbox-s3gen-q8_0") : i.engine === e : i.category === "backbone";
      return {
        ...i,
        required: a,
        downloaded: s,
        status: o ? "downloading" : s ? "ready" : "idle"
      };
    });
    let n = !1;
    if (e === "chatterbox") {
      const i = r.some(
        (o) => o.engine === "chatterbox" && o.category === "backbone" && o.downloaded
      ), s = r.some(
        (o) => o.engine === "chatterbox" && o.category === "vocoder" && o.downloaded
      );
      n = i && s;
    } else {
      const i = e ? r.filter((s) => s.required) : r.filter((s) => s.category === "backbone");
      n = i.length > 0 && i.every((s) => s.downloaded);
    }
    return {
      ready: n,
      allRequiredDownloaded: n,
      models: r,
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
  async downloadModel(e, r) {
    const n = this.modelDefinitions.find((a) => a.id === e);
    if (!n)
      return { success: !1, modelId: e, error: `Unknown model ID: ${e}` };
    if (this.syncCacheFromDisk(), this.downloadedModelIds.has(e))
      return r == null || r({
        modelId: e,
        percentage: 100,
        downloaded: n.sizeBytes,
        total: n.sizeBytes,
        speed: "Ready"
      }), { success: !0, modelId: e };
    if (n.engine === "minimax")
      return await this.downloadMiniMaxModel(e, n, r);
    let i = !1, s = 0, o = n.sizeBytes;
    this.activeDownloads.set(e, {
      cancel: () => {
        i = !0;
      }
    });
    try {
      const c = A[n.descriptorName] || null;
      if (!c || typeof A.downloadAsset != "function")
        return {
          success: !1,
          modelId: e,
          error: `No asset descriptor found for ${e} (${n.descriptorName})`
        };
      let l = null;
      for (let u = 1; u <= 2; u++)
        try {
          const d = A.downloadAsset({
            assetSrc: c,
            onProgress: (h) => {
              var R, M, O, x, C, I, P, N;
              if (i) return;
              const f = ((R = h.fileSetInfo) == null ? void 0 : R.overallPercentage) ?? ((M = h.shardInfo) == null ? void 0 : M.overallPercentage) ?? (h.fileSetInfo || h.shardInfo ? 0 : h.percentage ?? 0), p = ((O = h.fileSetInfo) == null ? void 0 : O.overallTotal) ?? ((x = h.shardInfo) == null ? void 0 : x.overallTotal) ?? h.total ?? n.sizeBytes;
              o = p;
              const g = ((C = h.fileSetInfo) == null ? void 0 : C.overallDownloaded) ?? ((I = h.shardInfo) == null ? void 0 : I.overallDownloaded) ?? h.downloaded ?? Math.round((f || 0) / 100 * p), v = Math.min(99, Math.max(1, Math.round(f || 0)));
              s = Math.max(s, v);
              let S = h.speed || "Downloading...";
              (P = h.fileSetInfo) != null && P.currentFile ? S = `${h.fileSetInfo.currentFile} (${h.fileSetInfo.fileIndex}/${h.fileSetInfo.totalFiles})` : (N = h.shardInfo) != null && N.shardName && (S = `${h.shardInfo.shardName} (${h.shardInfo.currentShard}/${h.shardInfo.totalShards})`);
              const _ = g >= p && p > 0 || f >= 100;
              _ && (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState()), r == null || r({
                modelId: e,
                percentage: _ ? 100 : s,
                downloaded: g,
                total: p,
                speed: _ ? "Completed" : S
              });
            }
          });
          d && d.requestId && this.activeDownloads.set(e, {
            cancel: () => {
              i = !0;
              try {
                typeof A.cancel == "function" && A.cancel({
                  requestId: d.requestId
                });
              } catch {
              }
            }
          }), await d, l = null;
          break;
        } catch (d) {
          if (l = d, String((d == null ? void 0 : d.message) || d).includes("could not be locked") && u === 1 && !i) {
            console.warn(`[ModelsService] Registry lock conflict for ${e}. Retrying in 1.2s...`), await new Promise((f) => setTimeout(f, 1200));
            continue;
          }
          throw d;
        }
      if (l) throw l;
      return i ? { success: !1, modelId: e, error: "Download cancelled" } : (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), r == null || r({
        modelId: e,
        percentage: 100,
        downloaded: o,
        total: o,
        speed: "Completed"
      }), { success: !0, modelId: e });
    } catch (a) {
      return console.error(`[ModelsService] Download error for ${e}:`, a), { success: !1, modelId: e, error: String(a) };
    } finally {
      this.activeDownloads.delete(e);
    }
  }
  /**
   * Cancel an in-flight download
   */
  cancelDownload(e) {
    const r = this.activeDownloads.get(e);
    return r ? (r.cancel(), this.activeDownloads.delete(e), !0) : !1;
  }
  /**
   * Delete all installed models from disk and reset internal state
   */
  async deleteAllModels() {
    for (const [e, r] of this.activeDownloads.entries()) {
      try {
        r.cancel();
      } catch {
      }
      this.activeDownloads.delete(e);
    }
    this.downloadedModelIds.clear(), this.saveState();
    try {
      if (y.existsSync(this.cacheDir)) {
        const e = y.readdirSync(this.cacheDir);
        for (const r of e) {
          const n = E.join(this.cacheDir, r);
          try {
            y.statSync(n).isDirectory() ? y.rmSync(n, { recursive: !0, force: !0 }) : y.unlinkSync(n);
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
    return A.getModelInfo({ name: e });
  }
  /**
   * Directly downloads MiniMax-Music3 GGUF models from Hugging Face repository
   * with streaming progress, real byte metrics, and cancellation support.
   */
  async downloadMiniMaxModel(e, r, n) {
    const s = {
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
    if (!s)
      return { success: !1, modelId: e, error: `Unknown MiniMax model: ${e}` };
    if (!y.existsSync(this.cacheDir))
      try {
        y.mkdirSync(this.cacheDir, { recursive: !0 });
      } catch (d) {
        return { success: !1, modelId: e, error: `Failed to create cache directory: ${d}` };
      }
    const o = E.join(this.cacheDir, s.filename), a = E.join(this.cacheDir, `${s.filename}.download`);
    try {
      if (y.existsSync(o)) {
        const f = y.statSync(o);
        if (f.size > 1024 * 1024)
          return this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), n == null || n({
            modelId: e,
            percentage: 100,
            downloaded: f.size,
            total: f.size,
            speed: "Ready"
          }), { success: !0, modelId: e };
      }
      const h = y.readdirSync(this.cacheDir).find((f) => f.toLowerCase().endsWith(s.filename.toLowerCase()));
      if (h) {
        const f = y.statSync(E.join(this.cacheDir, h));
        if (f.size > 1024 * 1024)
          return this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), n == null || n({
            modelId: e,
            percentage: 100,
            downloaded: f.size,
            total: f.size,
            speed: "Ready"
          }), { success: !0, modelId: e };
      }
    } catch {
    }
    const c = new AbortController();
    let l = !1;
    if (this.activeDownloads.set(e, {
      cancel: () => {
        l = !0, c.abort();
      }
    }), y.existsSync(a))
      try {
        y.unlinkSync(a);
      } catch {
      }
    let u = null;
    try {
      const d = await fetch(s.url, {
        signal: c.signal,
        redirect: "follow"
      });
      if (!d.ok || !d.body)
        throw new Error(`Failed to fetch ${s.url}: HTTP ${d.status} ${d.statusText}`);
      const h = d.headers.get("content-length"), f = h ? parseInt(h, 10) : r.sizeBytes;
      u = y.createWriteStream(a);
      const p = d.body.getReader();
      let g = 0, v = Date.now(), S = 0, _ = "Starting...";
      for (n == null || n({
        modelId: e,
        percentage: 1,
        downloaded: 0,
        total: f,
        speed: _
      }); ; ) {
        if (l)
          throw new Error("Download cancelled");
        const { done: x, value: C } = await p.read();
        if (x) break;
        if (C && C.length > 0) {
          const I = u.write(Buffer.from(C));
          g += C.length, I || await new Promise((F) => u.once("drain", F));
          const P = Date.now(), N = P - v;
          if (N >= 400 || g >= f) {
            const F = g - S, L = N / 1e3;
            _ = `${(F / Math.max(0.1, L) / (1024 * 1024)).toFixed(1)} MB/s`, v = P, S = g;
            const J = f > 0 ? Math.min(99, Math.max(1, Math.round(g / f * 100))) : 0;
            n == null || n({
              modelId: e,
              percentage: J,
              downloaded: g,
              total: f,
              speed: _
            });
          }
        }
      }
      if (await new Promise((x, C) => {
        if (!u) return x();
        u.on("finish", x), u.on("error", C), u.end();
      }), u = null, l)
        throw new Error("Download cancelled");
      const R = y.statSync(a);
      if (R.size < 1024 * 1024)
        throw new Error(`Downloaded file size (${R.size} bytes) is too small. Corrupt or incomplete download.`);
      const M = y.openSync(a, "r"), O = Buffer.alloc(4);
      if (y.readSync(M, O, 0, 4, 0), y.closeSync(M), O.toString("ascii") !== "GGUF")
        throw new Error(`Downloaded file is not a valid GGUF binary (magic: ${O.toString("ascii")})`);
      if (y.existsSync(o))
        try {
          y.unlinkSync(o);
        } catch {
        }
      return y.renameSync(a, o), this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), n == null || n({
        modelId: e,
        percentage: 100,
        downloaded: f,
        total: f,
        speed: "Completed"
      }), { success: !0, modelId: e };
    } catch (d) {
      if (u)
        try {
          u.destroy();
        } catch {
        }
      if (y.existsSync(a))
        try {
          y.unlinkSync(a);
        } catch {
        }
      this.downloadedModelIds.delete(e), this.saveState();
      const h = l || (d == null ? void 0 : d.name) === "AbortError" || String(d).includes("cancelled");
      return {
        success: !1,
        modelId: e,
        error: h ? "Download cancelled" : (d == null ? void 0 : d.message) || String(d)
      };
    } finally {
      this.activeDownloads.delete(e);
    }
  }
}
class Hi extends Le {
  constructor(e) {
    super(), this.modelsService = e;
  }
  init() {
    z.handle(
      $.MODELS_GET_STATUS,
      async (e, r) => {
        try {
          return { success: !0, data: this.modelsService.getStatus(r == null ? void 0 : r.engine) };
        } catch (n) {
          return { success: !1, error: String(n) };
        }
      }
    ), z.handle(
      $.MODELS_DOWNLOAD,
      async (e, r) => {
        const n = (i) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.MODELS_DOWNLOAD_PROGRESS, i);
          } catch (s) {
            console.warn("[ModelsController] Failed to send download progress:", s);
          }
        };
        if (r != null && r.allRequired) {
          const s = this.modelsService.getStatus(r == null ? void 0 : r.engine).models.filter((o) => o.required && !o.downloaded);
          for (const o of s)
            await this.modelsService.downloadModel(o.id, n);
          return { success: !0, data: this.modelsService.getStatus(r == null ? void 0 : r.engine) };
        }
        return r != null && r.modelId ? { ...await this.modelsService.downloadModel(r.modelId, n), data: this.modelsService.getStatus(r == null ? void 0 : r.engine) } : { success: !1, error: "No modelId or allRequired flag specified" };
      }
    ), z.handle(
      $.MODELS_CANCEL_DOWNLOAD,
      async (e, { modelId: r }) => ({ success: this.modelsService.cancelDownload(r), modelId: r })
    ), z.handle(
      $.MODELS_GET_INFO,
      async (e, { name: r }) => {
        try {
          return { success: !0, data: await this.modelsService.getModelInfo(r) };
        } catch (n) {
          return { success: !1, error: String(n) };
        }
      }
    ), z.handle($.MODELS_DELETE_ALL, async () => {
      try {
        return await this.modelsService.deleteAllModels(), { success: !0 };
      } catch (e) {
        return { success: !1, error: String(e) };
      }
    });
  }
}
class Ji {
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
    const e = process.env.VITE_PUBLIC || E.join(process.cwd(), "public"), r = [
      E.join(e, "voices", "samples"),
      E.join(process.cwd(), "public", "voices", "samples"),
      E.join(Y.getAppPath(), "public", "voices", "samples"),
      E.join(Y.getAppPath(), "dist", "voices", "samples")
    ];
    for (const n of r)
      if (y.existsSync(n))
        return n;
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
      const r = y.readdirSync(e, { withFileTypes: !0 }), n = [];
      for (const i of r) {
        if (!i.isDirectory()) continue;
        const s = E.join(e, i.name), o = E.join(s, "info.json"), a = E.join(s, "json.info"), c = y.existsSync(o) ? o : y.existsSync(a) ? a : null;
        if (c)
          try {
            const l = y.readFileSync(c, "utf-8"), u = JSON.parse(l), d = u.list || u.location || (y.existsSync(E.join(s, "json", "voices.json")) ? "json/voices.json" : "voices.json");
            n.push({
              folder: i.name,
              language: u.language || i.name,
              name: u.name || u.language || i.name,
              flag: u.flag || "🌐",
              code: u.code || i.name,
              nativeName: u.nativeName || u.name || u.language,
              list: d,
              location: d,
              listUrl: `/voices/samples/${i.name}/${d.replace(/^\//, "")}`,
              count: u.count || 0
            });
          } catch (l) {
            console.warn(`[VoiceService] Failed to parse info.json in ${s}:`, l);
          }
      }
      return { success: !0, packages: n };
    } catch (e) {
      return console.error("[VoiceService] Failed to scan voice samples:", e), { success: !1, packages: [], error: String(e) };
    }
  }
  /**
   * Load voices directly from disk for a given language folder
   */
  loadVoicesForPackage(e, r = "json/voices.json") {
    try {
      const n = this.getSamplesDirectory();
      if (!n)
        return { success: !1, voices: [], error: "Samples directory not found" };
      const i = r.replace(/^\//, ""), o = [
        E.join(n, e, i),
        E.join(n, e, "json", "voices.json"),
        E.join(n, e, "voices.json")
      ].find((u) => y.existsSync(u));
      if (!o)
        return { success: !1, voices: [], error: `Voice list not found for folder ${e}` };
      const a = y.readFileSync(o, "utf-8"), c = JSON.parse(a);
      return { success: !0, voices: Array.isArray(c) ? c : c.voices || [] };
    } catch (n) {
      return console.error(`[VoiceService] Failed to load voices for ${e}:`, n), { success: !1, voices: [], error: String(n) };
    }
  }
  /**
   * Resolve or create the custom voices directory inside public/voices/custom
   */
  getCustomVoicesDirectory() {
    const e = process.env.VITE_PUBLIC || E.join(process.cwd(), "public"), r = E.join(e, "voices", "custom");
    return y.existsSync(r) || y.mkdirSync(r, { recursive: !0 }), r;
  }
  /**
   * Saves an imported or microphone-recorded voice audio sample directly to disk
   * and converts it to a standard 24kHz mono WAV for CosyVoice 3 reference conditioning.
   */
  async saveCustomVoice(e) {
    try {
      const r = this.getCustomVoicesDirectory(), n = (e.fileName || "sample.wav").replace(/[^a-zA-Z0-9._-]/g, "_"), i = E.extname(n).toLowerCase() || ".wav", s = Date.now(), o = `voice_${e.voiceId}_${s}${i}`, a = E.join(r, o), c = Buffer.isBuffer(e.audioBuffer) ? e.audioBuffer : Buffer.from(e.audioBuffer);
      y.writeFileSync(a, c);
      let l = a, u = `/voices/custom/${o}`;
      if (i !== ".wav") {
        const h = `voice_${e.voiceId}_${s}.wav`, f = E.join(r, h);
        try {
          const { execFileSync: p } = await import("node:child_process");
          p("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", a, f]), y.existsSync(f) && y.statSync(f).size > 100 && (l = f, u = `/voices/custom/${h}`);
        } catch (p) {
          console.warn("[VoiceService] Audio conversion fallback, using original file:", p);
        }
      }
      let d;
      if (e.avatarBuffer) {
        const h = Buffer.isBuffer(e.avatarBuffer) ? e.avatarBuffer : Buffer.from(e.avatarBuffer);
        if (h.byteLength > 0) {
          const f = E.extname(e.avatarFileName || ".jpg").toLowerCase() || ".jpg", p = `avatar_${e.voiceId}_${s}${f}`, g = E.join(r, p);
          y.writeFileSync(g, h), d = `/voices/custom/${p}`;
        }
      }
      return this.repository && await this.repository.saveCustomVoice({
        id: e.voiceId,
        name: e.name,
        category: "cloned",
        avatarUrl: d || "/voices/sterling.jpg",
        sampleUrl: u,
        referenceAudioName: E.basename(l)
      }), {
        success: !0,
        filePath: l,
        sampleUrl: u,
        avatarUrl: d
      };
    } catch (r) {
      return console.error("[VoiceService] Failed to save custom voice:", r), { success: !1, error: String(r) };
    }
  }
  /**
   * Delete a custom voice from disk and SQLite
   */
  async deleteCustomVoice(e) {
    try {
      this.repository && await this.repository.deleteCustomVoice(e);
      const r = this.getCustomVoicesDirectory();
      if (y.existsSync(r)) {
        const n = y.readdirSync(r);
        for (const i of n)
          if (i.includes(`_${e}_`))
            try {
              y.unlinkSync(E.join(r, i));
            } catch {
            }
      }
      return { success: !0 };
    } catch (r) {
      return console.error("[VoiceService] Failed to delete custom voice files:", r), { success: !1, error: String(r) };
    }
  }
}
class Qi {
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
      })).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        color: r.color,
        avatarUrl: r.avatarUrl,
        initials: r.initials,
        gender: r.gender,
        tags: r.tags ? JSON.parse(r.tags) : [],
        referenceAudioName: r.referenceAudioName || void 0,
        sampleUrl: r.sampleUrl || void 0,
        languageCode: r.languageCode || void 0,
        languageName: r.languageName || void 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
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
    } catch (r) {
      return console.error("[VoiceRepositoryService] Failed to save custom voice:", r), { success: !1, error: (r == null ? void 0 : r.message) || String(r) };
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
    } catch (r) {
      return console.error("[VoiceRepositoryService] Failed to delete custom voice:", r), { success: !1, error: (r == null ? void 0 : r.message) || String(r) };
    }
  }
}
class Ki extends Le {
  constructor(e) {
    super(), this.voiceService = e;
  }
  init() {
    z.handle($.VOICES_SCAN, async () => this.voiceService.scanVoicePackages()), z.handle($.LEGACY_SCAN_VOICE_SAMPLES, async () => this.voiceService.scanVoicePackages()), z.handle(
      $.VOICES_LOAD,
      async (e, { folder: r, list: n }) => this.voiceService.loadVoicesForPackage(r, n)
    ), z.handle(
      $.VOICES_SAVE_CUSTOM,
      async (e, r) => this.voiceService.saveCustomVoice(r)
    ), z.handle(
      $.VOICES_DELETE_CUSTOM,
      async (e, { voiceId: r }) => this.voiceService.deleteCustomVoice(r)
    ), z.handle($.VOICES_LIST_CUSTOM, async () => {
      try {
        return { success: !0, data: await this.voiceService.listCustomVoices() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
function Xi(t, e) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const r = t.length, n = 44, i = r * 2, s = Buffer.alloc(n + i);
  s.write("RIFF", 0), s.writeUInt32LE(n + i - 8, 4), s.write("WAVE", 8), s.write("fmt ", 12), s.writeUInt32LE(16, 16), s.writeUInt16LE(1, 20), s.writeUInt16LE(1, 22), s.writeUInt32LE(e, 24), s.writeUInt32LE(e * 2, 28), s.writeUInt16LE(2, 32), s.writeUInt16LE(16, 34), s.write("data", 36), s.writeUInt32LE(i, 40);
  for (let o = 0; o < r; o++) {
    const a = Number.isFinite(t[o]) ? Math.round(t[o]) : 0, c = Math.max(-32768, Math.min(32767, a));
    s.writeInt16LE(c, n + o * 2);
  }
  return `data:audio/wav;base64,${s.toString("base64")}`;
}
function es(t, e) {
  if (e = Math.max(1, Math.floor(e)), t.length === 0) return Array(e).fill(4);
  const r = [], n = Math.max(1, Math.floor(t.length / e));
  for (let i = 0; i < e; i++) {
    let s = 0;
    const o = i * n, a = Math.min(t.length, o + n);
    for (let c = o; c < a; c += Math.max(1, Math.floor((a - o) / 40))) {
      const l = Math.abs(t[c] / 32768);
      l > s && (s = l);
    }
    r.push(Math.max(4, Math.min(98, Math.round(s * 100))));
  }
  return r;
}
function $r(t, e, r) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const n = t.length, i = 44, s = n * 2, o = Buffer.alloc(i + s);
  o.write("RIFF", 0), o.writeUInt32LE(i + s - 8, 4), o.write("WAVE", 8), o.write("fmt ", 12), o.writeUInt32LE(16, 16), o.writeUInt16LE(1, 20), o.writeUInt16LE(1, 22), o.writeUInt32LE(e, 24), o.writeUInt32LE(e * 2, 28), o.writeUInt16LE(2, 32), o.writeUInt16LE(16, 34), o.write("data", 36), o.writeUInt32LE(s, 40);
  for (let d = 0; d < n; d++) {
    const h = Number.isFinite(t[d]) ? Math.round(t[d]) : 0, f = Math.max(-32768, Math.min(32767, h));
    o.writeInt16LE(f, i + d * 2);
  }
  const a = t.reduce((d, h) => Math.max(d, Math.abs(h)), 0), c = E.resolve(process.cwd(), "assets/testing-voice-output");
  y.mkdirSync(c, { recursive: !0 });
  const l = `${r}-${Date.now()}.wav`, u = E.join(c, l);
  return y.writeFileSync(u, o), console.log(
    `[TTS Debug] Saved PCM to ${u} (${n} samples @ ${e}Hz, maxAbs=${a.toFixed(4)})`
  ), u;
}
function Dt(t, e) {
  const r = Math.floor(e * Math.max(0.015, t)), n = new Array(r);
  let i = 0;
  for (let o = 0; o < r; o++) {
    const a = (Math.random() * 2 - 1) * 5;
    i = i * 0.85 + a * 0.15, n[o] = i;
  }
  const s = Math.min(Math.floor(e * 8e-3), Math.floor(r / 2));
  for (let o = 0; o < s; o++) {
    const a = 0.5 * (1 - Math.cos(Math.PI * o / s));
    n[o] *= a;
    const c = 0.5 * (1 - Math.cos(Math.PI * (s - o) / s));
    n[r - 1 - o] *= c;
  }
  return n;
}
function ts(t, e, r = 18, n = 28) {
  if (t.length === 0) return t;
  let i = 0;
  for (let u = 0; u < t.length; u++) {
    const d = Math.abs(t[u]);
    d > i && (i = d);
  }
  if (i === 0) return t;
  const s = Math.max(i * 8e-3, i > 2 ? 60 : 2e-3), o = Math.floor(e * r / 1e3), a = Math.floor(e * n / 1e3);
  let c = 0;
  for (let u = 0; u < t.length; u++)
    if (Math.abs(t[u]) > s) {
      c = Math.max(0, u - o);
      break;
    }
  let l = t.length;
  for (let u = t.length - 1; u >= c; u--)
    if (Math.abs(t[u]) > s) {
      l = Math.min(t.length, u + 1 + a);
      break;
    }
  return c >= l || l - c < e * 0.08 ? t : t.slice(c, l);
}
function st(t, e, r, n = 12) {
  if (e.length === 0) return;
  if (t.length === 0) {
    for (let o = 0; o < e.length; o++) t.push(e[o]);
    return;
  }
  const i = Math.min(
    Math.floor(r * n / 1e3),
    Math.floor(t.length / 2),
    Math.floor(e.length / 2)
  );
  if (i <= 0) {
    for (let o = 0; o < e.length; o++) t.push(e[o]);
    return;
  }
  const s = t.length - i;
  for (let o = 0; o < i; o++) {
    const a = o / i, c = Math.cos(a * (Math.PI / 2)), l = Math.sin(a * (Math.PI / 2));
    t[s + o] = t[s + o] * c + e[o] * l;
  }
  for (let o = i; o < e.length; o++)
    t.push(e[o]);
}
function rs(t, e, r = "normal") {
  let n = t, i = r;
  const s = [];
  if ((i === "whisper" || /\[(?:whisper|soft)\]/i.test(n)) && (i = "whisper", s.push("whisper"), n = n.replace(/\[\/?(?:whisper|soft)\]/gi, " ")), i === "yell" || /\[(?:yell|shout|loud)\]/i.test(n)) {
    i = "yell", s.push("yell"), n = n.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ");
    const o = n.trim(), a = /[!?]$/.test(o) ? "" : "!";
    n = `${o.toUpperCase()}${a}`;
  }
  return (i === "raise" || /\[(?:raise|emphasis)\]/i.test(n) || /<\/?strong>/i.test(n)) && (i = "raise", s.push("raise")), n = n.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " "), n = n.replace(/<\/?laughter>/gi, " "), (/\[(?:sigh|breath)\]/i.test(n) || /<\/?breath>/i.test(n)) && s.push("breath"), /\[(?:hmm+|thinking)\]/i.test(n) && s.push("hmm"), /\[gasp\]/i.test(n) && s.push("gasp"), e === "cosyvoice3" ? (n = n.replace(/\[(?:breath|sigh)\]/gi, " <breath> "), n = n.replace(
    /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
    "<strong>$1</strong>"
  ), i === "raise" && !/<strong>[\s\S]*?<\/strong>/i.test(n) && (n = `<strong>${n.trim()}</strong>`), n = n.replace(/\[\/?(?:raise|emphasis)\]/gi, " "), n = n.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... "), n = n.replace(/\[gasp\]/gi, "<breath> "), n = n.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim(), i === "whisper" && n.length > 0 && (n = `<breath> ${n.toLowerCase()} <breath>`)) : (n = n.replace(/<\/?(?:laughter|strong|breath)>/gi, " "), n = n.replace(
    /\[\/?(?:laugh|laughter|giggle|chuckle|breath|sigh|gasp|whisper|soft|yell|shout|loud|raise|emphasis)\]/gi,
    " "
  ), s.includes("hmm") && (n = n.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ")), (s.includes("breath") || s.includes("sigh") || s.includes("gasp")) && (n = n.replace(/\[(?:breath|sigh|gasp)\]/gi, "... ")), i === "raise" && (n = n.toUpperCase()), n = n.replace(/\s+/g, " ").replace(/\.{4,}/g, "...").trim(), i === "whisper" && n.length > 0 && (n = `... ${n.toLowerCase()} ...`)), { cleanedText: n, detectedCues: s, tone: i };
}
function ns(t, e = 36) {
  const r = t.trim();
  if (!r) return [];
  const n = r.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim();
  if (n.split(/\s+/).filter(Boolean).length <= e) {
    const c = /[.!?]$/.test(n);
    return [{ text: r, isSentenceEnd: c }];
  }
  const s = r.match(/(?:<[^>]+>|[^.!?\n])+([.!?\n]+(?=[\s<]|$)|$)/g) || [r], o = [];
  let a = "";
  for (const c of s) {
    const l = c.trim();
    if (!l) continue;
    const u = a ? `${a} ${l}` : l;
    if (u.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e)
      a = u;
    else {
      if (a) {
        const f = a.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), p = /[.!?]$/.test(f);
        o.push({ text: a, isSentenceEnd: p });
      }
      if (l.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length > e) {
        const f = l.match(/(?:<[^>]+>|[^,;:—-])+([,;:—-]+(?=[\s<]|$)|$)/g) || [l];
        let p = "";
        for (const g of f) {
          const v = g.trim();
          if (!v) continue;
          const S = p ? `${p} ${v}` : v;
          S.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e ? p = S : (p && o.push({ text: p, isSentenceEnd: !1 }), p = v);
        }
        p ? a = p : a = "";
      } else
        a = l;
    }
  }
  if (a.trim()) {
    const c = a.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), l = /[.!?]$/.test(c);
    o.push({ text: a.trim(), isSentenceEnd: l });
  }
  return o.filter((c) => c.text.length > 0);
}
function is(t) {
  let e = t.replace(
    /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi,
    (a, c) => {
      const l = parseFloat(c);
      return Number.isFinite(l) && l <= 1.2 ? "... " : a;
    }
  );
  e = e.replace(/\[(whisper|soft|yell|shout|loud|raise|emphasis)\]\s*\[\/\1\]/gi, "");
  const r = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]|\[(whisper|soft|yell|shout|loud|raise|emphasis)\]([\s\S]*?)\[\/\2\]/gi, n = [];
  let i = 0, s;
  for (; (s = r.exec(e)) !== null; ) {
    const a = e.slice(i, s.index).trim();
    if (a && n.push({ type: "speech", text: a, tone: "normal" }), s[1] !== void 0) {
      const c = parseFloat(s[1]);
      Number.isFinite(c) && c > 0 && n.push({ type: "pause", pauseSec: Math.min(c, 30) });
    } else if (s[2] !== void 0) {
      const c = s[2].toLowerCase(), l = (s[3] || "").trim();
      if (l) {
        let u = "normal";
        c === "whisper" || c === "soft" ? u = "whisper" : c === "yell" || c === "shout" || c === "loud" ? u = "yell" : (c === "raise" || c === "emphasis") && (u = "raise"), n.push({ type: "speech", text: l, tone: u });
      }
    }
    i = s.index + s[0].length;
  }
  const o = e.slice(i).trim();
  return o && n.push({ type: "speech", text: o, tone: "normal" }), n;
}
function Sn(t) {
  if (!t || typeof t != "string") return;
  let e = t;
  if (!y.existsSync(e)) {
    const a = E.resolve(process.cwd(), "public", t.replace(/^\//, ""));
    y.existsSync(a) && (e = a);
  }
  if (!y.existsSync(e)) {
    const a = E.resolve(process.cwd(), t);
    y.existsSync(a) && (e = a);
  }
  if (!y.existsSync(e)) return;
  const r = E.extname(e).toLowerCase();
  if (r === ".wav") return e;
  const n = E.join(X.tmpdir(), "echo-voice-cache");
  y.mkdirSync(n, { recursive: !0 });
  const i = y.statSync(e), s = `${E.basename(e, r)}_${i.size}_${Math.floor(i.mtimeMs)}.wav`, o = E.join(n, s);
  if (y.existsSync(o) && y.statSync(o).size > 1e3)
    return o;
  try {
    if (Vi("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", e, o]), y.existsSync(o) && y.statSync(o).size > 1e3)
      return o;
  } catch (a) {
    console.warn(`[Echo Voice Engine] Audio conversion failed for ${e}:`, a);
  }
}
function kr(t) {
  if (t) {
    const e = Sn(t);
    if (e) return e;
  }
}
class ss {
  constructor(e) {
    b(this, "modelsService");
    b(this, "loadedModels", /* @__PURE__ */ new Map());
    b(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    this.modelsService = e || new ir();
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
    for (const r of this.loadedModels.values())
      try {
        await ((e = A.unloadModel) == null ? void 0 : e.call(A, {
          modelId: r
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
  async downloadModel(e, r) {
    return this.modelsService.downloadModel(e, r);
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
    var s, o, a, c, l;
    const r = e.engine || "cosyvoice3", n = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), i = A.TTS_ENHANCER_LAVASR_FP16;
    if (r === "chatterbox") {
      const u = e.language && e.language !== "en" && this.modelsService.isModelDownloaded("chatterbox-t3-multilingual-q8_0") && this.modelsService.isModelDownloaded("chatterbox-s3gen-multilingual-q8_0");
      let d = u ? A.TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0 : A.TTS_T3_TURBO_EN_CHATTERBOX_Q8_0, h = u ? A.TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0 : A.TTS_S3GEN_EN_CHATTERBOX_Q8_0;
      const f = u ? "Chatterbox T3 Multilingual (Q8_0 GGUF)" : "Chatterbox T3 Turbo EN (Q8_0 GGUF)";
      if (!d || !h)
        throw new Error("QVAC Chatterbox descriptors (T3 and/or S3Gen) missing from SDK");
      let p = kr(e.referenceAudioSrc);
      if (!p) {
        const R = E.resolve(process.cwd(), "public", "voices", "samples", "en", "voice_en_male_1.mp3");
        y.existsSync(R) && (p = Sn(R));
      }
      const g = [
        "chatterbox",
        u ? "multilingual" : "en",
        p ? E.basename(p) : "default",
        n ? "lavasr48k" : "native24k",
        process.arch === "arm64" ? "metal" : "cpu"
      ].join("|"), v = this.loadedModels.get(g);
      if (v)
        return { modelId: v, engine: "chatterbox" };
      (s = e.onLog) == null || s.call(e, {
        text: `[Echo Voice Engine] Loading ${f} + S3Gen Vocoder (${n ? "48kHz LavaSR" : "24kHz native"}${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const S = {
        ttsEngine: "chatterbox",
        language: e.language || "en",
        s3genModelSrc: (h == null ? void 0 : h.src) || h,
        streamChunkTokens: 25,
        streamFirstChunkTokens: 10,
        cfmSteps: 1,
        threads: 8,
        useGPU: process.arch === "arm64",
        seed: 42,
        ...p ? { referenceAudioSrc: p } : {},
        ...n && i ? { lavasrEnhancerModelSrc: i } : {}
      }, _ = await A.loadModel({
        modelSrc: d,
        modelType: "tts",
        modelConfig: S,
        onProgress: (R) => {
          var O;
          const M = Math.round((R == null ? void 0 : R.percentage) ?? 0);
          (O = e.onProgress) == null || O.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(M * 0.4)),
            message: `Loading ${f} weights ${M}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const R = this.loadedModels.keys().next().value;
        if (R) {
          const M = this.loadedModels.get(R);
          if (M)
            try {
              await ((o = A.unloadModel) == null ? void 0 : o.call(A, { modelId: M }));
            } catch {
            }
          this.loadedModels.delete(R);
        }
      }
      return this.loadedModels.set(g, _), { modelId: _, engine: "chatterbox" };
    } else {
      const u = A.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || A.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!u)
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      const d = ((a = e.emotion) == null ? void 0 : a.toLowerCase()) || "", f = ["anger", "happy", "neutral", "sad"].includes(d) ? d : void 0, p = kr(e.referenceAudioSrc), g = (this.modelsService.isModelDownloaded("cosyvoice3-s3tok-fp16") || this.modelsService.isModelDownloaded("cosyvoice3-s3tok")) && (this.modelsService.isModelDownloaded("cosyvoice3-campplus-fp32") || this.modelsService.isModelDownloaded("cosyvoice3-campplus"));
      console.log(
        `[Echo Voice Engine] CosyVoice 3 setup: refWavPath=${p}, hasCloningModels=${g}`
      );
      const v = [
        "cosyvoice3",
        p || "native",
        f || "none",
        n ? "lavasr48k" : "native24k"
      ].join("|"), S = this.loadedModels.get(v);
      if (S)
        return { modelId: S, engine: "cosyvoice3" };
      const _ = p ? ` voice="${E.basename(p)}"` : " (native studio voice)", R = f ? ` emotion="${f}"` : "";
      (c = e.onLog) == null || c.call(e, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0 [FP32 Flow Matching]${n ? " +LavaSR 48kHz" : ""}${_}${R})...`,
        stream: "stdout"
      });
      const M = {
        ttsEngine: "cosyvoice3",
        useGPU: !0,
        seed: 42,
        ...p && g ? {
          cosyvoice3S3tokModelSrc: A.TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16,
          cosyvoice3CampplusModelSrc: A.TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32,
          referenceAudioSrc: p
        } : {},
        ...n && i ? { lavasrEnhancerModelSrc: i } : {},
        ...f ? { emotion: f } : {}
      }, O = await A.loadModel({
        modelSrc: u,
        modelType: "tts",
        modelConfig: M,
        onProgress: (x) => {
          var I;
          const C = Math.round((x == null ? void 0 : x.percentage) ?? 0);
          (I = e.onProgress) == null || I.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(C * 0.4)),
            message: `Loading CosyVoice 3 weights ${C}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const x = this.loadedModels.keys().next().value;
        if (x) {
          const C = this.loadedModels.get(x);
          if (C)
            try {
              await ((l = A.unloadModel) == null ? void 0 : l.call(A, { modelId: C }));
            } catch {
            }
          this.loadedModels.delete(x);
        }
      }
      return this.loadedModels.set(v, O), { modelId: O, engine: "cosyvoice3" };
    }
  }
  cancelSynthesis(e) {
    var n;
    const r = this.activeTtsRequestIds.get(e);
    if (r) {
      try {
        (n = A.cancel) == null || n.call(A, { requestId: r });
      } catch {
      }
      this.activeTtsRequestIds.delete(e);
    }
  }
  /**
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Chatterbox T3)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  async synthesize(e, r, n, i) {
    var d, h, f, p, g, v, S, _, R;
    const { taskId: s, rounds: o } = e, a = e.engine || "cosyvoice3", c = o.filter((M) => M.text.trim().length > 0);
    if (c.length === 0)
      return { success: !1, error: "No active speech rounds to synthesize" };
    const l = c[0], u = e.speakerName || "Selected Speaker";
    n == null || n({
      text: `[Echo Voice Engine] Synthesis task ${s} engine="${a}" voice="${u}" turns=${c.length}...`,
      stream: "system"
    });
    try {
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      r == null || r({
        taskId: s,
        progress: 8,
        message: `Loading ${a === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const M = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), O = e.voicePrompt || e.prompt || e.description || l.prompt || l.description, x = ((d = l.emotion) == null ? void 0 : d.toLowerCase()) || "", C = [
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
      ], I = C.includes(x) ? x : void 0, P = l.referenceAudioSrc || e.referenceAudioSrc, { engine: N } = await this.ensureModelLoaded({
        engine: a,
        language: e.language || "en",
        lavaSrEnabled: M,
        instruct: O || void 0,
        emotion: I,
        pace: (h = l.pace) == null ? void 0 : h.toLowerCase(),
        referenceAudioSrc: P,
        taskId: s,
        onProgress: r,
        onLog: n
      });
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      const F = [];
      let L = M ? 48e3 : 24e3;
      for (let re = 0; re < c.length; re++) {
        if (i != null && i()) {
          const pe = this.activeTtsRequestIds.get(s);
          if (pe)
            try {
              await ((f = A.cancel) == null ? void 0 : f.call(A, { requestId: pe }));
            } catch {
            }
          return { success: !1, error: "Cancelled" };
        }
        const oe = c[re], nt = oe.referenceAudioSrc || e.referenceAudioSrc, Er = ((p = oe.emotion) == null ? void 0 : p.toLowerCase()) || "", Mi = C.includes(Er) ? Er : I, { modelId: $i } = await this.ensureModelLoaded({
          engine: a,
          language: e.language || "en",
          lavaSrEnabled: M,
          instruct: oe.prompt || oe.description || O || void 0,
          emotion: Mi,
          pace: (g = oe.pace) == null ? void 0 : g.toLowerCase(),
          referenceAudioSrc: nt,
          taskId: s,
          onProgress: r,
          onLog: n
        });
        if (r == null || r({
          taskId: s,
          progress: 40 + Math.round(re / c.length * 50),
          message: `Synthesizing turn ${re + 1}/${c.length}${oe.speakerName ? ` (${oe.speakerName})` : ""}...`,
          phase: "synthesis"
        }), re > 0 && F.length > 0) {
          const pe = Dt(0.2, L);
          st(F, pe, L, 14);
        }
        const Ir = is(oe.text);
        let ki = 0;
        for (let pe = 0; pe < Ir.length; pe++) {
          const Ce = Ir[pe];
          if (i != null && i()) {
            const Ae = this.activeTtsRequestIds.get(s);
            if (Ae)
              try {
                await ((v = A.cancel) == null ? void 0 : v.call(A, { requestId: Ae }));
              } catch {
              }
            return { success: !1, error: "Cancelled" };
          }
          if (Ce.type === "pause" && Ce.pauseSec) {
            const Ae = Dt(Ce.pauseSec, L);
            st(F, Ae, L, 14);
            continue;
          }
          if (Ce.type === "speech" && Ce.text) {
            const { cleanedText: Ae, detectedCues: qe, tone: Ot } = rs(Ce.text, N, Ce.tone);
            if (!Ae) continue;
            const it = ns(Ae, 36);
            for (let ge = 0; ge < it.length; ge++) {
              const Nt = it[ge].text;
              if (!Nt) continue;
              if (i != null && i()) {
                const ne = this.activeTtsRequestIds.get(s);
                if (ne)
                  try {
                    await ((S = A.cancel) == null ? void 0 : S.call(A, { requestId: ne }));
                  } catch {
                  }
                return { success: !1, error: "Cancelled" };
              }
              if (F.length > 0) {
                const $e = ge > 0 && !it[ge - 1].isSentenceEnd ? 0.035 : ge > 0 ? 0.09 : 0.08, ce = Dt($e, L);
                st(F, ce, L, 10);
              }
              ki++;
              const ye = {
                modelId: $i,
                text: Nt,
                inputType: "text",
                stream: !1
              };
              if (N === "cosyvoice3") {
                const ne = (((_ = oe.emotion) == null ? void 0 : _.toLowerCase()) || I || "").trim(), $e = ["anger", "happy", "neutral", "sad"];
                if (Ot === "whisper" || qe.includes("whisper"))
                  ye.volume = "soft", ye.pace = "slow";
                else if (Ot === "yell" || qe.includes("yell"))
                  ye.volume = "loud", ye.emotion = "anger";
                else if (Ot === "raise" || qe.includes("raise"))
                  ye.volume = "loud";
                else {
                  let ce = $e.includes(ne) ? ne : void 0;
                  if ((qe.includes("sigh") || qe.includes("breath")) && !ce && (ce = "sad"), ce && ce !== "neutral")
                    ye.emotion = ce;
                  else {
                    const He = (((R = oe.pace) == null ? void 0 : R.toLowerCase()) || "").trim();
                    ["slow", "moderate", "fast"].includes(He) && He !== "moderate" && (ye.pace = He);
                  }
                }
              }
              const Me = A.textToSpeech(ye);
              Me != null && Me.requestId && this.activeTtsRequestIds.set(s, Me.requestId);
              const ae = await Me.buffer ?? [], Oi = await Me.done, Rt = await Me.sampleRate, Ye = typeof Rt == "number" && Rt > 0 ? Rt : M ? 48e3 : 24e3;
              if (L = Ye, this.activeTtsRequestIds.delete(s), ae.length > 0) {
                let ne = 0, $e = 1 / 0, ce = -1 / 0;
                for (const Ue of ae) {
                  const Pt = Number.isFinite(Ue) ? Ue : 0;
                  ne = Math.max(ne, Math.abs(Pt)), $e = Math.min($e, Pt), ce = Math.max(ce, Pt);
                }
                const He = ae.every((Ue) => Ue === 0), Tr = ae.every((Ue) => Ue === ae[0]);
                console.log(
                  `[TTS Debug] Turn ${re + 1} Chunk ${ge + 1}/${it.length}: PCM length=${ae.length}, maxAbs=${ne.toFixed(4)}, min=${$e.toFixed(4)}, max=${ce.toFixed(4)}, allZero=${He}, allSame=${Tr}, sampleRate=${Ye}`
                );
              }
              if (ae.length > 0) {
                const ne = Nt.replace(/[^a-z0-9]/gi, "_").slice(0, 30) || `round-${re}-chunk-${ge}`;
                $r(ae, Ye, `segment-${re}-${ne}`);
              }
              if (!Oi || !ae || ae.length === 0)
                throw new Error(
                  `${N === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} returned no audio for turn ${re + 1}`
                );
              const Ni = ts(ae, Ye);
              st(F, Ni, Ye, 12);
            }
          }
        }
      }
      if (i != null && i()) return { success: !1, error: "Cancelled" };
      r == null || r({
        taskId: s,
        progress: 95,
        message: `Finalizing ${L}Hz WAV & waveform...`,
        phase: "finalizing"
      }), F.length > 0 && $r(F, L, "combined-output");
      const Q = Xi(F, L), U = es(F, 38), J = Math.round(F.length / L * 10) / 10, ze = c[0].text.trim(), rt = ze.length > 55 ? `${ze.slice(0, 52)}...` : ze, We = {
        id: `gen-${s}`,
        roundIndex: e.historyIndex || 0,
        title: `Generation ${(e.historyIndex || 0) + 1}`,
        textSnippet: rt,
        speakerName: c.length > 1 ? `${c.length} Speakers` : e.speakerName || "Sterling Rhodes",
        speakerColor: c.length > 1 ? "#10b981" : e.speakerColor || "#38bdf8",
        speakerAvatarUrl: e.speakerAvatarUrl || "/voices/sterling.jpg",
        duration: J,
        audioUrl: Q,
        waveform: U,
        timestamp: "Just now",
        emotion: l.emotion || "Neutral"
      };
      return r == null || r({
        taskId: s,
        progress: 100,
        message: `${N === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} synthesis complete`,
        phase: "complete"
      }), n == null || n({
        text: `[Echo Voice Engine] Synthesis complete (${J}s @ ${L}Hz, ${F.length} samples).`,
        stream: "stdout"
      }), { success: !0, data: We };
    } catch (M) {
      this.activeTtsRequestIds.delete(s);
      const O = M != null && M.message ? String(M.message) : String(M);
      return n == null || n({
        text: `[Echo Voice Engine] Synthesis failed: ${O}`,
        stream: "stderr"
      }), { success: !1, error: O };
    }
  }
}
class os {
  constructor(e, r) {
    b(this, "activeTasks", /* @__PURE__ */ new Set());
    b(this, "voiceEngine");
    b(this, "modelsService");
    b(this, "conversationRepo");
    this.modelsService = e || new ir(), this.voiceEngine = new ss(this.modelsService), this.conversationRepo = r;
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
  async downloadModel(e, r) {
    return this.modelsService.downloadModel(e, r);
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
    var r, n;
    if (this.activeTasks.has(e)) {
      this.activeTasks.delete(e);
      try {
        (n = (r = this.voiceEngine).cancelSynthesis) == null || n.call(r, e);
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
  async generateSpeech(e, r, n) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      return await this.voiceEngine.synthesize(
        e,
        r,
        n,
        () => this.isCancelled(i)
      );
    } finally {
      this.activeTasks.delete(i);
    }
  }
}
class as {
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
      })).map((r) => ({
        id: r.id,
        text: r.text,
        previewSnippet: r.previewSnippet || r.text,
        voiceName: r.voiceName,
        voiceColor: r.voiceColor,
        voiceAvatarUrl: r.voiceAvatarUrl || "/voices/sterling.jpg",
        dateGroup: r.dateGroup,
        timeAgo: r.timeAgo,
        timestamp: r.timestamp ? Number(r.timestamp) : r.createdAt.getTime(),
        model: r.model,
        engine: r.engine,
        duration: r.duration,
        durationSec: r.durationSec || 0,
        emotion: r.emotion || void 0,
        audioUrl: r.audioUrl || void 0,
        waveform: r.waveform ? JSON.parse(r.waveform) : [],
        voicePrompt: r.voicePrompt || void 0,
        language: r.language || void 0,
        speakerCount: r.speakerCount,
        generationId: r.generationId || void 0,
        activity: r.activity ? {
          id: r.activity.id,
          type: r.activity.type,
          title: r.activity.title,
          category: r.activity.category,
          subCategory: r.activity.subCategory,
          description: r.activity.description
        } : void 0,
        roundsData: r.rounds.map((n) => ({
          id: n.id,
          voiceId: n.voiceId,
          text: n.text,
          speed: n.speed,
          emotion: n.emotion || void 0,
          pace: n.pace || void 0,
          prompt: n.prompt || void 0,
          description: n.description || void 0,
          referenceAudioSrc: n.referenceAudioSrc || void 0,
          speakerName: n.speakerName || void 0,
          speakerColor: n.speakerColor || void 0
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
      const r = e.waveform ? JSON.stringify(e.waveform) : "[]", n = e.timestamp ? BigInt(Math.floor(e.timestamp)) : BigInt(Date.now());
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
            timestamp: n,
            model: e.model,
            engine: e.engine || "cosyvoice3",
            duration: e.duration,
            durationSec: e.durationSec,
            emotion: e.emotion,
            audioUrl: e.audioUrl,
            waveform: r,
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
            timestamp: n,
            model: e.model,
            engine: e.engine || "cosyvoice3",
            duration: e.duration,
            durationSec: e.durationSec,
            emotion: e.emotion,
            audioUrl: e.audioUrl,
            waveform: r,
            voicePrompt: e.voicePrompt,
            language: e.language,
            speakerCount: e.speakerCount || 1,
            generationId: e.generationId
          }
        }), await i.speechRound.deleteMany({
          where: { conversationId: e.id }
        }), e.roundsData && Array.isArray(e.roundsData) && e.roundsData.length > 0) {
          const h = e.roundsData.map((f, p) => ({
            id: f.id || `${e.id}-round-${p}`,
            conversationId: e.id,
            roundOrder: p,
            voiceId: f.voiceId || "voice-en-male-1",
            text: f.text || "",
            speed: typeof f.speed == "number" ? f.speed : 1,
            emotion: f.emotion || null,
            pace: f.pace || null,
            prompt: f.prompt || null,
            description: f.description || null,
            referenceAudioSrc: f.referenceAudioSrc || null,
            speakerName: f.speakerName || null,
            speakerColor: f.speakerColor || null
          }));
          for (const f of h)
            await i.speechRound.create({ data: f });
        }
        const o = (e.previewSnippet || e.text || "").replace(/\s+/g, " ").trim(), a = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${e.voiceName || "Speech Synthesis"} Turn`, c = await i.activity.findUnique({
          where: { conversationId: e.id }
        }), l = "Text to Speech", u = e.speakerCount && e.speakerCount > 1 ? `${e.speakerCount} Speakers Diarized` : e.voiceName || "Single Speaker", d = JSON.stringify({
          model: e.model,
          engine: e.engine || "cosyvoice3",
          duration: e.duration,
          durationSec: e.durationSec,
          emotion: e.emotion,
          audioUrl: e.audioUrl,
          waveform: e.waveform || [],
          speakerCount: e.speakerCount || 1
        });
        if (c)
          await i.activity.update({
            where: { conversationId: e.id },
            data: {
              category: l,
              subCategory: u,
              description: o ? o.slice(0, 160) : null,
              metadata: d
            }
          });
        else {
          let h = a, f = 1;
          for (; await i.activity.findUnique({ where: { title: h } }); )
            f++, h = `${a} #${f}`;
          await i.activity.create({
            data: {
              id: `act-${e.id}`,
              type: "tts",
              title: h,
              category: l,
              subCategory: u,
              description: o ? o.slice(0, 160) : null,
              originId: e.id,
              originType: "conversation",
              conversationId: e.id,
              metadata: d
            }
          });
        }
      }), { success: !0 };
    } catch (r) {
      return console.error("[ConversationRepositoryService] Failed to save conversation:", r), { success: !1, error: r instanceof Error ? r.message : String(r) };
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
    } catch (r) {
      return console.error("[ConversationRepositoryService] Failed to delete conversation:", r), { success: !1, error: r instanceof Error ? r.message : String(r) };
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
class cs extends Le {
  constructor(e) {
    super(), this.ttsService = e;
  }
  init() {
    z.handle(
      $.TTS_GENERATE,
      async (e, r) => {
        const n = r.engine || "cosyvoice3", s = this.ttsService.getModelStatus(n).models.filter((l) => l.required && !l.downloaded);
        if (s.length > 0)
          return {
            success: !1,
            error: `Required voice engine models not downloaded: ${s.map((l) => l.name).join(", ")}`
          };
        const o = (l) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.TTS_PROGRESS, l);
          } catch (u) {
            console.warn("[TtsController] Failed to send progress event:", u);
          }
        }, a = (l) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: l.text,
              stream: l.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (u) {
            console.warn("[TtsController] Failed to send log event:", u);
          }
        }, c = await this.ttsService.generateSpeech(r, o, a);
        if (c.success && c.data)
          try {
            e.sender.isDestroyed() || e.sender.send($.TTS_COMPLETE, {
              taskId: r.taskId,
              generation: c.data
            });
          } catch (l) {
            console.warn("[TtsController] Failed to send complete event:", l);
          }
        else if (!c.success)
          try {
            e.sender.isDestroyed() || e.sender.send($.TTS_ERROR, {
              taskId: r.taskId,
              error: c.error || "Generation failed"
            });
          } catch (l) {
            console.warn("[TtsController] Failed to send error event:", l);
          }
        return c;
      }
    ), z.handle(
      $.TTS_CANCEL,
      async (e, { taskId: r }) => ({ success: this.ttsService.cancelGeneration(r), taskId: r })
    ), z.handle($.TTS_HISTORY_LIST, async () => {
      try {
        return { success: !0, data: await this.ttsService.listConversations() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    }), z.handle($.TTS_HISTORY_SAVE, async (e, r) => {
      try {
        return await this.ttsService.saveConversation(r);
      } catch (n) {
        return { success: !1, error: (n == null ? void 0 : n.message) || String(n) };
      }
    }), z.handle($.TTS_HISTORY_DELETE, async (e, r) => {
      try {
        const n = typeof r == "string" ? r : r.id;
        return await this.ttsService.deleteConversation(n);
      } catch (n) {
        return { success: !1, error: (n == null ? void 0 : n.message) || String(n) };
      }
    }), z.handle($.TTS_HISTORY_CLEAR, async () => {
      try {
        return await this.ttsService.clearConversations();
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
const ke = class ke {
  constructor() {
    b(this, "primaryLogPath");
    b(this, "mirrorLogPath");
    var i;
    let e;
    try {
      e = (i = Y) != null && i.getPath ? Y.getPath("userData") : process.cwd();
    } catch {
      e = process.cwd();
    }
    const r = E.join(e, "logs");
    if (!y.existsSync(r))
      try {
        y.mkdirSync(r, { recursive: !0 });
      } catch {
      }
    this.primaryLogPath = E.join(r, "music-generation.log");
    const n = E.join(process.cwd(), "logs");
    if (!y.existsSync(n))
      try {
        y.mkdirSync(n, { recursive: !0 });
      } catch {
      }
    this.mirrorLogPath = E.join(n, "music-generation.log"), this.rotateIfNecessary(this.primaryLogPath), this.rotateIfNecessary(this.mirrorLogPath), this.writeRaw(`
=== Music Logger Initialized [${(/* @__PURE__ */ new Date()).toISOString()}] ===
Primary Log: ${this.primaryLogPath}
Mirror Log: ${this.mirrorLogPath}
`);
  }
  static getInstance() {
    return ke.instance || (ke.instance = new ke()), ke.instance;
  }
  rotateIfNecessary(e) {
    try {
      if (y.existsSync(e) && y.statSync(e).size > 15 * 1024 * 1024) {
        const n = `${e}.${Date.now()}.bak`;
        y.renameSync(e, n);
      }
    } catch {
    }
  }
  writeRaw(e) {
    try {
      y.appendFileSync(this.primaryLogPath, e, "utf-8");
    } catch (r) {
      console.warn("[MusicLogger] Failed to write primary log:", r);
    }
    if (this.mirrorLogPath !== this.primaryLogPath)
      try {
        y.appendFileSync(this.mirrorLogPath, e, "utf-8");
      } catch {
      }
  }
  logInfo(e, r) {
    let i = `[${(/* @__PURE__ */ new Date()).toISOString()}] [INFO] ${e}`;
    r && (i += `
  Metadata: ${JSON.stringify(r, null, 2)}`), i += `
`, this.writeRaw(i), console.log(`[MusicLogger] ${e}`);
  }
  logSessionStart(e) {
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = "=".repeat(80), i = `
${n}
[${r}] ▸ STARTING MUSIC GENERATION
TaskId:         ${e.taskId}
Engine:         ${e.engine}
Caption:        "${e.caption}"
Lyrics:         ${e.lyrics ? `"${e.lyrics.slice(0, 100)}${e.lyrics.length > 100 ? "..." : ""}"` : "(none)"}
Instrumental:   ${!!e.isInstrumental}
Duration:       ${e.duration || 30}s
DiT Variant:    ${e.ditVariant || "n/a"}
Seed:           ${e.seed ?? -1}
${n}
`;
    this.writeRaw(i), console.log(`[MusicLogger] ▸ Generation Started for task: ${e.taskId} (Engine: ${e.engine})`);
  }
  logMilestone(e, r, n) {
    const s = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [${r}] ${n || ""}
`;
    this.writeRaw(s), console.log(`[MusicLogger] [${e}] [${r}] ${n || ""}`);
  }
  logProgress(e, r, n, i, s) {
    const a = `[${(/* @__PURE__ */ new Date()).toISOString()}] [${e}] [PROGRESS] ${r}: ${s}% (${n}/${i})
`;
    this.writeRaw(a);
  }
  logSuccess(e, r) {
    const n = (/* @__PURE__ */ new Date()).toISOString(), i = "-".repeat(80), s = `
${i}
[${n}] ✓ MUSIC GENERATION SUCCEEDED
TaskId:         ${e}
Duration:       ${(r.durationMs / 1e3).toFixed(2)}s
Format:         ${r.sampleRate} Hz, ${r.channels} ch
Output WAV:     ${r.wavFilePath}
${i}
`;
    this.writeRaw(s), console.log(`[MusicLogger] ✓ Generation Succeeded: ${e} -> ${r.wavFilePath}`);
  }
  logFailure(e) {
    const r = (/* @__PURE__ */ new Date()).toISOString(), n = "#".repeat(80), i = e.error, s = (i == null ? void 0 : i.message) || String(i), o = (i == null ? void 0 : i.code) || (i == null ? void 0 : i.errCode) || "UNKNOWN", a = (i == null ? void 0 : i.stack) || "(No stack trace available)", c = i != null && i.cause ? JSON.stringify(i.cause, null, 2) : void 0, l = i == null ? void 0 : i.adds;
    let u = [];
    const d = E.join(X.homedir(), ".qvac", "models");
    try {
      y.existsSync(d) && (u = y.readdirSync(d).map((g) => {
        try {
          const S = (y.statSync(E.join(d, g)).size / (1024 * 1024)).toFixed(1);
          return `${g} (${S} MB)`;
        } catch {
          return g;
        }
      }));
    } catch {
    }
    const h = Math.round(X.freemem() / (1024 * 1024)), f = Math.round(X.totalmem() / (1024 * 1024)), p = `
${n}
[${r}] ✖ MUSIC GENERATION FAILED
TaskId:           ${e.taskId}
Engine:           ${e.engine}
Failure Stage:    ${e.stage}
Error Code:       ${o}
Error Message:    ${s}
${l ? `Error Adds:       ${l}
` : ""}${c ? `Error Cause:      ${c}
` : ""}
Stack Trace:
${a}

Options Provided:
${JSON.stringify(e.options || {}, null, 2)}

Resolved Model Paths:
${JSON.stringify(e.resolvedPaths || {}, null, 2)}

Models Cache Directory (${d}):
${u.length > 0 ? u.map((g) => `  - ${g}`).join(`
`) : "  (Directory empty or inaccessible)"}

System Resources:
  Platform:       ${X.platform()}-${X.arch()}
  Free Memory:    ${h} MB / ${f} MB (${Math.round(h / f * 100)}% free)
  Node Version:   ${process.version}
${n}
`;
    this.writeRaw(p), console.error(`[MusicLogger] ✖ Generation Failed for ${e.taskId} (Engine: ${e.engine}, Stage: ${e.stage}): ${s}`), console.error(a);
  }
  getRecentLogs(e = 200) {
    try {
      if (!y.existsSync(this.primaryLogPath))
        return "No music generation logs recorded yet.";
      const r = y.readFileSync(this.primaryLogPath, "utf-8"), n = r.split(`
`);
      return n.length <= e ? r : n.slice(n.length - e).join(`
`);
    } catch (r) {
      return `Failed to read logs: ${(r == null ? void 0 : r.message) || String(r)}`;
    }
  }
  clearLogs() {
    try {
      return y.existsSync(this.primaryLogPath) && y.writeFileSync(this.primaryLogPath, "", "utf-8"), y.existsSync(this.mirrorLogPath) && this.mirrorLogPath !== this.primaryLogPath && y.writeFileSync(this.mirrorLogPath, "", "utf-8"), !0;
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
b(ke, "instance");
let Vt = ke;
const Oe = class Oe {
  static getInstance() {
    return Oe.instance || (Oe.instance = new Oe()), Oe.instance;
  }
  /**
   * Sanitizes prompt, lyrics, and arrangements incorporating all selected UI options
   * (vocalMode, BPM, keyscale, time signature, duration, vocal language, etc.).
   */
  sanitize(e) {
    var d;
    const r = e.caption || "", n = e.engine || "acestep", i = e.duration && e.duration > 0 ? e.duration : 30, s = /\b(instrumental|no vocals?|no singing|without vocals?|backing track|karaoke|pure instrumental|solo piano|solo guitar|acoustic instrumental)\b/i.test(r), o = !!(e.vocalMode === "instrumental" || e.isInstrumental || ((d = e.lyrics) == null ? void 0 : d.trim()) === "[Instrumental]" || s);
    let a = this.stripConversationalMeta(r), c, l;
    if (o ? (a = a.replace(/\b(?:with\s+)?(?:clear\s+melodic\s+)?(?:singing\s+vocals?|singing|lead\s+vocals?|vocalist|singer|soprano|baritone|tenor|choir|voice)\b/gi, "").replace(/\b(?:with\s+lyrics?|lyrics?)\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /\b(instrumental|backing track|no vocals)\b/i.test(a) ? /\bno vocals\b/i.test(a) || (a = `${a}, no vocals`) : a = `${a}, instrumental backing track, no vocals, rich melodic instruments`, n === "acestep" && !/(studio quality|clean mix|crisp|high fidelity|mastered|clear audio)/i.test(a) && (a = `${a}, studio quality mix, crisp clear audio, punchy transients`), l = "[Instrumental]", c = void 0) : (a = a.replace(/\b(?:pure\s+)?instrumental(?:\s+track|\s+version)?\b/gi, "").replace(/\b(?:without|no)\s+vocals?\b/gi, "").replace(/\s*,\s*,+/g, ",").trim(), /(vocal|singer|voice|singing|choir|soprano|baritone|tenor|lead vocals|vocalist|harmony)/i.test(a) || (c = this.inferVocalTimbre(a, e.vocalLanguage), a = `${a}, ${c}`), e.vocalMode === "manual" && e.lyrics && e.lyrics.trim() && e.lyrics.trim() !== "[Instrumental]" ? l = this.formatLyricsForDuration(e.lyrics, a, i) : n === "acestep" && !e.lyrics ? l = "" : l = this.formatLyricsForDuration(e.lyrics, a, i)), e.bpm && e.bpm > 0 && (/\b\d+\s*(?:bpm|beats\s+per\s+minute)\b/i.test(a) || (a = `${a}, ${e.bpm} BPM`)), e.keyscale && e.keyscale.trim() && e.keyscale.toLowerCase() !== "none") {
      const h = e.keyscale.trim(), f = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      new RegExp(`\\b${f}\\b`, "i").test(a) || /\b(?:in\s+key\s+of|key\s+of)\b/i.test(a) || (a = `${a}, in ${h}`);
    }
    if (e.timesignature && e.timesignature.trim() && e.timesignature !== "4/4") {
      const h = e.timesignature.trim();
      a.includes(h) || (a = `${a}, ${h} time signature`);
    }
    if (!o && e.vocalLanguage && e.vocalLanguage !== "en") {
      const f = {
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
      f && !new RegExp(`\\b${f}\\b`, "i").test(a) && (a = `${a}, ${f} vocals`);
    }
    if (i >= 120 ? /(extended|full-length|progression|arrangement|complete song)/i.test(a) || (a = `${a}, full-length structured arrangement with progression`) : i >= 60 && (/(progression|arrangement|structured)/i.test(a) || (a = `${a}, structured track progression`)), a = a.replace(/\s*,\s*,+/g, ", ").replace(/,\s*$/g, "").replace(/\s{2,}/g, " ").trim(), n === "acestep" && a.length > 450) {
      const h = a.slice(0, 450), f = h.lastIndexOf(",");
      a = (f > 250 ? h.slice(0, f) : h).trim(), o && !/\b(instrumental|no vocals)\b/i.test(a) && (a = `${a}, instrumental, no vocals`);
    }
    const u = n === "minimax" ? Math.max(750, Math.round(i * 25)) : void 0;
    return {
      caption: a.trim(),
      lyrics: l.trim(),
      duration: i,
      maxFrames: u,
      vocalHintInjected: c,
      isInstrumental: o
    };
  }
  /**
   * Strips conversational filler like "generate a...", "make a song about..."
   * as well as markdown formatting, bullet points, and LLM-generated section headers.
   */
  stripConversationalMeta(e) {
    let r = e.trim();
    r = r.replace(/\*\*(.*?)\*\*/g, "$1"), r = r.replace(/\*(.*?)\*/g, "$1"), r = r.replace(/#{1,6}\s*/g, ""), r = r.replace(/^\s*\d+\.\s+/gm, ""), r = r.replace(/^\s*[-*•]\s+/gm, ""), r = r.replace(/(?:Musical arrangement and instrumentation|Composition and progression|Performance and sound characteristics|Production quality|Instrumentation|Arrangement|Sound characteristics|Style and mood)\s*:\s*/gi, ""), r = r.replace(/\b(?:The composition should sound like|The final composition should sound like|Build the composition around|Keep the arrangement entirely|Develop the musical theme|Begin with a|Include several)\b[^.,;\n]*/gi, "");
    const n = [
      /^(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|write|compose|produce)\s+(?:me\s+)?(?:a|an|the|some)?\s+/i,
      /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+have\s+)?(?:a|an|the|some)?\s+)/i,
      /^(?:give\s+me\s+(?:a|an|the)?\s+)/i,
      /^(?:song\s+about\s+)/i,
      /^(?:track\s+about\s+)/i
    ];
    for (const i of n)
      r = r.replace(i, "");
    return r = r.replace(/[\r\n]+/g, ", "), r = r.replace(/\s*,\s*,+/g, ", ").replace(/,\s*,/g, ", ").replace(/\s{2,}/g, " ").trim(), r = r.replace(/^,\s*/, "").replace(/,\s*$/, ""), r.length > 0 && (r = r.charAt(0).toUpperCase() + r.slice(1)), r;
  }
  /**
   * Infers the best vocal timbre matching the musical genre/theme and optional language
   */
  inferVocalTimbre(e, r) {
    const n = e.toLowerCase(), i = {
      es: "Spanish",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian"
    }, s = r && r !== "en" && i[r.toLowerCase()] ? `${i[r.toLowerCase()]} ` : "";
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk|ancient|kingdom)/.test(n) ? `${s}haunting bard vocals, clear close-mic singing, natural human vibrato, acoustic studio production` : /(synthwave|retrowave|cyberpunk|80s|neon|electro)/.test(n) ? `${s}crisp 80s gated reverb male vocals, polished lead vocal, punchy melodic synth hook` : /(lo-fi|lofi|chillhop|coffee|relax|bedroom)/.test(n) ? `${s}soft breathy female vocals, intimate close-mic acoustic presence, clear pronunciation` : /(rock|metal|punk|grunge|electric guitar|heavy)/.test(n) ? `${s}raw energetic rock vocals, powerful singing voice, clear vocal consonants` : /(cinematic|epic|orchestral|orchestra|trailer|hero)/.test(n) ? `${s}soaring dramatic vocals, rich choral harmonies, expansive dynamic range` : /(ballad|piano|sad|emotional|heartbreak|acoustic|love|romance|romantic)/.test(n) ? `${s}heartfelt emotional solo vocals, warm studio acoustic presence, intimate vocal nuance, close-mic singing` : /(pop|dance|disco|summer|happy|party)/.test(n) ? `${s}bright modern pop vocals, crisp high-end clarity, infectious melodic chorus` : /(r&b|soul|jazz|blues)/.test(n) ? `${s}smooth soulful vocals, rich vocal harmonics, clear diction` : `${s}expressive lead singing vocals, crisp close-mic presence, natural human vibrato, studio vocal clarity`;
  }
  /**
   * Formats, tags, and extends lyrics according to duration so the model
   * doesn't stop prematurely at ~20 seconds.
   */
  formatLyricsForDuration(e, r, n) {
    let i = (e || "").trim();
    if (!i)
      return this.generateDefaultLyricsForTheme(r, n);
    i = i.replace(/\[?(?:verse\s*\d*|\(verse\s*\d*\)|verse\s*\d*:)\]?/gi, "[verse]"), i = i.replace(/\[?(?:chorus|\(chorus\)|chorus:)\]?/gi, "[chorus]"), i = i.replace(/\[?(?:bridge|\(bridge\)|bridge:)\]?/gi, "[bridge]"), i = i.replace(/\[?(?:outro|\(outro\)|outro:)\]?/gi, "[outro]"), i = i.replace(/\[?(?:intro|\(intro\)|intro:)\]?/gi, "[intro]"), i = i.replace(/\*\*(.*?)\*\*/g, "$1"), i = i.replace(/#{1,6}\s*/g, ""), i.startsWith("[") || (i = `[verse]
${i}`);
    const s = i.match(/\[(verse|chorus|bridge|outro|intro)\]/gi) || [];
    if (n >= 120 && s.length < 3) {
      const o = i.split(`
`).filter((a) => a.trim() && !a.startsWith("["));
      if (o.length > 0) {
        const a = o.slice(0, Math.min(4, o.length)).join(`
`), c = o.length > 4 ? o.slice(4).join(`
`) : a;
        i = [
          `[verse]
${a}`,
          `[chorus]
${c}`,
          `[verse]
${a}`,
          `[chorus]
${c}`,
          `[bridge]
Carried on the melody, through the passing time...`,
          `[chorus]
${c}`,
          `[outro]
Fading softly into the end...`
        ].join(`

`);
      }
    } else n >= 60 && s.length < 2 && (i = `${i}

[chorus]
${i.replace(/\[verse\]/g, "").trim()}

[outro]
Fading with the music...`);
    return i;
  }
  /**
   * Generates a complete, multi-section lyric sheet tailored to the duration.
   */
  generateDefaultLyricsForTheme(e, r) {
    const n = e.toLowerCase();
    return /(medieval|war|harp|battle|castle)/.test(n) ? r >= 120 ? `[verse]
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
b(Oe, "instance");
let Zt = Oe;
const Ne = class Ne {
  static getInstance() {
    return Ne.instance || (Ne.instance = new Ne()), Ne.instance;
  }
  /**
   * Post-processes raw interleaved PCM audio buffer into studio-mastered audio.
   * Returns a new Uint8Array with the mastered PCM samples.
   */
  masterPcm(e, r, n, i, s = {}) {
    if (!e || e.byteLength === 0 || n <= 0 || r <= 0)
      return { masteredPcm: e, peakBeforeDb: -99, peakAfterDb: -99, details: "empty pcm" };
    const {
      enableHighPass: o = !0,
      highPassHz: a = 32,
      enableAirShelf: c = !0,
      airShelfHz: l = 9500,
      airShelfGainDb: u = 2.2,
      enableNormalize: d = !0,
      targetPeakDb: h = -0.5,
      enableSoftLimiter: f = !0
    } = s, p = Math.floor(i === 16 ? e.byteLength / 2 : e.byteLength / 4), g = new Float32Array(p);
    if (i === 16) {
      const C = new Int16Array(e.buffer, e.byteOffset, p);
      for (let I = 0; I < p; I++)
        g[I] = C[I] / 32768;
    } else if (i === 32) {
      const C = new Float32Array(e.buffer, e.byteOffset, p);
      g.set(C);
    } else
      return { masteredPcm: e, peakBeforeDb: 0, peakAfterDb: 0, details: "unsupported bit depth" };
    let v = 1e-5;
    for (let C = 0; C < p; C++) {
      const I = Math.abs(g[C]);
      I > v && (v = I);
    }
    const S = 20 * Math.log10(v);
    o && a > 0 && a < r / 2 && this.applyHighPassFilter(g, r, n, a), c && u !== 0 && l < r / 2 && this.applyHighShelfFilter(g, r, n, l, u);
    let _ = 1e-5;
    for (let C = 0; C < p; C++) {
      const I = Math.abs(g[C]);
      I > _ && (_ = I);
    }
    if (d && _ > 1e-4) {
      const I = Math.pow(10, h / 20) / _;
      for (let P = 0; P < p; P++)
        g[P] *= I;
    }
    if (f) {
      const I = 0.06000000000000005;
      for (let P = 0; P < p; P++) {
        const N = g[P];
        N > 0.94 ? g[P] = 0.94 + I * Math.tanh((N - 0.94) / I) : N < -0.94 && (g[P] = -0.94 + I * Math.tanh((N + 0.94) / I));
      }
    }
    let R = 1e-5;
    for (let C = 0; C < p; C++) {
      const I = Math.abs(g[C]);
      I > R && (R = I);
    }
    const M = 20 * Math.log10(R), O = new Uint8Array(e.byteLength);
    if (i === 16) {
      const C = new Int16Array(O.buffer, O.byteOffset, p);
      for (let I = 0; I < p; I++) {
        const P = Math.max(-1, Math.min(1, g[I]));
        C[I] = P < 0 ? Math.round(P * 32768) : Math.round(P * 32767);
      }
    } else i === 32 && new Float32Array(O.buffer, O.byteOffset, p).set(g);
    const x = `HighPass: ${a}Hz | AirShelf: +${u}dB @ ${l}Hz | Peak: ${S.toFixed(1)}dBFS -> ${M.toFixed(1)}dBFS`;
    return { masteredPcm: O, peakBeforeDb: S, peakAfterDb: M, details: x };
  }
  /**
   * Applies a 2nd-order Butterworth High-Pass Biquad Filter per channel
   */
  applyHighPassFilter(e, r, n, i) {
    const s = 2 * Math.PI * i / r, o = Math.cos(s), l = Math.sin(s) / (2 * 0.70710678), u = (1 + o) / 2, d = -(1 + o), h = (1 + o) / 2, f = 1 + l, p = -2 * o, g = 1 - l, v = u / f, S = d / f, _ = h / f, R = p / f, M = g / f;
    for (let O = 0; O < n; O++) {
      let x = 0, C = 0, I = 0, P = 0;
      for (let N = O; N < e.length; N += n) {
        const F = e[N], L = v * F + S * x + _ * C - R * I - M * P;
        C = x, x = F, P = I, I = L, e[N] = L;
      }
    }
  }
  /**
   * Applies a High-Shelf Presence / Vocal Air Biquad Filter per channel
   */
  applyHighShelfFilter(e, r, n, i, s) {
    const o = Math.pow(10, s / 40), a = 2 * Math.PI * i / r, c = Math.cos(a), d = Math.sin(a) / 2 * Math.sqrt((o + 1 / o) * (1 / 1 - 1) + 2), h = 2 * Math.sqrt(o) * d, f = o * (o + 1 + (o - 1) * c + h), p = -2 * o * (o - 1 + (o + 1) * c), g = o * (o + 1 + (o - 1) * c - h), v = o + 1 - (o - 1) * c + h, S = 2 * (o - 1 - (o + 1) * c), _ = o + 1 - (o - 1) * c - h, R = f / v, M = p / v, O = g / v, x = S / v, C = _ / v;
    for (let I = 0; I < n; I++) {
      let P = 0, N = 0, F = 0, L = 0;
      for (let Q = I; Q < e.length; Q += n) {
        const U = e[Q], J = R * U + M * P + O * N - x * F - C * L;
        N = P, P = U, L = F, F = J, e[Q] = J;
      }
    }
  }
};
b(Ne, "instance");
let gt = Ne;
const Re = class Re {
  constructor() {
    b(this, "activeModelId", null);
    b(this, "isLoadingModel", !1);
    b(this, "idleUnloadTimer", null);
  }
  static getInstance() {
    return Re.instance || (Re.instance = new Re()), Re.instance;
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
        await new Promise((r) => setTimeout(r, 100));
      if (this.activeModelId) return this.activeModelId;
    }
    this.isLoadingModel = !0;
    try {
      console.log("[QwenLyricService] ▸ Loading Qwen3-1.7B Instruct LLM for lyric generation...");
      const r = await A.loadModel({
        modelSrc: A.QWEN3_1_7B_INST_Q4,
        onProgress: (n) => {
          e == null || e(n);
        }
      });
      return this.activeModelId = r, console.log(`[QwenLyricService] ✓ Qwen3-1.7B loaded successfully with ID: ${r}`), this.touchActivity(), r;
    } catch (r) {
      throw console.error("[QwenLyricService] ✖ Failed to load Qwen3-1.7B:", r), r;
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
        await A.unloadModel({ modelId: e }), console.log("[QwenLyricService] ✓ Qwen3-1.7B unloaded to free memory");
      } catch (r) {
        console.warn("[QwenLyricService] Warning unloading Qwen3-1.7B:", r);
      }
    }
  }
  /**
   * Generates song lyrics from a description, streaming tokens in real time.
   */
  async generateLyricsStream(e, r, n) {
    this.touchActivity();
    const i = (e || "").trim() || "A soulful, emotional song about life and hope";
    try {
      const s = await this.ensureModelLoaded(n), o = `You are a professional hit songwriter.
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
3. Keep verses and chorus punchy, rhyming, and easy to sing.`, a = `Write song lyrics for: "${i}". Output only the lyrics starting with [verse].`, c = A.completion({
        modelId: s,
        history: [
          { role: "system", content: o },
          { role: "user", content: a }
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
      let l = "", u = !1, d = !1;
      const h = setTimeout(() => {
        if (!u) {
          d = !0, console.warn("[QwenLyricService] First token watchdog timed out (7s). Canceling run & activating fast synthesizer.");
          try {
            A.cancel({ requestId: c.requestId }).catch(() => {
            });
          } catch {
          }
        }
      }, 7e3);
      try {
        for await (const g of c.events) {
          if (d) break;
          if (g.type === "contentDelta" && g.text) {
            const v = g.text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "");
            v && (u || (u = !0, clearTimeout(h)), l += v, r == null || r(v));
          }
        }
      } catch (g) {
        console.warn("[QwenLyricService] Stream iteration warning/end:", g);
      } finally {
        clearTimeout(h);
      }
      const f = l.trim();
      if (!u || f.length < 30) {
        console.warn("[QwenLyricService] LLM output insufficient or timed out, synthesizing genre-tailored lyrics.");
        const g = this.getFallbackLyrics(i);
        for (const v of g)
          r == null || r(v), await new Promise((S) => setTimeout(S, 4));
        return this.touchActivity(), { lyrics: g, engine: "fallback" };
      }
      const p = f.startsWith("[") ? f : `[verse]
${f}`;
      return this.touchActivity(), { lyrics: p, engine: "qwen-1.7b" };
    } catch (s) {
      console.warn("[QwenLyricService] Qwen lyric generation failed, activating fallback:", s);
      const o = this.getFallbackLyrics(i);
      for (const a of o)
        r == null || r(a), await new Promise((c) => setTimeout(c, 4));
      return this.touchActivity(), { lyrics: o, engine: "fallback" };
    }
  }
  /**
   * Fast rule-based genre-tailored lyrical synthesizer
   */
  getFallbackLyrics(e) {
    const r = e.toLowerCase();
    return /(medieval|celtic|harp|fantasy|bard|tavern|folk|acoustic|woodland|castle)/.test(r) ? `[verse]
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
Peace to the fallen, beyond despair...` : /(synthwave|retro|neon|cyberpunk|80s|electronic|dance|edm|techno|club|future)/.test(r) ? `[verse]
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
Driving forever into the light...` : /(hip hop|hip-hop|rap|trap|drill|urban|rhyme|beats|808|freestyle)/.test(r) ? `[verse]
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
Turn the volume down low...` : /(rock|metal|punk|grunge|guitar|heavy|distortion|electric)/.test(r) ? `[verse]
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
This is what rock and roll is all about!` : /(pop|upbeat|happy|joy|bright|fun|summer|danceable)/.test(r) ? `[verse]
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
b(Re, "instance");
let yt = Re;
function Or(t, e, r, n) {
  const i = new ArrayBuffer(44), s = new DataView(i), o = r * (n / 8);
  ot(s, 0, "RIFF"), s.setUint32(4, 36 + t.byteLength, !0), ot(s, 8, "WAVE"), ot(s, 12, "fmt "), s.setUint32(16, 16, !0), s.setUint16(20, 1, !0), s.setUint16(22, r, !0), s.setUint32(24, e, !0), s.setUint32(28, e * o, !0), s.setUint16(32, o, !0), s.setUint16(34, n, !0), ot(s, 36, "data"), s.setUint32(40, t.byteLength, !0);
  const a = new Uint8Array(44 + t.byteLength);
  return a.set(new Uint8Array(i)), a.set(t, 44), a;
}
function ot(t, e, r) {
  for (let n = 0; n < r.length; n++)
    t.setUint8(e + n, r.charCodeAt(n));
}
function Nr(t) {
  return `data:audio/wav;base64,${Buffer.from(t.buffer, t.byteOffset, t.byteLength).toString("base64")}`;
}
function Rr(t, e, r, n = 64) {
  if (t.length === 0) return Array(n).fill(10);
  const i = [];
  if (e === 16) {
    const s = new Int16Array(t.buffer, t.byteOffset, Math.floor(t.byteLength / 2)), o = Math.max(1, Math.floor(s.length / n));
    for (let a = 0; a < n; a++) {
      let c = 0;
      const l = a * o, u = Math.min(s.length, l + o);
      for (let d = l; d < u; d += r) {
        const h = Math.abs(s[d]) / 32768;
        h > c && (c = h);
      }
      i.push(Math.max(6, Math.min(98, Math.round(c * 100))));
    }
  } else if (e === 32) {
    const s = new Float32Array(t.buffer, t.byteOffset, Math.floor(t.byteLength / 4)), o = Math.max(1, Math.floor(s.length / n));
    for (let a = 0; a < n; a++) {
      let c = 0;
      const l = a * o, u = Math.min(s.length, l + o);
      for (let d = l; d < u; d += r) {
        const h = Math.abs(s[d]);
        h > c && (c = h);
      }
      i.push(Math.max(6, Math.min(98, Math.round(c * 100))));
    }
  } else
    for (let s = 0; s < n; s++)
      i.push(Math.round(20 + Math.sin(s / 4) * 15));
  return i;
}
class ls {
  constructor() {
    b(this, "activeModelId");
    b(this, "activeEngine");
    b(this, "activeDitVariant");
    b(this, "activeRequestIds", /* @__PURE__ */ new Map());
    // taskId -> requestId
    b(this, "musicExportsDir");
    b(this, "logger", Vt.getInstance());
    var e;
    try {
      const r = (e = Y) != null && e.getPath ? Y.getPath("userData") : process.cwd();
      this.musicExportsDir = E.join(r, "music-exports"), y.existsSync(this.musicExportsDir) || y.mkdirSync(this.musicExportsDir, { recursive: !0 });
    } catch {
      this.musicExportsDir = E.join(process.cwd(), "music-exports");
    }
  }
  getActiveModelId() {
    return this.activeModelId;
  }
  /**
   * Assess hardware and memory fit for ACE-Step or MiniMax models before loading
   */
  async assessFit(e = "acestep", r = "turbo-q4") {
    try {
      if (e === "acestep") {
        const s = this.resolveDitModelSrc(r);
        return { success: !0, data: await A.assessModelFit({
          models: [
            {
              modelType: "audiogen",
              modelConfig: {
                engine: "acestep",
                textEncModelSrc: A.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
                lmModelSrc: A.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
                ditModelSrc: s,
                vaeModelSrc: A.AUDIOGEN_VAE_BF16,
                useGPU: !0
              }
            }
          ]
        }) };
      }
      const { lmModelSrc: n, synthModelSrc: i } = this.resolveMiniMaxModelPaths();
      return n && i ? { success: !0, data: await A.assessModelFit({
        models: [
          {
            modelType: "audiogen",
            modelConfig: {
              engine: "minimax",
              lmModelSrc: n,
              synthModelSrc: i,
              useGPU: !0
            }
          }
        ]
      }) } : { success: !0, message: "MiniMax assessment requires local model paths" };
    } catch (n) {
      return this.logger.logFailure({
        taskId: "assess-fit",
        engine: e,
        stage: "ASSESS_FIT",
        error: n,
        options: { engine: e, ditVariant: r }
      }), { success: !1, error: (n == null ? void 0 : n.message) || String(n) };
    }
  }
  /**
   * Discovers downloaded MiniMax-Music3 GGUF model files from disk cache (~/.qvac/models)
   */
  resolveMiniMaxModelPaths(e, r) {
    let n = e, i = r;
    const s = E.join(X.homedir(), ".qvac", "models");
    if (y.existsSync(s))
      try {
        const o = y.readdirSync(s);
        for (const a of o) {
          const c = a.toLowerCase();
          if (c.endsWith(".download") || c.endsWith(".tmp") || c.endsWith(".partial") || c.endsWith(".crdownload"))
            continue;
          const l = E.join(s, a);
          try {
            const u = y.statSync(l);
            if (!u.isFile() || u.size < 1024 * 1024) continue;
          } catch {
            continue;
          }
          if (!n && (c.includes("mm3-lm") || c.includes("minimax") && (c.includes("lm") || c.includes("transformer"))) && !c.includes("vocoder") && !c.includes("synth")) {
            if (a.includes("-imat.gguf")) {
              const u = a.replace("-imat.gguf", ".gguf"), d = E.join(s, u);
              if (!y.existsSync(d))
                try {
                  y.linkSync(l, d), console.log(`[MusicEngineService] Created quant-matched hardlink: ${u} -> ${a}`);
                } catch {
                  try {
                    y.symlinkSync(l, d);
                  } catch {
                  }
                }
              if (y.existsSync(d)) {
                n = d;
                continue;
              }
            }
            n = l;
          }
          !i && (c.includes("mm3-synth") || c.includes("minimax") && (c.includes("synth") || c.includes("vocoder"))) && !c.includes("transformer") && !c.includes("lm") && (i = l);
        }
      } catch (o) {
        console.warn("[MusicEngineService] Error resolving MiniMax model paths:", o);
      }
    return { lmModelSrc: n, synthModelSrc: i };
  }
  /**
   * Checks whether MiniMax Music-v3 models are installed and accessible on disk
   */
  areMiniMaxModelsAvailable() {
    const { lmModelSrc: e, synthModelSrc: r } = this.resolveMiniMaxModelPaths();
    return !!(e && r);
  }
  /**
   * Resolves the DiT model source constant based on user variant selection
   */
  resolveDitModelSrc(e) {
    switch (e) {
      case "turbo-q8":
        return A.AUDIOGEN_ACESTEP_V15_TURBO_Q8_0;
      case "sft-q8":
        return A.AUDIOGEN_ACESTEP_V15_SFT_Q8_0;
      case "base-q4":
        return A.AUDIOGEN_ACESTEP_V15_BASE_Q4_K_M || A.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
      case "turbo-q4":
      default:
        return A.AUDIOGEN_ACESTEP_V15_TURBO_Q4_K_M;
    }
  }
  /**
   * Ensures the appropriate AudioGen model is loaded in QVAC runtime
   */
  async ensureModelLoaded(e, r) {
    const n = e.engine || "acestep", i = e.ditVariant || "turbo-q4";
    if (this.activeModelId && this.activeEngine === n && (n === "minimax" || this.activeDitVariant === i))
      return this.activeModelId;
    if (this.activeModelId) {
      try {
        await A.unloadModel({ modelId: this.activeModelId });
      } catch (s) {
        console.warn("[MusicEngineService] Warning unloading prior model:", s);
      }
      this.activeModelId = void 0;
    }
    if (n === "acestep") {
      const s = this.resolveDitModelSrc(i);
      r == null || r({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Preparing ACE-Step AudioGen models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading ACE-Step (${i}) into QVAC runtime`);
      try {
        const o = await A.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "acestep",
            textEncModelSrc: A.AUDIOGEN_QWEN3_EMBEDDING_0_6B_Q8_0,
            lmModelSrc: A.AUDIOGEN_ACESTEP_5HZ_LM_0_6B_Q8_0,
            ditModelSrc: s,
            vaeModelSrc: A.AUDIOGEN_VAE_BF16,
            useGPU: e.useGPU !== !1,
            inferenceSteps: e.inferenceSteps || 8
          },
          onProgress: (a) => {
            var u;
            const c = (d) => (d / 1e6).toFixed(1), l = ((u = a.downloadKey) == null ? void 0 : u.split("/").pop()) || a.downloadKey || "model";
            r == null || r({
              taskId: "model-load",
              stage: "Downloading",
              step: Math.round(a.downloaded / 1e6),
              total: Math.round(a.total / 1e6),
              percentage: a.percentage,
              message: `Downloading ${l}: ${a.percentage.toFixed(0)}% (${c(a.downloaded)}/${c(a.total)} MB)`
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
          resolvedPaths: { ditModelSrc: s }
        }), o;
      }
    } else {
      const { lmModelSrc: s, synthModelSrc: o } = this.resolveMiniMaxModelPaths(e.lmModelSrc, e.synthModelSrc);
      if (!s || !o) {
        const c = "MiniMax-Music3 model files are not installed. Please download the MiniMax models first.";
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "RESOLVE_MINIMAX_PATHS",
          error: new Error(c),
          options: e,
          resolvedPaths: { lmModelSrc: s, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ MiniMax Model Load Failed: missing model paths", {
          lmModelSrc: s,
          synthModelSrc: o,
          optionsLm: e.lmModelSrc,
          optionsSynth: e.synthModelSrc
        }), new Error(c);
      }
      r == null || r({
        taskId: "model-load",
        stage: "Loading Models",
        step: 0,
        total: 100,
        percentage: 0,
        message: "Loading MiniMax-Music3 local GGUF models..."
      }), this.logger.logMilestone("model-load", "LOAD_START", `Loading MiniMax models into QVAC runtime (LM: ${s}, Synth: ${o})`), await yt.getInstance().unload();
      const a = X.freemem() / 1024 ** 3;
      a < 8 && (this.logger.logMilestone(
        "model-load",
        "LOW_MEMORY",
        `Only ${a.toFixed(1)} GB reported free before MiniMax load; generation may be slow. Close heavy apps for best speed.`
      ), console.warn(`[MusicEngineService] Low free memory before MiniMax load: ${a.toFixed(1)} GB`));
      try {
        const c = await A.loadModel({
          modelType: "audiogen",
          modelConfig: {
            engine: "minimax",
            lmModelSrc: s,
            synthModelSrc: o,
            device: e.useGPU === !1 ? "cpu" : "gpu",
            ...e.threads !== void 0 && { threads: e.threads }
          }
        });
        return this.activeModelId = c, this.activeEngine = "minimax", this.logger.logMilestone("model-load", "LOAD_SUCCESS", `MiniMax model loaded successfully! ID: ${c}`), c;
      } catch (c) {
        throw this.logger.logFailure({
          taskId: "model-load",
          engine: "minimax",
          stage: "LOAD_MINIMAX_RUNTIME",
          error: c,
          options: e,
          resolvedPaths: { lmModelSrc: s, synthModelSrc: o }
        }), console.error("[MusicEngineService] ✖ Failed to load MiniMax models in QVAC runtime:", {
          error: (c == null ? void 0 : c.message) || String(c),
          code: c == null ? void 0 : c.code,
          stack: c == null ? void 0 : c.stack,
          lmModelSrc: s,
          synthModelSrc: o
        }), c;
      }
    }
  }
  /**
   * Generates music track based on prompt, lyrics, and musical controls
   */
  async generate(e, r, n, i) {
    const { taskId: s, caption: o } = e;
    if (!o || !o.trim())
      return { success: !1, error: "Caption is required and cannot be empty." };
    this.logger.logSessionStart({
      taskId: s,
      engine: e.engine || "acestep",
      caption: o,
      lyrics: e.lyrics,
      isInstrumental: e.isInstrumental,
      duration: e.duration,
      ditVariant: e.ditVariant,
      seed: e.seed
    });
    try {
      n == null || n({ text: `▸ Initializing Music Generation: "${o}"`, stream: "system" });
      const a = await this.ensureModelLoaded(e, r);
      if (i != null && i())
        return this.logger.logMilestone(s, "CANCELLED", "Cancelled by user before synthesis started"), { success: !1, error: "Cancelled by user before synthesis started." };
      this.logger.logMilestone(s, "MODEL_READY", `Model ID: ${a} (${e.engine || "acestep"})`), n == null || n({ text: `▸ Model loaded successfully: ${a} (Engine: ${e.engine || "acestep"})`, stream: "system" });
      const c = e.engine || "acestep", l = Zt.getInstance().sanitize({
        caption: e.caption,
        lyrics: e.lyrics,
        isInstrumental: e.isInstrumental,
        vocalMode: e.vocalMode,
        duration: e.duration,
        engine: c,
        bpm: e.bpm,
        keyscale: e.keyscale,
        timesignature: e.timesignature,
        vocalLanguage: e.vocalLanguage,
        ditVariant: e.ditVariant,
        simpleMode: e.simpleMode,
        taskType: e.taskType
      });
      this.logger.logMilestone(
        s,
        "SANITIZED",
        `Cleaned Caption: "${l.caption.slice(0, 80)}..." | Target Duration: ${l.duration}s | LyricsLength: ${l.lyrics.length} | Mode: ${l.isInstrumental ? "INSTRUMENTAL" : "VOCAL"}${l.vocalHintInjected ? ` | VocalInjected: "${l.vocalHintInjected}"` : ""}`
      ), n == null || n({
        text: `▸ Request Sanitized: "${l.caption.slice(0, 60)}..." (Mode: ${l.isInstrumental ? "Instrumental" : "Vocal"}, Duration: ${l.duration}s)`,
        stream: "system"
      });
      let u = {
        modelId: a,
        caption: l.caption,
        lyrics: l.lyrics,
        duration: l.duration
      };
      if (e.seed !== void 0 && (u.seed = e.seed), c === "acestep") {
        if (l.duration > 60) {
          if (this.areMiniMaxModelsAvailable())
            return this.logger.logMilestone(
              s,
              "ENGINE_ELEVATED",
              `Extended duration (${l.duration}s) exceeds ACE-Step's 60s window. Seamlessly routing to MiniMax Music-v3 Global LM.`
            ), await this.generate({
              ...e,
              engine: "minimax"
            }, r, n, i);
          this.logger.logMilestone(
            s,
            "DURATION_CLAMPED",
            `ACE-Step 5Hz LM natively supports up to 60s. Clamping from ${l.duration}s to 60s to ensure successful synthesis.`
          ), l.duration = 60, u.duration = 60;
        }
        e.simpleMode !== !1 && !l.isInstrumental && !e.lyrics ? (u.simpleMode = !0, delete u.lyrics) : l.isInstrumental && (u.simpleMode = !1, u.lyrics = "[Instrumental]"), !e.vocalLanguage && !l.isInstrumental && (u.vocalLanguage = "en");
      }
      if (c === "acestep") {
        e.bpm !== void 0 && (u.bpm = e.bpm), e.keyscale && (u.keyscale = e.keyscale), e.timesignature && (u.timesignature = e.timesignature), e.vocalLanguage && (u.vocalLanguage = e.vocalLanguage), e.augmentCaptionWithMetadata && (u.augmentCaptionWithMetadata = !0), u.simpleMode || e.simpleMode ? u.simpleMode = !0 : e.rewriteQuery && (u.rewriteQuery = !0), e.generateLrc && (u.generateLrc = !0), e.computeQualityScore && (u.computeQualityScore = !0), e.normalizeLoudness !== void 0 ? u.normalizeLoudness = e.normalizeLoudness : u.normalizeLoudness = !0;
        const L = !e.ditVariant || e.ditVariant.includes("turbo");
        L ? e.guidanceScale && e.guidanceScale > 1.5 ? (console.warn(`[MusicEngineService] Clamping high guidanceScale (${e.guidanceScale}) to 1.0 on turbo DiT to prevent distortion.`), u.guidanceScale = 1) : u.guidanceScale = e.guidanceScale !== void 0 ? e.guidanceScale : 0 : u.guidanceScale = e.guidanceScale !== void 0 ? e.guidanceScale : 7, L ? e.shift && e.shift < 2 ? (console.warn(`[MusicEngineService] Correcting low shift (${e.shift}) to 3.0 on turbo DiT for acoustic clarity.`), u.shift = 3) : u.shift = e.shift !== void 0 ? e.shift : 3 : u.shift = e.shift !== void 0 ? e.shift : 1, u.dcwEnabled = e.dcwEnabled !== void 0 ? e.dcwEnabled : !0, u.dcwScaler = e.dcwScaler !== void 0 ? e.dcwScaler : 0.05, u.dcwHighScaler = e.dcwHighScaler !== void 0 ? e.dcwHighScaler : 0.02, e.inferenceSteps ? u.inferenceSteps = Math.max(L ? 8 : 30, e.inferenceSteps) : u.inferenceSteps = L ? 10 : 50, e.referenceAudio && (u.referenceAudio = e.referenceAudio), e.taskType && e.taskType !== "text2music" && (u.taskType = e.taskType, e.sourceAudio && (u.sourceAudio = e.sourceAudio), e.taskType === "cover-nofsq" ? (u.audioCoverStrength = 1, u.coverNoiseStrength = e.coverNoiseStrength ?? 0.75) : e.taskType === "lego" && e.track && (u.track = e.track));
      } else
        u.cfgScale = e.cfgScale !== void 0 ? e.cfgScale : 1.8, e.maxFrames !== void 0 && (u.maxFrames = e.maxFrames, delete u.duration), e.inferenceSteps && e.inferenceSteps >= 16 ? u.inferenceSteps = e.inferenceSteps : u.inferenceSteps = 22;
      n == null || n({ text: "▸ Starting QVAC audioGen inference run...", stream: "system" });
      const d = A.audioGen(u);
      this.activeRequestIds.set(s, d.requestId), n == null || n({ text: `▸ Assigned requestId: ${d.requestId}`, stream: "system" }), (async () => {
        const L = /* @__PURE__ */ new Map(), Q = (U) => {
          const J = Math.max(0, Math.round(U / 1e3));
          return J >= 60 ? `${Math.floor(J / 60)}m ${J % 60}s` : `${J}s`;
        };
        try {
          for await (const U of d.progressStream) {
            if (i != null && i()) break;
            const J = U.total > 0 ? Math.round(U.step / U.total * 100) : 0;
            let ze = U.total > 0 ? `${U.stage}: step ${U.step}/${U.total}` : `${U.stage}: step ${U.step}`;
            L.has(U.stage) || L.set(U.stage, Date.now());
            let rt, We;
            const re = U.total > 12 ? 5 : 2;
            if (U.total > 0 && U.step >= re && U.step < U.total) {
              const nt = (Date.now() - L.get(U.stage)) / U.step * (U.total - U.step);
              rt = Math.max(1, Math.round(nt / 1e3)), We = Q(nt), ze += ` · ~${We} remaining`;
            }
            r == null || r({
              taskId: s,
              stage: U.stage,
              step: U.step,
              total: U.total,
              percentage: J,
              message: ze,
              etaSeconds: rt,
              etaFormatted: We
            }), n == null || n({ text: `▸ [${U.stage}] ${U.step}/${U.total || "?"}`, stream: "stdout" });
          }
        } catch {
        }
      })();
      const [h, f] = await Promise.all([d.audio, d.stats]);
      this.activeRequestIds.delete(s);
      const p = f == null ? void 0 : f.backendId, g = p === 1 ? "Metal (Apple GPU)" : p === 2 ? "CUDA (GPU)" : p === 0 ? "CPU" : p !== void 0 ? `Backend #${p}` : "Metal (Apple GPU)", v = f == null ? void 0 : f.gpuFallbackReason;
      this.logger.logMilestone(
        s,
        "BACKEND_STATS",
        `Compute Backend: ${g}${v && v !== 0 ? ` (Fallback Reason: ${v})` : ""}`
      ), n == null || n({
        text: `▸ Compute Backend: ${g}`,
        stream: "system"
      });
      const S = f;
      if (S && (S.arMs !== void 0 || S.flowMs !== void 0 || S.totalTimeMs !== void 0)) {
        const L = (U) => typeof U == "number" ? `${(U / 1e3).toFixed(1)}s` : "n/a", Q = `total=${L(S.totalTimeMs)} | AR=${L(S.arMs)} | condition=${L(S.conditionMs)} | flow=${L(S.flowMs)} | vocoder=${L(S.vocoderMs)} | frames=${S.emittedFrames ?? "n/a"}${S.emittedFrames ? ` (~${(S.emittedFrames / 25).toFixed(0)}s audio)` : ""} | RTF=${typeof S.realTimeFactor == "number" ? S.realTimeFactor.toFixed(2) : "n/a"}`;
        this.logger.logMilestone(s, "STAGE_TIMINGS", Q), n == null || n({ text: `▸ Stage timings: ${Q}`, stream: "system" });
      }
      n == null || n({ text: `▸ Synthesis completed! Mastering ${h.pcm.byteLength} raw PCM bytes...`, stream: "system" });
      const { masteredPcm: _, details: R } = gt.getInstance().masterPcm(
        h.pcm,
        h.sampleRate,
        h.channels,
        h.bitsPerSample
      );
      this.logger.logMilestone(s, "DSP_MASTERED", R), n == null || n({ text: `▸ Audio Mastered: ${R}`, stream: "system" });
      const M = Or(_, h.sampleRate, h.channels, h.bitsPerSample), O = `music-${Date.now()}-${s.slice(0, 8)}.wav`, x = E.join(this.musicExportsDir, O);
      let C = "";
      try {
        y.writeFileSync(x, Buffer.from(M.buffer, M.byteOffset, M.byteLength)), C = `echo-media://${x}`, n == null || n({ text: `▸ Exported WAV saved to: ${x}`, stream: "system" });
      } catch (L) {
        console.warn("[MusicEngineService] Could not write export file, falling back to data URI:", L), C = Nr(M);
      }
      const I = Rr(h.pcm, h.bitsPerSample, h.channels, 64), P = (f == null ? void 0 : f.audioDurationMs) || Math.round(h.pcm.byteLength / (h.bitsPerSample / 8) / h.channels / h.sampleRate * 1e3), N = f == null ? void 0 : f.metadata, F = {
        id: `music_gen_${Date.now()}`,
        taskId: s,
        caption: (N == null ? void 0 : N.caption) || o,
        lyrics: (N == null ? void 0 : N.lyrics) || e.lyrics,
        audioUrl: C,
        wavFilePath: x,
        durationMs: P,
        sampleRate: h.sampleRate,
        channels: h.channels,
        bitsPerSample: h.bitsPerSample,
        waveform: I,
        bpm: (N == null ? void 0 : N.bpm) ?? e.bpm,
        keyscale: (N == null ? void 0 : N.keyscale) ?? e.keyscale,
        timesignature: N != null && N.beatsPerBar ? `${N.beatsPerBar}/4` : e.timesignature,
        vocalLanguage: (N == null ? void 0 : N.vocalLanguage) ?? e.vocalLanguage,
        isInstrumental: e.isInstrumental ?? u.lyrics === "[Instrumental]",
        seed: (N == null ? void 0 : N.seed) ?? e.seed,
        taskType: e.taskType || "text2music",
        lrc: f == null ? void 0 : f.lrc,
        lyricsScore: f == null ? void 0 : f.lyricsScore,
        qualityScore: f == null ? void 0 : f.qualityScore,
        qualityReport: N == null ? void 0 : N.qualityReport,
        stats: f,
        metadata: N,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return this.logger.logSuccess(s, F), n == null || n({ text: `▸ Music generation finished successfully (${(P / 1e3).toFixed(1)}s)`, stream: "system" }), { success: !0, data: F };
    } catch (a) {
      if (this.activeRequestIds.delete(s), a instanceof A.InferenceCancelledError || i != null && i())
        return console.warn(`[MusicEngineService] Generation cancelled for task ${s}`), this.logger.logMilestone(s, "CANCELLED", "Generation was cancelled by user"), n == null || n({ text: "▸ Music generation cancelled.", stream: "stderr" }), { success: !1, error: "Generation was cancelled." };
      const c = e.engine === "minimax" ? this.resolveMiniMaxModelPaths(e.lmModelSrc, e.synthModelSrc) : { ditModelSrc: this.resolveDitModelSrc(e.ditVariant) };
      return this.logger.logFailure({
        taskId: s,
        engine: e.engine || "acestep",
        stage: "INFERENCE_RUN",
        error: a,
        options: e,
        resolvedPaths: c
      }), console.error(`[MusicEngineService] ✖ Music Generation FAILED for task ${s}:`, {
        error: (a == null ? void 0 : a.message) || String(a),
        code: a == null ? void 0 : a.code,
        stack: a == null ? void 0 : a.stack,
        cause: a == null ? void 0 : a.cause,
        options: {
          engine: e.engine || "acestep",
          caption: e.caption,
          lyrics: e.lyrics ? `${e.lyrics.slice(0, 80)}...` : void 0,
          duration: e.duration,
          ditVariant: e.ditVariant
        }
      }), n == null || n({
        text: `✖ Generation Failed: ${(a == null ? void 0 : a.message) || String(a)}${a != null && a.stack ? `
${a.stack}` : ""}`,
        stream: "stderr"
      }), {
        success: !1,
        error: (a == null ? void 0 : a.message) || "Music generation failed.",
        errorDetails: {
          code: a == null ? void 0 : a.code,
          stage: "INFERENCE_RUN",
          engine: e.engine || "acestep",
          stack: a == null ? void 0 : a.stack,
          cause: a == null ? void 0 : a.cause
        }
      };
    }
  }
  /**
   * Edits an existing recording using ACE-Step Flow-Edit or Repaint operations
   */
  async edit(e, r, n, i) {
    const { taskId: s, sourceAudio: o, operations: a } = e;
    if (!o)
      return { success: !1, error: "sourceAudio is required for editing." };
    if (!a || a.length === 0)
      return { success: !1, error: "At least one edit operation is required." };
    try {
      n == null || n({ text: `▸ Starting Audio Edit with ${a.length} operation(s)...`, stream: "system" });
      const l = {
        modelId: await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4", useGPU: e.useGPU }, r),
        sourceAudio: o,
        operations: a,
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
      }, u = A.audioEdit(l);
      this.activeRequestIds.set(s, u.requestId), (async () => {
        try {
          for await (const O of u.progressStream) {
            if (i != null && i()) break;
            const x = O.total > 0 ? Math.round(O.step / O.total * 100) : 0;
            r == null || r({
              taskId: s,
              stage: O.stage,
              step: O.step,
              total: O.total,
              percentage: x,
              message: `${O.stage}: ${O.step}/${O.total}`
            });
          }
        } catch {
        }
      })();
      const [d, h] = await Promise.all([u.audio, u.stats]);
      this.activeRequestIds.delete(s);
      const { masteredPcm: f } = gt.getInstance().masterPcm(
        d.pcm,
        d.sampleRate,
        d.channels,
        d.bitsPerSample
      ), p = Or(f, d.sampleRate, d.channels, d.bitsPerSample), g = `music-edit-${Date.now()}-${s.slice(0, 8)}.wav`, v = E.join(this.musicExportsDir, g);
      let S = "";
      try {
        y.writeFileSync(v, Buffer.from(p.buffer, p.byteOffset, p.byteLength)), S = `echo-media://${v}`;
      } catch {
        S = Nr(p);
      }
      const _ = Rr(d.pcm, d.bitsPerSample, d.channels, 64), R = (h == null ? void 0 : h.audioDurationMs) || Math.round(d.pcm.byteLength / (d.bitsPerSample / 8) / d.channels / d.sampleRate * 1e3);
      return { success: !0, data: {
        id: `music_edit_${Date.now()}`,
        taskId: s,
        caption: `Edit (${a.map((O) => O.type).join(" + ")})`,
        audioUrl: S,
        wavFilePath: v,
        durationMs: R,
        sampleRate: d.sampleRate,
        channels: d.channels,
        bitsPerSample: d.bitsPerSample,
        waveform: _,
        stats: h,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      } };
    } catch (c) {
      return this.activeRequestIds.delete(s), c instanceof A.InferenceCancelledError || i != null && i() ? { success: !1, error: "Edit was cancelled." } : { success: !1, error: (c == null ? void 0 : c.message) || "Audio edit failed." };
    }
  }
  /**
   * Describes an existing recording using ACE-Step reverse analysis pipeline
   */
  async understand(e, r, n) {
    const { taskId: i, sourceAudio: s, vocalLanguage: o, seed: a } = e;
    if (!s)
      return { success: !1, error: "sourceAudio is required for audio understand." };
    try {
      n == null || n({ text: "▸ Analyzing audio recording with ACE-Step AudioUnderstand...", stream: "system" });
      const l = {
        modelId: await this.ensureModelLoaded({ engine: "acestep", ditVariant: "turbo-q4" }, r),
        sourceAudio: s,
        ...o && { vocalLanguage: o },
        ...a !== void 0 && { seed: a },
        ...e.lmTemperature !== void 0 && { lmTemperature: e.lmTemperature },
        ...e.lmTopP !== void 0 && { lmTopP: e.lmTopP },
        ...e.lmTopK !== void 0 && { lmTopK: e.lmTopK }
      }, u = A.audioUnderstand(l);
      this.activeRequestIds.set(i, u.requestId), (async () => {
        try {
          for await (const h of u.progressStream) {
            const f = h.total > 0 ? Math.round(h.step / h.total * 100) : 0;
            r == null || r({
              taskId: i,
              stage: h.stage,
              step: h.step,
              total: h.total,
              percentage: f,
              message: `${h.stage}: ${h.step}/${h.total}`
            });
          }
        } catch {
        }
      })();
      const d = await u.description;
      return this.activeRequestIds.delete(i), n == null || n({ text: `▸ Analysis complete! Detected: ${d.bpm} BPM, ${d.keyscale}, ${d.timesignature}`, stream: "system" }), {
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
    } catch (c) {
      return this.activeRequestIds.delete(i), { success: !1, error: (c == null ? void 0 : c.message) || "Audio analysis failed." };
    }
  }
  /**
   * Hard-cancels an in-flight QVAC generation or edit task
   */
  cancel(e) {
    const r = this.activeRequestIds.get(e);
    if (r)
      try {
        return A.cancel({ requestId: r }), this.activeRequestIds.delete(e), !0;
      } catch (n) {
        console.warn(`[MusicEngineService] Failed to cancel request ${r}:`, n);
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
        return await A.unloadModel({ modelId: this.activeModelId }), this.activeModelId = void 0, this.activeEngine = void 0, this.activeDitVariant = void 0, !0;
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
class us {
  constructor() {
    b(this, "activeTasks", /* @__PURE__ */ new Set());
    b(this, "engineService");
    b(this, "historyFilePath");
    b(this, "historyCache", []);
    var e;
    this.engineService = new ls();
    try {
      const r = (e = Y) != null && e.getPath ? Y.getPath("userData") : process.cwd();
      this.historyFilePath = E.join(r, "music-history.json"), this.loadHistoryFromDisk();
    } catch {
      this.historyFilePath = E.join(process.cwd(), "music-history.json");
    }
  }
  sanitizeItem(e) {
    const r = { ...e };
    return r.wavFilePath && y.existsSync(r.wavFilePath) ? r.audioUrl = `echo-media://${r.wavFilePath}` : r.audioUrl && r.audioUrl.startsWith("data:") && r.audioUrl.length > 5e4 && (r.audioUrl = ""), r;
  }
  loadHistoryFromDisk() {
    try {
      if (y.existsSync(this.historyFilePath)) {
        const e = y.readFileSync(this.historyFilePath, "utf-8"), r = JSON.parse(e);
        Array.isArray(r) && (this.historyCache = r.map((n) => this.sanitizeItem(n)));
      }
    } catch (e) {
      console.warn("[MusicService] Could not read music history:", e), this.historyCache = [];
    }
  }
  saveHistoryToDisk() {
    try {
      const e = this.historyCache.slice(0, 100).map((r) => this.sanitizeItem(r));
      y.writeFileSync(this.historyFilePath, JSON.stringify(e, null, 2), "utf-8");
    } catch (e) {
      console.warn("[MusicService] Could not write music history:", e);
    }
  }
  getModelStatus() {
    return this.engineService.getStatus();
  }
  async assessFit(e, r) {
    return this.engineService.assessFit(e, r);
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
  async generateMusic(e, r, n) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      const s = await this.engineService.generate(
        e,
        r,
        n,
        () => this.isCancelled(i)
      );
      return s.success && s.data && (this.historyCache.unshift(s.data), this.saveHistoryToDisk()), s;
    } finally {
      this.activeTasks.delete(i);
    }
  }
  async editMusic(e, r, n) {
    const { taskId: i } = e;
    this.activeTasks.add(i);
    try {
      const s = await this.engineService.edit(
        e,
        r,
        n,
        () => this.isCancelled(i)
      );
      return s.success && s.data && (this.historyCache.unshift(s.data), this.saveHistoryToDisk()), s;
    } finally {
      this.activeTasks.delete(i);
    }
  }
  async understandMusic(e, r, n) {
    return this.engineService.understand(e, r, n);
  }
  listHistory() {
    return this.historyCache;
  }
  getHistoryItem(e) {
    return this.historyCache.find((r) => r.id === e || r.taskId === e);
  }
  saveHistoryItem(e) {
    const r = this.historyCache.findIndex((n) => n.id === e.id);
    return r >= 0 ? this.historyCache[r] = e : this.historyCache.unshift(e), this.saveHistoryToDisk(), !0;
  }
  deleteHistoryItem(e) {
    const r = this.historyCache.length;
    return this.historyCache = this.historyCache.filter((n) => n.id !== e), this.historyCache.length !== r ? (this.saveHistoryToDisk(), !0) : !1;
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
class ds extends Le {
  constructor(e, r) {
    super(), this.musicService = e, this.activityRepo = r;
  }
  init() {
    z.handle(
      $.MUSIC_GENERATE,
      async (e, r) => {
        const n = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_PROGRESS, o);
          } catch (a) {
            console.warn("[MusicController] Failed to send progress event:", a);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (a) {
            console.warn("[MusicController] Failed to send log event:", a);
          }
        }, s = await this.musicService.generateMusic(r, n, i);
        if (s.success && s.data) {
          this.saveMusicActivity(s.data);
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_COMPLETE, {
              taskId: r.taskId,
              generation: s.data
            });
          } catch (o) {
            console.warn("[MusicController] Failed to send complete event:", o);
          }
        } else if (!s.success) {
          console.error(
            `[MusicController] ✖ Music generation failed for taskId ${r.taskId} (Engine: ${r.engine || "acestep"}):`,
            s.error
          ), i({
            text: `✖ Music Generation Failed: ${s.error}`,
            stream: "stderr"
          });
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_ERROR, {
              taskId: r.taskId,
              error: s.error || "Music generation failed",
              details: s.errorDetails
            });
          } catch (o) {
            console.warn("[MusicController] Failed to send error event:", o);
          }
        }
        return s;
      }
    ), z.handle(
      $.MUSIC_CANCEL,
      async (e, { taskId: r }) => ({ success: this.musicService.cancelGeneration(r), taskId: r })
    ), z.handle(
      $.MUSIC_EDIT,
      async (e, r) => {
        const n = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_PROGRESS, o);
          } catch (a) {
            console.warn("[MusicController] Failed to send progress event:", a);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (a) {
            console.warn("[MusicController] Failed to send log event:", a);
          }
        }, s = await this.musicService.editMusic(r, n, i);
        return s.success && s.data && this.saveMusicActivity(s.data), s;
      }
    ), z.handle(
      $.MUSIC_UNDERSTAND,
      async (e, r) => {
        const n = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_PROGRESS, o);
          } catch (a) {
            console.warn("[MusicController] Failed to send progress event:", a);
          }
        }, i = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: o.text,
              stream: o.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (a) {
            console.warn("[MusicController] Failed to send log event:", a);
          }
        };
        return await this.musicService.understandMusic(r, n, i);
      }
    ), z.handle($.MUSIC_MODEL_STATUS, async () => ({
      success: !0,
      data: this.musicService.getModelStatus()
    })), z.handle(
      $.MUSIC_ASSESS_FIT,
      async (e, r) => this.musicService.assessFit(r == null ? void 0 : r.engine, r == null ? void 0 : r.ditVariant)
    ), z.handle($.MUSIC_UNLOAD_MODEL, async () => ({ success: await this.musicService.unloadModel() })), z.handle($.MUSIC_HISTORY_LIST, async () => ({
      success: !0,
      data: this.musicService.listHistory()
    })), z.handle(
      $.MUSIC_HISTORY_SAVE,
      async (e, r) => {
        const n = this.musicService.saveHistoryItem(r);
        return n && this.saveMusicActivity(r), { success: n };
      }
    ), z.handle(
      $.MUSIC_HISTORY_DELETE,
      async (e, { id: r }) => {
        const n = this.musicService.deleteHistoryItem(r);
        return this.activityRepo && this.activityRepo.deleteActivity(`act-music-${r}`).catch(console.error), { success: n };
      }
    ), z.handle($.MUSIC_HISTORY_CLEAR, async () => ({ success: this.musicService.clearHistory() })), z.handle($.MUSIC_GET_LOGS, async (e, r) => ({ success: !0, data: this.musicService.getGenerationLogs(r) })), z.handle($.MUSIC_CLEAR_LOGS, async () => ({ success: this.musicService.clearGenerationLogs() })), z.handle(
      $.MUSIC_GENERATE_LYRICS,
      async (e, r) => {
        const n = r.taskId || `lyric_task_${Date.now()}`, i = (s) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.MUSIC_LYRICS_TOKEN, { taskId: n, token: s });
          } catch {
          }
        };
        try {
          const s = await yt.getInstance().generateLyricsStream(r.prompt, i);
          return { success: !0, lyrics: s.lyrics, engine: s.engine, taskId: n };
        } catch (s) {
          return console.error("[MusicController] Error generating lyrics with Qwen:", s), { success: !1, error: (s == null ? void 0 : s.message) || "Failed to generate lyrics", taskId: n };
        }
      }
    );
  }
  saveMusicActivity(e) {
    if (!this.activityRepo) return;
    const r = e.caption || "Music Track", n = r.length > 50 ? `${r.slice(0, 47)}...` : r, i = e.wavFilePath ? `echo-media://${e.wavFilePath}` : e.audioUrl && e.audioUrl.length > 5e4 ? "" : e.audioUrl;
    this.activityRepo.saveActivity({
      id: `act-music-${e.id}`,
      type: "music",
      title: n,
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
    }).catch((s) => console.error("[MusicController] Failed to auto-save activity:", s));
  }
}
function Wt(t) {
  const e = Object.values(t).filter((n) => typeof n == "number");
  return Object.entries(t).filter(([n, i]) => e.indexOf(+n) === -1).map(([n, i]) => i);
}
function Pr(t, e = "|") {
  return t.map((r) => Tn(r)).join(e);
}
function qt(t, e) {
  return typeof e == "bigint" ? e.toString() : e;
}
class hs {
  constructor(e) {
    this._getter = e, this._value = void 0;
  }
  get value() {
    const e = this._getter;
    return e !== void 0 && (this._value = e(), this._getter = void 0), this._value;
  }
}
function sr(t) {
  return new hs(t);
}
function fs(t) {
  return t == null;
}
function or(t) {
  const e = t.startsWith("^") ? 1 : 0, r = t.endsWith("$") ? t.length - 1 : t.length;
  return t.slice(e, r);
}
function ms(t, e) {
  const r = t / e, n = Math.round(r), i = 4 * Number.EPSILON * Math.max(Math.abs(r), 1);
  return Math.abs(r - n) < i ? 0 : r - n;
}
function Ee(t, e, r) {
  Object.defineProperty(t, e, {
    value: r,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function wn(t) {
  const e = Object.getOwnPropertyDescriptor(t, "shape");
  return e != null && e.get ? e.get.raw : e == null ? void 0 : e.value;
}
function me(t) {
  return wn(t._zod.def) ?? t._zod.def.shape;
}
function _n(t, e, r) {
  Object.defineProperty(t, e, {
    get() {
      const n = r();
      return Ee(this, e, n), n;
    },
    enumerable: !0,
    configurable: !0
  });
}
function bn(t, e, r) {
  e in t ? Ee(t, e, r) : t[e] = r;
}
function De(t, e, r, n) {
  const i = me(e);
  for (const s of r) {
    const o = Object.getOwnPropertyDescriptor(i, s);
    o.enumerable && (o.get ? _n(t, s, () => {
      const a = e._zod.def.shape[s];
      return n ? n(a, s) : a;
    }) : bn(t, s, n ? n(o.value, s) : o.value));
  }
}
function ps(t, e) {
  for (const r of Reflect.ownKeys(e)) {
    const n = Object.getOwnPropertyDescriptor(e, r);
    n.enumerable && (n.get ? _n(t, r, () => e[r]) : bn(t, r, n.value));
  }
}
function te(...t) {
  const e = {};
  for (const r of t) {
    const n = Object.getOwnPropertyDescriptors(r);
    Object.assign(e, n);
  }
  return Object.defineProperties({}, e);
}
function gs(t) {
  return JSON.stringify(t);
}
function ys(t) {
  return t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const En = "captureStackTrace" in Error ? Error.captureStackTrace : (...t) => {
};
function vt(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
const vs = /* @__PURE__ */ sr(() => {
  var t;
  if (ue.jitless || typeof navigator < "u" && ((t = navigator == null ? void 0 : navigator.userAgent) != null && t.includes("Cloudflare")))
    return !1;
  try {
    const e = Function;
    return new e(""), !0;
  } catch {
    return !1;
  }
});
function je(t) {
  if (vt(t) === !1)
    return !1;
  const e = t.constructor;
  if (e === void 0 || typeof e != "function")
    return !0;
  const r = e.prototype;
  return !(vt(r) === !1 || Object.prototype.hasOwnProperty.call(r, "isPrototypeOf") === !1);
}
function In(t) {
  return je(t) ? { ...t } : Array.isArray(t) ? [...t] : t instanceof Map ? new Map(t) : t instanceof Set ? new Set(t) : t;
}
const Ss = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function Tt(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Ie(t, e, r) {
  const n = new t._zod.constr(e ?? t._zod.def);
  return (!e || r != null && r.parent) && (n._zod.parent = t), n;
}
function k(t) {
  const e = t;
  if (!e)
    return {};
  if (typeof e == "string")
    return { error: () => e };
  if ((e == null ? void 0 : e.message) !== void 0) {
    if ((e == null ? void 0 : e.error) !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    e.error = e.message;
  }
  return delete e.message, typeof e.error == "string" ? { ...e, error: () => e.error } : e;
}
function Tn(t) {
  return typeof t == "bigint" ? t.toString() + "n" : typeof t == "string" ? `"${t}"` : `${t}`;
}
function ws(t) {
  return Object.keys(t).filter((e) => t[e]._zod.optin !== void 0 && t[e]._zod.optout === "optional");
}
const Cn = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, _s = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function bs(t, e) {
  const r = t._zod.def, n = r.checks;
  if (n && n.length > 0)
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  const s = {};
  return De(s, t, Ct(t, e)), Ie(t, te(r, { shape: s, checks: [] }));
}
function Ct(t, e) {
  var i;
  const r = me(t), n = [];
  for (const s of Reflect.ownKeys(e)) {
    if (!((i = Object.getOwnPropertyDescriptor(r, s)) != null && i.enumerable))
      throw new Error(`Unrecognized key: "${String(s)}"`);
    e[s] && n.push(s);
  }
  return n;
}
function Es(t, e) {
  const r = t._zod.def, n = r.checks;
  if (n && n.length > 0)
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  const s = new Set(Ct(t, e)), o = {};
  return De(o, t, Reflect.ownKeys(me(t)).filter((a) => !s.has(a))), Ie(t, te(r, { shape: o, checks: [] }));
}
function Is(t, e) {
  if (!je(e))
    throw new Error("Invalid input to extend: expected a plain object");
  const r = t._zod.def.checks;
  if (r && r.length > 0) {
    const i = me(t);
    for (const s of Reflect.ownKeys(e))
      if (Object.getOwnPropertyDescriptor(i, s) !== void 0)
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  return Ie(t, te(t._zod.def, { shape: An(t, e) }));
}
function An(t, e) {
  const r = {};
  return De(r, t, Reflect.ownKeys(me(t))), ps(r, e), r;
}
function Ts(t, e) {
  if (!je(e))
    throw new Error("Invalid input to safeExtend: expected a plain object");
  return Ie(t, te(t._zod.def, { shape: An(t, e) }));
}
function Cs(t, e) {
  var i, s;
  if (!((i = e == null ? void 0 : e._zod) != null && i.def))
    throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
  if ((s = t._zod.def.checks) != null && s.length)
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  const r = {};
  De(r, t, Reflect.ownKeys(me(t))), De(r, e, Reflect.ownKeys(me(e)));
  const n = te(t._zod.def, {
    shape: r,
    get catchall() {
      return e._zod.def.catchall;
    },
    checks: e._zod.def.checks ?? []
  });
  return Ie(t, n);
}
function Dr(t, e, r, n = "partial") {
  const s = e._zod.def.checks;
  if (s && s.length > 0)
    throw new Error(`.${n}() cannot be used on object schemas containing refinements`);
  const a = r ? new Set(Ct(e, r)) : void 0, c = {};
  return De(c, e, Reflect.ownKeys(me(e)), t && ((l, u) => a && !a.has(u) ? l : new t({ type: "optional", innerType: l }))), Ie(e, te(e._zod.def, { shape: c, checks: [] }));
}
function As(t, e, r) {
  const n = r ? new Set(Ct(e, r)) : void 0, i = {};
  return De(i, e, Reflect.ownKeys(me(e)), (s, o) => (
    // overwrite with non-optional
    n && !n.has(o) ? s : new t({ type: "nonoptional", innerType: s })
  )), Ie(e, te(e._zod.def, { shape: i }));
}
function fe(t, e = 0) {
  var r;
  if (t.aborted === !0)
    return !0;
  for (let n = e; n < t.issues.length; n++)
    if (((r = t.issues[n]) == null ? void 0 : r.continue) !== !0)
      return !0;
  return !1;
}
function Ms(t, e = 0) {
  var r;
  if (t.aborted === !0)
    return !0;
  for (let n = e; n < t.issues.length; n++)
    if (((r = t.issues[n]) == null ? void 0 : r.continue) === !1)
      return !0;
  return !1;
}
function Fe(t, e) {
  return e.map((r) => {
    var n;
    return (n = r).path ?? (n.path = []), r.path.unshift(t), r;
  });
}
function Je(t) {
  return typeof t == "string" ? t : t == null ? void 0 : t.message;
}
function Lr(t, e, r) {
  var n;
  for (let i = e; i < t.length; i++)
    (n = t[i]).schema ?? (n.schema = r);
}
function _e(t, e, r) {
  var c, l, u, d, h, f, p, g, v, S;
  var n;
  const i = (l = (c = t.inst) == null ? void 0 : c._zod) == null ? void 0 : l.traits;
  i != null && i.has("$ZodType") && (i.has("$ZodCheck") ? (n = t).schema ?? (n.schema = t.inst) : t.schema = t.inst);
  const s = t.schema !== t.inst ? (d = (u = t.schema) == null ? void 0 : u._zod.def) == null ? void 0 : d.error : void 0, o = t.message ? t.message : Je((p = (f = (h = t.inst) == null ? void 0 : h._zod.def) == null ? void 0 : f.error) == null ? void 0 : p.call(f, t)) ?? Je(s == null ? void 0 : s(t)) ?? Je((g = e == null ? void 0 : e.error) == null ? void 0 : g.call(e, t)) ?? Je((v = r.customError) == null ? void 0 : v.call(r, t)) ?? Je((S = r.localeError) == null ? void 0 : S.call(r, t)) ?? "Invalid input", a = {};
  for (const _ of Object.keys(t))
    _ === "inst" || _ === "schema" || _ === "continue" || _ === "input" || _ === "__proto__" || (a[_] = t[_]);
  return a.path ?? (a.path = []), a.message = o, e != null && e.reportInput && (a.input = t.input), a;
}
const $s = /[\uD800-\uDBFF]/;
function ar(t) {
  const e = t.length;
  if (!$s.test(t))
    return e;
  let r = e;
  for (let n = 0; n < e - 1; n++)
    (t.charCodeAt(n) & 64512) === 55296 && (t.charCodeAt(n + 1) & 64512) === 56320 && (r--, n++);
  return r;
}
function cr(t) {
  return Array.isArray(t) ? "array" : typeof t == "string" ? "string" : "unknown";
}
function ks(t) {
  const e = typeof t;
  switch (e) {
    case "number":
      return Number.isNaN(t) ? "nan" : "number";
    case "object": {
      if (t === null)
        return "null";
      if (Array.isArray(t))
        return "array";
      const r = t;
      if (r && Object.getPrototypeOf(r) !== Object.prototype && "constructor" in r && r.constructor)
        return r.constructor.name;
    }
  }
  return e;
}
function tt(...t) {
  const [e, r, n] = t;
  return typeof e == "string" ? {
    message: e,
    code: "custom",
    input: r,
    inst: n
  } : { ...e };
}
function Os(t, e) {
  for (const r in e) {
    const n = Object.getOwnPropertyDescriptor(e, r);
    n.get ? Object.defineProperty(t, r, { ...n, enumerable: !1 }) : Ns(t, r, n.value);
  }
}
function be(t, e, r, n = !0) {
  return Object.defineProperty(t, e, { configurable: !0, writable: !0, enumerable: n, value: r }), r;
}
function Mn(t, e, r) {
  return be(t, e, r, !1);
}
function $n(t, e) {
  for (const r in t) {
    const n = t[r];
    Object.defineProperty(e, r, {
      configurable: !0,
      enumerable: !0,
      get() {
        return be(this, r, n(this));
      },
      set(i) {
        be(this, r, i);
      }
    });
  }
  return e;
}
function Ns(t, e, r) {
  Object.defineProperty(t, e, {
    configurable: !0,
    get() {
      return this == null ? r : be(this, e, r.bind(this));
    },
    set(n) {
      be(this, e, n);
    }
  });
}
function Rs(t, e) {
  const r = Object.getPrototypeOf(t);
  return e in r ? void 0 : r;
}
let Lt, Se = !1;
const Ps = {
  configurable: !0,
  get() {
    Se = !0;
  }
};
function B(t, e, r) {
  const n = Object.getPrototypeOf(t._zod);
  if (e in n && Lt !== t._zod) {
    Lt = void 0;
    return;
  }
  Lt = t._zod, Object.defineProperty(n, e, {
    configurable: !0,
    get() {
      Object.defineProperty(this, e, Ps);
      const i = Se;
      Se = !1;
      try {
        const s = r(this);
        return Se ? delete this[e] : Object.defineProperty(this, e, { configurable: !0, writable: !0, value: s }), Se = Se || i, s;
      } catch (s) {
        throw delete this[e], Se = Se || i, s;
      }
    },
    set(i) {
      Object.defineProperty(this, e, { configurable: !0, writable: !0, value: i });
    }
  });
}
function Ds(t, e, r, n) {
  const i = Rs(t, e);
  i && Object.defineProperty(i, e, {
    configurable: !0,
    get() {
      const s = { configurable: !0, writable: !0, enumerable: n, value: void 0 };
      return Object.defineProperty(this, e, s), s.value = r(this), Object.defineProperty(this, e, s), s.value;
    },
    set(s) {
      Object.defineProperty(this, e, { configurable: !0, writable: !0, enumerable: n, value: s });
    }
  });
}
const Ls = "~constantCatch";
function xs(t) {
  const e = () => t;
  return e[Ls] = !0, e;
}
var xr;
const xt = { value: void 0, enumerable: !1 };
let zr = "captureStackTrace" in Error ? Error : null;
function zs(t) {
  const e = zr;
  if (e) {
    const r = e.stackTraceLimit;
    if (typeof r == "number") {
      try {
        e.stackTraceLimit = 0;
      } catch {
        return zr = null, new t();
      }
      try {
        return new t();
      } finally {
        e.stackTraceLimit = r;
      }
    }
  }
  return new t();
}
function w(t, e, r, n) {
  const i = {};
  function s(h) {
    this.def = h, this.constr = d, this.traits = /* @__PURE__ */ new Set();
  }
  s.prototype = i;
  const o = r, a = o && /* @__PURE__ */ new WeakSet();
  function c(h, f) {
    if (h._zod) {
      if (h._zod.traits.has(t))
        return;
    } else {
      xt.value = new s(f);
      try {
        Object.defineProperty(h, "_zod", xt);
      } finally {
        xt.value = void 0;
      }
    }
    if (h._zod.traits.add(t), e(h, f), a) {
      const g = Object.getPrototypeOf(h), v = h._zod.constr.prototype;
      let S = g;
      for (; S && S !== v; )
        S = Object.getPrototypeOf(S);
      const _ = S ?? g;
      a.has(_) || (a.add(_), Os(_, o));
    }
    const p = d.prototype;
    for (const g in p)
      Object.prototype.hasOwnProperty.call(p, g) && (g in h || (h[g] = p[g].bind(h)));
  }
  const l = (n == null ? void 0 : n.Parent) ?? Object;
  class u extends l {
  }
  Object.defineProperty(u, "name", { value: t });
  function d(h) {
    var v;
    const f = n != null && n.Parent ? zs(u) : this;
    c(f, h);
    const p = f._zod.deferred;
    if (p) {
      for (const S of p)
        S();
      f._zod.deferred = void 0;
    }
    const g = (v = globalThis.__zod_globalConfig) == null ? void 0 : v.postProcessor;
    return g && g(f), f;
  }
  return Object.defineProperty(d, "init", { value: c }), Object.defineProperty(d, Symbol.hasInstance, {
    value: (h) => {
      var f, p;
      return n != null && n.Parent && h instanceof n.Parent ? !0 : (p = (f = h == null ? void 0 : h._zod) == null ? void 0 : f.traits) == null ? void 0 : p.has(t);
    }
  }), Object.defineProperty(d, "name", { value: t }), d;
}
class Pe extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
}
class kn extends Error {
  constructor(e) {
    super(`Encountered unidirectional transform during encode: ${e}`), this.name = "ZodEncodeError";
  }
}
(xr = globalThis).__zod_globalConfig ?? (xr.__zod_globalConfig = {});
const ue = globalThis.__zod_globalConfig;
function he(t) {
  return t && Object.assign(ue, t), ue;
}
function Us() {
  const t = this._zod;
  return t.message ?? (t.message = JSON.stringify(t.def, qt, 2)), t.message;
}
function Fs(t) {
  this._zod.message = t;
}
const js = {
  get: Us,
  set: Fs,
  enumerable: !0,
  configurable: !0
}, zt = { value: void 0, enumerable: !1 }, Ur = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), Bs = (t, e) => {
  t.name = "$ZodError", zt.value = e, Object.defineProperty(t, "issues", zt), zt.value = void 0, Object.defineProperty(t, "message", js);
  const r = Object.getPrototypeOf(t);
  Ur.has(r) || (Ur.add(r), Object.defineProperty(r, "toString", {
    configurable: !0,
    enumerable: !1,
    get() {
      const n = () => this.message;
      return Object.defineProperty(this, "toString", { value: n, configurable: !0, writable: !0 }), n;
    },
    set(n) {
      Object.defineProperty(this, "toString", { value: n, configurable: !0, writable: !0 });
    }
  }));
}, Gs = w("$ZodError", Bs);
function Vs(t, e, r) {
  return Object.prototype.hasOwnProperty.call(t, e) || (e === "__proto__" ? Object.defineProperty(t, e, { value: r(), writable: !0, enumerable: !0, configurable: !0 }) : t[e] = r()), t[e];
}
function Zs(t, e = (r) => r.message) {
  const r = {}, n = [];
  for (const i of t.issues)
    i.path.length > 0 ? Vs(r, i.path[0], () => []).push(e(i)) : n.push(e(i));
  return { formErrors: n, fieldErrors: r };
}
function Ws(t, e = (r) => r.message) {
  const r = { _errors: [] }, n = (i, s = []) => {
    for (const o of i.issues)
      if (o.code === "invalid_union" && o.errors.length)
        o.errors.map((a) => n({ issues: a }, [...s, ...o.path]));
      else if (o.code === "invalid_key")
        n({ issues: o.issues }, [...s, ...o.path]);
      else if (o.code === "invalid_element")
        n({ issues: o.issues }, [...s, ...o.path]);
      else {
        const a = [...s, ...o.path];
        if (a.length === 0)
          r._errors.push(e(o));
        else {
          let c = r, l = 0;
          for (; l < a.length; ) {
            const u = a[l], d = l === a.length - 1;
            if (u === "_errors") {
              d && c._errors.push(e(o)), l++;
              continue;
            }
            Object.prototype.hasOwnProperty.call(c, u) || Object.defineProperty(c, u, {
              value: { _errors: [] },
              enumerable: !0,
              writable: !0,
              configurable: !0
            });
            const h = c[u];
            d && h._errors.push(e(o)), c = h, l++;
          }
        }
      }
  };
  return n(t), r;
}
function At(t, e) {
  return { callee: (e == null ? void 0 : e.callee) ?? t, Err: e == null ? void 0 : e.Err };
}
const lr = (t) => {
  const e = (r, n, i, s) => {
    const o = i ? { ...i, async: !1 } : { async: !1 }, a = r._zod.run({ value: n, issues: [] }, o);
    if (a instanceof Promise)
      throw new Pe();
    if (a.issues.length) {
      const c = new ((s == null ? void 0 : s.Err) ?? t)(a.issues.map((l) => _e(l, o, he())));
      throw En(c, (s == null ? void 0 : s.callee) ?? e), c;
    }
    return a.value;
  };
  return e;
}, ur = (t) => {
  const e = async (r, n, i, s) => {
    const o = i ? { ...i, async: !0 } : { async: !0 };
    let a = r._zod.run({ value: n, issues: [] }, o);
    if (a instanceof Promise && (a = await a), a.issues.length) {
      const c = new ((s == null ? void 0 : s.Err) ?? t)(a.issues.map((l) => _e(l, o, he())));
      throw En(c, (s == null ? void 0 : s.callee) ?? e), c;
    }
    return a.value;
  };
  return e;
}, dr = (t) => (e, r, n) => {
  const i = n ? { ...n, async: !1 } : { async: !1 }, s = e._zod.run({ value: r, issues: [] }, i);
  if (s instanceof Promise)
    throw new Pe();
  return s.issues.length ? On(t, s.issues, i) : { success: !0, data: s.value };
};
function On(t, e, r) {
  let n;
  return {
    success: !1,
    get error() {
      return n || (n = new t(e.map((i) => _e(i, r, he()))), e = void 0, r = void 0), n;
    },
    set error(i) {
      n = i, e = void 0, r = void 0;
    }
  };
}
const hr = (t) => async (e, r, n) => {
  const i = n ? { ...n, async: !0 } : { async: !0 };
  let s = e._zod.run({ value: r, issues: [] }, i);
  return s instanceof Promise && (s = await s), s.issues.length ? On(t, s.issues, i) : { success: !0, data: s.value };
}, qs = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), Ys = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), Hs = (t, e, r) => {
  const n = t._zod.bag.validator;
  if (n !== void 0) {
    if (n(e) !== qs)
      return !0;
    if (n.definite === !0 && r === void 0)
      return !1;
  }
  return Js(t, e, r);
};
function Js(t, e, r) {
  const n = r ? { ...r, async: !1, abortEarly: !0 } : { async: !1, abortEarly: !0 }, i = t._zod.bag.fallbackRun;
  let s;
  if (i ? (n[Ys] = !0, s = i({ value: e, issues: [] }, n)) : s = t._zod.run({ value: e, issues: [] }, n), s instanceof Promise)
    throw new Pe();
  return s.issues.length === 0;
}
const Qs = async (t, e, r) => {
  const n = r ? { ...r, async: !0, abortEarly: !0 } : { async: !0, abortEarly: !0 };
  let i = t._zod.run({ value: e, issues: [] }, n);
  return i instanceof Promise && (i = await i), i.issues.length === 0;
}, Ks = (t) => {
  const e = lr(t), r = (n, i, s, o) => {
    const a = s ? { ...s, direction: "backward" } : { direction: "backward" };
    return e(n, i, a, At(r, o));
  };
  return r;
}, Xs = (t) => {
  const e = lr(t), r = (n, i, s, o) => e(n, i, s, At(r, o));
  return r;
}, eo = (t) => {
  const e = ur(t), r = async (n, i, s, o) => {
    const a = s ? { ...s, direction: "backward" } : { direction: "backward" };
    return await e(n, i, a, At(r, o));
  };
  return r;
}, to = (t) => {
  const e = ur(t), r = async (n, i, s, o) => await e(n, i, s, At(r, o));
  return r;
}, ro = (t) => (e, r, n) => {
  const i = n ? { ...n, direction: "backward" } : { direction: "backward" };
  return dr(t)(e, r, i);
}, no = (t) => (e, r, n) => dr(t)(e, r, n), io = (t) => async (e, r, n) => {
  const i = n ? { ...n, direction: "backward" } : { direction: "backward" };
  return hr(t)(e, r, i);
}, so = (t) => async (e, r, n) => hr(t)(e, r, n), oo = /^[cC][0-9a-z]{6,}$/, ao = /^[0-9a-z]+$/, co = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, lo = /^[0-9a-vA-V]{20}$/, uo = /^[A-Za-z0-9]{27}$/, ho = /^[a-zA-Z0-9_-]{21}$/;
function fo(t) {
  return new RegExp(`^[a-zA-Z0-9_-]{${t}}$`);
}
const mo = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, po = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Fr = (t) => t ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${t}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, go = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, yo = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function vo() {
  return new RegExp(yo, "u");
}
const So = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, wo = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, _o = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, bo = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Eo = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Io = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, To = /^https?$/, Co = /^\+[1-9]\d{6,14}$/, Nn = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function Ao(t) {
  return new RegExp(`^${t}$`);
}
const Mo = /* @__PURE__ */ Ao(Nn);
function Yt(t) {
  const e = "(?:[01]\\d|2[0-3]):[0-5]\\d";
  return typeof t.precision == "number" ? t.precision === -1 ? `${e}` : t.precision === 0 ? `${e}:[0-5]\\d` : `${e}:[0-5]\\d\\.\\d{${t.precision}}` : t.seconds ? `${e}:[0-5]\\d(?:\\.\\d+)?` : `${e}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function $o(t) {
  return new RegExp(`^${Yt(t)}$`);
}
function ko(t) {
  const e = ["Z"];
  t.offset && e.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  const r = `${Yt({ precision: t.precision, seconds: !0 })}(?:${e.join("|")})`, n = t.local ? `${r}|${Yt({ precision: t.precision })}` : r;
  return new RegExp(`^${Nn}T(?:${n})$`);
}
const Oo = /^[\s\S]{0,}$/, No = /^-?\d+$/, fr = /^-?\d+(?:\.\d+)?$/, Ro = /^(?:true|false)$/i, Po = /^[^A-Z]*$/, Do = /^[^a-z]*$/, ee = /* @__PURE__ */ w("$ZodCheck", (t, e) => {
  var r;
  t._zod ?? (t._zod = {}), t._zod.def = e, (r = t._zod).onattach ?? (r.onattach = []);
}), mr = (t) => {
  const e = t.value;
  return !fs(e) && e.length !== void 0;
}, St = {
  number: "number",
  bigint: "bigint",
  object: "date"
}, Rn = /* @__PURE__ */ w("$ZodCheckLessThan", (t, e) => {
  ee.init(t, e);
  const r = St[typeof e.value];
  t._zod.check = (n) => {
    (e.inclusive ? n.value <= e.value : n.value < e.value) || n.issues.push({
      origin: St[typeof n.value] ?? r,
      code: "too_big",
      maximum: typeof e.value == "object" ? e.value.getTime() : e.value,
      input: n.value,
      inclusive: e.inclusive,
      inst: t,
      continue: !e.abort
    });
  };
}), Pn = /* @__PURE__ */ w("$ZodCheckGreaterThan", (t, e) => {
  ee.init(t, e);
  const r = St[typeof e.value];
  t._zod.check = (n) => {
    (e.inclusive ? n.value >= e.value : n.value > e.value) || n.issues.push({
      origin: St[typeof n.value] ?? r,
      code: "too_small",
      minimum: typeof e.value == "object" ? e.value.getTime() : e.value,
      input: n.value,
      inclusive: e.inclusive,
      inst: t,
      continue: !e.abort
    });
  };
}), Lo = /* @__PURE__ */ w("$ZodCheckMultipleOf", (t, e) => {
  ee.init(t, e), t._zod.check = (r) => {
    if (typeof r.value != typeof e.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    (typeof r.value == "bigint" ? (
      // `value % 0n` throws, and nothing is a multiple of zero — the number branch already fails this way via NaN
      e.value !== BigInt(0) && r.value % e.value === BigInt(0)
    ) : ms(r.value, e.value) === 0) || r.issues.push({
      origin: typeof r.value,
      code: "not_multiple_of",
      divisor: e.value,
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
}), xo = /* @__PURE__ */ w("$ZodCheckNumberFormat", (t, e) => {
  var o;
  ee.init(t, e), e.format = e.format || "float64";
  const r = (o = e.format) == null ? void 0 : o.includes("int"), n = r ? "int" : "number", [i, s] = Cn[e.format];
  t._zod.check = (a) => {
    const c = a.value;
    if (r) {
      if (!Number.isInteger(c)) {
        a.issues.push({
          expected: n,
          format: e.format,
          code: "invalid_type",
          continue: !1,
          input: c,
          inst: t
        });
        return;
      }
      if (!Number.isSafeInteger(c)) {
        c > 0 ? a.issues.push({
          input: c,
          code: "too_big",
          maximum: Number.MAX_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: t,
          origin: n,
          inclusive: !0,
          continue: !e.abort
        }) : a.issues.push({
          input: c,
          code: "too_small",
          minimum: Number.MIN_SAFE_INTEGER,
          note: "Integers must be within the safe integer range.",
          inst: t,
          origin: n,
          inclusive: !0,
          continue: !e.abort
        });
        return;
      }
    }
    c < i && a.issues.push({
      origin: "number",
      input: c,
      code: "too_small",
      minimum: i,
      inclusive: !0,
      inst: t,
      continue: !e.abort
    }), c > s && a.issues.push({
      origin: "number",
      input: c,
      code: "too_big",
      maximum: s,
      inclusive: !0,
      inst: t,
      continue: !e.abort
    });
  };
}), zo = /* @__PURE__ */ w("$ZodCheckMaxLength", (t, e) => {
  var r;
  ee.init(t, e), (r = t._zod.def).when ?? (r.when = mr), t._zod.check = (n) => {
    const i = n.value, s = i.length;
    if ((typeof i == "string" && s > e.maximum ? ar(i) : s) <= e.maximum)
      return;
    const a = cr(i);
    n.issues.push({
      origin: a,
      code: "too_big",
      maximum: e.maximum,
      inclusive: !0,
      input: i,
      inst: t,
      continue: !e.abort
    });
  };
}), Uo = /* @__PURE__ */ w("$ZodCheckMinLength", (t, e) => {
  var r;
  ee.init(t, e), (r = t._zod.def).when ?? (r.when = mr), t._zod.check = (n) => {
    const i = n.value, s = i.length;
    if ((typeof i == "string" && s >= e.minimum && s < e.minimum * 2 ? ar(i) : s) >= e.minimum)
      return;
    const a = cr(i);
    n.issues.push({
      origin: a,
      code: "too_small",
      minimum: e.minimum,
      inclusive: !0,
      input: i,
      inst: t,
      continue: !e.abort
    });
  };
}), Fo = /* @__PURE__ */ w("$ZodCheckLengthEquals", (t, e) => {
  var r;
  ee.init(t, e), (r = t._zod.def).when ?? (r.when = mr), t._zod.check = (n) => {
    const i = n.value, s = i.length, o = typeof i == "string" && s >= e.length && s <= e.length * 2 ? ar(i) : s;
    if (o === e.length)
      return;
    const a = cr(i), c = o > e.length;
    n.issues.push({
      origin: a,
      ...c ? { code: "too_big", maximum: e.length } : { code: "too_small", minimum: e.length },
      inclusive: !0,
      exact: !0,
      input: n.value,
      inst: t,
      continue: !e.abort
    });
  };
}), Mt = /* @__PURE__ */ w("$ZodCheckStringFormat", (t, e) => {
  var r, n;
  ee.init(t, e), e.pattern ? (r = t._zod).check ?? (r.check = (i) => {
    e.pattern.lastIndex = 0, !e.pattern.test(i.value) && i.issues.push({
      origin: "string",
      code: "invalid_format",
      format: e.format,
      input: i.value,
      ...e.pattern ? { pattern: e.pattern.toString() } : {},
      inst: t,
      continue: !e.abort
    });
  }) : (n = t._zod).check ?? (n.check = () => {
  });
}), jo = /* @__PURE__ */ w("$ZodCheckRegex", (t, e) => {
  Mt.init(t, e), t._zod.check = (r) => {
    e.pattern.lastIndex = 0, !e.pattern.test(r.value) && r.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: r.value,
      pattern: e.pattern.toString(),
      inst: t,
      continue: !e.abort
    });
  };
}), Bo = /* @__PURE__ */ w("$ZodCheckLowerCase", (t, e) => {
  e.pattern ?? (e.pattern = Po), Mt.init(t, e);
}), Go = /* @__PURE__ */ w("$ZodCheckUpperCase", (t, e) => {
  e.pattern ?? (e.pattern = Do), Mt.init(t, e);
}), Vo = /* @__PURE__ */ w("$ZodCheckIncludes", (t, e) => {
  ee.init(t, e);
  const r = Tt(e.includes), n = new RegExp(typeof e.position == "number" ? `^.{${e.position},}${r}` : r);
  e.pattern = n, t._zod.check = (i) => {
    i.value.includes(e.includes, e.position) || i.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: e.includes,
      input: i.value,
      inst: t,
      continue: !e.abort
    });
  };
}), Zo = /* @__PURE__ */ w("$ZodCheckStartsWith", (t, e) => {
  ee.init(t, e);
  const r = new RegExp(`^${Tt(e.prefix)}.*`);
  e.pattern ?? (e.pattern = r), t._zod.check = (n) => {
    n.value.startsWith(e.prefix) || n.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: e.prefix,
      input: n.value,
      inst: t,
      continue: !e.abort
    });
  };
}), Wo = /* @__PURE__ */ w("$ZodCheckEndsWith", (t, e) => {
  ee.init(t, e);
  const r = new RegExp(`.*${Tt(e.suffix)}$`);
  e.pattern ?? (e.pattern = r), t._zod.check = (n) => {
    n.value.endsWith(e.suffix) || n.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: e.suffix,
      input: n.value,
      inst: t,
      continue: !e.abort
    });
  };
}), qo = /* @__PURE__ */ w("$ZodCheckOverwrite", (t, e) => {
  ee.init(t, e), t._zod.check = (r) => {
    r.value = e.tx(r.value);
  };
});
class Yo {
  constructor(e = [], r = {}) {
    this.content = [], this.indent = 0, this.args = e, this.closed = r;
  }
  // the compiler catches a child's throw and keeps writing into this doc, so the indent has to unwind with it
  indented(e) {
    this.indent += 1;
    try {
      e(this);
    } finally {
      this.indent -= 1;
    }
  }
  write(e) {
    if (typeof e == "function") {
      e(this, { execution: "sync" }), e(this, { execution: "async" });
      return;
    }
    const n = e.split(`
`).filter((o) => o), i = Math.min(...n.map((o) => o.length - o.trimStart().length)), s = n.map((o) => o.slice(i)).map((o) => " ".repeat(this.indent * 2) + o);
    for (const o of s)
      this.content.push(o);
  }
  compile() {
    const e = Function, r = (this == null ? void 0 : this.content) ?? [""];
    return new e(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${r.join(`
`)}
};`)(...Object.values(this.closed));
  }
}
const Ho = {
  major: 4,
  minor: 6,
  patch: 5
}, V = /* @__PURE__ */ w("$ZodType", (t, e) => {
  var s;
  var r;
  t ?? (t = {}), t._zod.def = e, t._zod.bag = t._zod.bag || {}, t._zod.version = Ho;
  const n = t._zod.def.checks, i = t._zod.traits.has("$ZodCheck") ? [t, ...n ?? []] : n != null && n.length ? [...n] : [];
  for (const o of i)
    for (const a of o._zod.onattach)
      a(t);
  if (i.length === 0)
    (r = t._zod).deferred ?? (r.deferred = []), (s = t._zod.deferred) == null || s.push(() => {
      t._zod.run = t._zod.parse;
    });
  else {
    const o = (c, l, u) => {
      if (c.memo)
        return c;
      let d = fe(c), h;
      for (const f of l) {
        if (f._zod.def.when) {
          if (Ms(c) || !f._zod.def.when(c))
            continue;
        } else if (d)
          continue;
        const p = c.issues.length, g = f._zod.check(c);
        if (g instanceof Promise && (u == null ? void 0 : u.async) === !1)
          throw new Pe();
        if (h || g instanceof Promise)
          h = (h ?? Promise.resolve()).then(async () => {
            await g, c.issues.length !== p && (Lr(c.issues, p, t), d || (d = fe(c, p)));
          });
        else {
          if (c.issues.length === p)
            continue;
          Lr(c.issues, p, t), d || (d = fe(c, p));
        }
      }
      return h ? h.then(() => c) : c;
    }, a = (c, l, u) => {
      if (fe(c))
        return c.aborted = !0, c;
      const d = o(l, i, u);
      if (d instanceof Promise) {
        if (u.async === !1)
          throw new Pe();
        return d.then((h) => t._zod.parse(h, u));
      }
      return t._zod.parse(d, u);
    };
    t._zod.run = (c, l) => {
      if (l.skipChecks)
        return t._zod.parse(c, l);
      if (l.direction === "backward") {
        const d = t._zod.parse({ value: c.value, issues: [] }, { ...l, skipChecks: !0 });
        return d instanceof Promise ? d.then((h) => a(h, c, l)) : a(d, c, l);
      }
      const u = t._zod.parse(c, l);
      if (u instanceof Promise) {
        if (l.async === !1)
          throw new Pe();
        return u.then((d) => o(d, i, l));
      }
      return o(u, i, l);
    };
  }
}, {
  // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
  get "~standard"() {
    return Mn(this, "~standard", Ln(this));
  },
  set "~standard"(t) {
    be(this, "~standard", t);
  }
}), Dn = (t, e) => t.issues.length ? { issues: t.issues.map((r) => _e(r, e, he())) } : { value: t.value };
async function Jo(t, e) {
  const r = { async: !0 };
  return Dn(await t._zod.run({ value: e, issues: [] }, r), r);
}
function Ln(t) {
  return {
    validate: (e) => {
      const r = { async: !1 };
      try {
        const n = t._zod.run({ value: e, issues: [] }, r);
        if (!(n instanceof Promise))
          return Dn(n, r);
      } catch {
      }
      return Jo(t, e);
    },
    vendor: "zod",
    version: 1
  };
}
const pr = /* @__PURE__ */ w("$ZodString", (t, e) => {
  V.init(t, e), t._zod.pattern = e.pattern ?? Oo, t._zod.parse = (r, n) => {
    if (e.coerce)
      try {
        r.value = String(r.value);
      } catch {
      }
    return typeof r.value == "string" || r.issues.push({
      expected: "string",
      code: "invalid_type",
      input: r.value,
      inst: t
    }), r;
  };
}), G = /* @__PURE__ */ w("$ZodStringFormat", (t, e) => {
  Mt.init(t, e), pr.init(t, e);
}), Qo = /* @__PURE__ */ w("$ZodGUID", (t, e) => {
  e.pattern ?? (e.pattern = po), G.init(t, e);
}), Ko = /* @__PURE__ */ w("$ZodUUID", (t, e) => {
  if (e.version) {
    const n = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    }[e.version];
    if (n === void 0)
      throw new Error(`Invalid UUID version: "${e.version}"`);
    e.pattern ?? (e.pattern = Fr(n));
  } else
    e.pattern ?? (e.pattern = Fr());
  G.init(t, e);
}), Xo = /* @__PURE__ */ w("$ZodEmail", (t, e) => {
  e.pattern ?? (e.pattern = go), G.init(t, e);
}), xn = 1, wt = 2;
function zn(t) {
  try {
    return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(t) : (new URL(t), !0);
  } catch {
    return !1;
  }
}
function ea(t, e) {
  return !("normalize" in e) && !("hostname" in e) && !("protocol" in e) ? zn(t) || wt : ta(t, e);
}
function ta(t, e) {
  var r;
  if (!e.normalize && ((r = e.protocol) == null ? void 0 : r.source) === To.source && !/^https?:\/\//i.test(t))
    return xn;
  try {
    if (typeof URL < "u") {
      const n = URL;
      if (typeof n.parse == "function")
        return n.parse(t) ?? wt;
    }
    return new URL(t);
  } catch {
    return wt;
  }
}
const ra = /[\t\n\r]/g;
function jr(t) {
  return t.replace(ra, "");
}
function na(t, e) {
  return e.lastIndex = 0, e.test(t.hostname);
}
function ia(t, e) {
  return e.lastIndex = 0, e.test(t.protocol.endsWith(":") ? t.protocol.slice(0, -1) : t.protocol);
}
const sa = /* @__PURE__ */ w("$ZodURL", (t, e) => {
  G.init(t, e), t._zod.check = (r) => {
    try {
      const n = r.value.trim(), i = ea(n, e);
      if (i === xn) {
        r.issues.push({
          code: "invalid_format",
          format: "url",
          note: "Invalid URL format",
          input: r.value,
          inst: t,
          continue: !e.abort
        });
        return;
      }
      if (i === wt) {
        r.issues.push({
          code: "invalid_format",
          format: "url",
          input: r.value,
          inst: t,
          continue: !e.abort
        });
        return;
      }
      if (i === !0) {
        r.value = jr(n);
        return;
      }
      e.hostname && !na(i, e.hostname) && r.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid hostname",
        pattern: e.hostname.source,
        input: r.value,
        inst: t,
        continue: !e.abort
      }), e.protocol && !ia(i, e.protocol) && r.issues.push({
        code: "invalid_format",
        format: "url",
        note: "Invalid protocol",
        pattern: e.protocol.source,
        input: r.value,
        inst: t,
        continue: !e.abort
      }), r.value = e.normalize ? i.href : jr(n);
      return;
    } catch {
      r.issues.push({
        code: "invalid_format",
        format: "url",
        input: r.value,
        inst: t,
        continue: !e.abort
      });
    }
  };
}), oa = /* @__PURE__ */ w("$ZodEmoji", (t, e) => {
  e.pattern ?? (e.pattern = vo()), G.init(t, e);
}), aa = /* @__PURE__ */ w("$ZodNanoID", (t, e) => {
  if (e.length !== void 0 && (!Number.isInteger(e.length) || e.length < 1))
    throw new Error(`Invalid nanoid length: ${e.length}`);
  e.pattern ?? (e.pattern = e.length === void 0 ? ho : fo(e.length)), G.init(t, e);
}), ca = /* @__PURE__ */ w("$ZodCUID", (t, e) => {
  e.pattern ?? (e.pattern = oo), G.init(t, e);
}), la = /* @__PURE__ */ w("$ZodCUID2", (t, e) => {
  e.pattern ?? (e.pattern = ao), G.init(t, e);
}), ua = /* @__PURE__ */ w("$ZodULID", (t, e) => {
  e.pattern ?? (e.pattern = co), G.init(t, e);
}), da = /* @__PURE__ */ w("$ZodXID", (t, e) => {
  e.pattern ?? (e.pattern = lo), G.init(t, e);
}), ha = /* @__PURE__ */ w("$ZodKSUID", (t, e) => {
  e.pattern ?? (e.pattern = uo), G.init(t, e);
}), fa = /* @__PURE__ */ w("$ZodISODateTime", (t, e) => {
  e.pattern ?? (e.pattern = ko(e)), G.init(t, e);
}), ma = /* @__PURE__ */ w("$ZodISODate", (t, e) => {
  e.pattern ?? (e.pattern = Mo), G.init(t, e);
}), pa = /* @__PURE__ */ w("$ZodISOTime", (t, e) => {
  e.pattern ?? (e.pattern = $o(e)), G.init(t, e);
}), ga = /* @__PURE__ */ w("$ZodISODuration", (t, e) => {
  e.pattern ?? (e.pattern = mo), G.init(t, e);
}), ya = /* @__PURE__ */ w("$ZodIPv4", (t, e) => {
  e.pattern ?? (e.pattern = So), G.init(t, e);
}), va = /^[0-9a-fA-F:.]+$/;
function Un(t) {
  return va.test(t) ? zn(`http://[${t}]`) : !1;
}
const Sa = /* @__PURE__ */ w("$ZodIPv6", (t, e) => {
  e.pattern ?? (e.pattern = wo), G.init(t, e), t._zod.check = (r) => {
    Un(r.value) || r.issues.push({
      code: "invalid_format",
      format: "ipv6",
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
}), wa = /* @__PURE__ */ w("$ZodCIDRv4", (t, e) => {
  e.pattern ?? (e.pattern = _o), G.init(t, e);
});
function _a(t) {
  const e = t.split("/");
  if (e.length !== 2)
    return !1;
  const [r, n] = e;
  if (!n)
    return !1;
  const i = Number(n);
  return `${i}` !== n || i < 0 || i > 128 ? !1 : Un(r);
}
const ba = /* @__PURE__ */ w("$ZodCIDRv6", (t, e) => {
  e.pattern ?? (e.pattern = bo), G.init(t, e), t._zod.check = (r) => {
    _a(r.value) || r.issues.push({
      code: "invalid_format",
      format: "cidrv6",
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
});
function Fn(t) {
  if (t === "")
    return !0;
  if (/\s/.test(t) || t.length % 4 !== 0)
    return !1;
  try {
    return atob(t), !0;
  } catch {
    return !1;
  }
}
const jn = /^[0-9a-zA-Z+/]*={0,2}$/, Ea = /* @__PURE__ */ w("$ZodBase64", (t, e) => {
  e.pattern ?? (e.pattern = jn), G.init(t, e), t._zod.check = (r) => {
    Fn(r.value) || r.issues.push({
      code: "invalid_format",
      format: "base64",
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
}), gr = /^[A-Za-z0-9_-]*$/;
function Ia(t) {
  if (!gr.test(t))
    return !1;
  const e = t.replace(/[-_]/g, (n) => n === "-" ? "+" : "/"), r = e.padEnd(Math.ceil(e.length / 4) * 4, "=");
  return Fn(r);
}
const Ta = /* @__PURE__ */ w("$ZodBase64URL", (t, e) => {
  e.pattern ?? (e.pattern = gr), G.init(t, e), t._zod.check = (r) => {
    Ia(r.value) || r.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
}), Ca = /* @__PURE__ */ w("$ZodE164", (t, e) => {
  e.pattern ?? (e.pattern = Co), G.init(t, e);
});
function Aa(t, e = null) {
  try {
    const r = t.split(".");
    if (r.length !== 3)
      return !1;
    const [n] = r;
    if (!n)
      return !1;
    const i = JSON.parse(atob(n));
    return !("typ" in i && (i == null ? void 0 : i.typ) !== "JWT" || !i.alg || e && (!("alg" in i) || i.alg !== e));
  } catch {
    return !1;
  }
}
const Ma = /* @__PURE__ */ w("$ZodJWT", (t, e) => {
  G.init(t, e), t._zod.check = (r) => {
    Aa(r.value, e.alg) || r.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: r.value,
      inst: t,
      continue: !e.abort
    });
  };
}), Bn = /* @__PURE__ */ w("$ZodNumber", (t, e) => {
  V.init(t, e), t._zod.pattern = fr, t._zod.parse = (r, n) => {
    if (e.coerce)
      try {
        r.value = Number(r.value);
      } catch {
      }
    const i = r.value;
    if (typeof i == "number" && !Number.isNaN(i) && Number.isFinite(i))
      return r;
    const s = typeof i == "number" ? Number.isNaN(i) ? "NaN" : Number.isFinite(i) ? void 0 : String(i) : void 0;
    return r.issues.push({
      expected: "number",
      code: "invalid_type",
      input: i,
      inst: t,
      ...s ? { received: s } : {}
    }), r;
  };
}), $a = /* @__PURE__ */ w("$ZodNumberFormat", (t, e) => {
  xo.init(t, e), Bn.init(t, e);
}), ka = /* @__PURE__ */ w("$ZodBoolean", (t, e) => {
  V.init(t, e), t._zod.pattern = Ro, t._zod.parse = (r, n) => {
    if (e.coerce)
      try {
        r.value = !!r.value;
      } catch {
      }
    const i = r.value;
    return typeof i == "boolean" || r.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input: i,
      inst: t
    }), r;
  };
}), Oa = /* @__PURE__ */ w("$ZodAny", (t, e) => {
  V.init(t, e), t._zod.parse = (r) => r;
}), Na = /* @__PURE__ */ w("$ZodUnknown", (t, e) => {
  V.init(t, e), t._zod.parse = (r) => r;
}), Ra = /* @__PURE__ */ w("$ZodNever", (t, e) => {
  V.init(t, e), t._zod.parse = (r, n) => (r.issues.push({
    expected: "never",
    code: "invalid_type",
    input: r.value,
    inst: t
  }), r);
});
function Br(t, e, r) {
  t.issues.length && e.issues.push(...Fe(r, t.issues)), e.value[r] = t.value;
}
const Pa = /* @__PURE__ */ w("$ZodArray", (t, e) => {
  V.init(t, e);
  const r = ue.memoizer;
  r == null || r.attach(t), t._zod.parse = (n, i) => {
    const s = n.value;
    if (!Array.isArray(s))
      return n.issues.push({
        expected: "array",
        code: "invalid_type",
        input: s,
        inst: t
      }), n;
    n.value = r ? r.alloc(t, n, Array(s.length), i) : Array(s.length);
    const o = [], a = i == null ? void 0 : i.abortEarly;
    for (let c = 0; c < s.length; c++) {
      const l = s[c], u = e.element._zod.run({
        value: l,
        issues: []
      }, i);
      if (u instanceof Promise)
        o.push(u.then((d) => Br(d, n, c)));
      else if (Br(u, n, c), a && u.issues.length !== 0 && fe(u))
        break;
    }
    return o.length ? Promise.all(o).then(() => n) : n;
  };
});
function _t(t, e, r, n, i, s) {
  const o = r in n, a = s === "optional";
  if (!(!o && a && i === "optional")) {
    if (t.issues.length) {
      if (i !== void 0 && a && !o)
        return;
      e.issues.push(...Fe(r, t.issues));
    }
    if (!o && i === void 0) {
      t.issues.length || e.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [r]
      });
      return;
    }
    t.value === void 0 ? (o || i === "defaulted" && !a) && (e.value[r] = void 0) : e.value[r] = t.value;
  }
}
const Da = [];
function Gn(t) {
  var o, a, c, l;
  const e = Object.keys(t.shape), r = Object.getOwnPropertySymbols(t.shape), n = r.length ? r : Da, i = n.length ? [...e, ...n] : e;
  for (const u of i)
    if (!((l = (c = (a = (o = t.shape) == null ? void 0 : o[u]) == null ? void 0 : a._zod) == null ? void 0 : c.traits) != null && l.has("$ZodType")))
      throw new Error(`Invalid element at key "${String(u)}": expected a Zod schema`);
  const s = ws(t.shape);
  return {
    ...t,
    allKeys: i,
    symbolKeys: n,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(e),
    numKeys: e.length,
    optionalKeys: new Set(s)
  };
}
function Vn(t, e, r, n, i, s, o) {
  const a = [], c = i.keySet, l = i.catchall._zod, u = l.def.type, d = l.optin, h = l.optout;
  let f = 0;
  for (const p in e) {
    if (o && r.issues.length !== f) {
      if (fe(r, f))
        break;
      f = r.issues.length;
    }
    if (c.has(p))
      continue;
    if (p === "__proto__") {
      u === "never" && a.push(p);
      continue;
    }
    if (u === "never") {
      a.push(p);
      continue;
    }
    const g = l.run({ value: e[p], issues: [] }, n);
    g instanceof Promise ? t.push(g.then((v) => _t(v, r, p, e, d, h))) : _t(g, r, p, e, d, h);
  }
  return a.length && r.issues.push({
    code: "unrecognized_keys",
    keys: a,
    input: e,
    inst: s,
    // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
    continue: !0
  }), t.length ? Promise.all(t).then(() => r) : r;
}
const La = /* @__PURE__ */ w("$ZodObject", (t, e) => {
  V.init(t, e);
  const r = Object.getOwnPropertyDescriptor(e, "shape"), n = r != null && r.get ? r.get.raw : e.shape ?? {};
  if (n) {
    const l = () => {
      const u = { ...n };
      return Object.defineProperty(e, "shape", { value: u }), l.raw = u, u;
    };
    l.raw = n, Object.defineProperty(e, "shape", { get: l });
  }
  const i = sr(() => Gn(e));
  B(t, "propValues", (l) => {
    const u = l.def.shape, d = {};
    for (const h in u) {
      const f = u[h]._zod;
      if (f.values) {
        Object.prototype.hasOwnProperty.call(d, h) || Ee(d, h, /* @__PURE__ */ new Set());
        for (const p of f.values)
          d[h].add(p);
        f.optin !== void 0 && d[h].add(void 0);
      }
    }
    return d;
  });
  const s = vt, o = e.catchall;
  let a;
  const c = ue.memoizer;
  c == null || c.attach(t), t._zod.parse = (l, u) => {
    a ?? (a = i.value);
    const d = l.value;
    if (!s(d))
      return l.issues.push({
        expected: "object",
        code: "invalid_type",
        input: d,
        inst: t
      }), l;
    l.value = c ? c.alloc(t, l, {}, u) : {};
    const h = [], f = a.shape, p = u == null ? void 0 : u.abortEarly;
    let g = l.issues.length;
    for (const v of a.allKeys) {
      if (p && l.issues.length !== g) {
        if (fe(l, g))
          break;
        g = l.issues.length;
      }
      if (v === "__proto__")
        continue;
      const S = f[v], _ = S._zod.optin, R = S._zod.optout, M = S._zod.run({ value: d[v], issues: [] }, u);
      M instanceof Promise ? h.push(M.then((O) => _t(O, l, v, d, _, R))) : _t(M, l, v, d, _, R);
    }
    return o ? Vn(h, d, l, u, i.value, t, p === !0) : h.length ? Promise.all(h).then(() => l) : l;
  };
}), xa = /* @__PURE__ */ w("$ZodObjectJIT", (t, e) => {
  La.init(t, e);
  const r = t._zod.parse, n = sr(() => Gn(e)), i = ue.memoizer, s = (f) => {
    var O, x;
    const p = n.value, g = p.symbolKeys, v = new Yo(["payload", "ctx"], { shape: f, inst: t, memo: i, syms: g }), S = (C) => `shape[${C}]._zod.run({ value: input[${C}], issues: [] }, ctx)`, _ = (C, I) => `
          let ${C}_ab = false;
          for (let i = 0; i < ${C}.issues.length; i++) {
            const iss = ${C}.issues[i];
            iss.path = iss.path ? [${I}, ...iss.path] : [${I}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${C}_ab = true;
          }
          if (${C}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
    v.write("const input = payload.value;");
    const R = /* @__PURE__ */ Object.create(null);
    let M = 0;
    for (const C of p.allKeys)
      R[C] = `key_${M++}`;
    v.write(i ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
    for (const C of p.allKeys) {
      if (C === "__proto__")
        continue;
      const I = R[C], P = typeof C == "symbol" ? `syms[${g.indexOf(C)}]` : gs(C), N = `${P} in input`, F = f[C], L = (O = F == null ? void 0 : F._zod) == null ? void 0 : O.optin, Q = L !== void 0, U = ((x = F == null ? void 0 : F._zod) == null ? void 0 : x.optout) === "optional";
      if (v.write(`const ${I} = ${S(P)};`), Q && U) {
        const J = L === "optional" ? `${I}_present` : `${I}.value !== undefined || ${I}_present`;
        v.write(`
        const ${I}_present = ${N};
        if (!${I}.issues.length || ${I}_present) {
          if (${I}.issues.length) {${_(I, P)}
          }

          if (${J}) {
            newResult[${P}] = ${I}.value;
          }
        }

      `);
      } else Q ? (v.write(`
        if (${I}.issues.length) {${_(I, P)}
        }
      `), L === "defaulted" ? v.write(`newResult[${P}] = ${I}.value;`) : v.write(`
        if (${I}.value !== undefined || ${N}) {
          newResult[${P}] = ${I}.value;
        }
      `)) : v.write(`
        const ${I}_present = ${N};
        if (${I}.issues.length) {${_(I, P)}
        }
        if (!${I}_present && !${I}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${P}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${I}_present) {
          newResult[${P}] = ${I}.value;
        }

      `);
    }
    return v.write("payload.value = newResult;"), v.write("return payload;"), v.compile();
  };
  let o;
  const a = vt, c = !ue.jitless, u = c && vs.value, d = e.catchall;
  let h;
  t._zod.parse = (f, p) => {
    h ?? (h = n.value);
    const g = f.value;
    return a(g) ? c && u && (p == null ? void 0 : p.async) === !1 && p.jitless !== !0 ? (o || (o = s(e.shape)), f = o(f, p), d ? Vn([], g, f, p, h, t, (p == null ? void 0 : p.abortEarly) === !0) : f) : r(f, p) : (f.issues.push({
      expected: "object",
      code: "invalid_type",
      input: g,
      inst: t
    }), f);
  };
});
function Gr(t, e, r, n) {
  for (const s of t)
    if (s.issues.length === 0)
      return e.value = s.value, e;
  const i = t.filter((s) => !fe(s));
  return i.length === 1 ? (e.value = i[0].value, i[0]) : (e.issues.push({
    code: "invalid_union",
    input: e.value,
    inst: r,
    errors: t.map((s) => s.issues.map((o) => _e(o, n, he())))
  }), e);
}
const za = /* @__PURE__ */ w("$ZodUnion", (t, e) => {
  V.init(t, e), B(t, "optin", (n) => n.def.options.some((i) => i._zod.optin === "defaulted") ? "defaulted" : n.def.options.some((i) => i._zod.optin !== void 0) ? "optional" : void 0), B(t, "optout", (n) => n.def.options.some((i) => i._zod.optout === "optional") ? "optional" : void 0), B(t, "values", (n) => {
    if (n.def.options.every((i) => i._zod.values))
      return new Set(n.def.options.flatMap((i) => Array.from(i._zod.values)));
  }), B(t, "pattern", (n) => {
    if (n.def.options.every((i) => i._zod.pattern)) {
      const i = n.def.options.map((s) => s._zod.pattern);
      return new RegExp(`^(${i.map((s) => or(s.source)).join("|")})$`);
    }
  });
  const r = e.options.length === 1 ? e.options[0]._zod.run : null;
  t._zod.parse = (n, i) => {
    if (r)
      return r(n, i);
    let s = !1;
    const o = [];
    for (const a of e.options) {
      const c = a._zod.run({
        value: n.value,
        issues: []
      }, i);
      if (c instanceof Promise)
        o.push(c), s = !0;
      else {
        if (c.issues.length === 0)
          return c;
        o.push(c);
      }
    }
    return s ? Promise.all(o).then((a) => Gr(a, n, t, i)) : Gr(o, n, t, i);
  };
}), Ua = /* @__PURE__ */ w("$ZodIntersection", (t, e) => {
  V.init(t, e), t._zod.parse = (r, n) => {
    const i = r.value, s = e.left._zod.run({ value: i, issues: [] }, n), o = e.right._zod.run({ value: i, issues: [] }, n);
    return s instanceof Promise || o instanceof Promise ? Promise.all([s, o]).then(([c, l]) => Vr(r, c, l)) : Vr(r, s, o);
  };
});
function Ht(t, e) {
  if (t === e)
    return { valid: !0, data: t };
  if (t instanceof Date && e instanceof Date && +t == +e)
    return { valid: !0, data: t };
  if (je(t) && je(e)) {
    const r = Object.keys(e), n = Object.keys(t).filter((s) => r.indexOf(s) !== -1), i = { ...t, ...e };
    Object.prototype.hasOwnProperty.call(i, "__proto__") && delete i.__proto__;
    for (const s of n) {
      if (s === "__proto__")
        continue;
      const o = Ht(t[s], e[s]);
      if (!o.valid)
        return {
          valid: !1,
          mergeErrorPath: [s, ...o.mergeErrorPath]
        };
      i[s] = o.data;
    }
    return { valid: !0, data: i };
  }
  if (Array.isArray(t) && Array.isArray(e)) {
    if (t.length !== e.length)
      return { valid: !1, mergeErrorPath: [] };
    const r = [];
    for (let n = 0; n < t.length; n++) {
      const i = t[n], s = e[n], o = Ht(i, s);
      if (!o.valid)
        return {
          valid: !1,
          mergeErrorPath: [n, ...o.mergeErrorPath]
        };
      r.push(o.data);
    }
    return { valid: !0, data: r };
  }
  return { valid: !1, mergeErrorPath: [] };
}
function Vr(t, e, r) {
  const n = /* @__PURE__ */ new Map();
  let i;
  const s = /* @__PURE__ */ new Map(), o = (l, u) => {
    var h, f;
    let d;
    if (l.code === "unrecognized_keys" && !((h = l.path) != null && h.length))
      i ?? (i = l), d = l.keys;
    else if (l.code === "invalid_key" && l.origin === "record" && ((f = l.path) == null ? void 0 : f.length) === 1) {
      const p = String(l.path[0]);
      s.has(p) || s.set(p, l), d = [p];
    } else
      return !1;
    for (const p of d)
      n.has(p) || n.set(p, {}), n.get(p)[u] = !0;
    return !0;
  };
  for (const l of e.issues)
    o(l, "l") || t.issues.push(l);
  for (const l of r.issues)
    o(l, "r") || t.issues.push(l);
  const a = [...n].filter(([, l]) => l.l && l.r).map(([l]) => l);
  if (a.length) {
    const l = i ? a.filter((u) => i.keys.includes(u)) : [];
    l.length && t.issues.push({ ...i, keys: l });
    for (const u of a)
      !l.includes(u) && s.has(u) && t.issues.push(s.get(u));
  }
  const c = Ht(e.value, r.value);
  if (!c.valid) {
    if (fe(t))
      return t;
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
  }
  return t.value = c.data, t;
}
const Fa = /* @__PURE__ */ w("$ZodRecord", (t, e) => {
  V.init(t, e);
  const r = ue.memoizer;
  r == null || r.attach(t), t._zod.parse = (n, i) => {
    const s = n.value;
    if (!je(s))
      return n.issues.push({
        expected: "record",
        code: "invalid_type",
        input: s,
        inst: t
      }), n;
    const o = [], a = e.keyType._zod.values;
    if (a && !e.partial) {
      n.value = r ? r.alloc(t, n, {}, i) : {};
      const c = /* @__PURE__ */ new Set();
      for (const u of a)
        if (typeof u == "string" || typeof u == "number" || typeof u == "symbol") {
          if (c.add(typeof u == "number" ? u.toString() : u), u === "__proto__")
            continue;
          const d = e.keyType._zod.run({ value: u, issues: [] }, i);
          if (d instanceof Promise)
            throw new Error("Async schemas not supported in object keys currently");
          if (d.issues.length) {
            n.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: d.issues.map((p) => _e(p, i, he())),
              input: u,
              path: [u],
              inst: t
            });
            continue;
          }
          const h = d.value;
          if (h === "__proto__")
            continue;
          const f = e.valueType._zod.run({ value: s[u], issues: [] }, i);
          f instanceof Promise ? o.push(f.then((p) => {
            p.issues.length && n.issues.push(...Fe(u, p.issues)), n.value[h] = p.value;
          })) : (f.issues.length && n.issues.push(...Fe(u, f.issues)), n.value[h] = f.value);
        }
      let l;
      for (const u in s)
        if (!c.has(u))
          if (e.mode === "loose") {
            if (u === "__proto__")
              continue;
            n.value[u] = s[u];
          } else
            l = l ?? [], l.push(u);
      l && l.length > 0 && n.issues.push({
        code: "unrecognized_keys",
        input: s,
        inst: t,
        keys: l,
        continue: !0
      });
    } else {
      n.value = r ? r.alloc(t, n, {}, i) : {};
      let c;
      for (const l of Reflect.ownKeys(s)) {
        if (l === "__proto__" || !Object.prototype.propertyIsEnumerable.call(s, l))
          continue;
        let u = e.keyType._zod.run({ value: l, issues: [] }, i);
        if (u instanceof Promise)
          throw new Error("Async schemas not supported in object keys currently");
        if (typeof l == "string" && fr.test(l) && u.issues.length) {
          const p = e.keyType._zod.run({ value: Number(l), issues: [] }, i);
          if (p instanceof Promise)
            throw new Error("Async schemas not supported in object keys currently");
          p.issues.length === 0 && (u = p);
        }
        if (u.issues.length) {
          e.mode === "loose" ? n.value[l] = s[l] : a ? (c = c ?? [], c.push(l)) : n.issues.push({
            code: "invalid_key",
            origin: "record",
            issues: u.issues.map((p) => _e(p, i, he())),
            input: l,
            path: [l],
            inst: t
          });
          continue;
        }
        const h = u.value;
        if (h === "__proto__")
          continue;
        const f = e.valueType._zod.run({ value: s[l], issues: [] }, i);
        f instanceof Promise ? o.push(f.then((p) => {
          p.issues.length && n.issues.push(...Fe(l, p.issues)), n.value[h] = p.value;
        })) : (f.issues.length && n.issues.push(...Fe(l, f.issues)), n.value[h] = f.value);
      }
      c && c.length > 0 && n.issues.push({
        code: "unrecognized_keys",
        input: s,
        inst: t,
        keys: c,
        continue: !0
      });
    }
    return o.length ? Promise.all(o).then(() => n) : n;
  };
}), ja = /* @__PURE__ */ w("$ZodEnum", (t, e) => {
  V.init(t, e);
  const r = Wt(e.entries), n = new Set(r);
  t._zod.values = n, B(t, "pattern", (i) => {
    const s = Wt(i.def.entries).filter((o) => Ss.has(typeof o));
    return new RegExp(s.length ? `^(${s.map((o) => Tt(o.toString())).join("|")})$` : "^[^\\s\\S]$");
  }), t._zod.parse = (i, s) => {
    const o = i.value;
    return n.has(o) || i.issues.push({
      code: "invalid_value",
      values: r,
      input: o,
      inst: t
    }), i;
  };
}), Ba = /* @__PURE__ */ w("$ZodTransform", (t, e) => {
  var r;
  V.init(t, e), t._zod.optin = "optional", (r = ue.memoizer) == null || r.guard(t), t._zod.parse = (n, i) => {
    if (i.direction === "backward")
      throw new kn(t.constructor.name);
    const s = e.transform(n.value, n);
    if (i.async)
      return (s instanceof Promise ? s : Promise.resolve(s)).then((a) => (n.value = a, n));
    if (s instanceof Promise)
      throw new Pe();
    return n.value = s, n;
  };
});
function Zr(t, e) {
  return t.value = e.issues.length ? void 0 : e.value, t;
}
const Zn = /* @__PURE__ */ w("$ZodOptional", (t, e) => {
  V.init(t, e), B(t, "optin", (r) => r.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), t._zod.optout = "optional", B(t, "values", (r) => {
    const n = r.def.innerType._zod.values;
    return n ? /* @__PURE__ */ new Set([...n, void 0]) : void 0;
  }), B(t, "pattern", (r) => {
    const n = r.def.innerType._zod.pattern;
    return n ? new RegExp(`^(${or(n.source)})?$`) : void 0;
  }), t._zod.parse = (r, n) => {
    if (r.value === void 0) {
      if (e.innerType._zod.optin !== "defaulted")
        return r;
      const i = e.innerType._zod.run({ value: r.value, issues: [] }, n);
      return i instanceof Promise ? i.then((s) => Zr(r, s)) : Zr(r, i);
    }
    return e.innerType._zod.run(r, n);
  };
}), Ga = /* @__PURE__ */ w("$ZodExactOptional", (t, e) => {
  Zn.init(t, e), B(t, "values", (r) => r.def.innerType._zod.values), B(t, "pattern", (r) => r.def.innerType._zod.pattern), t._zod.parse = (r, n) => e.innerType._zod.run(r, n);
}), Va = /* @__PURE__ */ w("$ZodNullable", (t, e) => {
  V.init(t, e), B(t, "optin", (r) => r.def.innerType._zod.optin), B(t, "optout", (r) => r.def.innerType._zod.optout), B(t, "pattern", (r) => {
    const n = r.def.innerType._zod.pattern;
    return n ? new RegExp(`^(${or(n.source)}|null)$`) : void 0;
  }), B(t, "values", (r) => r.def.innerType._zod.values ? /* @__PURE__ */ new Set([...r.def.innerType._zod.values, null]) : void 0), t._zod.parse = (r, n) => r.value === null ? r : e.innerType._zod.run(r, n);
}), Za = /* @__PURE__ */ w("$ZodDefault", (t, e) => {
  V.init(t, e), t._zod.optin = "defaulted", B(t, "values", (r) => r.def.innerType._zod.values), t._zod.parse = (r, n) => {
    if (n.direction === "backward")
      return e.innerType._zod.run(r, n);
    if (r.value === void 0)
      return r.value = e.defaultValue, r;
    const i = e.innerType._zod.run(r, n);
    return i instanceof Promise ? i.then((s) => Wr(s, e)) : Wr(i, e);
  };
});
function Wr(t, e) {
  return t.value === void 0 && (t.value = e.defaultValue), t;
}
const Wa = /* @__PURE__ */ w("$ZodPrefault", (t, e) => {
  V.init(t, e), t._zod.optin = "defaulted", B(t, "values", (r) => r.def.innerType._zod.values), t._zod.parse = (r, n) => (n.direction === "backward" || r.value === void 0 && (r.value = e.defaultValue), e.innerType._zod.run(r, n));
}), qa = /* @__PURE__ */ w("$ZodNonOptional", (t, e) => {
  V.init(t, e), B(t, "values", (r) => {
    const n = r.def.innerType._zod.values;
    return n ? new Set([...n].filter((i) => i !== void 0)) : void 0;
  }), t._zod.parse = (r, n) => {
    const i = e.innerType._zod.run(r, n);
    return i instanceof Promise ? i.then((s) => qr(s, t)) : qr(i, t);
  };
});
function qr(t, e) {
  return !t.issues.length && t.value === void 0 && t.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: t.value,
    inst: e
  }), t;
}
function Yr(t, e, r, n) {
  return e.issues.length ? (t.value = r.catchValue({
    ...e,
    value: t.value,
    error: {
      issues: e.issues.map((i) => _e(i, n, he()))
    },
    input: t.value
  }), t) : (t.value = e.value, e.memo && (t.memo = !0), t);
}
const Ya = /* @__PURE__ */ w("$ZodCatch", (t, e) => {
  V.init(t, e), B(t, "optin", (r) => r.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), B(t, "optout", (r) => r.def.innerType._zod.optout), B(t, "values", (r) => r.def.innerType._zod.values), t._zod.parse = (r, n) => {
    if (n.direction === "backward")
      return e.innerType._zod.run(r, n);
    const i = e.innerType._zod.run({ value: r.value, issues: [] }, n);
    return i instanceof Promise ? i.then((s) => Yr(r, s, e, n)) : Yr(r, i, e, n);
  };
}), Ha = /* @__PURE__ */ w("$ZodPipe", (t, e) => {
  V.init(t, e), B(t, "values", (r) => r.def.in._zod.values), B(t, "optin", (r) => r.def.in._zod.optin), B(t, "optout", (r) => r.def.out._zod.optout), B(t, "propValues", (r) => r.def.in._zod.propValues), t._zod.parse = (r, n) => {
    if (n.direction === "backward") {
      const s = e.out._zod.run(r, n);
      return s instanceof Promise ? s.then((o) => at(o, e.in, n)) : at(s, e.in, n);
    }
    const i = e.in._zod.run(r, n);
    return i instanceof Promise ? i.then((s) => at(s, e.out, n)) : at(i, e.out, n);
  };
});
function at(t, e, r) {
  return t.issues.some((n) => n.code !== "unrecognized_keys") ? (t.aborted = !0, t) : e._zod.run({ value: t.value, issues: t.issues }, r);
}
const Ja = /* @__PURE__ */ w("$ZodReadonly", (t, e) => {
  V.init(t, e), B(t, "propValues", (r) => r.def.innerType._zod.propValues), B(t, "values", (r) => r.def.innerType._zod.values), B(t, "optin", (r) => {
    var n, i;
    return (i = (n = r.def.innerType) == null ? void 0 : n._zod) == null ? void 0 : i.optin;
  }), B(t, "optout", (r) => {
    var n, i;
    return (i = (n = r.def.innerType) == null ? void 0 : n._zod) == null ? void 0 : i.optout;
  }), t._zod.parse = (r, n) => {
    if (n.direction === "backward")
      return e.innerType._zod.run(r, n);
    const i = e.innerType._zod.run(r, n);
    return i instanceof Promise ? i.then(Hr) : Hr(i);
  };
});
function Hr(t) {
  return t.memo || (t.value = Object.freeze(t.value)), t;
}
const Qa = /* @__PURE__ */ w("$ZodCustom", (t, e) => {
  ee.init(t, e), V.init(t, e), t._zod.parse = (r, n) => r, t._zod.check = (r) => {
    const n = r.value, i = e.fn(n);
    if (i instanceof Promise)
      return i.then((s) => Jr(s, r, n, t));
    Jr(i, r, n, t);
  };
});
function Jr(t, e, r, n) {
  if (!t) {
    const i = {
      code: "custom",
      input: r,
      inst: n,
      // incorporates params.error into issue reporting
      path: [...n._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !n._zod.def.abort
      // params: inst._zod.def.params,
    };
    n._zod.def.params && (i.params = n._zod.def.params), e.issues.push(tt(i));
  }
}
class Ka extends Error {
  constructor() {
    super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
  }
}
const Jt = "~memo", Qr = [];
function Wn(t) {
  return t !== null && typeof t == "object";
}
function Ut(t) {
  return t.map((e) => e.path ? { ...e, path: e.path.slice() } : { ...e });
}
const qn = /* @__PURE__ */ new WeakMap(), Qe = 0, ht = 1, Xe = 2;
function ft(t, e, r) {
  const n = qn.get(t);
  if (n !== void 0)
    return n ? Xe : Qe;
  if (e.has(t))
    return Xe;
  e.add(t);
  let i = Qe;
  const s = (u) => {
    if (i !== Xe && (u != null && u._zod)) {
      const d = ft(u, e);
      d > i && (i = d);
    }
  }, o = (u, d) => {
    var f;
    let h = Qe;
    for (const p of Reflect.ownKeys(u)) {
      const g = Object.getOwnPropertyDescriptor(u, p);
      if (!g.enumerable)
        continue;
      const v = g.get ? ht : (f = g.value) != null && f._zod ? ft(g.value, e) : Qe;
      v > h && (h = v);
    }
    return h;
  }, a = (u) => {
    u > i && (i = u);
  }, c = t._zod.def;
  switch (c.type) {
    case "object": {
      const u = wn(c);
      a(u ? o(u) : ht), s(c.catchall);
      break;
    }
    case "array":
      s(c.element);
      break;
    case "tuple":
      for (const u of c.items)
        s(u);
      s(c.rest);
      break;
    case "record":
    case "map":
      s(c.keyType), s(c.valueType);
      break;
    case "set":
      s(c.valueType);
      break;
    case "union":
      for (const u of c.options)
        s(u);
      break;
    case "intersection":
      s(c.left), s(c.right);
      break;
    case "optional":
    case "nullable":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
    case "nonoptional":
    case "promise":
    case "success":
      s(c.innerType);
      break;
    case "pipe":
      s(c.in), s(c.out);
      break;
    case "function":
      s(c.input), s(c.output);
      break;
    case "lazy": {
      const u = c._cachedInner ?? void 0;
      a(u ? ft(u, e) : ht);
      break;
    }
    case "template_literal":
    case "string":
    case "number":
    case "int":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
    case "void":
    case "never":
    case "any":
    case "unknown":
    case "date":
    case "nan":
    case "enum":
    case "literal":
    case "file":
    case "transform":
    case "custom":
      break;
    default:
      for (const u in c) {
        const d = Object.getOwnPropertyDescriptor(c, u);
        if (!d || d.get)
          continue;
        const h = d.value;
        if (!(!h || typeof h != "object")) {
          if (h._zod)
            s(h);
          else if (Array.isArray(h))
            for (const f of h)
              s(f);
        }
      }
  }
  return e.delete(t), Xa(t, i);
}
function Xa(t, e) {
  return e !== ht && qn.set(t, e === Xe), e;
}
function ec(t, e) {
  let r = t.buckets.get(e);
  return r || (r = /* @__PURE__ */ new WeakMap(), t.buckets.set(e, r)), r;
}
let ct;
const lt = [], tc = {
  alloc(t, e, r) {
    const n = ct;
    if (!n)
      return r;
    ct = void 0;
    const i = { value: r, issues: null };
    return n.set(e.value, i), lt.push(i), r;
  },
  guard(t) {
    var e;
    (e = t._zod).deferred ?? (e.deferred = []), t._zod.deferred.push(() => {
      const r = t._zod.parse, n = (i, s) => {
        if (s.direction !== "backward" && nc(s, i.value))
          throw new Ka();
        return r(i, s);
      };
      t._zod.parse = n, t._zod.run === r && (t._zod.run = n);
    });
  },
  attach(t) {
    var e;
    let r, n = !1, i, s;
    (e = t._zod).deferred ?? (e.deferred = []), t._zod.deferred.push(() => {
      const o = t._zod.parse, a = (c, l) => {
        if (r === void 0) {
          const S = ft(t, /* @__PURE__ */ new Set());
          if (S === Qe)
            return t._zod.parse = o, t._zod.run === a && (t._zod.run = o), o(c, l);
          S === Xe || n ? r = !0 : n = !0;
        }
        const u = c.value;
        if (!Wn(u))
          return o(c, l);
        let d = l[Jt];
        d || (d = { buckets: /* @__PURE__ */ new WeakMap(), backEdges: void 0 }, l[Jt] = d);
        let h;
        i === l ? h = s : (h = ec(d, t), i = l, s = h);
        const f = h.get(u);
        if (f)
          return c.value = f.value, f.issues ? f.issues.length && c.issues.push(...Ut(f.issues)) : (c.memo = !0, d.backEdges ?? (d.backEdges = /* @__PURE__ */ new WeakSet()), d.backEdges.add(f.value)), c;
        ct = h;
        const p = lt.length, g = o(c, l);
        ct = void 0;
        const v = lt.length > p ? lt.pop() : void 0;
        return g instanceof Promise ? g.then((S) => (v && (v.issues = S.issues.length ? Ut(S.issues) : Qr), S)) : (v && (v.issues = g.issues.length ? Ut(g.issues) : Qr), g);
      };
      t._zod.parse = a, t._zod.run === o && (t._zod.run = a);
    });
  }
};
function rc() {
  return tc;
}
function nc(t, e) {
  var n;
  const r = (n = t[Jt]) == null ? void 0 : n.backEdges;
  return r !== void 0 && Wn(e) && r.has(e);
}
const ic = () => {
  const t = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" },
    map: { unit: "entries", verb: "to have" }
  };
  function e(s) {
    return t[s] ?? null;
  }
  const r = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    mac: "MAC address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    currency_code: "currency code",
    credit_card: "credit card number",
    iban: "IBAN",
    jwt: "JWT",
    template_literal: "input"
  }, n = {
    // Compatibility: "nan" -> "NaN" for display
    nan: "NaN"
    // All other type names omitted - they fall back to raw values via ?? operator
  };
  function i(s, o) {
    return s === "number" && typeof o == "number" && !Number.isFinite(o) ? String(o) : n[s] ?? s;
  }
  return (s) => {
    switch (s.code) {
      case "invalid_type": {
        const o = i(s.expected), a = ks(s.input), c = i(a, s.input);
        return `Invalid input: expected ${o}, received ${c}`;
      }
      case "invalid_value":
        return s.values.length === 1 ? `Invalid input: expected ${Tn(s.values[0])}` : `Invalid option: expected one of ${Pr(s.values, "|")}`;
      case "too_big": {
        const o = s.exact ? "exactly " : s.inclusive ? "<=" : "<", a = e(s.origin);
        return a ? `Too big: expected ${s.origin ?? "value"} to have ${o}${s.maximum.toString()} ${a.unit ?? "elements"}` : `Too big: expected ${s.origin ?? "value"} to be ${o}${s.maximum.toString()}`;
      }
      case "too_small": {
        const o = s.exact ? "exactly " : s.inclusive ? ">=" : ">", a = e(s.origin);
        return a ? `Too small: expected ${s.origin} to have ${o}${s.minimum.toString()} ${a.unit}` : `Too small: expected ${s.origin} to be ${o}${s.minimum.toString()}`;
      }
      case "invalid_format": {
        const o = s;
        return o.format === "starts_with" ? `Invalid string: must start with "${o.prefix}"` : o.format === "ends_with" ? `Invalid string: must end with "${o.suffix}"` : o.format === "includes" ? `Invalid string: must include "${o.includes}"` : o.format === "regex" ? `Invalid string: must match pattern ${o.pattern}` : `Invalid ${r[o.format] ?? s.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${s.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${s.keys.length > 1 ? "s" : ""}: ${Pr(s.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${s.origin}`;
      case "invalid_union":
        return s.options && Array.isArray(s.options) && s.options.length > 0 ? `Invalid discriminator value. Expected ${s.options.map((a) => `'${a}'`).join(" | ")}` : s.inclusive === !1 ? "Invalid input: more than one option matched" : "Invalid input";
      case "invalid_element":
        return `Invalid value in ${s.origin}`;
      default:
        return "Invalid input";
    }
  };
};
function sc() {
  return {
    localeError: ic()
  };
}
var Kr;
class oc {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add(e, ...r) {
    const n = r[0];
    return this._map.set(e, n), n && typeof n == "object" && "id" in n && this._idmap.set(n.id, e), this;
  }
  clear() {
    return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
  }
  remove(e) {
    const r = this._map.get(e);
    return r && typeof r == "object" && "id" in r && this._idmap.delete(r.id), this._map.delete(e), this;
  }
  get(e) {
    const r = e._zod.parent;
    if (r) {
      const n = { ...this.get(r) ?? {} };
      delete n.id;
      const i = { ...n, ...this._map.get(e) };
      return Object.keys(i).length ? i : void 0;
    }
    return this._map.get(e);
  }
  has(e) {
    return this._map.has(e);
  }
}
function ac() {
  return new oc();
}
(Kr = globalThis).__zod_globalRegistry ?? (Kr.__zod_globalRegistry = ac());
const Ke = globalThis.__zod_globalRegistry;
function Yn(t) {
  return t.checks && (t.checks = [...t.checks]), t;
}
// @__NO_SIDE_EFFECTS__
function cc(t, e) {
  return new t(Yn({ type: "string", ...k(e) }));
}
// @__NO_SIDE_EFFECTS__
function lc(t, e) {
  return new t({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function uc(t, e) {
  return new t({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function dc(t, e) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function hc(t, e) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function fc(t, e) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function mc(t, e) {
  return new t({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function pc(t, e) {
  return new t({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function gc(t, e) {
  return new t({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function yc(t, e) {
  return new t({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function vc(t, e) {
  return new t({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Sc(t, e) {
  return new t({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function wc(t, e) {
  return new t({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function _c(t, e) {
  return new t({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function bc(t, e) {
  return new t({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Ec(t, e) {
  return new t({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Ic(t, e) {
  return new t({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Tc(t, e) {
  return new t({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Cc(t, e) {
  return new t({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Ac(t, e) {
  return new t({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Mc(t, e) {
  return new t({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function $c(t, e) {
  return new t({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function kc(t, e) {
  return new t({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Oc(t, e) {
  return new t({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Nc(t, e) {
  return new t({
    type: "string",
    format: "date",
    check: "string_format",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Rc(t, e) {
  return new t({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Pc(t, e) {
  return new t({
    type: "string",
    format: "duration",
    check: "string_format",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Dc(t, e) {
  return new t(Yn({ type: "number", checks: [], ...k(e) }));
}
// @__NO_SIDE_EFFECTS__
function Lc(t, e) {
  return new t({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function xc(t, e) {
  return new t({
    type: "boolean",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function zc(t) {
  return new t({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function Uc(t) {
  return new t({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function Fc(t, e) {
  return new t({
    type: "never",
    ...k(e)
  });
}
// @__NO_SIDE_EFFECTS__
function Xr(t, e) {
  return new Rn({
    check: "less_than",
    ...k(e),
    value: t,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function Ft(t, e) {
  return new Rn({
    check: "less_than",
    ...k(e),
    value: t,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function en(t, e) {
  return new Pn({
    check: "greater_than",
    ...k(e),
    value: t,
    inclusive: !1
  });
}
// @__NO_SIDE_EFFECTS__
function jt(t, e) {
  return new Pn({
    check: "greater_than",
    ...k(e),
    value: t,
    inclusive: !0
  });
}
// @__NO_SIDE_EFFECTS__
function tn(t, e) {
  return new Lo({
    check: "multiple_of",
    ...k(e),
    value: t
  });
}
// @__NO_SIDE_EFFECTS__
function Hn(t, e) {
  return new zo({
    check: "max_length",
    ...k(e),
    maximum: t
  });
}
// @__NO_SIDE_EFFECTS__
function bt(t, e) {
  return new Uo({
    check: "min_length",
    ...k(e),
    minimum: t
  });
}
// @__NO_SIDE_EFFECTS__
function Jn(t, e) {
  return new Fo({
    check: "length_equals",
    ...k(e),
    length: t
  });
}
// @__NO_SIDE_EFFECTS__
function jc(t, e) {
  return new jo({
    check: "string_format",
    format: "regex",
    ...k(e),
    pattern: t
  });
}
// @__NO_SIDE_EFFECTS__
function Bc(t) {
  return new Bo({
    check: "string_format",
    format: "lowercase",
    ...k(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Gc(t) {
  return new Go({
    check: "string_format",
    format: "uppercase",
    ...k(t)
  });
}
// @__NO_SIDE_EFFECTS__
function Vc(t, e) {
  return new Vo({
    check: "string_format",
    format: "includes",
    ...k(e),
    includes: t
  });
}
// @__NO_SIDE_EFFECTS__
function Zc(t, e) {
  return new Zo({
    check: "string_format",
    format: "starts_with",
    ...k(e),
    prefix: t
  });
}
// @__NO_SIDE_EFFECTS__
function Wc(t, e) {
  return new Wo({
    check: "string_format",
    format: "ends_with",
    ...k(e),
    suffix: t
  });
}
// @__NO_SIDE_EFFECTS__
function Ve(t) {
  return new qo({
    check: "overwrite",
    tx: t
  });
}
// @__NO_SIDE_EFFECTS__
function qc(t) {
  return /* @__PURE__ */ Ve((e) => e.normalize(t));
}
// @__NO_SIDE_EFFECTS__
function Yc() {
  return /* @__PURE__ */ Ve((t) => t.trim());
}
// @__NO_SIDE_EFFECTS__
function Hc() {
  return /* @__PURE__ */ Ve((t) => t.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function Jc() {
  return /* @__PURE__ */ Ve((t) => t.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function Qc() {
  return /* @__PURE__ */ Ve((t) => ys(t));
}
// @__NO_SIDE_EFFECTS__
function Kc(t, e, r) {
  return new t({
    type: "array",
    element: e,
    // get element() {
    //   return element;
    // },
    ...k(r)
  });
}
// @__NO_SIDE_EFFECTS__
function Xc(t, e, r) {
  return new t({
    type: "custom",
    check: "custom",
    fn: e,
    ...k(r)
  });
}
// @__NO_SIDE_EFFECTS__
function el(t, e) {
  const r = /* @__PURE__ */ tl((n) => (n.addIssue = (i) => {
    if (typeof i == "string")
      n.issues.push(tt(i, n.value, r._zod.def));
    else {
      const s = i;
      s.fatal && (s.continue = !1), s.code ?? (s.code = "custom"), "input" in s || (s.input = n.value), s.inst ?? (s.inst = r), s.continue ?? (s.continue = !r._zod.def.abort), n.issues.push(tt(s));
    }
  }, t(n.value, n)), e);
  return r;
}
// @__NO_SIDE_EFFECTS__
function tl(t, e) {
  const r = new ee({
    check: "custom",
    ...k(e)
  });
  return r._zod.check = t, r;
}
function et(t, ...e) {
  for (const r of e)
    for (const n of Reflect.ownKeys(r))
      Object.prototype.propertyIsEnumerable.call(r, n) && Ee(t, n, r[n]);
  return t;
}
function Qn(t) {
  let e = (t == null ? void 0 : t.target) ?? "draft-2020-12";
  return e === "draft-4" && (e = "draft-04"), e === "draft-7" && (e = "draft-07"), {
    processors: t.processors ?? {},
    metadataRegistry: (t == null ? void 0 : t.metadata) ?? Ke,
    target: e,
    unrepresentable: (t == null ? void 0 : t.unrepresentable) ?? "throw",
    override: (t == null ? void 0 : t.override) ?? (() => {
    }),
    io: (t == null ? void 0 : t.io) ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    sharedDefsExtractedFor: void 0,
    sharedEmitDoneFor: void 0,
    cycles: (t == null ? void 0 : t.cycles) ?? "ref",
    reused: (t == null ? void 0 : t.reused) ?? "inline",
    intersections: [],
    deferred: [],
    external: (t == null ? void 0 : t.external) ?? void 0
  };
}
function Ze(t, e, r, n, i) {
  const s = typeof e.unrepresentable == "function" ? e.unrepresentable({ zodSchema: t, path: n.path, message: i }) : e.unrepresentable;
  if (s === "any")
    return !1;
  if (s === void 0 || s === "throw")
    throw new Error(i);
  return Object.assign(r, s), !0;
}
function H(t, e, r = { path: [], schemaPath: [] }) {
  var u, d;
  var n;
  const i = t._zod.def, s = e.seen.get(t);
  if (s)
    return s.count++, r.schemaPath.includes(t) && (s.cycle = r.path), s.schema;
  const o = { schema: {}, count: 1, cycle: void 0, path: r.path };
  e.seen.set(t, o), e.sharedDefsExtractedFor = void 0, e.sharedEmitDoneFor = void 0;
  const a = (d = (u = t._zod).toJSONSchema) == null ? void 0 : d.call(u);
  if (a)
    o.schema = a;
  else {
    const h = {
      ...r,
      schemaPath: [...r.schemaPath, t],
      path: r.path
    };
    if (t._zod.processJSONSchema)
      t._zod.processJSONSchema(e, o.schema, h);
    else {
      const p = o.schema, g = e.processors[i.type];
      if (!g)
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
      g(t, e, p, h);
    }
    const f = t._zod.parent;
    f && (o.ref || (o.ref = f), H(f, e, h), e.seen.get(f).isParent = !0);
  }
  const c = e.metadataRegistry.get(t);
  return c && et(o.schema, c), e.io === "input" && K(t) && (delete o.schema.examples, delete o.schema.default), e.io === "input" && "_prefault" in o.schema && ((n = o.schema).default ?? (n.default = o.schema._prefault)), delete o.schema._prefault, e.seen.get(t).schema;
}
function rn(t) {
  return t.replace(/~/g, "~0").replace(/\//g, "~1");
}
function Kn(t, e) {
  var o, a, c, l;
  const r = t.seen.get(e);
  if (!r)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  if (t.external && t.sharedDefsExtractedFor === t.external)
    return;
  const n = /* @__PURE__ */ new Map();
  for (const u of t.seen.entries()) {
    const d = (o = t.metadataRegistry.get(u[0])) == null ? void 0 : o.id;
    if (d) {
      const h = n.get(d);
      if (h && h !== u[0])
        throw new Error(`Duplicate schema id "${d}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      n.set(d, u[0]);
    }
  }
  const i = (u) => {
    var g;
    const d = t.target === "draft-2020-12" ? "$defs" : "definitions";
    if (t.external) {
      const v = (g = t.external.registry.get(u[0])) == null ? void 0 : g.id, S = t.external.uri ?? ((R) => R);
      if (v)
        return { ref: S(v) };
      const _ = u[1].defId ?? u[1].schema.id ?? `schema${t.counter++}`;
      return u[1].defId = _, { defId: _, ref: `${S("__shared")}#/${d}/${rn(_)}` };
    }
    const h = "#", f = `${h}/${d}/`;
    if (u[1] === r && !u[1].schema.id)
      return { ref: h };
    const p = u[1].schema.id ?? `__schema${t.counter++}`;
    return { defId: p, ref: f + rn(p) };
  }, s = (u) => {
    if (u[1].schema.$ref)
      return;
    const d = u[1], { ref: h, defId: f } = i(u);
    d.def = { ...d.schema }, f && (d.defId = f);
    const p = d.schema;
    for (const g in p)
      delete p[g];
    p.$ref = h;
  };
  if (t.cycles === "throw")
    for (const u of t.seen.entries()) {
      const d = u[1];
      if (d.cycle)
        throw new Error(`Cycle detected: #/${(a = d.cycle) == null ? void 0 : a.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (const u of t.seen.entries()) {
    const d = u[1];
    if (e === u[0]) {
      s(u);
      continue;
    }
    if (t.external) {
      const f = (c = t.external.registry.get(u[0])) == null ? void 0 : c.id;
      if (e !== u[0] && f) {
        s(u);
        continue;
      }
    }
    if ((l = t.metadataRegistry.get(u[0])) == null ? void 0 : l.id) {
      s(u);
      continue;
    }
    if (d.cycle) {
      s(u);
      continue;
    }
    d.count > 1 && t.reused === "ref" && s(u);
  }
  t.external && (t.sharedDefsExtractedFor = t.external);
}
function Xn(t) {
  const e = t.anyOf;
  if (!Array.isArray(e) || e.length === 0 || t.type !== void 0)
    return;
  const r = [];
  for (const n of e) {
    if (!n || typeof n != "object")
      return;
    Xn(n);
    const i = Object.keys(n);
    if (i.length !== 1 || i[0] !== "type")
      return;
    const s = n.type;
    for (const o of Array.isArray(s) ? s : [s]) {
      if (typeof o != "string")
        return;
      r.includes(o) || r.push(o);
    }
  }
  delete t.anyOf, t.type = r.length === 1 ? r[0] : r;
}
const ei = /* @__PURE__ */ new Set(["type", "properties", "required", "additionalProperties"]), nn = ["oneOf", "anyOf"];
function sn(t) {
  const e = t.additionalProperties;
  return e === void 0 || e === !1 || typeof e != "object" || e === null ? null : Object.keys(e).length ? e : null;
}
function Qt(t) {
  var s;
  const e = [];
  for (const o of t) {
    if (typeof o != "object" || o.type !== "object")
      return null;
    for (const a in o)
      if (!ei.has(a))
        return null;
    e.push(o);
  }
  const r = {}, n = /* @__PURE__ */ new Set();
  for (const o of e) {
    for (const a in o.properties) {
      if (Object.prototype.hasOwnProperty.call(r, a))
        continue;
      const c = [];
      for (const u of e) {
        const d = ((s = u.properties) == null ? void 0 : s[a]) ?? sn(u);
        d != null && (c.some((h) => JSON.stringify(h) === JSON.stringify(d)) || c.push(d));
      }
      const l = c.length === 1 ? c[0] : Qt(c) ?? { allOf: c };
      Ee(r, a, l);
    }
    for (const a of o.required ?? [])
      n.add(a);
  }
  const i = { type: "object", properties: r };
  if (n.size && (i.required = [...n]), e.every((o) => o.additionalProperties === !1))
    i.additionalProperties = !1;
  else {
    const o = [];
    for (const a of e) {
      const c = sn(a);
      c && !o.some((l) => JSON.stringify(l) === JSON.stringify(c)) && o.push(c);
    }
    o.length === 1 ? i.additionalProperties = o[0] : o.length > 1 && (i.additionalProperties = { allOf: o });
  }
  return i;
}
function rl(t) {
  const e = t.allOf;
  if (!Array.isArray(e) || e.length < 2)
    return;
  for (const i of ei)
    if (i in t)
      return;
  const r = e.filter((i) => nn.some((s) => Array.isArray(i[s])));
  let n = null;
  if (!r.length)
    n = Qt(e);
  else {
    const i = r[0], s = nn.find((c) => Array.isArray(i[c]));
    if (Object.keys(i).length !== 1)
      return;
    const o = e.filter((c) => c !== i), a = i[s].map((c) => Qt([...o, c]));
    if (a.some((c) => !c))
      return;
    n = { [s]: a };
  }
  n && (delete t.allOf, et(t, n));
}
function ti(t, e) {
  var a, c, l, u;
  const r = t.seen.get(e);
  if (!r)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const n = (d) => {
    const h = t.seen.get(d);
    if (h.ref === null)
      return;
    const f = h.def ?? h.schema, p = { ...f }, g = h.ref;
    if (h.ref = null, g) {
      n(g);
      const S = t.seen.get(g), _ = S.schema;
      if (_.$ref && (t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0") ? (f.allOf = f.allOf ?? [], f.allOf.push(_)) : et(f, _), et(f, p), d._zod.parent === g)
        for (const M in f)
          M === "$ref" || M === "allOf" || M in p || delete f[M];
      if (_.$ref && S.def)
        for (const M in f)
          M === "$ref" || M === "allOf" || M in S.def && JSON.stringify(f[M]) === JSON.stringify(S.def[M]) && delete f[M];
    }
    const v = d._zod.parent;
    if (v && v !== g) {
      n(v);
      const S = t.seen.get(v);
      if (S != null && S.schema.$ref && (f.$ref = S.schema.$ref, S.def))
        for (const _ in f)
          _ === "$ref" || _ === "allOf" || _ in S.def && JSON.stringify(f[_]) === JSON.stringify(S.def[_]) && delete f[_];
    }
    t.override({
      zodSchema: d,
      jsonSchema: f,
      path: h.path ?? []
    });
  };
  if (!t.external || t.sharedEmitDoneFor !== t.external) {
    for (const d of [...t.seen.entries()].reverse())
      n(d[0]);
    if (t.target !== "openapi-3.0")
      for (const d of t.seen.entries())
        Xn(d[1].def ?? d[1].schema);
    for (const d of t.deferred)
      d();
    if (t.intersections.length) {
      const d = /* @__PURE__ */ new Map();
      for (const h of t.seen.values())
        for (const f of [h.schema, h.def]) {
          const p = f == null ? void 0 : f.allOf;
          if (!Array.isArray(p))
            continue;
          const g = d.get(p);
          g ? g.push(f) : d.set(p, [f]);
        }
      for (const h of t.intersections)
        for (const f of d.get(h) ?? [])
          rl(f);
    }
  }
  const i = {};
  if (t.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : t.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : t.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : t.target, (a = t.external) != null && a.uri) {
    const d = (c = t.external.registry.get(e)) == null ? void 0 : c.id;
    if (!d)
      throw new Error("Schema is missing an `id` property");
    i.$id = t.external.uri(d);
  }
  et(i, r.defId ? r.schema : r.def ?? r.schema);
  const s = (l = t.metadataRegistry.get(e)) == null ? void 0 : l.id;
  s !== void 0 && i.id === s && delete i.id;
  const o = ((u = t.external) == null ? void 0 : u.defs) ?? {};
  if (!t.external || t.sharedEmitDoneFor !== t.external)
    for (const d of t.seen.entries()) {
      const h = d[1];
      h.def && h.defId && (h.def.id === h.defId && delete h.def.id, Ee(o, h.defId, h.def));
    }
  t.external && (t.sharedEmitDoneFor = t.external), t.external || Object.keys(o).length > 0 && (t.target === "draft-2020-12" ? i.$defs = o : i.definitions = o);
  try {
    const d = JSON.parse(JSON.stringify(i));
    return Object.defineProperty(d, "~standard", {
      value: {
        ...e["~standard"],
        jsonSchema: {
          input: Et(e, "input", t.processors),
          output: Et(e, "output", t.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), d;
  } catch {
    throw new Error("Error converting schema to JSON.");
  }
}
function K(t, e) {
  const r = e ?? { seen: /* @__PURE__ */ new Set() };
  if (r.seen.has(t))
    return !1;
  r.seen.add(t);
  const n = t._zod.def;
  if (n.type === "transform")
    return !0;
  if (n.type === "array")
    return K(n.element, r);
  if (n.type === "set")
    return K(n.valueType, r);
  if (n.type === "lazy")
    return K(n.getter(), r);
  if (n.type === "promise" || n.type === "optional" || n.type === "nonoptional" || n.type === "nullable" || n.type === "readonly" || n.type === "default" || n.type === "prefault" || n.type === "catch")
    return K(n.innerType, r);
  if (n.type === "intersection")
    return K(n.left, r) || K(n.right, r);
  if (n.type === "record" || n.type === "map")
    return K(n.keyType, r) || K(n.valueType, r);
  if (n.type === "pipe")
    return t._zod.traits.has("$ZodCodec") ? !0 : K(n.in, r) || K(n.out, r);
  if (n.type === "object") {
    for (const i in n.shape)
      if (K(n.shape[i], r))
        return !0;
    return !1;
  }
  if (n.type === "union") {
    for (const i of n.options)
      if (K(i, r))
        return !0;
    return !1;
  }
  if (n.type === "tuple") {
    for (const i of n.items)
      if (K(i, r))
        return !0;
    return !!(n.rest && K(n.rest, r));
  }
  return !1;
}
const nl = (t, e = {}) => (r) => {
  const n = Qn({ ...r, processors: e });
  return H(t, n), Kn(n, t), ti(n, t);
}, Et = (t, e, r = {}) => (n) => {
  const { libraryOptions: i, target: s } = n ?? {}, o = Qn({ ...i ?? {}, target: s, io: e, processors: r });
  return H(t, o), Kn(o, t), ti(o, t);
}, Be = (t, e, r) => {
  (t[e] === void 0 || r > t[e]) && (t[e] = r);
}, Ge = (t, e, r) => {
  (t[e] === void 0 || r < t[e]) && (t[e] = r);
}, on = (t, e) => {
  Be(t, "minimum", e), Ge(t, "maximum", e);
}, ri = (t, e) => {
  t.multipleOf ?? (t.multipleOf = []), t.multipleOf.includes(e) || t.multipleOf.push(e);
}, ni = (t, e) => {
  t.patterns ?? (t.patterns = /* @__PURE__ */ new Set()), t.patterns.add(e);
}, ii = (t, e) => {
  t.mime = t.mime ? t.mime.filter((r) => e.includes(r)) : [...e];
}, si = (t, e) => {
  t.format = e, e.includes("int") && (t.isInt = !0);
}, an = (t, e) => Be(t, "minimum", e.minimum), cn = (t, e) => Ge(t, "maximum", e.maximum), ln = (t) => (e, r) => {
  si(e, r.format);
  const [n, i] = t[r.format];
  Be(e, "minimum", n), Ge(e, "maximum", i);
}, Bt = {
  greater_than: (t, e) => Be(t, e.inclusive ? "minimum" : "exclusiveMinimum", e.value),
  less_than: (t, e) => Ge(t, e.inclusive ? "maximum" : "exclusiveMaximum", e.value),
  multiple_of: (t, e) => ri(t, e.value),
  number_format: ln(Cn),
  bigint_format: ln(_s),
  min_length: an,
  max_length: cn,
  length_equals: (t, e) => on(t, e.length),
  min_size: an,
  max_size: cn,
  size_equals: (t, e) => on(t, e.size),
  string_format: (t, e) => {
    si(t, e.format), e.pattern && ni(t, e.pattern), (e.format === "base64" || e.format === "base64url") && (t.contentEncoding = e.format), (e.local || e.precision === -1) && (t.laxFormat = !0);
  },
  mime_type: (t, e) => ii(t, e.mime)
};
function le(t) {
  var s;
  const e = {}, r = t._zod.def, n = t._zod.traits.has("$ZodCheck") ? [t, ...r.checks ?? []] : r.checks ?? [];
  for (const o of n)
    (s = Bt[o._zod.def.check]) == null || s.call(Bt, e, o._zod.def);
  const i = t._zod.bag;
  i.minimum !== void 0 && Be(e, "minimum", i.minimum), i.exclusiveMinimum !== void 0 && Be(e, "exclusiveMinimum", i.exclusiveMinimum), i.maximum !== void 0 && Ge(e, "maximum", i.maximum), i.exclusiveMaximum !== void 0 && Ge(e, "exclusiveMaximum", i.exclusiveMaximum), i.multipleOf !== void 0 && ri(e, i.multipleOf), i.format !== void 0 && (e.format ?? (e.format = i.format), i.format.includes("int") && (e.isInt = !0)), i.mime && ii(e, i.mime);
  for (const o of i.patterns ?? [])
    ni(e, o);
  return e;
}
const il = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
}, sl = /* @__PURE__ */ new Map([
  [jn, Eo],
  [gr, Io]
]), oi = (t) => sl.get(t) ?? t, ol = (t, e, r, n) => {
  const i = r;
  i.type = "string";
  const { minimum: s, maximum: o, format: a, patterns: c, contentEncoding: l, laxFormat: u } = le(t);
  if (typeof s == "number" && (i.minLength = s), typeof o == "number" && (i.maxLength = o), a && (i.format = il[a] ?? a, i.format === "" && delete i.format, (a === "time" || u) && delete i.format), l && (i.contentEncoding = l), c && c.size > 0) {
    const d = [...c].map(oi);
    d.length === 1 ? i.pattern = d[0].source : d.length > 1 && (i.allOf = [
      ...d.map((h) => ({
        ...e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0" ? { type: "string" } : {},
        pattern: h.source
      }))
    ]);
  }
}, al = (t, e, r, n) => {
  const i = r, { minimum: s, maximum: o, multipleOf: a, exclusiveMaximum: c, exclusiveMinimum: l, isInt: u } = le(t);
  i.type = u ? "integer" : "number";
  const d = typeof l == "number" && l >= (s ?? Number.NEGATIVE_INFINITY), h = typeof c == "number" && c <= (o ?? Number.POSITIVE_INFINITY), f = e.target === "draft-04" || e.target === "openapi-3.0";
  if (d ? f ? (i.minimum = l, i.exclusiveMinimum = !0) : i.exclusiveMinimum = l : typeof s == "number" && (i.minimum = s), h ? f ? (i.maximum = c, i.exclusiveMaximum = !0) : i.exclusiveMaximum = c : typeof o == "number" && (i.maximum = o), a) {
    const p = /* @__PURE__ */ new Set();
    for (const S of a)
      Number.isFinite(S) && S !== 0 ? p.add(Math.abs(S)) : Ze(t, e, i, n, `A multipleOf divisor of ${S} cannot be represented in JSON Schema`);
    const [g, ...v] = p;
    g !== void 0 && (i.multipleOf = g), v.length && (i.allOf = [...i.allOf ?? [], ...v.map((S) => ({ multipleOf: S }))]);
  }
}, cl = (t, e, r, n) => {
  r.type = "boolean";
}, ll = (t, e, r, n) => {
  r.not = {};
}, ul = (t, e, r, n) => {
}, dl = (t, e, r, n) => {
}, hl = (t, e, r, n) => {
  const i = t._zod.def, s = Wt(i.entries);
  if (s.length === 0) {
    r.not = {};
    return;
  }
  s.every((o) => typeof o == "number") && (r.type = "number"), s.every((o) => typeof o == "string") && (r.type = "string"), r.enum = s;
}, fl = (t, e, r, n) => {
  Ze(t, e, r, n, "Custom types cannot be represented in JSON Schema");
}, ml = (t, e, r, n) => {
  Ze(t, e, r, n, "Transforms cannot be represented in JSON Schema");
}, pl = (t, e, r, n) => {
  const i = r, s = t._zod.def, { minimum: o, maximum: a } = le(t);
  typeof o == "number" && (i.minItems = o), typeof a == "number" && (i.maxItems = a), i.type = "array", i.items = H(s.element, e, {
    ...n,
    path: [...n.path, "items"]
  });
};
function It(t) {
  const e = t._zod.def;
  return e.type === "pipe" && e.in._zod.traits.has("$ZodTransform") ? It(e.out) : e.type === "catch" ? It(e.innerType) : t._zod.optin;
}
const gl = (t, e, r, n) => {
  var l;
  const i = r, s = t._zod.def, o = s.shape;
  if (Object.getOwnPropertySymbols(o).length && Ze(t, e, i, n, "Symbol keys cannot be represented in JSON Schema"))
    return;
  i.type = "object", i.properties = {};
  for (const u in o)
    Ee(i.properties, u, H(o[u], e, {
      ...n,
      path: [...n.path, "properties", u]
    }));
  const c = [];
  for (const u of Object.keys(o)) {
    const d = s.shape[u];
    (e.io === "input" ? It(d) === void 0 : d._zod.optout === void 0) && c.push(u);
  }
  c.length > 0 && (i.required = c), ((l = s.catchall) == null ? void 0 : l._zod.def.type) === "never" ? i.additionalProperties = !1 : s.catchall ? s.catchall && (i.additionalProperties = H(s.catchall, e, {
    ...n,
    path: [...n.path, "additionalProperties"]
  })) : e.io === "output" && (i.additionalProperties = !1);
}, yl = (t, e, r, n) => {
  const i = t._zod.def, s = i.inclusive === !1, o = i.options.map((a, c) => H(a, e, {
    ...n,
    path: [...n.path, s ? "oneOf" : "anyOf", c]
  }));
  s ? r.oneOf = o : r.anyOf = o;
}, vl = (t, e, r, n) => {
  const i = t._zod.def, s = H(i.left, e, {
    ...n,
    path: [...n.path, "allOf", 0]
  }), o = H(i.right, e, {
    ...n,
    path: [...n.path, "allOf", 1]
  }), a = (l) => "allOf" in l && Object.keys(l).length === 1, c = [
    ...a(s) ? s.allOf : [s],
    ...a(o) ? o.allOf : [o]
  ];
  r.allOf = c, e.intersections.push(c);
};
function Kt(t, e, r) {
  var p;
  if (e.$ref) {
    if (r.has(e))
      return e;
    r.add(e);
    const g = (p = t.get(e)) == null ? void 0 : p.def;
    if (!g)
      return e;
    const v = Kt(t, g, r);
    return v === g ? e : v;
  }
  for (const g of ["anyOf", "oneOf"]) {
    const v = e[g];
    if (!Array.isArray(v))
      continue;
    const S = v.map((_) => Kt(t, _, r));
    S.some((_, R) => _ !== v[R]) && (e = { ...e, [g]: S });
  }
  const n = Array.isArray(e.type) ? e.type : [e.type], i = !n.includes("string") && n.some((g) => g === "number" || g === "integer"), s = e.enum ?? (e.const !== void 0 ? [e.const] : void 0);
  if (!i && !(s != null && s.some((g) => typeof g == "number")))
    return e;
  const { minimum: o, maximum: a, exclusiveMinimum: c, exclusiveMaximum: l, multipleOf: u, format: d, id: h, ...f } = e;
  return f.enum ? f.enum = f.enum.map((g) => typeof g == "number" ? String(g) : g) : typeof f.const == "number" && (f.const = String(f.const)), i && (f.type = "string", s || (f.pattern = (n.includes("number") ? fr : No).source)), f;
}
const Xt = /* @__PURE__ */ new WeakMap();
function Sl(t) {
  var n;
  const e = /* @__PURE__ */ new Map();
  for (const i of t.seen.values())
    i.def && !e.has(i.schema) && e.set(i.schema, i);
  const r = /* @__PURE__ */ new Map();
  for (const i of Xt.get(t) ?? []) {
    const s = t.seen.get(i), o = (n = (s == null ? void 0 : s.def) ?? (s == null ? void 0 : s.schema)) == null ? void 0 : n.propertyNames;
    if (!o || o === !0 || r.has(o))
      continue;
    const a = Kt(e, o, /* @__PURE__ */ new Set());
    a !== o && r.set(o, a);
  }
  if (r.size)
    for (const i of t.seen.values())
      for (const s of [i.schema, i.def]) {
        const o = s && r.get(s.propertyNames);
        o && (s.propertyNames = o);
      }
}
const wl = (t, e, r, n) => {
  const i = r, s = t._zod.def;
  i.type = "object";
  const o = s.keyType, a = le(o).patterns;
  if (s.mode === "loose" && a && a.size > 0) {
    const u = H(s.valueType, e, {
      ...n,
      path: [...n.path, "patternProperties", "*"]
    });
    i.patternProperties = {};
    for (const d of a)
      Ee(i.patternProperties, oi(d).source, u);
  } else {
    if (e.target === "draft-07" || e.target === "draft-2020-12") {
      i.propertyNames = H(s.keyType, e, {
        ...n,
        path: [...n.path, "propertyNames"]
      });
      let u = Xt.get(e);
      u || (u = [], Xt.set(e, u), e.deferred.push(() => Sl(e))), u.push(t);
    }
    i.additionalProperties = H(s.valueType, e, {
      ...n,
      path: [...n.path, "additionalProperties"]
    });
  }
  const c = o._zod.values, l = e.io === "input" && It(s.valueType) !== void 0;
  if (c && !s.partial && !l) {
    const u = [...c].filter((d) => typeof d == "string" || typeof d == "number");
    u.length > 0 && (i.required = u.map(String));
  }
}, _l = (t, e, r, n) => {
  const i = t._zod.def, s = H(i.innerType, e, n), o = e.seen.get(t);
  e.target === "openapi-3.0" ? (o.ref = i.innerType, r.nullable = !0) : r.anyOf = [s, { type: "null" }];
}, bl = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  s.ref = i.innerType;
}, yr = Symbol();
function ai(t, e, r, n, i) {
  let s = !1;
  const o = JSON.stringify(t, (a, c) => typeof c != "bigint" ? c : (s = !0, null));
  return s ? (Ze(e, r, n, i, "BigInt defaults cannot be represented in JSON Schema"), yr) : JSON.parse(o);
}
const El = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  s.ref = i.innerType;
  const o = ai(i.defaultValue, t, e, r, n);
  o !== yr && (r.default = o);
}, Il = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  if (s.ref = i.innerType, e.io !== "input")
    return;
  const o = ai(i.defaultValue, t, e, r, n);
  o !== yr && (r._prefault = o);
}, Tl = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  s.ref = i.innerType;
  let o;
  try {
    o = i.catchValue(void 0);
  } catch {
    Ze(t, e, r, n, "Dynamic catch values are not supported in JSON Schema");
    return;
  }
  r.default = o;
}, Cl = (t, e, r, n) => {
  const i = t._zod.def, s = i.in._zod.traits.has("$ZodTransform"), o = e.io === "input" ? s ? i.out : i.in : i.out;
  H(o, e, n);
  const a = e.seen.get(t);
  a.ref = o;
}, Al = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  s.ref = i.innerType, r.readOnly = !0;
}, ci = (t, e, r, n) => {
  const i = t._zod.def;
  H(i.innerType, e, n);
  const s = e.seen.get(t);
  s.ref = i.innerType;
}, un = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function ut(t, e, r) {
  Object.defineProperty(t, e, {
    configurable: !0,
    enumerable: !1,
    get() {
      const n = r(this);
      return Object.defineProperty(this, e, { value: n, configurable: !0, writable: !0 }), n;
    },
    set(n) {
      Object.defineProperty(this, e, { value: n, configurable: !0, writable: !0 });
    }
  });
}
const Ml = (t, e) => {
  Gs.init(t, e), t.name = "ZodError";
  const r = Object.getPrototypeOf(t);
  un.has(r) || (un.add(r), ut(r, "format", (n) => (i) => Ws(n, i)), ut(r, "flatten", (n) => (i) => Zs(n, i)), ut(r, "addIssue", (n) => (i) => {
    n.issues.push(i), n.message = JSON.stringify(n.issues, qt, 2);
  }), ut(r, "addIssues", (n) => (i) => {
    n.issues.push(...i), n.message = JSON.stringify(n.issues, qt, 2);
  }), Object.defineProperty(r, "isEmpty", {
    configurable: !0,
    enumerable: !1,
    get() {
      return this.issues.length === 0;
    }
  }));
}, se = /* @__PURE__ */ w("ZodError", Ml, void 0, {
  Parent: Error
}), $l = /* @__PURE__ */ lr(se), kl = /* @__PURE__ */ ur(se), Ol = /* @__PURE__ */ dr(se), Nl = /* @__PURE__ */ hr(se), Rl = /* @__PURE__ */ Ks(se), Pl = /* @__PURE__ */ Xs(se), Dl = /* @__PURE__ */ eo(se), Ll = /* @__PURE__ */ to(se), xl = /* @__PURE__ */ ro(se), zl = /* @__PURE__ */ no(se), Ul = /* @__PURE__ */ io(se), Fl = /* @__PURE__ */ so(se);
function jl() {
  ue.localeError || he(sc());
}
function $t() {
  ue.memoizer || he({ memoizer: rc() });
}
const Z = /* @__PURE__ */ w("ZodType", (t, e) => (jl(), V.init(t, e), t.def = e, t.type = e.type, t), {
  check(...t) {
    const e = this.def;
    return this.clone(te(e, {
      checks: [
        ...e.checks ?? [],
        ...t.map((r) => typeof r == "function" ? { _zod: { check: r, def: { check: "custom" }, onattach: [] } } : r)
      ]
    }), { parent: !0 });
  },
  with(...t) {
    return this.check(...t);
  },
  clone(t, e) {
    return Ie(this, t, e);
  },
  brand() {
    return this;
  },
  register(t, e) {
    return t.add(this, e), this;
  },
  refine(t, e) {
    return this.check(Uu(t, e));
  },
  superRefine(t, e) {
    return this.check(Fu(t, e));
  },
  overwrite(t) {
    return this.check(/* @__PURE__ */ Ve(t));
  },
  optional() {
    return mn(this);
  },
  exactOptional() {
    return Cu(this);
  },
  nullable() {
    return pn(this);
  },
  nullish() {
    return mn(pn(this));
  },
  nonoptional(t) {
    return Nu(this, t);
  },
  array() {
    return T(this);
  },
  or(t) {
    return _u([this, t]);
  },
  and(t) {
    return Eu(this, t);
  },
  transform(t) {
    return gn(this, Tu(t));
  },
  default(t) {
    return $u(this, t);
  },
  prefault(t) {
    return Ou(this, t);
  },
  catch(t) {
    return Pu(this, t);
  },
  pipe(t) {
    return gn(this, t);
  },
  readonly() {
    return xu(this);
  },
  describe(t) {
    const e = this.clone();
    return Ke.add(e, { description: t }), e;
  },
  meta(...t) {
    if (t.length === 0)
      return Ke.get(this);
    const e = this.clone();
    return Ke.add(e, t[0]), e;
  },
  isOptional() {
    return this.safeParse(void 0).success;
  },
  isNullable() {
    return this.safeParse(null).success;
  },
  apply(t, ...e) {
    return e.length === 0 ? t(this) : t(this, ...e);
  },
  // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
  get "~standard"() {
    return Mn(this, "~standard", {
      ...Ln(this),
      jsonSchema: {
        input: Et(this, "input"),
        output: Et(this, "output")
      }
    });
  },
  set "~standard"(t) {
    be(this, "~standard", t);
  },
  parse: function t(e, r) {
    return $l(this, e, r, { callee: t });
  },
  parseAsync: async function t(e, r) {
    return await kl(this, e, r, { callee: t });
  },
  safeParse(t, e) {
    return Ol(this, t, e);
  },
  async safeParseAsync(t, e) {
    return Nl(this, t, e);
  },
  // `spa` is an alias: same function object as `safeParseAsync`, as before.
  get spa() {
    return this == null ? void 0 : this.safeParseAsync;
  },
  set spa(t) {
    be(this, "spa", t);
  },
  validate(t, e) {
    return Hs(this, t, e);
  },
  validateAsync(t, e) {
    return Qs(this, t, e);
  },
  encode: function t(e, r) {
    return Rl(this, e, r, { callee: t });
  },
  decode: function t(e, r) {
    return Pl(this, e, r, { callee: t });
  },
  encodeAsync: async function t(e, r) {
    return await Dl(this, e, r, { callee: t });
  },
  decodeAsync: async function t(e, r) {
    return await Ll(this, e, r, { callee: t });
  },
  safeEncode(t, e) {
    return xl(this, t, e);
  },
  safeDecode(t, e) {
    return zl(this, t, e);
  },
  async safeEncodeAsync(t, e) {
    return Ul(this, t, e);
  },
  async safeDecodeAsync(t, e) {
    return Fl(this, t, e);
  },
  toJSONSchema(t) {
    return nl(this, {})(t);
  },
  // Reads through to the registry on every access, so it must not cache.
  get description() {
    var t;
    return (t = Ke.get(this)) == null ? void 0 : t.description;
  },
  // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
  get _def() {
    return this._zod.def;
  }
}), li = /* @__PURE__ */ w(
  "_ZodString",
  (t, e) => {
    pr.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ol(t, r, n);
  },
  /* @__PURE__ */ $n({
    format: (t) => le(t).format ?? null,
    minLength: (t) => le(t).minimum ?? null,
    maxLength: (t) => le(t).maximum ?? null
  }, {
    regex(...t) {
      return this.check(/* @__PURE__ */ jc(...t));
    },
    includes(...t) {
      return this.check(/* @__PURE__ */ Vc(...t));
    },
    startsWith(...t) {
      return this.check(/* @__PURE__ */ Zc(...t));
    },
    endsWith(...t) {
      return this.check(/* @__PURE__ */ Wc(...t));
    },
    min(...t) {
      return this.check(/* @__PURE__ */ bt(...t));
    },
    max(...t) {
      return this.check(/* @__PURE__ */ Hn(...t));
    },
    length(...t) {
      return this.check(/* @__PURE__ */ Jn(...t));
    },
    nonempty(...t) {
      return this.check(/* @__PURE__ */ bt(1, ...t));
    },
    lowercase(t) {
      return this.check(/* @__PURE__ */ Bc(t));
    },
    uppercase(t) {
      return this.check(/* @__PURE__ */ Gc(t));
    },
    trim() {
      return this.check(/* @__PURE__ */ Yc());
    },
    normalize(...t) {
      return this.check(/* @__PURE__ */ qc(...t));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ Hc());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ Jc());
    },
    slugify() {
      return this.check(/* @__PURE__ */ Qc());
    }
  })
), Bl = /* @__PURE__ */ w("ZodString", (t, e) => {
  pr.init(t, e), li.init(t, e);
}, {
  email(t) {
    return this.check(/* @__PURE__ */ lc(ql, t));
  },
  url(t) {
    return this.check(/* @__PURE__ */ pc(Hl, t));
  },
  jwt(t) {
    return this.check(/* @__PURE__ */ kc(uu, t));
  },
  emoji(t) {
    return this.check(/* @__PURE__ */ gc(Jl, t));
  },
  guid(t) {
    return this.check(/* @__PURE__ */ uc(Yl, t));
  },
  uuid(t) {
    return this.check(/* @__PURE__ */ dc(dt, t));
  },
  uuidv4(t) {
    return this.check(/* @__PURE__ */ hc(dt, t));
  },
  uuidv6(t) {
    return this.check(/* @__PURE__ */ fc(dt, t));
  },
  uuidv7(t) {
    return this.check(/* @__PURE__ */ mc(dt, t));
  },
  nanoid(t) {
    return this.check(/* @__PURE__ */ yc(Ql, t));
  },
  cuid(t) {
    return this.check(/* @__PURE__ */ vc(Kl, t));
  },
  cuid2(t) {
    return this.check(/* @__PURE__ */ Sc(Xl, t));
  },
  ulid(t) {
    return this.check(/* @__PURE__ */ wc(eu, t));
  },
  base64(t) {
    return this.check(/* @__PURE__ */ Ac(au, t));
  },
  base64url(t) {
    return this.check(/* @__PURE__ */ Mc(cu, t));
  },
  xid(t) {
    return this.check(/* @__PURE__ */ _c(tu, t));
  },
  ksuid(t) {
    return this.check(/* @__PURE__ */ bc(ru, t));
  },
  ipv4(t) {
    return this.check(/* @__PURE__ */ Ec(nu, t));
  },
  ipv6(t) {
    return this.check(/* @__PURE__ */ Ic(iu, t));
  },
  cidrv4(t) {
    return this.check(/* @__PURE__ */ Tc(su, t));
  },
  cidrv6(t) {
    return this.check(/* @__PURE__ */ Cc(ou, t));
  },
  e164(t) {
    return this.check(/* @__PURE__ */ $c(lu, t));
  },
  datetime(t) {
    return this.check(/* @__PURE__ */ Oc(Gl, t));
  },
  date(t) {
    return this.check(/* @__PURE__ */ Nc(Vl, t));
  },
  time(t) {
    return this.check(/* @__PURE__ */ Rc(Zl, t));
  },
  duration(t) {
    return this.check(/* @__PURE__ */ Pc(Wl, t));
  }
});
function m(t) {
  return /* @__PURE__ */ cc(Bl, t);
}
const W = /* @__PURE__ */ w("ZodStringFormat", (t, e) => {
  G.init(t, e), li.init(t, e);
}), Gl = /* @__PURE__ */ w("ZodISODateTime", (t, e) => {
  fa.init(t, e), W.init(t, e);
}), Vl = /* @__PURE__ */ w("ZodISODate", (t, e) => {
  ma.init(t, e), W.init(t, e);
}), Zl = /* @__PURE__ */ w("ZodISOTime", (t, e) => {
  pa.init(t, e), W.init(t, e);
}), Wl = /* @__PURE__ */ w("ZodISODuration", (t, e) => {
  ga.init(t, e), W.init(t, e);
}), ql = /* @__PURE__ */ w("ZodEmail", (t, e) => {
  Xo.init(t, e), W.init(t, e);
}), Yl = /* @__PURE__ */ w("ZodGUID", (t, e) => {
  Qo.init(t, e), W.init(t, e);
}), dt = /* @__PURE__ */ w("ZodUUID", (t, e) => {
  Ko.init(t, e), W.init(t, e);
}), Hl = /* @__PURE__ */ w("ZodURL", (t, e) => {
  sa.init(t, e), W.init(t, e);
}), Jl = /* @__PURE__ */ w("ZodEmoji", (t, e) => {
  oa.init(t, e), W.init(t, e);
}), Ql = /* @__PURE__ */ w("ZodNanoID", (t, e) => {
  aa.init(t, e), W.init(t, e);
}), Kl = /* @__PURE__ */ w("ZodCUID", (t, e) => {
  ca.init(t, e), W.init(t, e);
}), Xl = /* @__PURE__ */ w("ZodCUID2", (t, e) => {
  la.init(t, e), W.init(t, e);
}), eu = /* @__PURE__ */ w("ZodULID", (t, e) => {
  ua.init(t, e), W.init(t, e);
}), tu = /* @__PURE__ */ w("ZodXID", (t, e) => {
  da.init(t, e), W.init(t, e);
}), ru = /* @__PURE__ */ w("ZodKSUID", (t, e) => {
  ha.init(t, e), W.init(t, e);
}), nu = /* @__PURE__ */ w("ZodIPv4", (t, e) => {
  ya.init(t, e), W.init(t, e);
}), iu = /* @__PURE__ */ w("ZodIPv6", (t, e) => {
  Sa.init(t, e), W.init(t, e);
}), su = /* @__PURE__ */ w("ZodCIDRv4", (t, e) => {
  wa.init(t, e), W.init(t, e);
}), ou = /* @__PURE__ */ w("ZodCIDRv6", (t, e) => {
  ba.init(t, e), W.init(t, e);
}), au = /* @__PURE__ */ w("ZodBase64", (t, e) => {
  Ea.init(t, e), W.init(t, e);
}), cu = /* @__PURE__ */ w("ZodBase64URL", (t, e) => {
  Ta.init(t, e), W.init(t, e);
}), lu = /* @__PURE__ */ w("ZodE164", (t, e) => {
  Ca.init(t, e), W.init(t, e);
}), uu = /* @__PURE__ */ w("ZodJWT", (t, e) => {
  Ma.init(t, e), W.init(t, e);
}), ui = /* @__PURE__ */ w(
  "ZodNumber",
  (t, e) => {
    Bn.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => al(t, r, n, i), t.isFinite = !0;
  },
  /* @__PURE__ */ $n({
    minValue: (t) => {
      const { minimum: e, exclusiveMinimum: r } = le(t);
      return Math.max(e ?? Number.NEGATIVE_INFINITY, r ?? Number.NEGATIVE_INFINITY);
    },
    maxValue: (t) => {
      const { maximum: e, exclusiveMaximum: r } = le(t);
      return Math.min(e ?? Number.POSITIVE_INFINITY, r ?? Number.POSITIVE_INFINITY);
    },
    isInt: (t) => {
      const { isInt: e, multipleOf: r } = le(t);
      return !!e || !!(r != null && r.some(Number.isSafeInteger));
    },
    format: (t) => le(t).format ?? null
  }, {
    gt(t, e) {
      return this.check(/* @__PURE__ */ en(t, e));
    },
    gte(t, e) {
      return this.check(/* @__PURE__ */ jt(t, e));
    },
    min(t, e) {
      return this.check(/* @__PURE__ */ jt(t, e));
    },
    lt(t, e) {
      return this.check(/* @__PURE__ */ Xr(t, e));
    },
    lte(t, e) {
      return this.check(/* @__PURE__ */ Ft(t, e));
    },
    max(t, e) {
      return this.check(/* @__PURE__ */ Ft(t, e));
    },
    int(t) {
      return this.check(dn(t));
    },
    safe(t) {
      return this.check(dn(t));
    },
    positive(t) {
      return this.check(/* @__PURE__ */ en(0, t));
    },
    nonnegative(t) {
      return this.check(/* @__PURE__ */ jt(0, t));
    },
    negative(t) {
      return this.check(/* @__PURE__ */ Xr(0, t));
    },
    nonpositive(t) {
      return this.check(/* @__PURE__ */ Ft(0, t));
    },
    multipleOf(t, e) {
      return this.check(/* @__PURE__ */ tn(t, e));
    },
    step(t, e) {
      return this.check(/* @__PURE__ */ tn(t, e));
    },
    finite() {
      return this;
    }
  })
);
function j(t) {
  return /* @__PURE__ */ Dc(ui, t);
}
const du = /* @__PURE__ */ w("ZodNumberFormat", (t, e) => {
  $a.init(t, e), ui.init(t, e);
});
function dn(t) {
  return /* @__PURE__ */ Lc(du, t);
}
const hu = /* @__PURE__ */ w("ZodBoolean", (t, e) => {
  ka.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => cl(t, r, n);
});
function Te(t) {
  return /* @__PURE__ */ xc(hu, t);
}
const fu = /* @__PURE__ */ w("ZodAny", (t, e) => {
  Oa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ul();
});
function mu() {
  return /* @__PURE__ */ zc(fu);
}
const pu = /* @__PURE__ */ w("ZodUnknown", (t, e) => {
  Na.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => dl();
});
function hn() {
  return /* @__PURE__ */ Uc(pu);
}
const gu = /* @__PURE__ */ w("ZodNever", (t, e) => {
  Ra.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ll(t, r, n);
});
function yu(t) {
  return /* @__PURE__ */ Fc(gu, t);
}
const vu = /* @__PURE__ */ w("ZodArray", (t, e) => {
  $t(), Pa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => pl(t, r, n, i), t.element = e.element;
}, {
  min(t, e) {
    return this.check(/* @__PURE__ */ bt(t, e));
  },
  nonempty(t) {
    return this.check(/* @__PURE__ */ bt(1, t));
  },
  max(t, e) {
    return this.check(/* @__PURE__ */ Hn(t, e));
  },
  length(t, e) {
    return this.check(/* @__PURE__ */ Jn(t, e));
  },
  unwrap() {
    return this.element;
  }
});
function T(t, e) {
  return /* @__PURE__ */ Kc(vu, t, e);
}
const Su = /* @__PURE__ */ w("ZodObject", (t, e) => {
  $t(), xa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => gl(t, r, n, i), Ds(t, "shape", (r) => r._zod.def.shape, !1);
}, {
  keyof() {
    return q(Object.keys(this._zod.def.shape));
  },
  catchall(t) {
    return this.clone(te(this._zod.def, { catchall: t }));
  },
  passthrough() {
    return this.clone(te(this._zod.def, { catchall: hn() }));
  },
  loose() {
    return this.clone(te(this._zod.def, { catchall: hn() }));
  },
  strict() {
    return this.clone(te(this._zod.def, { catchall: yu() }));
  },
  strip() {
    return this.clone(te(this._zod.def, { catchall: void 0 }));
  },
  extend(t) {
    return Is(this, t);
  },
  safeExtend(t) {
    return Ts(this, t);
  },
  merge(t) {
    return Cs(this, t);
  },
  pick(t) {
    return bs(this, t);
  },
  omit(t) {
    return Es(this, t);
  },
  partial(...t) {
    return Dr(di, this, t[0]);
  },
  exactPartial(...t) {
    return Dr(hi, this, t[0], "exactPartial");
  },
  required(...t) {
    return As(fi, this, t[0]);
  }
});
function D(t, e) {
  const r = {
    type: "object",
    shape: t ?? {},
    ...k(e)
  };
  return new Su(r);
}
const wu = /* @__PURE__ */ w("ZodUnion", (t, e) => {
  za.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => yl(t, r, n, i), t.options = e.options;
});
function _u(t, e) {
  return new wu({
    type: "union",
    options: t,
    ...k(e)
  });
}
const bu = /* @__PURE__ */ w("ZodIntersection", (t, e) => {
  Ua.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => vl(t, r, n, i);
});
function Eu(t, e) {
  return new bu({
    type: "intersection",
    left: t,
    right: e
  });
}
const fn = /* @__PURE__ */ w("ZodRecord", (t, e) => {
  $t(), Fa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => wl(t, r, n, i), t.keyType = e.keyType, t.valueType = e.valueType;
});
function ie(t, e, r) {
  return !e || !e._zod ? new fn({
    type: "record",
    keyType: m(),
    valueType: t,
    ...k(e)
  }) : new fn({
    type: "record",
    keyType: t,
    valueType: e,
    ...k(r)
  });
}
const er = /* @__PURE__ */ w("ZodEnum", (t, e) => {
  ja.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (n, i, s) => hl(t, n, i), t.enum = e.entries, t.options = [...t._zod.values];
  const r = new Set(Object.keys(e.entries));
  t.extract = (n, i) => {
    const s = {};
    for (const o of n)
      if (r.has(o))
        s[o] = e.entries[o];
      else
        throw new Error(`Key ${o} not found in enum`);
    return new er({
      ...e,
      checks: [],
      ...k(i),
      entries: s
    });
  }, t.exclude = (n, i) => {
    const s = { ...e.entries };
    for (const o of n)
      if (r.has(o))
        delete s[o];
      else
        throw new Error(`Key ${o} not found in enum`);
    return new er({
      ...e,
      checks: [],
      ...k(i),
      entries: s
    });
  };
});
function q(t, e) {
  const r = Array.isArray(t) ? Object.fromEntries(t.map((n) => [n, n])) : t;
  return new er({
    type: "enum",
    entries: r,
    ...k(e)
  });
}
const Iu = /* @__PURE__ */ w("ZodTransform", (t, e) => {
  $t(), Ba.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ml(t, r, n, i), t._zod.parse = (r, n) => {
    if (n.direction === "backward")
      throw new kn(t.constructor.name);
    r.addIssue = (s) => {
      if (typeof s == "string")
        r.issues.push(tt(s, r.value, e));
      else {
        const o = s;
        o.fatal && (o.continue = !1), o.code ?? (o.code = "custom"), "input" in o || (o.input = r.value), o.inst ?? (o.inst = t), r.issues.push(tt(o));
      }
    };
    const i = e.transform(r.value, r);
    return i instanceof Promise ? i.then((s) => (r.value = s, r)) : (r.value = i, r);
  };
});
function Tu(t) {
  return new Iu({
    type: "transform",
    transform: t
  });
}
const di = /* @__PURE__ */ w("ZodOptional", (t, e) => {
  Zn.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ci(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function mn(t) {
  return new di({
    type: "optional",
    innerType: t
  });
}
const hi = /* @__PURE__ */ w("ZodExactOptional", (t, e) => {
  Ga.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => ci(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function Cu(t) {
  return new hi({
    type: "optional",
    innerType: t
  });
}
const Au = /* @__PURE__ */ w("ZodNullable", (t, e) => {
  Va.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => _l(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function pn(t) {
  return new Au({
    type: "nullable",
    innerType: t
  });
}
const Mu = /* @__PURE__ */ w("ZodDefault", (t, e) => {
  Za.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => El(t, r, n, i), t.unwrap = () => t._zod.def.innerType, t.removeDefault = t.unwrap;
});
function $u(t, e) {
  return new Mu({
    type: "default",
    innerType: t,
    get defaultValue() {
      return typeof e == "function" ? e() : In(e);
    }
  });
}
const ku = /* @__PURE__ */ w("ZodPrefault", (t, e) => {
  Wa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => Il(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function Ou(t, e) {
  return new ku({
    type: "prefault",
    innerType: t,
    get defaultValue() {
      return typeof e == "function" ? e() : In(e);
    }
  });
}
const fi = /* @__PURE__ */ w("ZodNonOptional", (t, e) => {
  qa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => bl(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function Nu(t, e) {
  return new fi({
    type: "nonoptional",
    innerType: t,
    ...k(e)
  });
}
const Ru = /* @__PURE__ */ w("ZodCatch", (t, e) => {
  Ya.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => Tl(t, r, n, i), t.unwrap = () => t._zod.def.innerType, t.removeCatch = t.unwrap;
});
function Pu(t, e) {
  return new Ru({
    type: "catch",
    innerType: t,
    catchValue: typeof e == "function" ? e : xs(e)
  });
}
const Du = /* @__PURE__ */ w("ZodPipe", (t, e) => {
  Ha.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => Cl(t, r, n, i), t.in = e.in, t.out = e.out;
});
function gn(t, e) {
  return new Du({
    type: "pipe",
    in: t,
    out: e
    // ...util.normalizeParams(params),
  });
}
const Lu = /* @__PURE__ */ w("ZodReadonly", (t, e) => {
  Ja.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => Al(t, r, n, i), t.unwrap = () => t._zod.def.innerType;
});
function xu(t) {
  return new Lu({
    type: "readonly",
    innerType: t
  });
}
const zu = /* @__PURE__ */ w("ZodCustom", (t, e) => {
  Qa.init(t, e), Z.init(t, e), t._zod.processJSONSchema = (r, n, i) => fl(t, r, n, i);
});
function Uu(t, e = {}) {
  return /* @__PURE__ */ Xc(zu, t, e);
}
function Fu(t, e) {
  return /* @__PURE__ */ el(t, e);
}
const mi = q([
  "short_story",
  "novel",
  "audio_drama",
  "episodic",
  "interactive",
  "documentary"
]), ju = q(["fast", "moderate", "deliberate", "variable"]), Bu = q([
  "first_person",
  "third_person_limited",
  "third_person_omniscient",
  "second_person",
  "multi_perspective"
]), pi = D({
  id: m().default(() => `intent-${Date.now()}`),
  title: m(),
  premise: m().describe("The core premise and central hook of the story"),
  primaryGenre: m(),
  subgenres: T(m()).default([]),
  targetAudience: m(),
  format: mi.default("short_story"),
  tone: T(m()).describe("Dominant emotional and stylistic tones"),
  themes: T(m()).describe("Key underlying thematic questions or explorations"),
  explicitConstraints: T(m()).default([]).describe("Rules or limits specified by the creator"),
  impliedAssumptions: T(m()).default([]).describe("Assumptions derived from genre conventions"),
  clarifiedAmbiguities: T(m()).default([]).describe("Resolved ambiguities between contradictory requirements"),
  biasAnalysis: D({
    intentionalFictionalBiases: T(m()).describe("Artistic choices to preserve"),
    mitigatedUnintendedAssumptions: T(m()).describe("Avoided stereotypes or flat generalizations")
  }).optional(),
  pacingPreference: ju.default("moderate"),
  perspective: Bu.default("third_person_limited")
});
D({
  rawPrompt: m().min(3),
  genreHints: T(m()).optional(),
  format: mi.optional(),
  constraints: T(m()).optional()
});
const Gu = q([
  "protagonist",
  "antagonist",
  "deuteragonist",
  "supporting",
  "mentor",
  "catalyst",
  "minor"
]), gi = D({
  targetCharacterId: m(),
  relationshipType: m().describe("e.g., rival, mentor, estranged sibling, ally"),
  dynamic: m().describe("Nuance of how they interact and emotional tension"),
  trustScore: j().min(-1).max(1).default(0).describe("From -1 (hostile) to 1 (absolute trust)"),
  sharedSecret: m().optional()
}), vr = D({
  id: m(),
  name: m(),
  aliases: T(m()).default([]),
  role: Gu,
  archetype: m().optional(),
  personality: D({
    traits: T(m()),
    primaryMotivation: m().describe("Core driving want or need"),
    secondaryMotivations: T(m()).default([]),
    coreFlaw: m(),
    fears: T(m()),
    weaknesses: T(m()),
    internalContradictions: T(m()).describe("Psychological paradoxes within the character")
  }),
  dialogueStyle: D({
    vocabularyLevel: m().describe("e.g., colloquial, academic, terse, poetic"),
    speechCadence: m().describe("e.g., rapid-fire, measured, fragmented, staccato"),
    catchphrasesOrQuirks: T(m()).default([]),
    subtextTendency: m().describe("How they disguise or convey their true intentions")
  }),
  backstorySummary: m(),
  definingPastEvents: T(m()).default([]).optional(),
  relationships: T(gi).default([]).optional()
}), Sr = D({
  characterId: m(),
  knownFacts: T(m()).describe("Verified objective facts this character is aware of"),
  falseBeliefs: T(m()).describe("Untrue or distorted beliefs this character holds"),
  hiddenSecrets: T(m()).describe("Facts this character actively conceals from others"),
  currentGoal: m().describe("Immediate objective in the current scene or act"),
  emotionalState: m().describe("Current baseline emotional disposition"),
  physicalLocationId: m()
}), wr = D({
  id: m(),
  name: m(),
  environmentType: m().describe("e.g., urban underbelly, orbital station, ancient forest"),
  description: m(),
  sensoryDetails: D({
    sights: T(m()),
    sounds: T(m()),
    smellsOrAtmosphere: T(m())
  }),
  culturalSignificance: m().optional(),
  currentCondition: m().describe("Current state of the location")
}), _r = D({
  id: m(),
  category: q(["physical_law", "magic_system", "technology", "history", "society", "politics"]),
  statement: m().describe("Objective truth about the fictional universe"),
  isImmutable: Te().default(!0),
  establishedInSceneId: m().optional()
}), Vu = D({
  worldName: m(),
  overview: m(),
  technologyOrMagicLevel: m(),
  societalStructures: T(m()).default([]),
  rulesAndConstraints: T(_r),
  locations: T(wr),
  characters: T(vr),
  initialEpistemicStates: ie(m(), Sr)
}), Zu = q([
  "planned",
  "in_progress",
  "drafted",
  "approved",
  "revision_required",
  "rejected"
]), Wu = D({
  beatNumber: j().int().positive(),
  description: m(),
  characterActions: ie(m(), m()).optional(),
  microConflict: m().optional()
}), kt = D({
  id: m(),
  chapterId: m(),
  sceneIndex: j().int().nonnegative(),
  title: m(),
  objective: m().describe("The primary dramatic or narrative purpose of this scene"),
  participatingCharacterIds: T(m()).min(1),
  focusCharacterId: m().describe("The point of view or focal character for the scene"),
  locationId: m(),
  openingConditions: m().describe("What physical and emotional state the scene opens in"),
  requiredEvents: T(m()).min(1).describe("Crucial plot beats that must occur"),
  requiredRevelations: T(m()).default([]).describe("Information revealed to specific characters or reader"),
  characterMotivationsInScene: ie(m(), m()).describe("What each character is pursuing in this scene"),
  emotionalShift: D({
    from: m(),
    to: m()
  }),
  continuityConstraints: T(m()).default([]).describe("Continuity requirements from previous scenes"),
  expectedClosingConditions: m().describe("Final state of scene, establishing the bridge to next scenes"),
  dependencies: T(m()).default([]).describe("IDs of scenes that must occur prior"),
  targetWordCount: j().int().min(100).default(800),
  beats: T(Wu).default([]),
  status: Zu.default("planned")
}), qu = D({
  id: m(),
  chapterNumber: j().int().positive(),
  title: m(),
  summary: m(),
  scenes: T(kt)
}), Yu = D({
  actNumber: j().int().positive(),
  title: m(),
  dramaticFunction: m().describe("e.g., Setup, Confrontation, Crisis, Climax, Resolution"),
  chapters: T(qu)
}), Hu = D({
  id: m(),
  setupDescription: m(),
  setupSceneId: m(),
  payoffDescription: m(),
  payoffSceneId: m(),
  isPayoffResolved: Te().default(!1)
}), Ju = D({
  arcName: m(),
  openingSituation: m(),
  incitingIncident: m(),
  mainConflict: m(),
  majorPlotDevelopments: T(m()),
  subplots: T(m()).default([]),
  turningPoints: T(m()),
  climax: m(),
  resolution: m(),
  ending: m()
}), Qu = q([
  "pending_review",
  "approved",
  "revisions_requested",
  "escalated"
]), tr = D({
  projectId: m(),
  title: m(),
  logline: m(),
  arc: Ju,
  acts: T(Yu),
  setupPayoffs: T(Hu).default([]),
  reviewStatus: Qu.default("pending_review"),
  submissionCount: j().int().min(0).max(2).default(0),
  integrityReviewNotes: T(m()).default([])
}), Ku = q(["minor", "major", "critical"]), Xu = q([
  "causal_inconsistency",
  "character_motivation_mismatch",
  "timeline_contradiction",
  "world_rule_violation",
  "unresolved_setup",
  "insufficient_justification",
  "pacing_or_structure_flaw"
]), ed = D({
  category: Xu,
  severity: Ku,
  affectedSceneIds: T(m()),
  description: m(),
  requiredCorrection: m()
}), yi = D({
  isApproved: Te(),
  submissionNumber: j().int().min(1).max(2),
  overallAssessment: m(),
  findings: T(ed).default([]),
  strengths: T(m()).default([]),
  recommendation: q(["approve", "request_revision", "escalate_to_human"])
}), td = q([
  "character_state",
  "character_knowledge",
  "character_belief",
  "relationship_update",
  "new_canonical_fact",
  "plot_thread_update",
  "location_state_change",
  "timeline_event"
]), vi = D({
  id: m().default(() => `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  type: td,
  targetEntityId: m().describe("ID of character, location, or plot thread"),
  action: q(["set", "add", "update", "resolve"]),
  payload: ie(m(), mu()),
  justification: m().describe("Dramatic or causal justification for why this mutation occurred in the scene")
}), rd = vi.extend({
  committedAt: m(),
  sourceSceneId: m(),
  appliedSuccessfully: Te().default(!0)
}), nd = q(["introduced", "escalating", "resolved", "abandoned"]), Si = D({
  id: m(),
  title: m(),
  description: m(),
  involvedCharacterIds: T(m()),
  status: nd.default("introduced"),
  introducedInSceneId: m(),
  resolvedInSceneId: m().optional()
}), id = D({
  id: m(),
  sceneId: m(),
  chronologicalIndex: j().int().nonnegative(),
  timestampOrPhase: m().describe("e.g., Day 1: Dusk, or Chapter 2: The Ambush"),
  summary: m(),
  impactedCharacterIds: T(m())
}), sd = D({
  contract: kt,
  prose: m(),
  summary: m().describe("Condensed 2-3 sentence summary of what canonically occurred"),
  wordCount: j().int().nonnegative(),
  generatedAt: m(),
  approvedAt: m(),
  mutationsApplied: T(rd).default([])
}), wi = D({
  projectId: m(),
  title: m(),
  characters: ie(m(), vr),
  epistemicStates: ie(m(), Sr),
  locations: ie(m(), wr),
  worldFacts: T(_r),
  plotThreads: ie(m(), Si),
  scenes: ie(m(), sd),
  sceneExecutionOrder: T(m()),
  timeline: T(id),
  unresolvedMysteries: T(m()).default([]),
  establishedRevelations: T(m()).default([]),
  version: j().int().default(1),
  updatedAt: m()
}), od = D({
  profile: vr,
  state: Sr,
  relationshipsWithOtherParticipants: T(gi)
}), ad = D({
  previousSceneId: m().optional(),
  previousSceneTitle: m().optional(),
  summary: m().optional(),
  closingSnippet: m().optional().describe("Last 2-3 paragraphs of the previous scene to maintain seamless prose continuity")
}), cd = D({
  sceneId: m(),
  sceneContract: kt,
  activeCharacters: T(od),
  currentLocation: wr,
  relevantWorldFacts: T(_r),
  relevantPlotThreads: T(Si),
  previousSceneBridge: ad,
  unresolvedMysteries: T(m()).default([]),
  narrativeConstraints: T(m()).default([])
});
D({
  taskId: m(),
  sceneContract: kt,
  projection: cd,
  stylistics: D({
    narrativePerspective: m(),
    overallTone: T(m()),
    sceneAtmosphere: m(),
    pacing: m()
  }),
  revisionFeedback: m().optional().describe("If this is a revision pass, specific reviewer instructions to fix")
});
const ld = D({
  sceneId: m(),
  title: m(),
  prose: m().min(50).describe("The full generated prose for the scene"),
  summary: m().describe("Concise canonical summary of what transpired"),
  wordCount: j().int().nonnegative(),
  proposedMutations: T(vi).default([]),
  craftNotes: D({
    focalSubtext: m().optional(),
    sensoryMotifsUsed: T(m()).default([]),
    pacingAssessment: m().optional()
  }).optional()
}), ud = D({
  criterion: q([
    "contract_objective_fulfilled",
    "required_events_present",
    "character_behavior_and_voice_consistent",
    "epistemic_knowledge_boundaries_respected",
    "world_rules_and_continuity_preserved",
    "no_unauthorized_major_plot_divergence",
    "style_and_tone_adherence"
  ]),
  passed: Te(),
  notes: m()
}), _i = D({
  sceneId: m(),
  isApproved: Te(),
  iterationNumber: j().int().min(1).default(1),
  checkItems: T(ud),
  overallCritique: m(),
  requiredRevisions: T(m()).default([]),
  recommendation: q(["approve", "request_revision", "escalate_failure"])
}), dd = q(["male", "female", "neutral", "other"]), hd = q([
  "neutral",
  "whispering",
  "intense",
  "urgent",
  "fearful",
  "furious",
  "mournful",
  "joyful",
  "ironic",
  "menacing",
  "hesitant",
  "tender"
]), bi = D({
  characterId: m(),
  // or 'NARRATOR'
  characterName: m(),
  assignedVoiceId: m().describe("Identifier in TTS model voice catalog"),
  engine: q(["cosyvoice3", "chatterbox", "moss", "mock"]).default("cosyvoice3"),
  gender: dd,
  pitchOffset: j().min(-1).max(1).default(0),
  naturalSpeed: j().min(0.5).max(2).default(1),
  baselineStylePrompt: m().optional().describe("Voice prompt description for zero-shot TTS conditioning")
}), fd = D({
  id: m(),
  utteranceIndex: j().int().nonnegative(),
  sceneId: m(),
  speakerId: m().describe("Character ID or 'NARRATOR'"),
  speakerName: m(),
  isDialogue: Te(),
  spokenText: m().min(1),
  voiceProfile: bi,
  performance: D({
    emotion: hd.default("neutral"),
    deliveryIntensity: j().min(0.1).max(1).default(0.5),
    speedMultiplier: j().min(0.7).max(1.4).default(1),
    prePauseMs: j().int().nonnegative().default(100),
    postPauseMs: j().int().nonnegative().default(250),
    actingNotes: m().optional()
  }),
  soundDesignCue: D({
    soundEffectId: m().optional(),
    sfxVolume: j().min(0).max(1).default(0.5),
    sfxTriggerPoint: q(["start", "during", "end"]).default("start")
  }).optional()
}), md = D({
  ambienceId: m(),
  description: m(),
  category: q(["indoor", "outdoor", "sci_fi", "weather", "tense_silence", "crowd"]),
  loop: Te().default(!0),
  volume: j().min(0).max(1).default(0.3),
  fadeInMs: j().int().default(1500),
  fadeOutMs: j().int().default(2e3)
}), pd = D({
  trackTheme: m(),
  mood: m(),
  intensityLevel: j().min(1).max(5).default(2),
  volume: j().min(0).max(1).default(0.25),
  startAtUtteranceIndex: j().int().default(0)
}), gd = D({
  sceneId: m(),
  sceneTitle: m(),
  voiceCast: ie(m(), bi),
  ambienceTrack: md.optional(),
  musicTrack: pd.optional(),
  segments: T(fd),
  estimatedDurationSeconds: j().nonnegative()
}), Ei = q([
  "INITIALIZED",
  "NORMALIZING_INTENT",
  "DESIGNING_WORLD_AND_CHARACTERS",
  "ARCHITECTING_BLUEPRINT",
  "REVIEWING_BLUEPRINT_PASS_1",
  "REVISING_BLUEPRINT",
  "REVIEWING_BLUEPRINT_PASS_2",
  "BLUEPRINT_APPROVED",
  "EXECUTING_SCENE",
  "REVIEWING_SCENE",
  "COMMITTING_SCENE",
  "PREPARING_AUDIO",
  "COMPLETED",
  "ESCALATED_NEEDS_INTERVENTION",
  "FAILED"
]), yd = D({
  taskId: m(),
  stage: Ei,
  targetEntityId: m().optional(),
  attemptNumber: j().int().min(1).default(1),
  startedAt: m(),
  completedAt: m().optional(),
  status: q(["pending", "running", "succeeded", "failed", "rejected"]),
  errorDetails: m().optional()
}), vd = D({
  workflowId: m(),
  projectId: m(),
  currentStage: Ei,
  intent: pi.optional(),
  blueprint: tr.optional(),
  blueprintReviews: T(yi).default([]),
  currentSceneId: m().optional(),
  sceneRetryCounts: ie(m(), j()).default({}),
  sceneReviews: ie(m(), T(_i)).default({}),
  completedSceneIds: T(m()).default([]),
  taskHistory: T(yd).default([]),
  resumptionPoint: m().optional(),
  escalationReason: m().optional(),
  lastUpdated: m()
});
function Sd(t) {
  const e = [], r = [];
  let n = !1, i = !1;
  for (let s = 0; s < t.length; s++) {
    const o = t[s];
    if (i) {
      i = !1;
      continue;
    }
    if (o === "\\" && n) {
      i = !0;
      continue;
    }
    if (o === '"') {
      n = !n;
      continue;
    }
    if (!n) {
      if (o === "{")
        r.push(s);
      else if (o === "}" && r.length > 0) {
        const a = r.pop();
        r.length === 0 && e.push([a, s + 1]);
      }
    }
  }
  return e;
}
function Gt(t) {
  return t.replace(/,\s*([}\]])/g, "$1").trim();
}
function wd(t, e) {
  if (!t || typeof t != "string")
    throw new Error("Cannot extract JSON from empty or non-string input");
  const r = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (r && r[1]) {
    const o = Gt(r[1]);
    try {
      const a = JSON.parse(o);
      return e ? e.parse(a) : a;
    } catch {
    }
  }
  const n = Sd(t);
  if (n.length > 0)
    for (let o = n.length - 1; o >= 0; o--) {
      const [a, c] = n[o], l = Gt(t.slice(a, c));
      try {
        const u = JSON.parse(l);
        return e ? e.parse(u) : u;
      } catch {
      }
    }
  const i = t.indexOf("{"), s = t.lastIndexOf("}");
  if (i !== -1 && s !== -1 && s > i) {
    const o = Gt(t.slice(i, s + 1));
    try {
      const a = JSON.parse(o);
      return e ? e.parse(a) : a;
    } catch (a) {
      throw new Error(
        `Failed to parse extracted JSON slice: ${a.message}
Extracted snippet: ${o.slice(0, 300)}...`
      );
    }
  }
  throw new Error(`No valid JSON structure found in output:
${t.slice(0, 400)}...`);
}
class _d {
  constructor(e = 1) {
    b(this, "activeCount", 0);
    b(this, "queue", []);
    b(this, "maxConcurrency");
    this.maxConcurrency = e;
  }
  get pendingCount() {
    return this.queue.length;
  }
  get isBusy() {
    return this.activeCount >= this.maxConcurrency;
  }
  async run(e) {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      try {
        return await e();
      } finally {
        this.activeCount--, this.processNext();
      }
    }
    return new Promise((r, n) => {
      this.queue.push(async () => {
        try {
          const i = await e();
          r(i);
        } catch (i) {
          n(i);
        }
      });
    });
  }
  processNext() {
    if (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const e = this.queue.shift();
      e && (this.activeCount++, e().finally(() => {
        this.activeCount--, this.processNext();
      }));
    }
  }
  clear() {
    this.queue = [];
  }
}
if (typeof process < "u" && process.env && (process.env.QVAC_RPC_INIT_TIMEOUT_MS || (process.env.QVAC_RPC_INIT_TIMEOUT_MS = "120000"), !process.env.QVAC_WORKER_PATH && typeof process.cwd == "function"))
  try {
    const t = E.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js");
    if (typeof y < "u" && typeof y.existsSync == "function" && y.existsSync(t))
      try {
        process.env.QVAC_WORKER_PATH = y.realpathSync(t);
      } catch {
        process.env.QVAC_WORKER_PATH = t;
      }
  } catch {
  }
const we = class we {
  // 10 min default for CPU / Metal inference
  constructor(e = 1) {
    b(this, "_modelId", "");
    b(this, "_isInitialized", !1);
    b(this, "queue");
    b(this, "timeoutMs", 6e5);
    this.queue = new _d(e);
  }
  get isInitialized() {
    return this._isInitialized;
  }
  get modelId() {
    return this._modelId;
  }
  async initialize(e) {
    if (!(this._isInitialized && this._modelId)) {
      if (e != null && e.timeoutMs && (this.timeoutMs = e.timeoutMs), we.inFlightLoadPromise) {
        this._modelId = await we.inFlightLoadPromise, this._isInitialized = !0;
        return;
      }
      we.inFlightLoadPromise = this.doLoadModel(e).finally(() => {
        we.inFlightLoadPromise = null;
      }), this._modelId = await we.inFlightLoadPromise, this._isInitialized = !0;
    }
  }
  async doLoadModel(e) {
    const r = e == null ? void 0 : e.modelId;
    let n = zi;
    r === "GEMMA4_2B_MULTIMODAL_Q6_K" ? n = Fi : r && typeof r == "object" && (n = r);
    const i = (e == null ? void 0 : e.ctxSize) || 128e3, s = (e == null ? void 0 : e.device) === "cpu" ? "cpu" : void 0;
    let o = (n == null ? void 0 : n.modelId) || "gemma-4";
    try {
      n && typeof mt == "function" && (o = await mt({
        modelSrc: n,
        modelConfig: {
          ctx_size: i,
          ...s ? { device: s } : {}
        }
      }));
    } catch (a) {
      if ((a == null ? void 0 : a.code) === 52200 && typeof pt == "function")
        try {
          const c = await pt(n);
          c != null && c.loadedInstances && c.loadedInstances.length > 0 && (o = c.loadedInstances[0].registryId);
        } catch {
        }
      else
        throw new Error(`[QvacAdapter] Failed to load Gemma 4 model: ${a.message || String(a)}`);
    }
    return o;
  }
  async generateCompletion(e) {
    return this._isInitialized || await this.initialize(), this.queue.run(async () => {
      var g;
      const r = Date.now(), n = [
        { role: "system", content: e.systemPrompt },
        ...e.messages.map((v) => ({ role: v.role, content: v.content }))
      ], i = e.responseSchema ? { type: "json_object" } : void 0, s = {
        modelId: this._modelId,
        history: n,
        maxTokens: e.maxTokens || 4e3,
        stream: e.stream !== !1,
        captureThinking: !0,
        toolDialect: "gemma4",
        ...i ? { responseFormat: i } : {},
        ...e.kvCacheKey ? { kvCache: e.kvCacheKey } : {}
      }, o = Ui(s);
      let a = "", c = "";
      const l = (async () => {
        var v, S;
        if (o.events && e.stream !== !1)
          for await (const _ of o.events)
            _.type === "thinkingDelta" && _.text ? (c += _.text, (v = e.onThinking) == null || v.call(e, _.text)) : _.type === "contentDelta" && _.text && (a += _.text, (S = e.onToken) == null || S.call(e, _.text));
      })(), u = new Promise(
        (v, S) => setTimeout(
          () => S(new Error(`Inference timed out after ${this.timeoutMs / 1e3}s`)),
          this.timeoutMs
        )
      ), d = await Promise.race([
        Promise.all([l, o.final]).then(([, v]) => v),
        u
      ]), h = (d == null ? void 0 : d.cacheableAssistantContent) || (d == null ? void 0 : d.contentText) || a || ((g = d == null ? void 0 : d.raw) == null ? void 0 : g.fullText) || "", f = Date.now() - r;
      let p;
      return e.responseSchema && (p = wd(h, e.responseSchema)), {
        rawText: h,
        parsed: p,
        thinking: c || (d == null ? void 0 : d.thinking) || void 0,
        durationMs: f,
        modelId: this._modelId
      };
    });
  }
  async unload() {
    if (this._modelId && typeof Cr == "function")
      try {
        await Cr({ modelId: this._modelId });
      } catch (e) {
        console.warn("[QvacAdapter] Failed to unload model:", e);
      }
    this._isInitialized = !1, this._modelId = "";
  }
};
b(we, "inFlightLoadPromise", null);
let rr = we;
class Ii {
  constructor(e) {
    b(this, "state");
    e ? this.state = wi.parse(e) : this.state = {
      projectId: `proj-${Date.now()}`,
      title: "Untitled Narrative",
      characters: {},
      epistemicStates: {},
      locations: {},
      worldFacts: [],
      plotThreads: {},
      scenes: {},
      sceneExecutionOrder: [],
      timeline: [],
      unresolvedMysteries: [],
      establishedRevelations: [],
      version: 1,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  initializeFromManifest(e, r, n) {
    this.state.projectId = e, this.state.title = r;
    for (const i of n.characters)
      this.state.characters[i.id] = i;
    for (const [i, s] of Object.entries(n.initialEpistemicStates))
      this.state.epistemicStates[i] = s;
    for (const i of n.locations)
      this.state.locations[i.id] = i;
    this.state.worldFacts = [...n.rulesAndConstraints], this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.version++;
  }
  getCharacter(e) {
    return this.state.characters[e];
  }
  getEpistemicState(e) {
    return this.state.epistemicStates[e];
  }
  getLocation(e) {
    return this.state.locations[e];
  }
  getScene(e) {
    return this.state.scenes[e];
  }
  getAllScenes() {
    return this.state.sceneExecutionOrder.map((e) => this.state.scenes[e]).filter(Boolean);
  }
  getPreviousScene(e) {
    const r = this.state.sceneExecutionOrder.indexOf(e);
    if (r > 0) {
      const n = this.state.sceneExecutionOrder[r - 1];
      return this.state.scenes[n];
    }
    if (r === -1 && this.state.sceneExecutionOrder.length > 0) {
      const n = this.state.sceneExecutionOrder[this.state.sceneExecutionOrder.length - 1];
      return this.state.scenes[n];
    }
  }
  commitScene(e, r, n, i) {
    const s = {
      contract: e,
      prose: r,
      summary: n,
      wordCount: r.trim().split(/\s+/).length,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      mutationsApplied: i
    };
    this.state.scenes[e.id] = s, this.state.sceneExecutionOrder.includes(e.id) || this.state.sceneExecutionOrder.push(e.id), this.state.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), this.state.version++;
  }
  addTimelineEvent(e) {
    this.state.timeline.push(e), this.state.timeline.sort((r, n) => r.chronologicalIndex - n.chronologicalIndex);
  }
  addPlotThread(e) {
    this.state.plotThreads[e.id] = e;
  }
  updatePlotThread(e, r, n) {
    this.state.plotThreads[e] && (this.state.plotThreads[e].status = r, n && (this.state.plotThreads[e].resolvedInSceneId = n));
  }
  addWorldFact(e) {
    this.state.worldFacts.some((n) => n.statement === e.statement) || this.state.worldFacts.push(e);
  }
  addRevelation(e) {
    this.state.establishedRevelations.includes(e) || this.state.establishedRevelations.push(e);
  }
  addUnresolvedMystery(e) {
    this.state.unresolvedMysteries.includes(e) || this.state.unresolvedMysteries.push(e);
  }
  resolveMystery(e) {
    this.state.unresolvedMysteries = this.state.unresolvedMysteries.filter((r) => r !== e);
  }
}
class bd {
  constructor(e) {
    b(this, "storyGraph");
    this.storyGraph = e;
  }
  validateMutation(e) {
    const r = [];
    switch (e.targetEntityId || r.push("Mutation missing targetEntityId"), (!e.justification || e.justification.trim().length === 0) && r.push("Mutation missing required dramatic justification"), e.type) {
      case "character_knowledge":
      case "character_state":
      case "character_belief": {
        this.storyGraph.getCharacter(e.targetEntityId) || r.push(`Target character "${e.targetEntityId}" does not exist in Story Graph`);
        break;
      }
      case "location_state_change": {
        this.storyGraph.getLocation(e.targetEntityId) || r.push(`Target location "${e.targetEntityId}" does not exist in Story Graph`);
        break;
      }
      case "new_canonical_fact": {
        (!e.payload.fact || typeof e.payload.fact != "string") && r.push('new_canonical_fact payload must include a non-empty string "fact"');
        break;
      }
      case "relationship_update": {
        const n = this.storyGraph.getCharacter(e.targetEntityId), i = e.payload.targetCharacterId;
        n || r.push(`Source character "${e.targetEntityId}" does not exist`), (!i || !this.storyGraph.getCharacter(i)) && r.push(`Target relationship character "${i}" does not exist`);
        break;
      }
    }
    return {
      isValid: r.length === 0,
      errors: r
    };
  }
  applyMutation(e, r) {
    const n = this.validateMutation(e);
    if (!n.isValid)
      throw new Error(`Invalid mutation rejected: ${n.errors.join("; ")}`);
    const i = this.storyGraph.state, s = {
      ...e,
      committedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sourceSceneId: r,
      appliedSuccessfully: !0
    };
    switch (e.type) {
      case "character_knowledge": {
        const o = i.epistemicStates[e.targetEntityId];
        if (o && e.payload.newFact) {
          const a = String(e.payload.newFact);
          o.knownFacts.includes(a) || o.knownFacts.push(a);
        }
        break;
      }
      case "character_belief": {
        const o = i.epistemicStates[e.targetEntityId];
        o && (e.payload.newFalseBelief && o.falseBeliefs.push(String(e.payload.newFalseBelief)), e.payload.shatteredBelief && (o.falseBeliefs = o.falseBeliefs.filter(
          (a) => a !== e.payload.shatteredBelief
        )));
        break;
      }
      case "character_state": {
        const o = i.epistemicStates[e.targetEntityId];
        o && (e.payload.emotionalState && (o.emotionalState = String(e.payload.emotionalState)), e.payload.currentGoal && (o.currentGoal = String(e.payload.currentGoal)), e.payload.physicalLocationId && (o.physicalLocationId = String(e.payload.physicalLocationId)), e.payload.revealedSecret && (o.hiddenSecrets = o.hiddenSecrets.filter(
          (a) => a !== e.payload.revealedSecret
        )));
        break;
      }
      case "relationship_update": {
        const o = i.characters[e.targetEntityId], a = e.payload.targetCharacterId;
        if (o && a) {
          const c = o.relationships.find((l) => l.targetCharacterId === a);
          c ? (e.payload.dynamic && (c.dynamic = String(e.payload.dynamic)), e.payload.trustScore !== void 0 && (c.trustScore = Number(e.payload.trustScore)), e.payload.relationshipType && (c.relationshipType = String(e.payload.relationshipType))) : o.relationships.push({
            targetCharacterId: a,
            relationshipType: String(e.payload.relationshipType || "associated"),
            dynamic: String(e.payload.dynamic || "evolving"),
            trustScore: Number(e.payload.trustScore ?? 0)
          });
        }
        break;
      }
      case "new_canonical_fact": {
        this.storyGraph.addWorldFact({
          id: `fact-${Date.now()}`,
          category: e.payload.category || "history",
          statement: String(e.payload.fact),
          isImmutable: e.payload.isImmutable !== !1,
          establishedInSceneId: r
        });
        break;
      }
      case "location_state_change": {
        const o = i.locations[e.targetEntityId];
        o && e.payload.currentCondition && (o.currentCondition = String(e.payload.currentCondition));
        break;
      }
      case "plot_thread_update": {
        e.payload.threadId && e.payload.status && this.storyGraph.updatePlotThread(
          e.payload.threadId,
          e.payload.status,
          r
        );
        break;
      }
      case "timeline_event": {
        this.storyGraph.addTimelineEvent({
          id: `evt-${Date.now()}`,
          sceneId: r,
          chronologicalIndex: i.timeline.length,
          timestampOrPhase: String(e.payload.timestampOrPhase || `Scene ${r}`),
          summary: String(e.payload.summary || e.justification),
          impactedCharacterIds: e.payload.impactedCharacterIds || []
        });
        break;
      }
    }
    return i.updatedAt = (/* @__PURE__ */ new Date()).toISOString(), i.version++, s;
  }
}
class Ed {
  constructor(e) {
    b(this, "storyGraph");
    this.storyGraph = e;
  }
  /**
   * Constructs a lightweight, high-salience context projection specifically
   * targeted to the given scene contract. Never loads the whole story history.
   */
  buildContextForScene(e) {
    const r = this.storyGraph.getState(), n = [];
    for (const l of e.participatingCharacterIds) {
      const u = r.characters[l], d = r.epistemicStates[l];
      if (u && d) {
        const h = (u.relationships || []).filter(
          (f) => e.participatingCharacterIds.includes(f.targetCharacterId)
        );
        n.push({
          profile: u,
          state: d,
          relationshipsWithOtherParticipants: h
        });
      }
    }
    const i = r.locations[e.locationId] || {
      id: e.locationId,
      name: "Unspecified Location",
      environmentType: "Neutral Environment",
      description: "An unmapped area within the setting.",
      sensoryDetails: { sights: [], sounds: [], smellsOrAtmosphere: [] },
      currentCondition: "Standard"
    }, s = r.worldFacts.slice(0, 8), o = Object.values(r.plotThreads).filter(
      (l) => l.involvedCharacterIds.some((u) => e.participatingCharacterIds.includes(u))
    ), a = this.storyGraph.getPreviousScene(e.id);
    let c = {};
    if (a) {
      const u = a.prose.split(`

`).filter((d) => d.trim().length > 0).slice(-2).join(`

`);
      c = {
        previousSceneId: a.contract.id,
        previousSceneTitle: a.contract.title,
        summary: a.summary,
        closingSnippet: u.length > 0 ? u : void 0
      };
    }
    return {
      sceneId: e.id,
      sceneContract: e,
      activeCharacters: n,
      currentLocation: i,
      relevantWorldFacts: s,
      relevantPlotThreads: o,
      previousSceneBridge: c,
      unresolvedMysteries: r.unresolvedMysteries.slice(0, 5),
      narrativeConstraints: e.continuityConstraints
    };
  }
  /**
   * Estimates token consumption of the context projection to ensure it stays well within budget.
   */
  estimateProjectionTokens(e) {
    const r = JSON.stringify(e);
    return Math.ceil(r.length / 4);
  }
}
class Id {
  constructor(e) {
    b(this, "storageDir");
    if (e ? this.storageDir = e : this.storageDir = E.resolve(process.cwd(), "data", "narratives"), !y.existsSync(this.storageDir))
      try {
        y.mkdirSync(this.storageDir, { recursive: !0 });
      } catch (r) {
        console.warn(`[PersistenceManager] Could not create storage directory ${this.storageDir}:`, r);
      }
  }
  getStoryGraphPath(e) {
    return E.join(this.storageDir, `${e}.storygraph.json`);
  }
  getWorkflowPath(e) {
    return E.join(this.storageDir, `${e}.workflow.json`);
  }
  saveStoryGraph(e) {
    const r = this.getStoryGraphPath(e.projectId), n = `${r}.tmp.${Date.now()}`, i = JSON.stringify(e, null, 2);
    y.writeFileSync(n, i, "utf-8"), y.renameSync(n, r);
  }
  loadStoryGraph(e) {
    const r = this.getStoryGraphPath(e);
    if (!y.existsSync(r))
      return null;
    try {
      const n = y.readFileSync(r, "utf-8"), i = JSON.parse(n);
      return wi.parse(i);
    } catch (n) {
      return console.error(`[PersistenceManager] Failed to load StoryGraph for ${e}:`, n), null;
    }
  }
  saveWorkflowSnapshot(e) {
    const r = this.getWorkflowPath(e.projectId), n = `${r}.tmp.${Date.now()}`, i = JSON.stringify(e, null, 2);
    y.writeFileSync(n, i, "utf-8"), y.renameSync(n, r);
  }
  loadWorkflowSnapshot(e) {
    const r = this.getWorkflowPath(e);
    if (!y.existsSync(r))
      return null;
    try {
      const n = y.readFileSync(r, "utf-8"), i = JSON.parse(n);
      return vd.parse(i);
    } catch (n) {
      return console.error(`[PersistenceManager] Failed to load WorkflowSnapshot for ${e}:`, n), null;
    }
  }
  hasPersistedNarrative(e) {
    return y.existsSync(this.getStoryGraphPath(e));
  }
}
class xe {
  constructor(e, r = 2) {
    b(this, "modelProvider");
    b(this, "maxRetries");
    this.modelProvider = e, this.maxRetries = r;
  }
  /**
   * Executes a strongly typed LLM inference request with automatic schema validation
   * and bounded retries if validation fails.
   */
  async invokeStructured(e, r) {
    const n = e.promptId || `${this.constructor.name}_${Date.now()}`;
    let i = null, s = "";
    for (let o = 1; o <= this.maxRetries; o++)
      try {
        const a = [...e.messages];
        s && a.push({
          role: "user",
          content: `Your previous response failed validation with the following issue:
${s}

Please output ONLY a corrected, strictly valid JSON object matching the required schema.`
        });
        const c = {
          ...e,
          promptId: n,
          messages: a,
          responseSchema: r
        }, l = await this.modelProvider.generateCompletion(c);
        if (l.parsed)
          return l.parsed;
        throw new Error("No parsed output returned by model provider");
      } catch (a) {
        i = a, s = a.message || String(a), console.warn(`[${this.constructor.name}] Attempt ${o} failed: ${s}`);
      }
    throw new Error(
      `[${this.constructor.name}] Exceeded maximum retries (${this.maxRetries}). Last error: ${i == null ? void 0 : i.message}`
    );
  }
}
class Td extends xe {
  constructor(e) {
    super(e);
  }
  async normalize(e) {
    var i, s;
    const r = `You are the Creative Intent Normalizer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Transform the raw creative prompt into a normalized, structured creative specification (CreativeIntent).

Analysis Guidelines:
1. Identify the core premise, primary genre, subgenres, target audience, and emotional tone.
2. Distinguish intentional artistic choices and fictional biases from unintended cultural stereotypes or flat generalizations.
3. Clarify ambiguities and resolve contradictory user requirements while preserving the author's core creative voice.
4. Establish explicit constraints and implied genre conventions.
5. Choose appropriate narrative perspective and pacing preference.

You must output ONLY a valid JSON object matching the CreativeIntent schema:
{
  "id": "intent-...",
  "title": "Working Title",
  "premise": "Core dramatic hook and premise",
  "primaryGenre": "Genre",
  "subgenres": ["Subgenre1", "Subgenre2"],
  "targetAudience": "Audience",
  "format": "short_story" | "novel" | "audio_drama" | "episodic" | "interactive",
  "tone": ["Tone1", "Tone2"],
  "themes": ["Theme1", "Theme2"],
  "explicitConstraints": ["Constraint1"],
  "impliedAssumptions": ["Assumption1"],
  "clarifiedAmbiguities": ["Resolved ambiguity"],
  "biasAnalysis": {
    "intentionalFictionalBiases": ["Artistic perspectives preserved"],
    "mitigatedUnintendedAssumptions": ["Flat stereotypes avoided"]
  },
  "pacingPreference": "fast" | "moderate" | "deliberate",
  "perspective": "first_person" | "third_person_limited" | "third_person_omniscient"
}`, n = `## RAW USER PROMPT
${e.rawPrompt}

${(i = e.genreHints) != null && i.length ? `Genre Hints: ${e.genreHints.join(", ")}` : ""}
${e.format ? `Requested Format: ${e.format}` : ""}
${(s = e.constraints) != null && s.length ? `Constraints: ${e.constraints.join(", ")}` : ""}

Normalize this into a structured CreativeIntent specification. Output ONLY JSON.`;
    return this.invokeStructured(
      {
        promptId: "normalize_intent",
        systemPrompt: r,
        messages: [{ role: "user", content: n }]
      },
      pi
    );
  }
}
class Cd extends xe {
  constructor(e) {
    super(e);
  }
  async design(e) {
    const r = `You are the World and Character Designer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Establish the complete fictional universe, physical/cultural rules, sensory locations, and rich multidimensional characters.

CRITICAL EPISTEMIC DIRECTIVE:
You MUST rigorously distinguish between:
1. Objective world facts (what is physically true in the universe).
2. What an individual character knows.
3. What an individual character falsely believes or assumes.
4. What an individual character is hiding or lying about.
5. What the audience/reader knows.

Knowledge must NEVER automatically propagate between characters.
Each character must have an isolated initialEpistemicState.

Character Craft Requirements:
- Personalities with distinct motivations, fears, flaws, and internal contradictions.
- Distinct dialogue style (vocabulary level, speech cadence, catchphrases/quirks, subtext tendency).
- Grounded relationships with nuanced tension and trust scores.

Locations:
- Provide concrete sensory details (sights, sounds, smells, atmosphere).

You must output ONLY a valid JSON object matching the WorldBuildingManifest schema:
{
  "worldName": "Name",
  "overview": "Overview of the setting",
  "technologyOrMagicLevel": "Description of tech/magic constraints",
  "societalStructures": ["Structure1", "Structure2"],
  "rulesAndConstraints": [
    { "id": "rule-1", "category": "technology" | "physical_law" | "society", "statement": "...", "isImmutable": true }
  ],
  "locations": [
    {
      "id": "loc-1",
      "name": "...",
      "environmentType": "...",
      "description": "...",
      "sensoryDetails": { "sights": [...], "sounds": [...], "smellsOrAtmosphere": [...] },
      "currentCondition": "..."
    }
  ],
  "characters": [
    {
      "id": "char-1",
      "name": "...",
      "aliases": [...],
      "role": "protagonist" | "antagonist" | "supporting",
      "personality": {
        "traits": [...],
        "primaryMotivation": "...",
        "secondaryMotivations": [...],
        "coreFlaw": "...",
        "fears": [...],
        "weaknesses": [...],
        "internalContradictions": [...]
      },
      "dialogueStyle": {
        "vocabularyLevel": "...",
        "speechCadence": "...",
        "catchphrasesOrQuirks": [...],
        "subtextTendency": "..."
      },
      "backstorySummary": "...",
      "definingPastEvents": [...],
      "relationships": [
        { "targetCharacterId": "char-2", "relationshipType": "...", "dynamic": "...", "trustScore": 0.2 }
      ]
    }
  ],
  "initialEpistemicStates": {
    "char-1": {
      "characterId": "char-1",
      "knownFacts": [...],
      "falseBeliefs": [...],
      "hiddenSecrets": [...],
      "currentGoal": "...",
      "emotionalState": "...",
      "physicalLocationId": "loc-1"
    }
  }
}`, n = `## CREATIVE INTENT SPECIFICATION
Title: ${e.title}
Premise: ${e.premise}
Primary Genre: ${e.primaryGenre}
Subgenres: ${e.subgenres.join(", ")}
Target Audience: ${e.targetAudience}
Tone: ${e.tone.join(", ")}
Themes: ${e.themes.join(", ")}
Explicit Constraints: ${e.explicitConstraints.join("; ")}

Design the complete fictional world, characters, locations, and epistemic states. Output ONLY JSON.`;
    return this.invokeStructured(
      {
        promptId: "world_designer",
        systemPrompt: r,
        messages: [{ role: "user", content: n }]
      },
      Vu
    );
  }
}
class Ad extends xe {
  constructor(e) {
    super(e);
  }
  async createBlueprint(e, r) {
    const n = this.buildSystemPrompt(), i = `## CREATIVE INTENT
Title: ${e.title}
Premise: ${e.premise}
Genre: ${e.primaryGenre} (${e.subgenres.join(", ")})
Format: ${e.format}
Tone: ${e.tone.join(", ")}
Themes: ${e.themes.join(", ")}
Constraints: ${e.explicitConstraints.join("; ")}

## WORLD AND CHARACTERS
World: ${r.worldName} (${r.technologyOrMagicLevel})
Rules:
${r.rulesAndConstraints.map((o) => `- [${o.category}] ${o.statement}`).join(`
`)}

Locations:
${r.locations.map((o) => `- ${o.name} (${o.id}): ${o.environmentType}`).join(`
`)}

Characters:
${r.characters.map((o) => `- ${o.name} (${o.id}, ${o.role}): Wants "${o.personality.primaryMotivation}". Flaw: "${o.personality.coreFlaw}"`).join(`
`)}

Create a complete, end-to-end Narrative Blueprint. Every scene must have a fully specified SceneContract. Output ONLY JSON.`, s = await this.invokeStructured(
      {
        promptId: "story_architect_create",
        systemPrompt: n,
        messages: [{ role: "user", content: i }]
      },
      tr
    );
    return s.submissionCount = 1, s.reviewStatus = "pending_review", s;
  }
  async reviseBlueprint(e, r) {
    const n = this.buildSystemPrompt(), i = `## CURRENT BLUEPRINT (SUBMISSION #${e.submissionCount})
${JSON.stringify(e, null, 2)}

## REVIEWER FINDINGS (REJECTION REASONS)
Assessment: ${r.overallAssessment}
Specific Findings:
${r.findings.map((o, a) => `${a + 1}. [${o.category}] (${o.severity}) in scenes [${o.affectedSceneIds.join(", ")}]: ${o.description}
Required Correction: ${o.requiredCorrection}`).join(`

`)}

Revise the blueprint to resolve EVERY finding listed above while preserving the core premise and characters. Output ONLY the revised JSON blueprint.`, s = await this.invokeStructured(
      {
        promptId: "story_architect_revise",
        systemPrompt: n,
        messages: [{ role: "user", content: i }]
      },
      tr
    );
    return s.submissionCount = e.submissionCount + 1, s.reviewStatus = "pending_review", s.integrityReviewNotes = [
      ...e.integrityReviewNotes,
      `Revision #${s.submissionCount} addressing: ${r.overallAssessment}`
    ], s;
  }
  buildSystemPrompt() {
    return `You are the Story Architect in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Construct a complete narrative blueprint from beginning to end before prose generation starts.

Architectural Rules:
1. End-to-End Planning: The narrative destination must be defined in advance (Opening → Inciting Incident → Rising Action → Midpoint → Turning Points → Climax → Resolution → Ending).
2. Hierarchical Structure: Project → Arc → Act → Chapter → Scene → Beat.
3. Scene Contracts: Every single scene MUST have an explicit SceneContract detailing:
   - scene objective
   - focusCharacterId and participatingCharacterIds
   - locationId
   - opening conditions
   - required events and required revelations
   - character motivations in the scene
   - emotional shift (from → to)
   - continuity constraints and dependencies
   - expected closing conditions
   - target word count (default 800)
   - dramatic beats
4. Setup & Payoff: Formulate explicit pairs connecting earlier setups to later payoffs.

You must output ONLY a valid JSON object matching the NarrativeBlueprint schema.`;
  }
}
class Md extends xe {
  constructor(e) {
    super(e);
  }
  async reviewBlueprint(e, r) {
    const n = Math.min(2, Math.max(1, e.submissionCount || 1)), i = `You are the Narrative Integrity Reviewer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Independently evaluate the complete narrative blueprint before it is approved for prose generation.

REVIEW PROTOCOL & CONSTRAINTS:
1. Strict 2-Submission Limit: This is submission #${n} of 2.
   - If submissionNumber == 1 and issues exist, set recommendation: "request_revision" and isApproved: false.
   - If submissionNumber == 2 and critical issues remain unresolved, set recommendation: "escalate_to_human" and isApproved: false.
   - If the blueprint is solid, set recommendation: "approve" and isApproved: true.
2. Review Checklist:
   - Causal consistency (do later events logically follow from prior causes?).
   - Character motivations (do actions stem from established psychologies rather than plot convenience?).
   - Timeline and location consistency.
   - World-rule adherence (does the plan violate established technological or physical rules?).
   - Setup and payoff integrity (are setups paid off, and payoffs earned?).
   - Beginning-to-ending coherence (does the ending resolve core conflicts established at the start?).
   - Narrative justification (do catastrophic or miraculous turns have proper setup?).

You must output ONLY a valid JSON object matching the BlueprintReviewResult schema:
{
  "isApproved": boolean,
  "submissionNumber": ${n},
  "overallAssessment": "Summary assessment",
  "findings": [
    {
      "category": "causal_inconsistency" | "character_motivation_mismatch" | "timeline_contradiction" | "world_rule_violation" | "unresolved_setup" | "insufficient_justification" | "pacing_or_structure_flaw",
      "severity": "minor" | "major" | "critical",
      "affectedSceneIds": ["scene-1"],
      "description": "...",
      "requiredCorrection": "..."
    }
  ],
  "strengths": ["..."],
  "recommendation": "approve" | "request_revision" | "escalate_to_human"
}`, s = `## WORLD RULES AND CHARACTERS
Rules:
${r.rulesAndConstraints.map((a) => `- [${a.category}] ${a.statement}`).join(`
`)}

Characters:
${r.characters.map((a) => `- ${a.name} (${a.id}): Wants "${a.personality.primaryMotivation}". Flaw: "${a.personality.coreFlaw}". Backstory: ${a.backstorySummary}`).join(`
`)}

## NARRATIVE BLUEPRINT TO EVALUATE (SUBMISSION #${n})
${JSON.stringify(e, null, 2)}

Perform a rigorous narrative integrity review. Output ONLY JSON.`, o = await this.invokeStructured(
      {
        promptId: `narrative_reviewer_pass_${n}`,
        systemPrompt: i,
        messages: [{ role: "user", content: s }]
      },
      yi
    );
    return o.submissionNumber = n, o;
  }
}
class $d {
  constructor(e, r) {
    b(this, "storyGraph");
    b(this, "contextBuilder");
    this.storyGraph = e, this.contextBuilder = r;
  }
  /**
   * Identifies all scenes planned across the blueprint in execution order.
   */
  extractPlannedScenes(e) {
    const r = [];
    for (const n of e.acts)
      for (const i of n.chapters)
        for (const s of i.scenes)
          r.push(s);
    return r.sort((n, i) => n.sceneIndex - i.sceneIndex);
  }
  /**
   * Determines the next uncompleted scene to produce.
   */
  getNextSceneToProduce(e) {
    const r = this.extractPlannedScenes(e);
    for (const n of r)
      if (!this.storyGraph.getScene(n.id))
        return n;
    return null;
  }
  /**
   * Assembles a comprehensive, purpose-built writing task assignment for a specific scene.
   */
  createWritingTask(e, r, n) {
    const i = this.contextBuilder.buildContextForScene(e);
    return {
      taskId: `task-${e.id}-${Date.now()}`,
      sceneContract: e,
      projection: i,
      stylistics: {
        narrativePerspective: r.perspective,
        overallTone: r.tone,
        sceneAtmosphere: `${e.emotionalShift.from} shifting towards ${e.emotionalShift.to}`,
        pacing: r.pacingPreference
      },
      revisionFeedback: n
    };
  }
}
class kd extends xe {
  constructor(e) {
    super(e);
  }
  async draftScene(e, r) {
    var l;
    const { sceneContract: n, projection: i, stylistics: s, revisionFeedback: o } = e, a = `You are the Specialized Writing Agent in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Craft vivid, emotionally resonant, character-driven narrative prose that satisfies the SceneContract.

CRITICAL CRAFT PRINCIPLES:
1. Character-Driven Prose:
   - Dialogue, internal monologue, and actions MUST emerge from each character's specific personality, motivations, flaws, and quirks.
   - Strictly honor what each character knows vs. what they do NOT know (epistemic state). A character must never act on information they have not learned.
   - Distinguish character personality from character dialogue style, scene tone, and narrative voice.
2. Sensory & Environmental Immersion:
   - Ground the prose in the physical location, tactile sensations, sounds, and lighting.
3. Bridge Continuity:
   - If previous scene closing context is provided, ensure seamless narrative flow without abrupt leaps.
4. Proposed Mutations:
   - Accurately propose all state changes enacted by the scene (character knowledge gained, emotional state shifts, timeline events, new facts established).

You must output ONLY a valid JSON object matching the SceneDraft schema:
{
  "sceneId": "${n.id}",
  "title": "${n.title}",
  "prose": "Full, immersive prose of the scene...",
  "summary": "2-3 sentence canonical summary of what transpired...",
  "wordCount": 750,
  "proposedMutations": [
    {
      "type": "character_knowledge" | "character_state" | "character_belief" | "relationship_update" | "new_canonical_fact" | "plot_thread_update" | "location_state_change" | "timeline_event",
      "targetEntityId": "char-1",
      "action": "add" | "update" | "set",
      "payload": { ... },
      "justification": "Why this changed in the scene"
    }
  ],
  "craftNotes": {
    "focalSubtext": "...",
    "sensoryMotifsUsed": ["..."],
    "pacingAssessment": "..."
  }
}`, c = `## SCENE CONTRACT
Title: ${n.title} (Scene #${n.sceneIndex + 1})
Objective: ${n.objective}
Focus Character: ${n.focusCharacterId}
Participating Characters: ${n.participatingCharacterIds.join(", ")}
Location: ${i.currentLocation.name} (${i.currentLocation.environmentType})
Opening Conditions: ${n.openingConditions}
Required Events:
${n.requiredEvents.map((u) => `- ${u}`).join(`
`)}
${n.requiredRevelations.length ? `Required Revelations:
${n.requiredRevelations.map((u) => `- ${u}`).join(`
`)}` : ""}
Emotional Shift: From "${n.emotionalShift.from}" to "${n.emotionalShift.to}"
Target Word Count: ${n.targetWordCount} words

## ACTIVE CHARACTERS & EPISTEMIC BOUNDARIES
${i.activeCharacters.map(
      (u) => `### ${u.profile.name} (${u.profile.id})
Personality: ${u.profile.personality.traits.join(", ")} | Wants: ${u.profile.personality.primaryMotivation} | Flaw: ${u.profile.personality.coreFlaw}
Dialogue Cadence: ${u.profile.dialogueStyle.speechCadence} | Vocab: ${u.profile.dialogueStyle.vocabularyLevel}
Current Epistemic Knowledge:
- Known Facts: ${u.state.knownFacts.join("; ") || "None"}
- False Beliefs: ${u.state.falseBeliefs.join("; ") || "None"}
- Secrets Concealed: ${u.state.hiddenSecrets.join("; ") || "None"}
- Current Goal in Scene: ${u.state.currentGoal}
- Current Emotional State: ${u.state.emotionalState}`
    ).join(`

`)}

## LOCATION SENSORY PALETTE
Sights: ${i.currentLocation.sensoryDetails.sights.join(", ")}
Sounds: ${i.currentLocation.sensoryDetails.sounds.join(", ")}
Atmosphere: ${i.currentLocation.sensoryDetails.smellsOrAtmosphere.join(", ")}

${(l = i.previousSceneBridge) != null && l.closingSnippet ? `## PREVIOUS SCENE BRIDGE (CONTINUE DIRECTLY FROM HERE)
Summary: ${i.previousSceneBridge.summary}
Closing Snippet:
"""
${i.previousSceneBridge.closingSnippet}
"""` : ""}

## STYLISTICS
Perspective: ${s.narrativePerspective}
Tone: ${s.overallTone.join(", ")}
Atmosphere: ${s.sceneAtmosphere}
Pacing: ${s.pacing}

${o ? `## REVISION FEEDBACK FROM REVIEWER (YOU MUST ADDRESS THESE SPECIFIC FLAWS)
${o}` : ""}

Write the complete scene prose and declare all proposed mutations. Output ONLY JSON.`;
    return this.invokeStructured(
      {
        promptId: `writing_agent_${n.id}`,
        systemPrompt: a,
        messages: [{ role: "user", content: c }],
        onToken: r
      },
      ld
    );
  }
}
class Od extends xe {
  constructor(e) {
    super(e);
  }
  async reviewScene(e, r, n, i = 1) {
    const s = `You are the Scene Reviewer in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Critically evaluate the generated scene draft against the SceneContract, character epistemic boundaries, and world rules before it can be committed to the canonical Story Graph.

CHECKLIST CRITERIA:
1. contract_objective_fulfilled: Did the scene achieve its core objective?
2. required_events_present: Are all mandatory events from the contract present in the prose?
3. character_behavior_and_voice_consistent: Did characters speak and act consistently with their personality flaws and dialogue styles?
4. epistemic_knowledge_boundaries_respected: Did any character act on knowledge they do not have or reveal secrets without causal justification?
5. world_rules_and_continuity_preserved: Are the fictional world rules and physical laws obeyed?
6. no_unauthorized_major_plot_divergence: Did the prose avoid introducing wild, unapproved alterations to the overarching plot?
7. style_and_tone_adherence: Does the prose honor the assigned emotional shift and tone?

REVIEW RULES:
- This is iteration #${i} of 2.
- If all checks pass, set recommendation: "approve" and isApproved: true.
- If issues exist and iterationNumber < 2, set recommendation: "request_revision" and list clear requiredRevisions.
- If issues persist on iteration 2, set recommendation: "escalate_failure" and isApproved: false.

You must output ONLY a valid JSON object matching the SceneReviewResult schema.`, o = `## SCENE CONTRACT
Title: ${e.title}
Objective: ${e.objective}
Required Events:
${e.requiredEvents.map((c) => `- ${c}`).join(`
`)}
Emotional Shift: ${e.emotionalShift.from} → ${e.emotionalShift.to}

## CHARACTER EPISTEMIC BOUNDARIES
${n.activeCharacters.map(
      (c) => `- ${c.profile.name}: Knows [${c.state.knownFacts.join("; ")}]. Believes [${c.state.falseBeliefs.join("; ")}]. Hiding [${c.state.hiddenSecrets.join("; ")}].`
    ).join(`
`)}

## WORLD RULES
${n.relevantWorldFacts.map((c) => `- [${c.category}] ${c.statement}`).join(`
`)}

## GENERATED SCENE DRAFT (ITERATION #${i})
Summary: ${r.summary}
Prose:
"""
${r.prose}
"""

Evaluate this scene draft. Output ONLY JSON.`, a = await this.invokeStructured(
      {
        promptId: `scene_reviewer_${e.id}_iter_${i}`,
        systemPrompt: s,
        messages: [{ role: "user", content: o }]
      },
      _i
    );
    return a.sceneId = e.id, a.iterationNumber = i, a;
  }
}
class Nd extends xe {
  constructor(r, n) {
    super(r);
    b(this, "storyGraph");
    this.storyGraph = n;
  }
  async preparePerformance(r) {
    const n = r.contract.participatingCharacterIds.map((o) => this.storyGraph.getCharacter(o)).filter(Boolean), i = `You are the Narration Director in an advanced AI Narrative Orchestration Engine.

Your responsibility:
Transform the canonical narrative scene prose into an utterance-level PerformanceScript tailored for natural neural speech synthesis with CosyVoice 3.

COSYVOICE 3 NATURAL VOICE DIRECTING GUIDELINES:
1. Utterance Segmentation:
   - Break down the prose into utterance-sized segments (individual sentences or natural speech turns).
   - Label each segment with the correct speakerId (character ID or "NARRATOR") and isDialogue (true/false).
2. CosyVoice 3 Voice Casting:
   - Use engine: "cosyvoice3" for all character voice profiles and narrator.
   - Establish stable CharacterVoiceProfile with appropriate pitchOffset (-0.2 to +0.2) and naturalSpeed (0.9 to 1.1).
3. Natural Conversational Tags & Cues:
   - In spokenText, you may insert native CosyVoice 3 instruct tags:
     * <breath> for natural intake of breath before tense, whispered, or dramatic sentences.
     * <strong>...</strong> for emphasized phrases, shouted commands, or dramatic peaks.
     * [whisper], [sigh], [gasp], [hmm] for expressive natural vocalizations.
4. Dynamic Emotional Performance:
   - Emotion (neutral, whispering, intense, urgent, fearful, furious, mournful, joyful, ironic, menacing, hesitant, tender).
   - Delivery intensity (0.1 to 1.0) and speed multiplier (0.8 to 1.3).
   - Expressive prePauseMs (100-300ms) and postPauseMs (200-600ms) for natural room tone pacing.
5. Sound Design & Score:
   - Ambience track (indoor, outdoor, sci_fi, weather, tense_silence, crowd).
   - Minimalist score theme and intensity.
   - Punctual sound design cues (e.g. sfx-radio-burst, airlock-seal, gun-cock, footsteps) triggered on specific utterances.

You must output ONLY a valid JSON object matching the PerformanceScript schema.`, s = `## SCENE METADATA
Scene ID: ${r.contract.id}
Scene Title: ${r.contract.title}
Location: ${r.contract.locationId}
Emotional Shift: ${r.contract.emotionalShift.from} → ${r.contract.emotionalShift.to}

## PARTICIPATING CHARACTERS
${n.map(
      (o) => `- ${o.name} (${o.id}): Dialogue Cadence: "${o.dialogueStyle.speechCadence}", Subtext: "${o.dialogueStyle.subtextTendency}"`
    ).join(`
`)}

## CANONICAL SCENE PROSE TO DIRECT
"""
${r.prose}
"""

Create the complete, production-ready PerformanceScript. Output ONLY JSON.`;
    return this.invokeStructured(
      {
        promptId: `narration_director_${r.contract.id}`,
        systemPrompt: i,
        messages: [{ role: "user", content: s }]
      },
      gd
    );
  }
}
const Rd = {
  maxBlueprintSubmissions: 2,
  maxSceneRevisions: 2,
  maxInferenceRetries: 2
};
class Pd {
  constructor(e = Rd) {
    b(this, "config");
    this.config = e;
  }
  canRetryBlueprint(e) {
    return e < this.config.maxBlueprintSubmissions;
  }
  canReviseScene(e) {
    return e < this.config.maxSceneRevisions;
  }
}
class Dd {
  constructor(e, r, n) {
    b(this, "snapshot");
    b(this, "persistence");
    this.persistence = r, n ? this.snapshot = n : this.snapshot = {
      workflowId: `wf-${Date.now()}`,
      projectId: e,
      currentStage: "INITIALIZED",
      blueprintReviews: [],
      sceneRetryCounts: {},
      sceneReviews: {},
      completedSceneIds: [],
      taskHistory: [],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.snapshot));
  }
  setStage(e, r) {
    this.snapshot.currentStage = e, r && (this.snapshot.escalationReason = r), this.snapshot.lastUpdated = (/* @__PURE__ */ new Date()).toISOString(), this.persist();
  }
  setIntent(e) {
    this.snapshot.intent = e, this.persist();
  }
  setBlueprint(e) {
    this.snapshot.blueprint = e, this.persist();
  }
  recordBlueprintReview(e) {
    this.snapshot.blueprintReviews.push(e), this.persist();
  }
  recordSceneReview(e, r) {
    this.snapshot.sceneReviews[e] || (this.snapshot.sceneReviews[e] = []), this.snapshot.sceneReviews[e].push(r), this.persist();
  }
  incrementSceneRetry(e) {
    const n = (this.snapshot.sceneRetryCounts[e] || 0) + 1;
    return this.snapshot.sceneRetryCounts[e] = n, this.persist(), n;
  }
  markSceneCompleted(e) {
    this.snapshot.completedSceneIds.includes(e) || this.snapshot.completedSceneIds.push(e), this.persist();
  }
  logTask(e) {
    this.snapshot.taskHistory.push(e), this.persist();
  }
  persist() {
    if (this.persistence)
      try {
        this.persistence.saveWorkflowSnapshot(this.snapshot);
      } catch (e) {
        console.warn("[WorkflowStateStore] Failed to persist workflow snapshot:", e);
      }
  }
}
class br {
  constructor(e, r, n, i) {
    b(this, "failurePolicy");
    b(this, "normalizer");
    b(this, "worldDesigner");
    b(this, "storyArchitect");
    b(this, "narrativeReviewer");
    b(this, "writingAgent");
    b(this, "modelProvider");
    b(this, "storyGraph");
    b(this, "persistence");
    b(this, "sceneReviewer");
    b(this, "narrationDirector");
    this.modelProvider = e, this.storyGraph = r, this.persistence = n, this.failurePolicy = i || new Pd(), this.normalizer = new Td(this.modelProvider), this.worldDesigner = new Cd(this.modelProvider), this.storyArchitect = new Ad(this.modelProvider), this.narrativeReviewer = new Md(this.modelProvider), this.writingAgent = new kd(this.modelProvider), this.sceneReviewer = new Od(this.modelProvider), this.narrationDirector = new Nd(this.modelProvider, this.storyGraph);
  }
  async run(e, r) {
    const n = (v, S) => {
      var _;
      (_ = r == null ? void 0 : r.onProgress) == null || _.call(r, v, S);
    };
    this.modelProvider.isInitialized || await this.modelProvider.initialize();
    const i = `proj-${Date.now()}`, s = new Dd(i, this.persistence), o = new bd(this.storyGraph), a = new Ed(this.storyGraph), c = new $d(this.storyGraph, a);
    s.setStage("NORMALIZING_INTENT"), n("NORMALIZING_INTENT", "Analyzing raw prompt and normalizing creative intent...");
    const l = await this.normalizer.normalize(e);
    s.setIntent(l), n("NORMALIZING_INTENT", `Normalized intent: "${l.title}" (${l.primaryGenre})`), s.setStage("DESIGNING_WORLD_AND_CHARACTERS"), n("DESIGNING_WORLD_AND_CHARACTERS", "Designing world rules, locations, and multidimensional characters...");
    const u = await this.worldDesigner.design(l);
    this.storyGraph.initializeFromManifest(i, l.title, u), this.persistence && this.persistence.saveStoryGraph(this.storyGraph.getState()), n("DESIGNING_WORLD_AND_CHARACTERS", `World created: ${u.worldName} with ${u.characters.length} characters.`), s.setStage("ARCHITECTING_BLUEPRINT"), n("ARCHITECTING_BLUEPRINT", "Drafting end-to-end narrative blueprint from opening to ending...");
    let d = await this.storyArchitect.createBlueprint(l, u);
    s.setBlueprint(d), n("ARCHITECTING_BLUEPRINT", `Blueprint drafted with ${d.acts.length} acts.`), s.setStage("REVIEWING_BLUEPRINT_PASS_1"), n("REVIEWING_BLUEPRINT_PASS_1", "Performing Pass 1 Narrative Integrity Review...");
    let h = await this.narrativeReviewer.reviewBlueprint(d, u);
    if (s.recordBlueprintReview(h), !h.isApproved && (n("REVISING_BLUEPRINT", `Pass 1 requested revisions: ${h.overallAssessment}`), s.setStage("REVISING_BLUEPRINT"), d = await this.storyArchitect.reviseBlueprint(d, h), s.setBlueprint(d), s.setStage("REVIEWING_BLUEPRINT_PASS_2"), n("REVIEWING_BLUEPRINT_PASS_2", "Performing Pass 2 Narrative Integrity Review..."), h = await this.narrativeReviewer.reviewBlueprint(d, u), s.recordBlueprintReview(h), !h.isApproved))
      return s.setStage(
        "ESCALATED_NEEDS_INTERVENTION",
        `Blueprint rejected after 2 review passes: ${h.overallAssessment}`
      ), n("ESCALATED_NEEDS_INTERVENTION", "Review rejected twice. Escalated to human operator."), {
        snapshot: s.getSnapshot(),
        storyGraph: this.storyGraph
      };
    d.reviewStatus = "approved", s.setBlueprint(d), s.setStage("BLUEPRINT_APPROVED"), n("BLUEPRINT_APPROVED", "Narrative Blueprint officially approved. Transitioning to Execution Layer.");
    const f = (r == null ? void 0 : r.maxScenesToProduce) ?? 999;
    let p = 0;
    for (; p < f; ) {
      const v = c.getNextSceneToProduce(d);
      if (!v)
        break;
      s.setStage("EXECUTING_SCENE"), n("EXECUTING_SCENE", `Producing Scene #${v.sceneIndex + 1}: "${v.title}"...`);
      let S = 0, _ = !1, R;
      for (; !_ && S < 2; ) {
        S++, s.incrementSceneRetry(v.id);
        const M = c.createWritingTask(v, l, R), O = await this.writingAgent.draftScene(M, r == null ? void 0 : r.onToken);
        s.setStage("REVIEWING_SCENE"), n("REVIEWING_SCENE", `Reviewing draft for Scene #${v.sceneIndex + 1} (Attempt ${S})...`);
        const x = await this.sceneReviewer.reviewScene(
          v,
          O,
          M.projection,
          S
        );
        if (s.recordSceneReview(v.id, x), x.isApproved) {
          s.setStage("COMMITTING_SCENE"), n("COMMITTING_SCENE", `Committing approved Scene #${v.sceneIndex + 1} to Story Graph...`);
          const C = [];
          for (const I of O.proposedMutations)
            try {
              const P = o.applyMutation(I, v.id);
              C.push(P);
            } catch (P) {
              console.warn(`[Orchestrator] Mutation dropped: ${P.message}`);
            }
          this.storyGraph.commitScene(v, O.prose, O.summary, C), this.persistence && this.persistence.saveStoryGraph(this.storyGraph.getState()), s.markSceneCompleted(v.id), _ = !0, p++, n("COMMITTING_SCENE", `Scene #${v.sceneIndex + 1} committed successfully (${O.wordCount} words).`);
        } else
          R = x.requiredRevisions.join(`
`), n("REVIEWING_SCENE", `Scene draft rejected: ${x.overallCritique}`);
      }
      if (!_)
        return s.setStage(
          "ESCALATED_NEEDS_INTERVENTION",
          `Scene ${v.id} failed review after ${S} attempts.`
        ), n("ESCALATED_NEEDS_INTERVENTION", `Scene ${v.id} revision limit exhausted.`), {
          snapshot: s.getSnapshot(),
          storyGraph: this.storyGraph
        };
    }
    const g = [];
    if ((r == null ? void 0 : r.enableAudioPreparation) !== !1) {
      s.setStage("PREPARING_AUDIO"), n("PREPARING_AUDIO", "Directing audio performance and sound design for approved scenes...");
      const v = this.storyGraph.getAllScenes();
      for (const S of v) {
        const _ = await this.narrationDirector.preparePerformance(S);
        g.push(_);
      }
      n("PREPARING_AUDIO", `Generated audio performance scripts for ${g.length} scenes.`);
    }
    return s.setStage("COMPLETED"), n("COMPLETED", "Narrative production pipeline completed successfully."), {
      snapshot: s.getSnapshot(),
      storyGraph: this.storyGraph,
      performanceScripts: g
    };
  }
  /**
   * Resumes an existing workflow run from its last committed state.
   */
  async resume(e, r) {
    var c, l;
    if (!this.persistence)
      throw new Error("[WorkflowOrchestrator] PersistenceManager is required for workflow resumption");
    const n = this.persistence.loadStoryGraph(e), i = this.persistence.loadWorkflowSnapshot(e);
    if (!n || !i)
      throw new Error(`[WorkflowOrchestrator] No persisted state found for project: ${e}`);
    const s = new Ii(n), o = new br(
      this.modelProvider,
      s,
      this.persistence,
      this.failurePolicy
    ), a = {
      rawPrompt: ((c = i.intent) == null ? void 0 : c.premise) || "Resuming story execution",
      format: (l = i.intent) == null ? void 0 : l.format
    };
    return o.run(a, r);
  }
}
if (typeof process < "u" && process.env && (process.env.QVAC_RPC_INIT_TIMEOUT_MS || (process.env.QVAC_RPC_INIT_TIMEOUT_MS = "120000"), !process.env.QVAC_WORKER_PATH && typeof process.cwd == "function"))
  try {
    const t = E.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js");
    if (typeof y < "u" && typeof y.existsSync == "function" && y.existsSync(t))
      try {
        process.env.QVAC_WORKER_PATH = y.realpathSync(t);
      } catch {
        process.env.QVAC_WORKER_PATH = t;
      }
  } catch {
  }
class ve {
  /**
   * Processes conversational cues and performance emotions into CosyVoice 3 instruct markup.
   */
  static processConversationalCues(e, r = "neutral", n = 0.5) {
    let i = e;
    const s = [];
    let o = "neutral", a, c;
    switch (r) {
      case "whispering":
        a = "soft", c = "slow", o = "neutral", s.push("whisper");
        break;
      case "furious":
        a = "loud", o = "anger", c = "fast", s.push("furious");
        break;
      case "intense":
      case "urgent":
        a = n > 0.7 ? "loud" : void 0, o = "anger", c = "fast", s.push("intense");
        break;
      case "fearful":
        a = n > 0.6 ? "soft" : void 0, o = "sad", c = "slow", s.push("fearful");
        break;
      case "mournful":
      case "tender":
        a = "soft", o = "sad", c = "slow", s.push("mournful");
        break;
      case "joyful":
        o = "happy", c = n > 0.6 ? "fast" : "moderate", s.push("joyful");
        break;
      case "menacing":
        a = "soft", o = "anger", c = "slow", s.push("menacing");
        break;
      case "ironic":
      case "hesitant":
        c = "slow", o = "neutral", s.push(r);
        break;
      default:
        o = "neutral";
        break;
    }
    return /\[(?:whisper|soft)\]/i.test(i) && (a = "soft", c = "slow", s.push("whisper"), i = i.replace(/\[\/?(?:whisper|soft)\]/gi, " ")), /\[(?:yell|shout|loud)\]/i.test(i) && (a = "loud", o = "anger", s.push("yell"), i = i.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ")), (/\[(?:sigh|breath)\]/i.test(i) || /<\/?breath>/i.test(i)) && (s.push("breath"), i = i.replace(/\[(?:sigh|breath)\]/gi, " <breath> ")), /\[gasp\]/i.test(i) && (s.push("gasp"), i = i.replace(/\[gasp\]/gi, " <breath> ")), (/\[(?:raise|emphasis)\]/i.test(i) || /<\/?strong>/i.test(i)) && (s.push("raise"), i = i.replace(
      /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
      "<strong>$1</strong>"
    ), i = i.replace(/\[\/?(?:raise|emphasis)\]/gi, " ")), /\[(?:hmm+|thinking)\]/i.test(i) && (s.push("hmm"), i = i.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ")), i = i.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " "), i = i.replace(/<\/?laughter>/gi, " "), a === "soft" && (r === "whispering" || s.includes("whisper")) && (i.includes("<breath>") || (i = `<breath> ${i.trim()} <breath>`)), (r === "furious" || s.includes("furious")) && !/<strong>[\s\S]*?<\/strong>/i.test(i) && (i = `<strong>${i.trim()}</strong>`), i = i.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim(), {
      processedText: i,
      cosyEmotion: o,
      volume: a,
      pace: c,
      detectedCues: s
    };
  }
  /**
   * Splits spoken text into natural, flowing sentence chunks (up to ~36 words)
   * while preserving XML markup tags (<breath>, <strong>) without breaking them.
   */
  static splitIntoNaturalSpeechChunks(e, r = 36) {
    const n = e.trim();
    if (!n) return [];
    if (n.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim().split(/\s+/).filter(Boolean).length <= r)
      return [n];
    const s = n.match(/(?:<[^>]+>|[^.!?\n])+([.!?\n]+(?=[\s<]|$)|$)/g) || [n], o = [];
    let a = "";
    for (const c of s) {
      const l = c.trim();
      if (l)
        if (!a)
          a = l;
        else {
          const u = `${a} ${l}`;
          u.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim().split(/\s+/).filter(Boolean).length > r ? (o.push(a.trim()), a = l) : a = u;
        }
    }
    return a.trim() && o.push(a.trim()), o;
  }
  /**
   * Generates microscopic acoustic room tone silence (extremely low amplitude dither)
   * to eliminate harsh digital zero silence.
   */
  static generateAcousticRoomPause(e, r = 24e3) {
    const n = Math.max(1, Math.round(e * r)), i = new Array(n);
    for (let s = 0; s < n; s++)
      i[s] = (Math.random() - 0.5) * 4;
    return i;
  }
  /**
   * Crossfade appends source samples to target samples to eliminate audio pop and phase artifacts.
   */
  static crossfadeAppend(e, r, n = 24e3, i = 15) {
    if (r.length === 0) return;
    if (e.length === 0) {
      for (let a = 0; a < r.length; a++)
        e.push(r[a]);
      return;
    }
    const s = Math.min(
      Math.round(i / 1e3 * n),
      Math.floor(e.length / 2),
      Math.floor(r.length / 2)
    );
    if (s <= 0) {
      for (let a = 0; a < r.length; a++)
        e.push(r[a]);
      return;
    }
    const o = e.length - s;
    for (let a = 0; a < s; a++) {
      const c = a / s, l = Math.cos(c * Math.PI / 2), u = Math.sin(c * Math.PI / 2), d = e[o + a] * l + r[a] * u;
      e[o + a] = Math.round(d);
    }
    for (let a = s; a < r.length; a++)
      e.push(r[a]);
  }
  /**
   * Encodes signed 16-bit PCM samples into standard RIFF WAV byte buffer.
   */
  static pcmToWavBuffer(e, r = 24e3) {
    const n = Number.isFinite(r) && r > 0 ? Math.round(r) : 24e3, i = e.length, s = 44, o = i * 2, a = Buffer.alloc(s + o);
    a.write("RIFF", 0), a.writeUInt32LE(s + o - 8, 4), a.write("WAVE", 8), a.write("fmt ", 12), a.writeUInt32LE(16, 16), a.writeUInt16LE(1, 20), a.writeUInt16LE(1, 22), a.writeUInt32LE(n, 24), a.writeUInt32LE(n * 2, 28), a.writeUInt16LE(2, 32), a.writeUInt16LE(16, 34), a.write("data", 36), a.writeUInt32LE(o, 40);
    for (let c = 0; c < i; c++) {
      const l = Number.isFinite(e[c]) ? Math.round(e[c]) : 0, u = Math.max(-32768, Math.min(32767, l));
      a.writeInt16LE(u, s + c * 2);
    }
    return a;
  }
}
class Ld {
  constructor(e) {
    b(this, "supportedEngines", ["cosyvoice3"]);
    b(this, "outputDir");
    b(this, "cacheDir");
    b(this, "useLiveQvacEngine");
    b(this, "lavaSrEnabled");
    b(this, "cfgScale");
    b(this, "stability");
    b(this, "similarity");
    b(this, "voicePrompt");
    b(this, "loadedModelId", null);
    const r = typeof e == "string" ? e : e == null ? void 0 : e.customOutputDir;
    if (this.useLiveQvacEngine = typeof e == "object" ? !!e.useLiveQvacEngine : !1, this.lavaSrEnabled = typeof e == "object" ? e.lavaSrEnabled !== !1 : !0, this.cfgScale = typeof e == "object" && e.cfgScale !== void 0 ? e.cfgScale : 1.5, this.stability = typeof e == "object" && e.stability !== void 0 ? e.stability : 0.7, this.similarity = typeof e == "object" && e.similarity !== void 0 ? e.similarity : 0.85, this.voicePrompt = typeof e == "object" ? e.voicePrompt : void 0, this.outputDir = r || E.resolve(process.cwd(), "data/audio/scenes"), this.cacheDir = E.resolve(process.cwd(), "data/audio/cache"), !y.existsSync(this.outputDir))
      try {
        y.mkdirSync(this.outputDir, { recursive: !0 });
      } catch {
      }
    if (!y.existsSync(this.cacheDir))
      try {
        y.mkdirSync(this.cacheDir, { recursive: !0 });
      } catch {
      }
  }
  /**
   * Preloads or resolves the CosyVoice 3 model instance in QVAC
   */
  async ensureCosyVoiceModelLoaded() {
    if (this.loadedModelId) return this.loadedModelId;
    const e = Gi;
    if (typeof mt == "function" && e)
      try {
        const r = await mt({
          modelSrc: e,
          modelType: "tts",
          modelConfig: {
            ttsEngine: "cosyvoice3",
            useGPU: !0,
            seed: 42,
            cosyvoice3S3tokModelSrc: Bi,
            cosyvoice3CampplusModelSrc: ji,
            ...this.lavaSrEnabled && Ar ? { lavasrEnhancerModelSrc: Ar } : {}
          }
        });
        return this.loadedModelId = r, r;
      } catch (r) {
        if ((r == null ? void 0 : r.code) === 52200 && typeof pt == "function")
          try {
            const i = await pt(e);
            if (i != null && i.loadedInstances && i.loadedInstances.length > 0) {
              const s = i.loadedInstances[0].registryId;
              return this.loadedModelId = s, s;
            }
          } catch {
          }
        const n = (e == null ? void 0 : e.modelId) || "cosyvoice3-llm-q8_0";
        return this.loadedModelId = n, n;
      }
    return this.loadedModelId = "cosyvoice3-llm-q8_0", "cosyvoice3-llm-q8_0";
  }
  async produceSegment(e) {
    const { emotion: r, deliveryIntensity: n, speedMultiplier: i } = e.performance, s = e.voiceProfile, o = ve.processConversationalCues(
      e.spokenText,
      r,
      n
    ), a = `${e.speakerId}_${e.id}_${o.cosyEmotion}_${o.volume || "norm"}_${this.lavaSrEnabled ? "48k" : "24k"}`, c = E.join(this.cacheDir, `${a}.wav`);
    if (y.existsSync(c)) {
      const p = y.statSync(c);
      let g = this.lavaSrEnabled ? 48e3 : 24e3;
      try {
        const S = y.openSync(c, "r"), _ = Buffer.alloc(28);
        y.readSync(S, _, 0, 28, 0), y.closeSync(S);
        const R = _.readUInt32LE(24);
        R > 0 && (g = R);
      } catch {
      }
      const v = Math.round((p.size - 44) / (g * 2) * 1e3);
      return {
        utteranceId: e.id,
        speakerId: e.speakerId,
        audioFilePath: c,
        durationMs: v,
        sampleRate: g,
        cached: !0
      };
    }
    let l = [];
    const u = this.lavaSrEnabled ? 48e3 : 24e3;
    let d = !1;
    if (this.useLiveQvacEngine && typeof Mr == "function")
      try {
        const g = {
          modelId: s.assignedVoiceId || await this.ensureCosyVoiceModelLoaded(),
          text: o.processedText,
          inputType: "text",
          stream: !1,
          emotion: o.cosyEmotion !== "neutral" ? o.cosyEmotion : void 0,
          volume: o.volume,
          pace: o.pace,
          cfgScale: this.cfgScale
        }, S = await Mr(g).buffer ?? [];
        Array.isArray(S) && S.length > 0 && (l = S, d = !0);
      } catch {
      }
    (!d || l.length === 0) && (l = this.generateNaturalAcousticWaveform(
      o.processedText,
      u,
      i,
      o.cosyEmotion,
      o.volume
    ));
    const h = ve.pcmToWavBuffer(l, u);
    y.writeFileSync(c, h);
    const f = Math.round(l.length / u * 1e3);
    return {
      utteranceId: e.id,
      speakerId: e.speakerId,
      audioFilePath: c,
      durationMs: f,
      sampleRate: u,
      waveformSnippet: [0.1, 0.4, 0.8, 0.6, 0.3, 0.1],
      cached: !1
    };
  }
  async assembleSceneAudio(e) {
    var l;
    const r = [], n = [], i = this.lavaSrEnabled ? 48e3 : 24e3;
    let s = 0;
    for (let u = 0; u < e.segments.length; u++) {
      const d = e.segments[u];
      if (d.performance.prePauseMs > 0) {
        const f = ve.generateAcousticRoomPause(
          d.performance.prePauseMs / 1e3,
          i
        );
        ve.crossfadeAppend(n, f, i, 10);
      }
      const h = await this.produceSegment(d);
      if (r.push(h), y.existsSync(h.audioFilePath)) {
        const f = y.readFileSync(h.audioFilePath), p = this.readPcmFromWav(f);
        ve.crossfadeAppend(n, p, i, 15);
      }
      if ((l = d.soundDesignCue) != null && l.soundEffectId && s++, d.performance.postPauseMs > 0) {
        const f = ve.generateAcousticRoomPause(
          d.performance.postPauseMs / 1e3,
          i
        );
        ve.crossfadeAppend(n, f, i, 10);
      }
    }
    const o = E.join(this.outputDir, `${e.sceneId}_master.wav`), a = ve.pcmToWavBuffer(n, i);
    y.writeFileSync(o, a);
    const c = Math.round(n.length / i * 1e3);
    return {
      sceneId: e.sceneId,
      sceneTitle: e.sceneTitle,
      masterAudioFilePath: o,
      totalDurationMs: c,
      segments: r,
      soundEffectsApplied: s,
      ambienceApplied: !!e.ambienceTrack,
      musicApplied: !!e.musicTrack,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async clearCache() {
    if (y.existsSync(this.cacheDir)) {
      const e = y.readdirSync(this.cacheDir);
      for (const r of e)
        r.endsWith(".wav") && y.unlinkSync(E.join(this.cacheDir, r));
    }
  }
  readPcmFromWav(e) {
    const r = [];
    for (let i = 44; i < e.length - 1; i += 2)
      r.push(e.readInt16LE(i));
    return r;
  }
  /**
   * Generates a realistic vocal acoustic simulation when offline or simulating.
   */
  generateNaturalAcousticWaveform(e, r, n, i, s) {
    const o = e.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim().split(/\s+/).filter(Boolean), a = Math.max(0.6, o.length / 2.6 * (1 / (n || 1))), c = Math.round(a * r), l = new Array(c), u = s === "soft" ? 4500 : s === "loud" ? 16e3 : 9500, d = i === "anger" ? 190 : i === "sad" ? 120 : 150;
    for (let h = 0; h < c; h++) {
      const f = h / r, p = Math.sin(2 * Math.PI * d * f), g = Math.sin(2 * Math.PI * (d * 2.2) * f) * 0.4, v = Math.sin(2 * Math.PI * (d * 3.8) * f) * 0.2, S = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * f), _ = Math.round((p + g + v) * S * u);
      l[h] = _;
    }
    return l;
  }
}
class xd {
  constructor() {
    b(this, "orchestrator", null);
    b(this, "modelProvider", null);
    b(this, "audioProducer", null);
    b(this, "persistence");
    var r;
    let e = E.join(process.cwd(), "data", "narratives");
    try {
      (r = Y) != null && r.getPath && (e = E.join(Y.getPath("userData"), "narratives"));
    } catch {
    }
    this.persistence = new Id(e);
  }
  async getModelProvider() {
    return this.modelProvider || (this.modelProvider = new rr(), await this.modelProvider.initialize()), this.modelProvider;
  }
  getAudioProducer(e) {
    return (!this.audioProducer || e) && (this.audioProducer = new Ld({
      useLiveQvacEngine: !0,
      lavaSrEnabled: (e == null ? void 0 : e.lavaSrEnabled) !== !1,
      cfgScale: (e == null ? void 0 : e.cfgScale) ?? 1.5,
      stability: (e == null ? void 0 : e.stability) ?? 0.7,
      similarity: (e == null ? void 0 : e.similarity) ?? 0.85,
      voicePrompt: e == null ? void 0 : e.voicePrompt
    })), this.audioProducer;
  }
  async generateStory(e, r, n) {
    var i;
    try {
      const s = await this.getModelProvider(), o = this.getAudioProducer(r), a = new Ii();
      this.orchestrator = new br(s, a, this.persistence);
      const c = {
        NORMALIZING_INTENT: { name: "Normalizing Creative Intent", pct: 15 },
        DESIGNING_WORLD_AND_CHARACTERS: { name: "Synthesizing World & Character Profiles", pct: 30 },
        ARCHITECTING_BLUEPRINT: { name: "Architecting End-to-End Blueprint", pct: 45 },
        REVIEWING_BLUEPRINT: { name: "Reviewing Narrative Integrity", pct: 60 },
        BLUEPRINT_APPROVED: { name: "Narrative Blueprint Approved", pct: 65 },
        EXECUTING_SCENE: { name: "Directing Scene Production", pct: 75 },
        REVIEWING_SCENE: { name: "Reviewing Scene Contract Adherence", pct: 85 },
        PREPARING_AUDIO: { name: "Preparing CosyVoice 3 Audio Scripts", pct: 92 },
        COMPLETED: { name: "Narrative Production Completed", pct: 100 }
      }, l = await this.orchestrator.run(e, {
        maxScenesToProduce: (r == null ? void 0 : r.maxScenesToProduce) ?? 2,
        enableAudioPreparation: (r == null ? void 0 : r.enableAudioPreparation) !== !1,
        onProgress: (d, h) => {
          const f = c[d] || { name: d, pct: 50 };
          n == null || n({
            stage: d,
            stageName: f.name,
            progressPercent: f.pct,
            message: h,
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          });
        }
      }), u = {};
      if ((r == null ? void 0 : r.enableAudioPreparation) !== !1 && ((i = l.performanceScripts) != null && i.length))
        for (const d of l.performanceScripts)
          try {
            n == null || n({
              stage: "SYNTHESIZING_AUDIO",
              stageName: "Synthesizing CosyVoice 3 Audio",
              progressPercent: 96,
              message: `Assembling acoustic dialogue for scene: ${d.sceneTitle}`,
              timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
            });
            const h = await o.assembleSceneAudio(d);
            u[d.sceneId] = h;
          } catch (h) {
            console.warn(`[StoryService] Failed to synthesize audio for scene ${d.sceneId}:`, h);
          }
      return {
        success: !0,
        data: {
          snapshot: l.snapshot,
          graphState: l.storyGraph.getState(),
          performanceScripts: l.performanceScripts || [],
          audioResults: u
        }
      };
    } catch (s) {
      return console.error("[StoryService] Generation failed:", s), { success: !1, error: String(s) };
    }
  }
}
class zd extends Le {
  constructor(e) {
    super(), this.storyService = e;
  }
  init() {
    z.handle(
      $.STORY_GENERATE,
      async (e, r) => {
        const n = (s) => {
          try {
            e.sender.isDestroyed() || e.sender.send($.STORY_PROGRESS, s);
          } catch (o) {
            console.warn("[StoryController] Failed to send progress event:", o);
          }
        }, i = await this.storyService.generateStory(
          r.prompt,
          r.options,
          n
        );
        if (i.success)
          try {
            e.sender.isDestroyed() || e.sender.send($.STORY_COMPLETE, i.data);
          } catch (s) {
            console.warn("[StoryController] Failed to send completion event:", s);
          }
        else
          try {
            e.sender.isDestroyed() || e.sender.send($.STORY_ERROR, { error: i.error });
          } catch (s) {
            console.warn("[StoryController] Failed to send error event:", s);
          }
        return i;
      }
    );
  }
}
class Ud {
  constructor(e, r) {
    b(this, "db");
    b(this, "musicService");
    this.db = e, this.musicService = r;
  }
  /**
   * Resolve origin data (TTS, Music, Story) based on activity record and relations
   */
  formatActivityRecord(e) {
    var a;
    let r;
    if (e.metadata)
      try {
        if (r = typeof e.metadata == "string" ? JSON.parse(e.metadata) : e.metadata, r && typeof r == "object") {
          const c = r.audioUrl, l = r.wavFilePath;
          l ? r.audioUrl = `echo-media://${l}` : c && c.startsWith("data:") && c.length > 5e4 && (r.audioUrl = "");
        }
      } catch {
        r = void 0;
      }
    const n = e.conversation ? {
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
      rounds: Array.isArray(e.conversation.rounds) ? e.conversation.rounds.map((c) => ({
        id: c.id,
        roundOrder: c.roundOrder,
        voiceId: c.voiceId,
        text: c.text,
        speed: c.speed,
        emotion: c.emotion,
        pace: c.pace,
        prompt: c.prompt,
        description: c.description,
        referenceAudioSrc: c.referenceAudioSrc,
        speakerName: c.speakerName,
        speakerColor: c.speakerColor
      })) : []
    } : e.type === "tts" && r ? {
      id: e.originId || e.id.replace(/^act-/, ""),
      text: e.description || r.text || e.title,
      previewSnippet: r.previewSnippet || e.description || e.title,
      voiceName: r.voiceName || e.subCategory || "Speech Synthesis",
      voiceColor: r.voiceColor || "#38bdf8",
      voiceAvatarUrl: r.voiceAvatarUrl || "/voices/sterling.jpg",
      model: r.model || "cosyvoice-v1",
      engine: r.engine || "cosyvoice3",
      duration: r.duration || "Audio",
      durationSec: r.durationSec || 0,
      emotion: r.emotion || void 0,
      audioUrl: r.audioUrl || void 0,
      waveform: Array.isArray(r.waveform) ? r.waveform : [],
      speakerCount: r.speakerCount || 1,
      rounds: Array.isArray(r.rounds) ? r.rounds : []
    } : void 0;
    let i;
    if (e.type === "music") {
      const c = e.originId || e.id.replace(/^act-music-/, "").replace(/^act-/, ""), l = (a = this.musicService) == null ? void 0 : a.getHistoryItem(c), u = (l == null ? void 0 : l.wavFilePath) || (r == null ? void 0 : r.wavFilePath);
      let d = u ? `echo-media://${u}` : (l == null ? void 0 : l.audioUrl) || (r == null ? void 0 : r.audioUrl);
      d && d.startsWith("data:") && d.length > 5e4 && (d = void 0), i = {
        id: c,
        taskId: (l == null ? void 0 : l.taskId) || (r == null ? void 0 : r.taskId) || void 0,
        title: e.title,
        caption: (l == null ? void 0 : l.caption) || (r == null ? void 0 : r.caption) || e.title,
        lyrics: (l == null ? void 0 : l.lyrics) || (r == null ? void 0 : r.lyrics) || void 0,
        audioUrl: d,
        wavFilePath: u || void 0,
        duration: (r == null ? void 0 : r.duration) || (l != null && l.durationMs ? `${Math.round(l.durationMs / 1e3)}s` : "Audio"),
        durationMs: (l == null ? void 0 : l.durationMs) || (r == null ? void 0 : r.durationMs) || void 0,
        waveform: (l == null ? void 0 : l.waveform) || (r == null ? void 0 : r.waveform) || [],
        bpm: (l == null ? void 0 : l.bpm) || (r == null ? void 0 : r.bpm) || void 0,
        keyscale: (l == null ? void 0 : l.keyscale) || (r == null ? void 0 : r.keyscale) || void 0,
        timesignature: (l == null ? void 0 : l.timesignature) || (r == null ? void 0 : r.timesignature) || void 0,
        vocalLanguage: (l == null ? void 0 : l.vocalLanguage) || (r == null ? void 0 : r.vocalLanguage) || void 0,
        seed: (l == null ? void 0 : l.seed) || (r == null ? void 0 : r.seed) || void 0,
        taskType: (l == null ? void 0 : l.taskType) || (r == null ? void 0 : r.taskType) || void 0,
        lrc: (l == null ? void 0 : l.lrc) || (r == null ? void 0 : r.lrc) || void 0,
        qualityScore: (l == null ? void 0 : l.qualityScore) || (r == null ? void 0 : r.qualityScore) || void 0,
        engine: (r == null ? void 0 : r.engine) || "acestep",
        cover: (r == null ? void 0 : r.cover) || "/covers/got/direwolf.jpg",
        createdAt: (l == null ? void 0 : l.createdAt) || (e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt)
      };
    }
    let s;
    (e.type === "story" || e.type === "stories") && (s = {
      id: e.originId || e.id.replace(/^act-story-/, "").replace(/^act-/, ""),
      title: e.title,
      subtitle: (r == null ? void 0 : r.subtitle) || e.description || void 0,
      narrator: (r == null ? void 0 : r.narrator) || e.subCategory || "Narrator",
      duration: (r == null ? void 0 : r.duration) || "Story",
      audioUrl: (r == null ? void 0 : r.audioUrl) || void 0,
      cover: (r == null ? void 0 : r.cover) || "/covers/got/winterfell.jpg",
      text: e.description || (r == null ? void 0 : r.text) || void 0,
      chapters: Array.isArray(r == null ? void 0 : r.chapters) ? r.chapters : [],
      model: (r == null ? void 0 : r.model) || void 0,
      engine: (r == null ? void 0 : r.engine) || void 0,
      characterVoices: Array.isArray(r == null ? void 0 : r.characterVoices) ? r.characterVoices : void 0,
      backgroundMusicUrl: (r == null ? void 0 : r.backgroundMusicUrl) || void 0,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt
    });
    const o = n || i || s || (r ? { ...r } : void 0);
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
      metadata: r,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
      // Related origin data returned when fetching activities
      data: o,
      origin: o,
      tts: n,
      music: i,
      story: s
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
      }), r = /* @__PURE__ */ new Set();
      for (const i of e) {
        const s = i;
        s.conversationId && r.add(s.conversationId), s.originId && r.add(s.originId);
      }
      const n = await this.db.client.conversation.findMany({
        where: r.size > 0 ? {
          id: {
            notIn: Array.from(r)
          }
        } : void 0,
        include: {
          rounds: {
            orderBy: { roundOrder: "asc" }
          }
        }
      });
      for (const i of n) {
        const o = (i.previewSnippet || i.text || "").replace(/\s+/g, " ").trim(), a = o ? o.length > 55 ? `${o.slice(0, 52)}...` : o : `${i.voiceName || "Speech Synthesis"} Turn`;
        let c = a, l = 1;
        for (; await this.db.client.activity.findUnique({ where: { title: c } }); )
          l++, c = `${a} #${l}`;
        const u = JSON.stringify({
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
            title: c,
            category: "Text to Speech",
            subCategory: i.speakerCount > 1 ? `${i.speakerCount} Speakers Diarized` : i.voiceName,
            description: o ? o.slice(0, 160) : null,
            originId: i.id,
            originType: "conversation",
            conversationId: i.id,
            metadata: u
          }
        });
      }
      if (this.musicService) {
        const i = this.musicService.listHistory();
        for (const s of i) {
          const o = `act-music-${s.id}`;
          if (!await this.db.client.activity.findFirst({
            where: {
              OR: [{ id: o }, { originId: s.id }]
            }
          })) {
            const c = s.caption || "Music Track", l = c.length > 50 ? `${c.slice(0, 47)}...` : c;
            let u = l, d = 1;
            for (; await this.db.client.activity.findUnique({ where: { title: u } }); )
              d++, u = `${l} #${d}`;
            const h = s.wavFilePath ? `echo-media://${s.wavFilePath}` : s.audioUrl && s.audioUrl.length > 5e4 ? "" : s.audioUrl;
            await this.db.client.activity.create({
              data: {
                id: o,
                type: "music",
                title: u,
                description: s.lyrics ? s.lyrics.slice(0, 160) : s.caption,
                category: "Music Generation",
                subCategory: "AudioGen",
                originId: s.id,
                originType: "music",
                metadata: JSON.stringify({
                  taskId: s.taskId,
                  caption: s.caption,
                  lyrics: s.lyrics,
                  audioUrl: h,
                  wavFilePath: s.wavFilePath,
                  durationMs: s.durationMs,
                  duration: s.durationMs ? `${Math.round(s.durationMs / 1e3)}s` : "Audio",
                  waveform: s.waveform || [],
                  bpm: s.bpm,
                  keyscale: s.keyscale,
                  timesignature: s.timesignature,
                  vocalLanguage: s.vocalLanguage
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
      })).map((r) => this.formatActivityRecord(r));
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
      const r = await this.db.client.activity.findUnique({
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
      return r ? this.formatActivityRecord(r) : null;
    } catch (r) {
      return console.error("[ActivityRepositoryService] Failed to find activity by ID:", r), null;
    }
  }
  /**
   * Find an activity by origin ID (e.g. conversationId) including related origin data
   */
  async getActivityByOrigin(e) {
    await this.db.init();
    try {
      const r = await this.db.client.activity.findFirst({
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
      return r ? this.formatActivityRecord(r) : null;
    } catch (r) {
      return console.error("[ActivityRepositoryService] Failed to find activity by origin:", r), null;
    }
  }
  /**
   * Save or update an activity in SQLite
   */
  async saveActivity(e) {
    await this.db.init();
    try {
      const r = e.metadata ? typeof e.metadata == "string" ? e.metadata : JSON.stringify(e.metadata) : null;
      let n = e.title.trim(), i = 1, s = !1;
      for (; !s; ) {
        const c = await this.db.client.activity.findUnique({
          where: { title: n }
        });
        !c || c.id === e.id ? s = !0 : (i++, n = `${e.title.trim()} #${i}`);
      }
      const o = e.category || (e.type === "music" ? "Music Generation" : "Text to Speech"), a = await this.db.client.activity.upsert({
        where: { id: e.id },
        update: {
          type: e.type,
          title: n,
          description: e.description || null,
          category: o,
          subCategory: e.subCategory || null,
          originId: e.originId || e.conversationId || null,
          originType: e.originType || (e.conversationId ? "conversation" : e.type),
          conversationId: e.conversationId || null,
          metadata: r
        },
        create: {
          id: e.id,
          type: e.type,
          title: n,
          description: e.description || null,
          category: o,
          subCategory: e.subCategory || null,
          originId: e.originId || e.conversationId || null,
          originType: e.originType || (e.conversationId ? "conversation" : e.type),
          conversationId: e.conversationId || null,
          metadata: r
        }
      });
      return { success: !0, data: this.formatActivityRecord(a) };
    } catch (r) {
      return console.error("[ActivityRepositoryService] Failed to save activity:", r), { success: !1, error: r instanceof Error ? r.message : String(r) };
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
    } catch (r) {
      return console.error("[ActivityRepositoryService] Failed to delete activity:", r), { success: !1, error: r instanceof Error ? r.message : String(r) };
    }
  }
}
class Fd extends Le {
  constructor(e) {
    super(), this.activityRepo = e;
  }
  init() {
    z.handle($.ACTIVITY_LIST, async () => {
      try {
        return { success: !0, data: await this.activityRepo.listActivities() };
      } catch (e) {
        return { success: !1, error: e instanceof Error ? e.message : String(e) };
      }
    }), z.handle($.ACTIVITY_GET, async (e, r) => {
      try {
        const n = typeof r == "string" ? r : r.id;
        return { success: !0, data: await this.activityRepo.getActivityById(n) };
      } catch (n) {
        return { success: !1, error: n instanceof Error ? n.message : String(n) };
      }
    }), z.handle(
      $.ACTIVITY_GET_BY_ORIGIN,
      async (e, r) => {
        try {
          const n = typeof r == "string" ? r : r.originId;
          return { success: !0, data: await this.activityRepo.getActivityByOrigin(n) };
        } catch (n) {
          return { success: !1, error: n instanceof Error ? n.message : String(n) };
        }
      }
    ), z.handle($.ACTIVITY_SAVE, async (e, r) => {
      try {
        return await this.activityRepo.saveActivity(r);
      } catch (n) {
        return { success: !1, error: n instanceof Error ? n.message : String(n) };
      }
    }), z.handle($.ACTIVITY_DELETE, async (e, r) => {
      try {
        const n = typeof r == "string" ? r : r.id;
        return await this.activityRepo.deleteActivity(n);
      } catch (n) {
        return { success: !1, error: n instanceof Error ? n.message : String(n) };
      }
    });
  }
}
const jd = Zi(import.meta.url), { PrismaClient: Bd } = jd("@prisma/client");
class Gd {
  constructor() {
    b(this, "prisma");
    b(this, "initialized", !1);
    b(this, "initPromise", null);
    const r = (Y ? Y.isPackaged : !1) ? Y.getPath("userData") : E.join(process.cwd(), "prisma");
    y.existsSync(r) || y.mkdirSync(r, { recursive: !0 });
    const n = E.join(r, "echo.db"), i = `file:${n}`;
    process.env.DATABASE_URL = i, console.log(`[DatabaseService] SQLite DB initialized at: ${n}`), this.prisma = new Bd({
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
function Vd() {
  const t = new Gd(), e = new qi(), r = new ir(), n = new us(), i = new xd(), s = new Qi(t), o = new as(t), a = new Ud(t, n), c = new Ji(s), l = new os(r, o), u = [
    new Yi(e),
    new Hi(r),
    new Ki(c),
    new cs(l),
    new ds(n, a),
    new zd(i),
    new Fd(a)
  ];
  for (const d of u)
    d.init();
  return {
    systemService: e,
    modelsService: r,
    voiceService: c,
    ttsService: l,
    musicService: n,
    storyService: i,
    activityRepository: a,
    dbService: t,
    controllers: u
  };
}
yn.registerSchemesAsPrivileged([
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
const Ti = E.dirname(Li(import.meta.url));
process.env.APP_ROOT = E.join(Ti, "..");
const nr = process.env.VITE_DEV_SERVER_URL, rh = E.join(process.env.APP_ROOT, "dist-electron"), Ci = E.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = nr ? E.join(process.env.APP_ROOT, "public") : Ci;
const nh = Vd();
let de = null;
function Ai() {
  de = new vn({
    icon: E.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: E.join(Ti, "preload.mjs")
    }
  }), de.webContents.on("console-message", (t, ...e) => {
    if (typeof t == "object" && t !== null && "message" in t) {
      const r = t.sourceId ? E.basename(t.sourceId) : "renderer";
      console.log(`[Renderer ${r}:${t.lineNumber}] ${t.message}`);
    } else {
      const [r, n, i, s] = e, o = s ? E.basename(s) : "renderer";
      console.log(`[Renderer ${o}:${i}] ${n}`);
    }
  }), de.webContents.on("render-process-gone", (t, e) => {
    console.error("[Renderer Crashed]:", e);
  }), de.webContents.on("did-finish-load", () => {
    de == null || de.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), nr ? de.loadURL(nr) : de.loadFile(E.join(Ci, "index.html"));
}
Y.on("window-all-closed", () => {
  process.platform !== "darwin" && (Y.quit(), de = null);
});
Y.on("activate", () => {
  vn.getAllWindows().length === 0 && Ai();
});
Y.whenReady().then(() => {
  yn.handle("echo-media", async (t) => {
    try {
      const e = t.url.replace(/^echo-media:\/\//, "");
      let r = decodeURIComponent(e.startsWith("/") ? e : "/" + e);
      if (process.platform === "win32" && r.startsWith("/") && (r = r.slice(1)), !y.existsSync(r))
        return new Response("Media not found", { status: 404 });
      const n = y.statSync(r).size, i = r.endsWith(".mp3") ? "audio/mpeg" : r.endsWith(".wav") ? "audio/wav" : "application/octet-stream", s = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Accept-Ranges": "bytes",
        "Content-Type": i
      }), o = t.headers.get("range"), a = o ? /bytes=(\d*)-(\d*)/.exec(o) : null;
      let c = 0, l = n - 1, u = 200;
      if (a && (a[1] !== "" || a[2] !== "")) {
        if (a[1] === "" ? c = Math.max(0, n - parseInt(a[2], 10)) : (c = parseInt(a[1], 10), a[2] !== "" && (l = Math.min(l, parseInt(a[2], 10)))), c >= n || c > l)
          return s.set("Content-Range", `bytes */${n}`), new Response(null, { status: 416, headers: s });
        u = 206, s.set("Content-Range", `bytes ${c}-${l}/${n}`);
      }
      if (s.set("Content-Length", String(l - c + 1)), t.method === "HEAD")
        return new Response(null, { status: u, headers: s });
      const d = xi.toWeb(
        y.createReadStream(r, { start: c, end: l })
      );
      return new Response(d, { status: u, headers: s });
    } catch (e) {
      return console.error("[echo-media protocol] Error loading media:", e), new Response("Error loading media", { status: 500 });
    }
  }), Ai();
});
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  rh as MAIN_DIST,
  Ci as RENDERER_DIST,
  nr as VITE_DEV_SERVER_URL,
  nh as core
};
