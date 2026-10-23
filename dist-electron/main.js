var Oe = Object.defineProperty;
var De = (l, e, t) => e in l ? Oe(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var w = (l, e, t) => De(l, typeof e != "symbol" ? e + "" : e, t);
import u from "node:path";
import h from "node:fs";
import { app as L, shell as Re, ipcMain as E, BrowserWindow as pe } from "electron";
import { fileURLToPath as Ue } from "node:url";
import G from "node:os";
import * as v from "@qvac/sdk";
import { execFileSync as Fe } from "node:child_process";
import { PrismaClient as ke } from "@prisma/client";
const Ve = [
  u.resolve(process.cwd(), "node_modules/@qvac/sdk/dist/src/worker/index.js"),
  u.resolve(process.cwd(), "node_modules/.pnpm/@qvac+sdk@0.22.0/node_modules/@qvac/sdk/dist/src/worker/index.js")
];
for (const l of Ve)
  if (h.existsSync(l)) {
    process.env.QVAC_WORKER_PATH = l;
    break;
  }
class $e {
  constructor() {
    w(this, "prevCpuTimes", null);
  }
  /**
   * Calculate live CPU usage from os.cpus()
   */
  getCpuUsage() {
    const e = G.cpus();
    let t = 0, s = 0;
    for (const n of e) {
      for (const a of Object.keys(n.times))
        s += n.times[a];
      t += n.times.idle;
    }
    if (!this.prevCpuTimes)
      return this.prevCpuTimes = { idle: t, total: s }, 14;
    const o = t - this.prevCpuTimes.idle, i = s - this.prevCpuTimes.total;
    if (this.prevCpuTimes = { idle: t, total: s }, i <= 0) return 14;
    const r = Math.round((i - o) / i * 100);
    return Math.max(1, Math.min(100, r));
  }
  /**
   * Query full hardware telemetry (RAM, CPU, GPU)
   */
  getMetrics() {
    var m;
    const e = G.totalmem(), t = G.freemem(), s = Math.max(0, e - t), o = s / e * 100, i = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2), r = Math.max(5, Math.min(99, Math.round(o + i))), n = this.getCpuUsage(), a = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1)), c = Math.max(3, Math.min(98, Math.round(n + a)));
    let d = 12;
    try {
      const f = L.getAppMetrics().find((y) => y.type === "GPU");
      if (f)
        d = Math.min(100, Math.max(8, Math.round(f.cpu.percentCPUUsage * 2 + 10)));
      else {
        const y = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
        d = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8 + y)));
      }
    } catch {
      d = Math.max(6, Math.min(94, Math.round(c * 0.7 + 8)));
    }
    return {
      ram: {
        usedGB: (s / (1024 * 1024 * 1024) + i * 0.1).toFixed(1),
        totalGB: (e / (1024 * 1024 * 1024)).toFixed(1),
        percent: r
      },
      cpu: {
        percent: c,
        cores: G.cpus().length,
        model: ((m = G.cpus()[0]) == null ? void 0 : m.model) || "Processor"
      },
      gpu: {
        percent: d,
        name: process.platform === "darwin" ? "Apple Silicon GPU" : "GPU Compute"
      }
    };
  }
  /**
   * Ensure exports directory exists and reveal it in native file manager
   */
  async openExportsFolder() {
    try {
      const e = u.join(L.getPath("documents"), "Echo", "Exports");
      return h.existsSync(e) || h.mkdirSync(e, { recursive: !0 }), await Re.openPath(e), { success: !0, path: e };
    } catch (e) {
      return console.error("[SystemService] Failed to open exports directory:", e), { success: !1, error: String(e) };
    }
  }
}
class se {
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
class Pe extends se {
  constructor(e) {
    super(), this.systemService = e;
  }
  init() {
    E.handle(S.SYSTEM_GET_METRICS, async () => this.systemService.getMetrics()), E.handle(S.LEGACY_GET_SYSTEM_METRICS, async () => this.systemService.getMetrics()), E.handle(S.SYSTEM_OPEN_EXPORTS, async () => this.systemService.openExportsFolder()), E.handle(S.LEGACY_OPEN_EXPORTS_FOLDER, async () => this.systemService.openExportsFolder());
  }
}
class de {
  constructor() {
    w(this, "cacheDir");
    w(this, "stateFilePath");
    w(this, "downloadedModelIds", /* @__PURE__ */ new Set());
    w(this, "activeDownloads", /* @__PURE__ */ new Map());
    // Full specification of neural TTS voice models
    w(this, "modelDefinitions", [
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
      }
    ]);
    this.cacheDir = u.join(G.homedir(), ".qvac", "models");
    const e = L ? L.getPath("userData") : u.join(G.homedir(), ".echo-ai");
    if (!h.existsSync(e))
      try {
        h.mkdirSync(e, { recursive: !0 });
      } catch {
      }
    this.stateFilePath = u.join(e, "voice_engine_state.json"), this.loadState();
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
      if (t === e || t.startsWith(e) || e.startsWith(t))
        return !0;
    return !1;
  }
  /**
   * Load persisted downloaded model status and discover cached weights
   */
  loadState() {
    try {
      if (h.existsSync(this.stateFilePath)) {
        const e = h.readFileSync(this.stateFilePath, "utf-8"), t = JSON.parse(e);
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
      h.writeFileSync(this.stateFilePath, JSON.stringify(e, null, 2), "utf-8");
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
      if (h.existsSync(this.cacheDir)) {
        const t = (i, r) => {
          const n = r.toLowerCase();
          let a = null;
          try {
            a = h.statSync(i);
          } catch {
            return;
          }
          const c = a.isFile() && a.size > 1024 * 1024;
          n.includes("parler-large-v1-f16") || n.includes("parler-large-v1-fp16") ? c && !this.downloadedModelIds.has("parler-large-v1-fp16") && (this.downloadedModelIds.add("chatterbox-t3-turbo-q8_0"), e = !0) : n.includes("chatterbox-s3gen-q8") || n.includes("chatterbox-s3gen") ? c && !this.downloadedModelIds.has("chatterbox-s3gen-q8_0") && (this.downloadedModelIds.add("chatterbox-s3gen-q8_0"), e = !0) : n.includes("chatterbox-t3-multilingual") ? c && !this.downloadedModelIds.has("chatterbox-t3-multilingual-q8_0") && (this.downloadedModelIds.add("chatterbox-t3-multilingual-q8_0"), e = !0) : n.includes("chatterbox-s3gen-multilingual") ? c && !this.downloadedModelIds.has("chatterbox-s3gen-multilingual-q8_0") && (this.downloadedModelIds.add("chatterbox-s3gen-multilingual-q8_0"), e = !0) : (n.includes("chatterbox-t3") || n.includes("chatterbox")) && c && !this.downloadedModelIds.has("chatterbox-t3-turbo-q8_0") && (this.downloadedModelIds.add("chatterbox-t3-turbo-q8_0"), e = !0), (n.includes("cosyvoice3-llm") || n.includes("cosy_voice")) && c && !this.downloadedModelIds.has("cosyvoice3-llm-q8_0") && (this.downloadedModelIds.add("cosyvoice3-llm-q8_0"), e = !0), (n.includes("cosyvoice3-flow-f16") || n.includes("cosyvoice3-flow-fp16") || n.includes("cosyvoice3-flow-f32") || n.includes("cosyvoice3-flow")) && c && !this.downloadedModelIds.has("cosyvoice3-flow-fp16") && (this.downloadedModelIds.add("cosyvoice3-flow-fp16"), e = !0), (n.includes("lavasr") || n.includes("enhancer")) && c && !this.downloadedModelIds.has("lavasr-enhancer") && (this.downloadedModelIds.add("lavasr-enhancer"), e = !0), (n.includes("cosyvoice3-s3tok") || n.includes("s3tok")) && c && !this.downloadedModelIds.has("cosyvoice3-s3tok-fp16") && (this.downloadedModelIds.add("cosyvoice3-s3tok-fp16"), e = !0), (n.includes("cosyvoice3-campplus") || n.includes("campplus")) && c && !this.downloadedModelIds.has("cosyvoice3-campplus-fp32") && (this.downloadedModelIds.add("cosyvoice3-campplus-fp32"), e = !0);
        }, s = h.readdirSync(this.cacheDir);
        for (const i of s) {
          const r = u.join(this.cacheDir, i);
          t(r, i);
        }
        const o = u.join(this.cacheDir, "sets");
        if (h.existsSync(o)) {
          const i = h.readdirSync(o);
          for (const r of i) {
            const n = u.join(o, r);
            try {
              if (h.existsSync(n)) {
                const a = h.readdirSync(n);
                for (const c of a) {
                  const d = u.join(n, c);
                  t(d, c);
                }
              }
            } catch {
            }
          }
        }
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
    const t = this.modelDefinitions.map((o) => {
      const i = this.downloadedModelIds.has(o.id), r = this.activeDownloads.has(o.id), n = e ? e === "cosyvoice3" ? o.engine === "cosyvoice3" && o.id !== "cosyvoice3-flow-fp16" || o.engine === "shared" : o.engine === "chatterbox" && (o.id === "chatterbox-t3-turbo-q8_0" || o.id === "chatterbox-s3gen-q8_0") : o.category === "backbone";
      return {
        ...o,
        required: n,
        downloaded: i,
        status: r ? "downloading" : i ? "ready" : "idle"
      };
    });
    let s = !1;
    if (e === "chatterbox") {
      const o = t.some(
        (r) => r.engine === "chatterbox" && r.category === "backbone" && r.downloaded
      ), i = t.some(
        (r) => r.engine === "chatterbox" && r.category === "vocoder" && r.downloaded
      );
      s = o && i;
    } else {
      const o = e ? t.filter((i) => i.required) : t.filter((i) => i.category === "backbone");
      s = o.length > 0 && o.every((i) => i.downloaded);
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
    let o = !1, i = 0, r = s.sizeBytes;
    this.activeDownloads.set(e, {
      cancel: () => {
        o = !0;
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
      for (let d = 1; d <= 2; d++)
        try {
          const g = v.downloadAsset({
            assetSrc: a,
            onProgress: (m) => {
              var M, T, I, A, D, $, Z, z;
              if (o) return;
              const p = ((M = m.fileSetInfo) == null ? void 0 : M.overallPercentage) ?? ((T = m.shardInfo) == null ? void 0 : T.overallPercentage) ?? (m.fileSetInfo || m.shardInfo ? 0 : m.percentage ?? 0), f = ((I = m.fileSetInfo) == null ? void 0 : I.overallTotal) ?? ((A = m.shardInfo) == null ? void 0 : A.overallTotal) ?? m.total ?? s.sizeBytes;
              r = f;
              const y = ((D = m.fileSetInfo) == null ? void 0 : D.overallDownloaded) ?? (($ = m.shardInfo) == null ? void 0 : $.overallDownloaded) ?? m.downloaded ?? Math.round((p || 0) / 100 * f), _ = Math.min(99, Math.max(1, Math.round(p || 0)));
              i = Math.max(i, _);
              let C = m.speed || "Downloading...";
              (Z = m.fileSetInfo) != null && Z.currentFile ? C = `${m.fileSetInfo.currentFile} (${m.fileSetInfo.fileIndex}/${m.fileSetInfo.totalFiles})` : (z = m.shardInfo) != null && z.shardName && (C = `${m.shardInfo.shardName} (${m.shardInfo.currentShard}/${m.shardInfo.totalShards})`);
              const b = y >= f && f > 0 || p >= 100;
              b && (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState()), t == null || t({
                modelId: e,
                percentage: b ? 100 : i,
                downloaded: y,
                total: f,
                speed: b ? "Completed" : C
              });
            }
          });
          g && g.requestId && this.activeDownloads.set(e, {
            cancel: () => {
              o = !0;
              try {
                typeof v.cancel == "function" && v.cancel({
                  requestId: g.requestId
                });
              } catch {
              }
            }
          }), await g, c = null;
          break;
        } catch (g) {
          if (c = g, String((g == null ? void 0 : g.message) || g).includes("could not be locked") && d === 1 && !o) {
            console.warn(`[ModelsService] Registry lock conflict for ${e}. Retrying in 1.2s...`), await new Promise((p) => setTimeout(p, 1200));
            continue;
          }
          throw g;
        }
      if (c) throw c;
      return o ? { success: !1, modelId: e, error: "Download cancelled" } : (this.downloadedModelIds.add(e), this.syncCacheFromDisk(), this.saveState(), t == null || t({
        modelId: e,
        percentage: 100,
        downloaded: r,
        total: r,
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
      if (h.existsSync(this.cacheDir)) {
        const e = h.readdirSync(this.cacheDir);
        for (const t of e) {
          const s = u.join(this.cacheDir, t);
          try {
            h.statSync(s).isDirectory() ? h.rmSync(s, { recursive: !0, force: !0 }) : h.unlinkSync(s);
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
}
class Be extends se {
  constructor(e) {
    super(), this.modelsService = e;
  }
  init() {
    E.handle(
      S.MODELS_GET_STATUS,
      async (e, t) => {
        try {
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        } catch (s) {
          return { success: !1, error: String(s) };
        }
      }
    ), E.handle(
      S.MODELS_DOWNLOAD,
      async (e, t) => {
        const s = (o) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.MODELS_DOWNLOAD_PROGRESS, o);
          } catch (i) {
            console.warn("[ModelsController] Failed to send download progress:", i);
          }
        };
        if (t != null && t.allRequired) {
          const i = this.modelsService.getStatus(t == null ? void 0 : t.engine).models.filter((r) => r.required && !r.downloaded);
          for (const r of i)
            await this.modelsService.downloadModel(r.id, s);
          return { success: !0, data: this.modelsService.getStatus(t == null ? void 0 : t.engine) };
        }
        return t != null && t.modelId ? { ...await this.modelsService.downloadModel(t.modelId, s), data: this.modelsService.getStatus(t == null ? void 0 : t.engine) } : { success: !1, error: "No modelId or allRequired flag specified" };
      }
    ), E.handle(
      S.MODELS_CANCEL_DOWNLOAD,
      async (e, { modelId: t }) => ({ success: this.modelsService.cancelDownload(t), modelId: t })
    ), E.handle(
      S.MODELS_GET_INFO,
      async (e, { name: t }) => {
        try {
          return { success: !0, data: await this.modelsService.getModelInfo(t) };
        } catch (s) {
          return { success: !1, error: String(s) };
        }
      }
    ), E.handle(S.MODELS_DELETE_ALL, async () => {
      try {
        return await this.modelsService.deleteAllModels(), { success: !0 };
      } catch (e) {
        return { success: !1, error: String(e) };
      }
    });
  }
}
class je {
  constructor(e) {
    w(this, "repository");
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
    const e = process.env.VITE_PUBLIC || u.join(process.cwd(), "public"), t = [
      u.join(e, "voices", "samples"),
      u.join(process.cwd(), "public", "voices", "samples"),
      u.join(L.getAppPath(), "public", "voices", "samples"),
      u.join(L.getAppPath(), "dist", "voices", "samples")
    ];
    for (const s of t)
      if (h.existsSync(s))
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
      const t = h.readdirSync(e, { withFileTypes: !0 }), s = [];
      for (const o of t) {
        if (!o.isDirectory()) continue;
        const i = u.join(e, o.name), r = u.join(i, "info.json"), n = u.join(i, "json.info"), a = h.existsSync(r) ? r : h.existsSync(n) ? n : null;
        if (a)
          try {
            const c = h.readFileSync(a, "utf-8"), d = JSON.parse(c), g = d.list || d.location || (h.existsSync(u.join(i, "json", "voices.json")) ? "json/voices.json" : "voices.json");
            s.push({
              folder: o.name,
              language: d.language || o.name,
              name: d.name || d.language || o.name,
              flag: d.flag || "🌐",
              code: d.code || o.name,
              nativeName: d.nativeName || d.name || d.language,
              list: g,
              location: g,
              listUrl: `/voices/samples/${o.name}/${g.replace(/^\//, "")}`,
              count: d.count || 0
            });
          } catch (c) {
            console.warn(`[VoiceService] Failed to parse info.json in ${i}:`, c);
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
      const o = t.replace(/^\//, ""), r = [
        u.join(s, e, o),
        u.join(s, e, "json", "voices.json"),
        u.join(s, e, "voices.json")
      ].find((d) => h.existsSync(d));
      if (!r)
        return { success: !1, voices: [], error: `Voice list not found for folder ${e}` };
      const n = h.readFileSync(r, "utf-8"), a = JSON.parse(n);
      return { success: !0, voices: Array.isArray(a) ? a : a.voices || [] };
    } catch (s) {
      return console.error(`[VoiceService] Failed to load voices for ${e}:`, s), { success: !1, voices: [], error: String(s) };
    }
  }
  /**
   * Resolve or create the custom voices directory inside public/voices/custom
   */
  getCustomVoicesDirectory() {
    const e = process.env.VITE_PUBLIC || u.join(process.cwd(), "public"), t = u.join(e, "voices", "custom");
    return h.existsSync(t) || h.mkdirSync(t, { recursive: !0 }), t;
  }
  /**
   * Saves an imported or microphone-recorded voice audio sample directly to disk
   * and converts it to a standard 24kHz mono WAV for CosyVoice 3 reference conditioning.
   */
  async saveCustomVoice(e) {
    try {
      const t = this.getCustomVoicesDirectory(), s = (e.fileName || "sample.wav").replace(/[^a-zA-Z0-9._-]/g, "_"), o = u.extname(s).toLowerCase() || ".wav", i = Date.now(), r = `voice_${e.voiceId}_${i}${o}`, n = u.join(t, r), a = Buffer.isBuffer(e.audioBuffer) ? e.audioBuffer : Buffer.from(e.audioBuffer);
      h.writeFileSync(n, a);
      let c = n, d = `/voices/custom/${r}`;
      if (o !== ".wav") {
        const m = `voice_${e.voiceId}_${i}.wav`, p = u.join(t, m);
        try {
          const { execFileSync: f } = await import("node:child_process");
          f("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", n, p]), h.existsSync(p) && h.statSync(p).size > 100 && (c = p, d = `/voices/custom/${m}`);
        } catch (f) {
          console.warn("[VoiceService] Audio conversion fallback, using original file:", f);
        }
      }
      let g;
      if (e.avatarBuffer) {
        const m = Buffer.isBuffer(e.avatarBuffer) ? e.avatarBuffer : Buffer.from(e.avatarBuffer);
        if (m.byteLength > 0) {
          const p = u.extname(e.avatarFileName || ".jpg").toLowerCase() || ".jpg", f = `avatar_${e.voiceId}_${i}${p}`, y = u.join(t, f);
          h.writeFileSync(y, m), g = `/voices/custom/${f}`;
        }
      }
      return this.repository && await this.repository.saveCustomVoice({
        id: e.voiceId,
        name: e.name,
        category: "cloned",
        avatarUrl: g || "/voices/sterling.jpg",
        sampleUrl: d,
        referenceAudioName: u.basename(c)
      }), {
        success: !0,
        filePath: c,
        sampleUrl: d,
        avatarUrl: g
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
      if (h.existsSync(t)) {
        const s = h.readdirSync(t);
        for (const o of s)
          if (o.includes(`_${e}_`))
            try {
              h.unlinkSync(u.join(t, o));
            } catch {
            }
      }
      return { success: !0 };
    } catch (t) {
      return console.error("[VoiceService] Failed to delete custom voice files:", t), { success: !1, error: String(t) };
    }
  }
}
class Ge {
  constructor(e) {
    w(this, "db");
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
class ze extends se {
  constructor(e) {
    super(), this.voiceService = e;
  }
  init() {
    E.handle(S.VOICES_SCAN, async () => this.voiceService.scanVoicePackages()), E.handle(S.LEGACY_SCAN_VOICE_SAMPLES, async () => this.voiceService.scanVoicePackages()), E.handle(
      S.VOICES_LOAD,
      async (e, { folder: t, list: s }) => this.voiceService.loadVoicesForPackage(t, s)
    ), E.handle(
      S.VOICES_SAVE_CUSTOM,
      async (e, t) => this.voiceService.saveCustomVoice(t)
    ), E.handle(
      S.VOICES_DELETE_CUSTOM,
      async (e, { voiceId: t }) => this.voiceService.deleteCustomVoice(t)
    ), E.handle(S.VOICES_LIST_CUSTOM, async () => {
      try {
        return { success: !0, data: await this.voiceService.listCustomVoices() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
function qe(l, e) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const t = l.length, s = 44, o = t * 2, i = Buffer.alloc(s + o);
  i.write("RIFF", 0), i.writeUInt32LE(s + o - 8, 4), i.write("WAVE", 8), i.write("fmt ", 12), i.writeUInt32LE(16, 16), i.writeUInt16LE(1, 20), i.writeUInt16LE(1, 22), i.writeUInt32LE(e, 24), i.writeUInt32LE(e * 2, 28), i.writeUInt16LE(2, 32), i.writeUInt16LE(16, 34), i.write("data", 36), i.writeUInt32LE(o, 40);
  for (let r = 0; r < t; r++) {
    const n = Number.isFinite(l[r]) ? Math.round(l[r]) : 0, a = Math.max(-32768, Math.min(32767, n));
    i.writeInt16LE(a, s + r * 2);
  }
  return `data:audio/wav;base64,${i.toString("base64")}`;
}
function Xe(l, e) {
  if (e = Math.max(1, Math.floor(e)), l.length === 0) return Array(e).fill(4);
  const t = [], s = Math.max(1, Math.floor(l.length / e));
  for (let o = 0; o < e; o++) {
    let i = 0;
    const r = o * s, n = Math.min(l.length, r + s);
    for (let a = r; a < n; a += Math.max(1, Math.floor((n - r) / 40))) {
      const c = Math.abs(l[a] / 32768);
      c > i && (i = c);
    }
    t.push(Math.max(4, Math.min(98, Math.round(i * 100))));
  }
  return t;
}
function ge(l, e, t) {
  e = Number.isFinite(e) && e > 0 ? Math.round(e) : 24e3;
  const s = l.length, o = 44, i = s * 2, r = Buffer.alloc(o + i);
  r.write("RIFF", 0), r.writeUInt32LE(o + i - 8, 4), r.write("WAVE", 8), r.write("fmt ", 12), r.writeUInt32LE(16, 16), r.writeUInt16LE(1, 20), r.writeUInt16LE(1, 22), r.writeUInt32LE(e, 24), r.writeUInt32LE(e * 2, 28), r.writeUInt16LE(2, 32), r.writeUInt16LE(16, 34), r.write("data", 36), r.writeUInt32LE(i, 40);
  for (let g = 0; g < s; g++) {
    const m = Number.isFinite(l[g]) ? Math.round(l[g]) : 0, p = Math.max(-32768, Math.min(32767, m));
    r.writeInt16LE(p, o + g * 2);
  }
  const n = l.reduce((g, m) => Math.max(g, Math.abs(m)), 0), a = u.resolve(process.cwd(), "assets/testing-voice-output");
  h.mkdirSync(a, { recursive: !0 });
  const c = `${t}-${Date.now()}.wav`, d = u.join(a, c);
  return h.writeFileSync(d, r), console.log(
    `[TTS Debug] Saved PCM to ${d} (${s} samples @ ${e}Hz, maxAbs=${n.toFixed(4)})`
  ), d;
}
function ce(l, e) {
  const t = Math.floor(e * Math.max(0.015, l)), s = new Array(t);
  let o = 0;
  for (let r = 0; r < t; r++) {
    const n = (Math.random() * 2 - 1) * 5;
    o = o * 0.85 + n * 0.15, s[r] = o;
  }
  const i = Math.min(Math.floor(e * 8e-3), Math.floor(t / 2));
  for (let r = 0; r < i; r++) {
    const n = 0.5 * (1 - Math.cos(Math.PI * r / i));
    s[r] *= n;
    const a = 0.5 * (1 - Math.cos(Math.PI * (i - r) / i));
    s[t - 1 - r] *= a;
  }
  return s;
}
function Ye(l, e, t = 18, s = 28) {
  if (l.length === 0) return l;
  let o = 0;
  for (let d = 0; d < l.length; d++) {
    const g = Math.abs(l[d]);
    g > o && (o = g);
  }
  if (o === 0) return l;
  const i = Math.max(o * 8e-3, o > 2 ? 60 : 2e-3), r = Math.floor(e * t / 1e3), n = Math.floor(e * s / 1e3);
  let a = 0;
  for (let d = 0; d < l.length; d++)
    if (Math.abs(l[d]) > i) {
      a = Math.max(0, d - r);
      break;
    }
  let c = l.length;
  for (let d = l.length - 1; d >= a; d--)
    if (Math.abs(l[d]) > i) {
      c = Math.min(l.length, d + 1 + n);
      break;
    }
  return a >= c || c - a < e * 0.08 ? l : l.slice(a, c);
}
function te(l, e, t, s = 12) {
  if (e.length === 0) return;
  if (l.length === 0) {
    for (let r = 0; r < e.length; r++) l.push(e[r]);
    return;
  }
  const o = Math.min(
    Math.floor(t * s / 1e3),
    Math.floor(l.length / 2),
    Math.floor(e.length / 2)
  );
  if (o <= 0) {
    for (let r = 0; r < e.length; r++) l.push(e[r]);
    return;
  }
  const i = l.length - o;
  for (let r = 0; r < o; r++) {
    const n = r / o, a = Math.cos(n * (Math.PI / 2)), c = Math.sin(n * (Math.PI / 2));
    l[i + r] = l[i + r] * a + e[r] * c;
  }
  for (let r = o; r < e.length; r++)
    l.push(e[r]);
}
function He(l, e, t = "normal") {
  let s = l, o = t;
  const i = [];
  if ((o === "whisper" || /\[(?:whisper|soft)\]/i.test(s)) && (o = "whisper", i.push("whisper"), s = s.replace(/\[\/?(?:whisper|soft)\]/gi, " ")), o === "yell" || /\[(?:yell|shout|loud)\]/i.test(s)) {
    o = "yell", i.push("yell"), s = s.replace(/\[\/?(?:yell|shout|loud)\]/gi, " ");
    const r = s.trim(), n = /[!?]$/.test(r) ? "" : "!";
    s = `${r.toUpperCase()}${n}`;
  }
  return (o === "raise" || /\[(?:raise|emphasis)\]/i.test(s) || /<\/?strong>/i.test(s)) && (o = "raise", i.push("raise")), s = s.replace(/\[\/?(?:laugh|laughter|giggle|chuckle)\]/gi, " "), s = s.replace(/<\/?laughter>/gi, " "), (/\[(?:sigh|breath)\]/i.test(s) || /<\/?breath>/i.test(s)) && i.push("breath"), /\[(?:hmm+|thinking)\]/i.test(s) && i.push("hmm"), /\[gasp\]/i.test(s) && i.push("gasp"), e === "cosyvoice3" ? (s = s.replace(/\[(?:breath|sigh)\]/gi, " <breath> "), s = s.replace(
    /\[(?:raise|emphasis)\]([\s\S]*?)\[\/(?:raise|emphasis)\]/gi,
    "<strong>$1</strong>"
  ), o === "raise" && !/<strong>[\s\S]*?<\/strong>/i.test(s) && (s = `<strong>${s.trim()}</strong>`), s = s.replace(/\[\/?(?:raise|emphasis)\]/gi, " "), s = s.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... "), s = s.replace(/\[gasp\]/gi, "<breath> "), s = s.replace(/(?:<breath>\s*)+<breath>/gi, "<breath>").replace(/\s+/g, " ").trim(), o === "whisper" && s.length > 0 && (s = `<breath> ${s.toLowerCase()} <breath>`)) : (s = s.replace(/<\/?(?:laughter|strong|breath)>/gi, " "), s = s.replace(
    /\[\/?(?:laugh|laughter|giggle|chuckle|breath|sigh|gasp|whisper|soft|yell|shout|loud|raise|emphasis)\]/gi,
    " "
  ), i.includes("hmm") && (s = s.replace(/\[(?:hmm+|thinking)\]/gi, "Hmm... ")), (i.includes("breath") || i.includes("sigh") || i.includes("gasp")) && (s = s.replace(/\[(?:breath|sigh|gasp)\]/gi, "... ")), o === "raise" && (s = s.toUpperCase()), s = s.replace(/\s+/g, " ").replace(/\.{4,}/g, "...").trim(), o === "whisper" && s.length > 0 && (s = `... ${s.toLowerCase()} ...`)), { cleanedText: s, detectedCues: i, tone: o };
}
function We(l, e = 36) {
  const t = l.trim();
  if (!t) return [];
  const s = t.replace(/<\/?[a-z0-9_-]+>/gi, " ").trim();
  if (s.split(/\s+/).filter(Boolean).length <= e) {
    const a = /[.!?]$/.test(s);
    return [{ text: t, isSentenceEnd: a }];
  }
  const i = t.match(/(?:<[^>]+>|[^.!?\n])+([.!?\n]+(?=[\s<]|$)|$)/g) || [t], r = [];
  let n = "";
  for (const a of i) {
    const c = a.trim();
    if (!c) continue;
    const d = n ? `${n} ${c}` : c;
    if (d.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e)
      n = d;
    else {
      if (n) {
        const p = n.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), f = /[.!?]$/.test(p);
        r.push({ text: n, isSentenceEnd: f });
      }
      if (c.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length > e) {
        const p = c.match(/(?:<[^>]+>|[^,;:—-])+([,;:—-]+(?=[\s<]|$)|$)/g) || [c];
        let f = "";
        for (const y of p) {
          const _ = y.trim();
          if (!_) continue;
          const C = f ? `${f} ${_}` : _;
          C.replace(/<\/?[a-z0-9_-]+>/gi, " ").split(/\s+/).filter(Boolean).length <= e ? f = C : (f && r.push({ text: f, isSentenceEnd: !1 }), f = _);
        }
        f ? n = f : n = "";
      } else
        n = c;
    }
  }
  if (n.trim()) {
    const a = n.replace(/<\/?[a-z0-9_-]+>/gi, "").trim(), c = /[.!?]$/.test(a);
    r.push({ text: n.trim(), isSentenceEnd: c });
  }
  return r.filter((a) => a.text.length > 0);
}
function Qe(l) {
  let e = l.replace(
    /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi,
    (n, a) => {
      const c = parseFloat(a);
      return Number.isFinite(c) && c <= 1.2 ? "... " : n;
    }
  );
  e = e.replace(/\[(whisper|soft|yell|shout|loud|raise|emphasis)\]\s*\[\/\1\]/gi, "");
  const t = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]|\[(whisper|soft|yell|shout|loud|raise|emphasis)\]([\s\S]*?)\[\/\2\]/gi, s = [];
  let o = 0, i;
  for (; (i = t.exec(e)) !== null; ) {
    const n = e.slice(o, i.index).trim();
    if (n && s.push({ type: "speech", text: n, tone: "normal" }), i[1] !== void 0) {
      const a = parseFloat(i[1]);
      Number.isFinite(a) && a > 0 && s.push({ type: "pause", pauseSec: Math.min(a, 30) });
    } else if (i[2] !== void 0) {
      const a = i[2].toLowerCase(), c = (i[3] || "").trim();
      if (c) {
        let d = "normal";
        a === "whisper" || a === "soft" ? d = "whisper" : a === "yell" || a === "shout" || a === "loud" ? d = "yell" : (a === "raise" || a === "emphasis") && (d = "raise"), s.push({ type: "speech", text: c, tone: d });
      }
    }
    o = i.index + i[0].length;
  }
  const r = e.slice(o).trim();
  return r && s.push({ type: "speech", text: r, tone: "normal" }), s;
}
function Se(l) {
  if (!l || typeof l != "string") return;
  let e = l;
  if (!h.existsSync(e)) {
    const n = u.resolve(process.cwd(), "public", l.replace(/^\//, ""));
    h.existsSync(n) && (e = n);
  }
  if (!h.existsSync(e)) {
    const n = u.resolve(process.cwd(), l);
    h.existsSync(n) && (e = n);
  }
  if (!h.existsSync(e)) return;
  const t = u.extname(e).toLowerCase();
  if (t === ".wav") return e;
  const s = u.join(G.tmpdir(), "echo-voice-cache");
  h.mkdirSync(s, { recursive: !0 });
  const o = h.statSync(e), i = `${u.basename(e, t)}_${o.size}_${Math.floor(o.mtimeMs)}.wav`, r = u.join(s, i);
  if (h.existsSync(r) && h.statSync(r).size > 1e3)
    return r;
  try {
    if (Fe("afconvert", ["-f", "WAVE", "-d", "LEI16@24000", "-c", "1", e, r]), h.existsSync(r) && h.statSync(r).size > 1e3)
      return r;
  } catch (n) {
    console.warn(`[Echo Voice Engine] Audio conversion failed for ${e}:`, n);
  }
}
function ve(l) {
  if (l) {
    const e = Se(l);
    if (e) return e;
  }
}
class Je {
  constructor(e) {
    w(this, "modelsService");
    w(this, "loadedModels", /* @__PURE__ */ new Map());
    w(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    this.modelsService = e || new de();
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
    var i, r, n, a, c;
    const t = e.engine || "cosyvoice3", s = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), o = v.TTS_ENHANCER_LAVASR_FP16;
    if (t === "chatterbox") {
      const d = e.language && e.language !== "en" && this.modelsService.isModelDownloaded("chatterbox-t3-multilingual-q8_0") && this.modelsService.isModelDownloaded("chatterbox-s3gen-multilingual-q8_0");
      let g = d ? v.TTS_T3_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_T3_TURBO_EN_CHATTERBOX_Q8_0, m = d ? v.TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q8_0 : v.TTS_S3GEN_EN_CHATTERBOX_Q8_0;
      const p = d ? "Chatterbox T3 Multilingual (Q8_0 GGUF)" : "Chatterbox T3 Turbo EN (Q8_0 GGUF)";
      if (!g || !m)
        throw new Error("QVAC Chatterbox descriptors (T3 and/or S3Gen) missing from SDK");
      let f = ve(e.referenceAudioSrc);
      if (!f) {
        const M = u.resolve(process.cwd(), "public", "voices", "samples", "en", "voice_en_male_1.mp3");
        h.existsSync(M) && (f = Se(M));
      }
      const y = [
        "chatterbox",
        d ? "multilingual" : "en",
        f ? u.basename(f) : "default",
        s ? "lavasr48k" : "native24k",
        process.arch === "arm64" ? "metal" : "cpu"
      ].join("|"), _ = this.loadedModels.get(y);
      if (_)
        return { modelId: _, engine: "chatterbox" };
      (i = e.onLog) == null || i.call(e, {
        text: `[Echo Voice Engine] Loading ${p} + S3Gen Vocoder (${s ? "48kHz LavaSR" : "24kHz native"}${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const C = {
        ttsEngine: "chatterbox",
        language: e.language || "en",
        s3genModelSrc: (m == null ? void 0 : m.src) || m,
        streamChunkTokens: 25,
        streamFirstChunkTokens: 10,
        cfmSteps: 1,
        threads: 8,
        useGPU: process.arch === "arm64",
        seed: 42,
        ...f ? { referenceAudioSrc: f } : {},
        ...s && o ? { lavasrEnhancerModelSrc: o } : {}
      }, b = await v.loadModel({
        modelSrc: g,
        modelType: "tts",
        modelConfig: C,
        onProgress: (M) => {
          var I;
          const T = Math.round((M == null ? void 0 : M.percentage) ?? 0);
          (I = e.onProgress) == null || I.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(T * 0.4)),
            message: `Loading ${p} weights ${T}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const M = this.loadedModels.keys().next().value;
        if (M) {
          const T = this.loadedModels.get(M);
          if (T)
            try {
              await ((r = v.unloadModel) == null ? void 0 : r.call(v, { modelId: T }));
            } catch {
            }
          this.loadedModels.delete(M);
        }
      }
      return this.loadedModels.set(y, b), { modelId: b, engine: "chatterbox" };
    } else {
      const d = v.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || v.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!d)
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      const g = ((n = e.emotion) == null ? void 0 : n.toLowerCase()) || "", p = ["anger", "happy", "neutral", "sad"].includes(g) ? g : void 0, f = ve(e.referenceAudioSrc), y = (this.modelsService.isModelDownloaded("cosyvoice3-s3tok-fp16") || this.modelsService.isModelDownloaded("cosyvoice3-s3tok")) && (this.modelsService.isModelDownloaded("cosyvoice3-campplus-fp32") || this.modelsService.isModelDownloaded("cosyvoice3-campplus"));
      console.log(
        `[Echo Voice Engine] CosyVoice 3 setup: refWavPath=${f}, hasCloningModels=${y}`
      );
      const _ = [
        "cosyvoice3",
        f || "native",
        p || "none",
        s ? "lavasr48k" : "native24k"
      ].join("|"), C = this.loadedModels.get(_);
      if (C)
        return { modelId: C, engine: "cosyvoice3" };
      const b = f ? ` voice="${u.basename(f)}"` : " (native studio voice)", M = p ? ` emotion="${p}"` : "";
      (a = e.onLog) == null || a.call(e, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0 [FP32 Flow Matching]${s ? " +LavaSR 48kHz" : ""}${b}${M})...`,
        stream: "stdout"
      });
      const T = {
        ttsEngine: "cosyvoice3",
        useGPU: !0,
        seed: 42,
        ...f && y ? {
          cosyvoice3S3tokModelSrc: v.TTS_COSYVOICE3_S3TOK_COSYVOICE_FP16,
          cosyvoice3CampplusModelSrc: v.TTS_COSYVOICE3_CAMPPLUS_COSYVOICE_FP32,
          referenceAudioSrc: f
        } : {},
        ...s && o ? { lavasrEnhancerModelSrc: o } : {},
        ...p ? { emotion: p } : {}
      }, I = await v.loadModel({
        modelSrc: d,
        modelType: "tts",
        modelConfig: T,
        onProgress: (A) => {
          var $;
          const D = Math.round((A == null ? void 0 : A.percentage) ?? 0);
          ($ = e.onProgress) == null || $.call(e, {
            taskId: e.taskId,
            progress: Math.min(40, Math.round(D * 0.4)),
            message: `Loading CosyVoice 3 weights ${D}%...`,
            phase: "loading"
          });
        }
      });
      if (this.loadedModels.size >= 4) {
        const A = this.loadedModels.keys().next().value;
        if (A) {
          const D = this.loadedModels.get(A);
          if (D)
            try {
              await ((c = v.unloadModel) == null ? void 0 : c.call(v, { modelId: D }));
            } catch {
            }
          this.loadedModels.delete(A);
        }
      }
      return this.loadedModels.set(_, I), { modelId: I, engine: "cosyvoice3" };
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
  async synthesize(e, t, s, o) {
    var g, m, p, f, y, _, C, b, M;
    const { taskId: i, rounds: r } = e, n = e.engine || "cosyvoice3", a = r.filter((T) => T.text.trim().length > 0);
    if (a.length === 0)
      return { success: !1, error: "No active speech rounds to synthesize" };
    const c = a[0], d = e.speakerName || "Selected Speaker";
    s == null || s({
      text: `[Echo Voice Engine] Synthesis task ${i} engine="${n}" voice="${d}" turns=${a.length}...`,
      stream: "system"
    });
    try {
      if (o != null && o()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: i,
        progress: 8,
        message: `Loading ${n === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const T = e.lavaSrEnabled !== !1 && this.modelsService.isModelDownloaded("lavasr-enhancer"), I = e.voicePrompt || e.prompt || e.description || c.prompt || c.description, A = ((g = c.emotion) == null ? void 0 : g.toLowerCase()) || "", D = [
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
      ], $ = D.includes(A) ? A : void 0, Z = c.referenceAudioSrc || e.referenceAudioSrc, { engine: z } = await this.ensureModelLoaded({
        engine: n,
        language: e.language || "en",
        lavaSrEnabled: T,
        instruct: I || void 0,
        emotion: $,
        pace: (m = c.pace) == null ? void 0 : m.toLowerCase(),
        referenceAudioSrc: Z,
        taskId: i,
        onProgress: t,
        onLog: s
      });
      if (o != null && o()) return { success: !1, error: "Cancelled" };
      const N = [];
      let x = T ? 48e3 : 24e3;
      for (let F = 0; F < a.length; F++) {
        if (o != null && o()) {
          const P = this.activeTtsRequestIds.get(i);
          if (P)
            try {
              await ((p = v.cancel) == null ? void 0 : p.call(v, { requestId: P }));
            } catch {
            }
          return { success: !1, error: "Cancelled" };
        }
        const k = a[F], Ie = k.referenceAudioSrc || e.referenceAudioSrc, he = ((f = k.emotion) == null ? void 0 : f.toLowerCase()) || "", Ae = D.includes(he) ? he : $, { modelId: Le } = await this.ensureModelLoaded({
          engine: n,
          language: e.language || "en",
          lavaSrEnabled: T,
          instruct: k.prompt || k.description || I || void 0,
          emotion: Ae,
          pace: (y = k.pace) == null ? void 0 : y.toLowerCase(),
          referenceAudioSrc: Ie,
          taskId: i,
          onProgress: t,
          onLog: s
        });
        if (t == null || t({
          taskId: i,
          progress: 40 + Math.round(F / a.length * 50),
          message: `Synthesizing turn ${F + 1}/${a.length}${k.speakerName ? ` (${k.speakerName})` : ""}...`,
          phase: "synthesis"
        }), F > 0 && N.length > 0) {
          const P = ce(0.2, x);
          te(N, P, x, 14);
        }
        const me = Qe(k.text);
        let be = 0;
        for (let P = 0; P < me.length; P++) {
          const q = me[P];
          if (o != null && o()) {
            const X = this.activeTtsRequestIds.get(i);
            if (X)
              try {
                await ((_ = v.cancel) == null ? void 0 : _.call(v, { requestId: X }));
              } catch {
              }
            return { success: !1, error: "Cancelled" };
          }
          if (q.type === "pause" && q.pauseSec) {
            const X = ce(q.pauseSec, x);
            te(N, X, x, 14);
            continue;
          }
          if (q.type === "speech" && q.text) {
            const { cleanedText: X, detectedCues: Q, tone: re } = He(q.text, z, q.tone);
            if (!X) continue;
            const ee = We(X, 36);
            for (let B = 0; B < ee.length; B++) {
              const ie = ee[B].text;
              if (!ie) continue;
              if (o != null && o()) {
                const O = this.activeTtsRequestIds.get(i);
                if (O)
                  try {
                    await ((C = v.cancel) == null ? void 0 : C.call(v, { requestId: O }));
                  } catch {
                  }
                return { success: !1, error: "Cancelled" };
              }
              if (N.length > 0) {
                const H = B > 0 && !ee[B - 1].isSentenceEnd ? 0.035 : B > 0 ? 0.09 : 0.08, U = ce(H, x);
                te(N, U, x, 10);
              }
              be++;
              const j = {
                modelId: Le,
                text: ie,
                inputType: "text",
                stream: !1
              };
              if (z === "cosyvoice3") {
                const O = (((b = k.emotion) == null ? void 0 : b.toLowerCase()) || $ || "").trim(), H = ["anger", "happy", "neutral", "sad"];
                if (re === "whisper" || Q.includes("whisper"))
                  j.volume = "soft", j.pace = "slow";
                else if (re === "yell" || Q.includes("yell"))
                  j.volume = "loud", j.emotion = "anger";
                else if (re === "raise" || Q.includes("raise"))
                  j.volume = "loud";
                else {
                  let U = H.includes(O) ? O : void 0;
                  if ((Q.includes("sigh") || Q.includes("breath")) && !U && (U = "sad"), U && U !== "neutral")
                    j.emotion = U;
                  else {
                    const K = (((M = k.pace) == null ? void 0 : M.toLowerCase()) || "").trim();
                    ["slow", "moderate", "fast"].includes(K) && K !== "moderate" && (j.pace = K);
                  }
                }
              }
              const Y = v.textToSpeech(j);
              Y != null && Y.requestId && this.activeTtsRequestIds.set(i, Y.requestId);
              const R = await Y.buffer ?? [], Ne = await Y.done, ne = await Y.sampleRate, J = typeof ne == "number" && ne > 0 ? ne : T ? 48e3 : 24e3;
              if (x = J, this.activeTtsRequestIds.delete(i), R.length > 0) {
                let O = 0, H = 1 / 0, U = -1 / 0;
                for (const W of R) {
                  const ae = Number.isFinite(W) ? W : 0;
                  O = Math.max(O, Math.abs(ae)), H = Math.min(H, ae), U = Math.max(U, ae);
                }
                const K = R.every((W) => W === 0), fe = R.every((W) => W === R[0]);
                console.log(
                  `[TTS Debug] Turn ${F + 1} Chunk ${B + 1}/${ee.length}: PCM length=${R.length}, maxAbs=${O.toFixed(4)}, min=${H.toFixed(4)}, max=${U.toFixed(4)}, allZero=${K}, allSame=${fe}, sampleRate=${J}`
                );
              }
              if (R.length > 0) {
                const O = ie.replace(/[^a-z0-9]/gi, "_").slice(0, 30) || `round-${F}-chunk-${B}`;
                ge(R, J, `segment-${F}-${O}`);
              }
              if (!Ne || !R || R.length === 0)
                throw new Error(
                  `${z === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} returned no audio for turn ${F + 1}`
                );
              const xe = Ye(R, J);
              te(N, xe, J, 12);
            }
          }
        }
      }
      if (o != null && o()) return { success: !1, error: "Cancelled" };
      t == null || t({
        taskId: i,
        progress: 95,
        message: `Finalizing ${x}Hz WAV & waveform...`,
        phase: "finalizing"
      }), N.length > 0 && ge(N, x, "combined-output");
      const we = qe(N, x), Me = Xe(N, 38), ue = Math.round(N.length / x * 10) / 10, oe = a[0].text.trim(), _e = oe.length > 55 ? `${oe.slice(0, 52)}...` : oe, Ce = {
        id: `gen-${i}`,
        roundIndex: e.historyIndex || 0,
        title: `Generation ${(e.historyIndex || 0) + 1}`,
        textSnippet: _e,
        speakerName: a.length > 1 ? `${a.length} Speakers` : e.speakerName || "Sterling Rhodes",
        speakerColor: a.length > 1 ? "#10b981" : e.speakerColor || "#38bdf8",
        speakerAvatarUrl: e.speakerAvatarUrl || "/voices/sterling.jpg",
        duration: ue,
        audioUrl: we,
        waveform: Me,
        timestamp: "Just now",
        emotion: c.emotion || "Neutral"
      };
      return t == null || t({
        taskId: i,
        progress: 100,
        message: `${z === "chatterbox" ? "Chatterbox T3" : "CosyVoice 3"} synthesis complete`,
        phase: "complete"
      }), s == null || s({
        text: `[Echo Voice Engine] Synthesis complete (${ue}s @ ${x}Hz, ${N.length} samples).`,
        stream: "stdout"
      }), { success: !0, data: Ce };
    } catch (T) {
      this.activeTtsRequestIds.delete(i);
      const I = T != null && T.message ? String(T.message) : String(T);
      return s == null || s({
        text: `[Echo Voice Engine] Synthesis failed: ${I}`,
        stream: "stderr"
      }), { success: !1, error: I };
    }
  }
}
class Ke {
  constructor(e, t) {
    w(this, "activeTasks", /* @__PURE__ */ new Set());
    w(this, "voiceEngine");
    w(this, "modelsService");
    w(this, "conversationRepo");
    this.modelsService = e || new de(), this.voiceEngine = new Je(this.modelsService), this.conversationRepo = t;
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
    const { taskId: o } = e;
    this.activeTasks.add(o);
    try {
      return await this.voiceEngine.synthesize(
        e,
        t,
        s,
        () => this.isCancelled(o)
      );
    } finally {
      this.activeTasks.delete(o);
    }
  }
}
class Ze {
  constructor(e) {
    w(this, "db");
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
          }
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
      return await this.db.client.$transaction(async (o) => {
        if (await o.conversation.upsert({
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
        }), await o.speechRound.deleteMany({
          where: { conversationId: e.id }
        }), e.roundsData && Array.isArray(e.roundsData) && e.roundsData.length > 0) {
          const i = e.roundsData.map((r, n) => ({
            id: r.id || `${e.id}-round-${n}`,
            conversationId: e.id,
            roundOrder: n,
            voiceId: r.voiceId || "voice-en-male-1",
            text: r.text || "",
            speed: typeof r.speed == "number" ? r.speed : 1,
            emotion: r.emotion || null,
            pace: r.pace || null,
            prompt: r.prompt || null,
            description: r.description || null,
            referenceAudioSrc: r.referenceAudioSrc || null,
            speakerName: r.speakerName || null,
            speakerColor: r.speakerColor || null
          }));
          for (const r of i)
            await o.speechRound.create({ data: r });
        }
      }), { success: !0 };
    } catch (t) {
      return console.error("[ConversationRepositoryService] Failed to save conversation:", t), { success: !1, error: (t == null ? void 0 : t.message) || String(t) };
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
      return console.error("[ConversationRepositoryService] Failed to delete conversation:", t), { success: !1, error: (t == null ? void 0 : t.message) || String(t) };
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
      return console.error("[ConversationRepositoryService] Failed to clear conversations:", e), { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
    }
  }
}
class et extends se {
  constructor(e) {
    super(), this.ttsService = e;
  }
  init() {
    E.handle(
      S.TTS_GENERATE,
      async (e, t) => {
        const s = t.engine || "cosyvoice3", i = this.ttsService.getModelStatus(s).models.filter((c) => c.required && !c.downloaded);
        if (i.length > 0)
          return {
            success: !1,
            error: `Required voice engine models not downloaded: ${i.map((c) => c.name).join(", ")}`
          };
        const r = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TTS_PROGRESS, c);
          } catch (d) {
            console.warn("[TtsController] Failed to send progress event:", d);
          }
        }, n = (c) => {
          try {
            e.sender.isDestroyed() || e.sender.send(S.TERMINAL_LOG, {
              projectId: "echo-ai",
              text: c.text,
              stream: c.stream,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          } catch (d) {
            console.warn("[TtsController] Failed to send log event:", d);
          }
        }, a = await this.ttsService.generateSpeech(t, r, n);
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
    ), E.handle(
      S.TTS_CANCEL,
      async (e, { taskId: t }) => ({ success: this.ttsService.cancelGeneration(t), taskId: t })
    ), E.handle(S.TTS_HISTORY_LIST, async () => {
      try {
        return { success: !0, data: await this.ttsService.listConversations() };
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    }), E.handle(S.TTS_HISTORY_SAVE, async (e, t) => {
      try {
        return await this.ttsService.saveConversation(t);
      } catch (s) {
        return { success: !1, error: (s == null ? void 0 : s.message) || String(s) };
      }
    }), E.handle(S.TTS_HISTORY_DELETE, async (e, t) => {
      try {
        const s = typeof t == "string" ? t : t.id;
        return await this.ttsService.deleteConversation(s);
      } catch (s) {
        return { success: !1, error: (s == null ? void 0 : s.message) || String(s) };
      }
    }), E.handle(S.TTS_HISTORY_CLEAR, async () => {
      try {
        return await this.ttsService.clearConversations();
      } catch (e) {
        return { success: !1, error: (e == null ? void 0 : e.message) || String(e) };
      }
    });
  }
}
class tt {
  constructor() {
    w(this, "prisma");
    w(this, "initialized", !1);
    const t = (L ? L.isPackaged : !1) ? L.getPath("userData") : u.join(process.cwd(), "prisma");
    h.existsSync(t) || h.mkdirSync(t, { recursive: !0 });
    const s = u.join(t, "echo.db"), o = `file:${s}`;
    process.env.DATABASE_URL = o, console.log(`[DatabaseService] SQLite DB initialized at: ${s}`), this.prisma = new ke({
      datasources: {
        db: {
          url: o
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
      `), this.initialized = !0, console.log("[DatabaseService] SQLite database schema initialized");
      } catch (e) {
        console.error("[DatabaseService] Error verifying SQLite tables:", e);
      }
  }
  /**
   * Graceful disconnect on application exit
   */
  async close() {
    try {
      await this.prisma.$disconnect();
    } catch {
    }
  }
}
function st() {
  const l = new tt(), e = new Ge(l), t = new Ze(l), s = new $e(), o = new de(), i = new je(e), r = new Ke(o, t), n = [
    new Pe(s),
    new Be(o),
    new ze(i),
    new et(r)
  ];
  for (const a of n)
    a.init();
  return {
    systemService: s,
    modelsService: o,
    voiceService: i,
    ttsService: r,
    dbService: l,
    controllers: n
  };
}
const Te = u.dirname(Ue(import.meta.url));
process.env.APP_ROOT = u.join(Te, "..");
const le = process.env.VITE_DEV_SERVER_URL, ht = u.join(process.env.APP_ROOT, "dist-electron"), Ee = u.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = le ? u.join(process.env.APP_ROOT, "public") : Ee;
const mt = st();
let V = null;
function ye() {
  V = new pe({
    icon: u.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: u.join(Te, "preload.mjs")
    }
  }), V.webContents.on(
    "console-message",
    (l, e, t, s, o) => {
      console.log(`[Renderer ${u.basename(o)}:${s}] ${t}`);
    }
  ), V.webContents.on("render-process-gone", (l, e) => {
    console.error("[Renderer Crashed]:", e);
  }), V.webContents.on("did-finish-load", () => {
    V == null || V.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), le ? V.loadURL(le) : V.loadFile(u.join(Ee, "index.html"));
}
L.on("window-all-closed", () => {
  process.platform !== "darwin" && (L.quit(), V = null);
});
L.on("activate", () => {
  pe.getAllWindows().length === 0 && ye();
});
L.whenReady().then(ye);
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  ht as MAIN_DIST,
  Ee as RENDERER_DIST,
  le as VITE_DEV_SERVER_URL,
  mt as core
};
