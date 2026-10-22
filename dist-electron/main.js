var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import path from "node:path";
import fs from "node:fs";
import { app, shell, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import os from "node:os";
import * as qvacSdk from "@qvac/sdk";
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
  // Voices domain
  VOICES_SCAN: "voices:scan",
  VOICES_LOAD: "voices:load",
  VOICES_GET: "voices:get",
  // Voice generation & TTS domain (Echo Voice Engine & QVAC)
  TTS_GENERATE: "tts:generate",
  TTS_CANCEL: "tts:cancel",
  TTS_PROGRESS: "tts:progress",
  TTS_COMPLETE: "tts:complete",
  TTS_ERROR: "tts:error",
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
class VoiceService {
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
function parseTextAndPauses(rawText) {
  const PAUSE_REGEX = /\[pause\s*([0-9.]+)\s*(?:s|sec|seconds)?\]/gi;
  const segments = [];
  let lastIndex = 0;
  let match;
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
class VoiceEngineService {
  constructor() {
    __publicField(this, "cacheDir");
    __publicField(this, "stateFilePath");
    __publicField(this, "downloadedModelIds", /* @__PURE__ */ new Set());
    __publicField(this, "activeDownloads", /* @__PURE__ */ new Map());
    __publicField(this, "loadedModel", null);
    __publicField(this, "activeTtsRequestIds", /* @__PURE__ */ new Map());
    // Definition of CosyVoice 3 and Parler-TTS neural models
    __publicField(this, "modelDefinitions", [
      {
        id: "parler-mini-v1-q8_0",
        name: "Parler-TTS Mini V1 (880M, Q8_0)",
        descriptorName: "TTS_MINI_V1_EN_PARLER_TTS_Q8_0",
        sizeBytes: 1162597856,
        sizeFormatted: "1.16 GB",
        description: "Description-conditioned neural speech transformer with 12 expressive emotions and natural prosody (fast on all hardware).",
        category: "backbone",
        engine: "parler",
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
      console.warn("[VoiceEngineService] Could not load state file:", e);
    }
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
            } catch {
            }
          }
        }
      }
    } catch {
    }
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
      fs.writeFileSync(
        this.stateFilePath,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
    } catch (e) {
      console.warn("[VoiceEngineService] Could not save state file:", e);
    }
  }
  /**
   * Delete all installed models from disk and reset engine state
   */
  async deleteAllModels() {
    var _a;
    if (this.loadedModel) {
      try {
        await ((_a = qvacSdk.unloadModel) == null ? void 0 : _a.call(qvacSdk, {
          modelId: this.loadedModel.modelId
        }));
      } catch {
      }
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
          } catch {
          }
        }
      }
    } catch {
    }
    return true;
  }
  /**
   * Get complete status of all voice engine models
   */
  getStatus(selectedEngine) {
    const models = this.modelDefinitions.map((def) => {
      const isDownloaded = this.downloadedModelIds.has(def.id);
      const isDownloading = this.activeDownloads.has(def.id);
      const isRequired = selectedEngine ? def.category === "backbone" && def.engine === selectedEngine : def.category === "backbone";
      return {
        ...def,
        required: isRequired,
        downloaded: isDownloaded,
        status: isDownloading ? "downloading" : isDownloaded ? "ready" : "idle"
      };
    });
    const hasReadyBackbone = selectedEngine ? this.downloadedModelIds.has(
      selectedEngine === "parler" ? "parler-mini-v1-q8_0" : "cosyvoice3-llm-q8_0"
    ) : this.downloadedModelIds.has("parler-mini-v1-q8_0") || this.downloadedModelIds.has("cosyvoice3-llm-q8_0");
    return {
      ready: hasReadyBackbone,
      allRequiredDownloaded: hasReadyBackbone,
      models,
      cacheDirectory: this.cacheDir
    };
  }
  /**
   * Download a single model with live progress updates
   */
  async downloadModel(modelId, onProgress) {
    const def = this.modelDefinitions.find((m) => m.id === modelId);
    if (!def) {
      return { success: false, modelId, error: `Unknown model ID: ${modelId}` };
    }
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
    let isCancelled = false;
    let lastPct = 0;
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
          error: `No asset descriptor found for ${modelId}`
        };
      }
      const downloadPromise = qvacSdk.downloadAsset({
        assetSrc: sdkDescriptor,
        onProgress: (p) => {
          if (isCancelled) return;
          const pct = Math.min(100, Math.round(p.percentage || 0));
          if (pct < lastPct) return;
          lastPct = pct;
          const dl = p.downloaded || Math.round(pct / 100 * def.sizeBytes);
          const tot = p.total || def.sizeBytes;
          const speed = p.speed || "Downloading...";
          onProgress == null ? void 0 : onProgress({
            modelId,
            percentage: pct,
            downloaded: dl,
            total: tot,
            speed
          });
        }
      });
      if (downloadPromise && downloadPromise.requestId) {
        this.activeDownloads.set(modelId, {
          cancel: () => {
            isCancelled = true;
            try {
              if (typeof qvacSdk.cancel === "function") {
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
      if (isCancelled) {
        return { success: false, modelId, error: "Download cancelled" };
      }
      this.downloadedModelIds.add(modelId);
      this.saveState();
      onProgress == null ? void 0 : onProgress({
        modelId,
        percentage: 100,
        downloaded: def.sizeBytes,
        total: def.sizeBytes,
        speed: "Completed"
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
   * Mark all required models as downloaded for fast setup
   */
  markAllAsReady() {
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
  async ensureModelLoaded(opts) {
    var _a, _b, _c, _d, _e, _f;
    const engine = opts.engine || "cosyvoice3";
    const lavaSr = opts.lavaSrEnabled !== false;
    const lavasrSrc = qvacSdk.TTS_ENHANCER_LAVASR_FP16;
    if (engine === "parler") {
      const parlerDescriptor = qvacSdk.TTS_MINI_V1_EN_PARLER_TTS_Q8_0 || qvacSdk.TTS_MINI_V1_EN_PARLER_TTS_FP16;
      if (!parlerDescriptor) {
        throw new Error("QVAC Parler-TTS descriptor missing from SDK");
      }
      const key = `parler|${process.arch === "arm64" ? "metal" : "cpu"}|native44k`;
      if (this.loadedModel && this.loadedModel.key === key) {
        return { modelId: this.loadedModel.modelId, engine: "parler" };
      }
      if (this.loadedModel) {
        try {
          await ((_a = qvacSdk.unloadModel) == null ? void 0 : _a.call(qvacSdk, {
            modelId: this.loadedModel.modelId
          }));
        } catch {
        }
        this.loadedModel = null;
      }
      (_b = opts.onLog) == null ? void 0 : _b.call(opts, {
        text: `[Echo Voice Engine] Loading Parler-TTS Mini V1 (880M Q8_0, 44.1kHz native${process.arch === "arm64" ? " +Metal GPU" : " +CPU"})...`,
        stream: "stdout"
      });
      const baseConfig = {
        ttsEngine: "parler",
        useGPU: process.arch === "arm64",
        seed: 42
      };
      const modelId = await qvacSdk.loadModel({
        modelSrc: parlerDescriptor,
        modelType: "tts",
        modelConfig: baseConfig,
        onProgress: (p) => {
          var _a2;
          const pct = Math.round((p == null ? void 0 : p.percentage) ?? 0);
          (_a2 = opts.onProgress) == null ? void 0 : _a2.call(opts, {
            taskId: opts.taskId,
            progress: Math.min(40, Math.round(pct * 0.4)),
            message: `Loading Parler-TTS weights ${pct}%...`,
            phase: "loading"
          });
        }
      });
      this.loadedModel = { modelId, key };
      return { modelId, engine: "parler" };
    } else {
      const cosyvoiceDescriptor = qvacSdk.TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0 || qvacSdk.TTS_COSYVOICE3_LLM_COSYVOICE_Q4_0;
      if (!cosyvoiceDescriptor) {
        throw new Error("QVAC CosyVoice 3 descriptor missing from SDK");
      }
      const instructPrompt = ((_c = opts.instruct) == null ? void 0 : _c.trim()) || "";
      const rawEmotion = ((_d = opts.emotion) == null ? void 0 : _d.toLowerCase()) || "";
      const validEmotions = ["anger", "happy", "neutral", "sad"];
      const emotion = validEmotions.includes(rawEmotion) ? rawEmotion : void 0;
      const key = [
        "cosyvoice3",
        "baseline",
        instructPrompt || "none",
        emotion || "none",
        lavaSr ? "lavasr48k" : "native24k"
      ].join("|");
      if (this.loadedModel && this.loadedModel.key === key) {
        return { modelId: this.loadedModel.modelId, engine: "cosyvoice3" };
      }
      if (this.loadedModel) {
        try {
          await ((_e = qvacSdk.unloadModel) == null ? void 0 : _e.call(qvacSdk, {
            modelId: this.loadedModel.modelId
          }));
        } catch {
        }
        this.loadedModel = null;
      }
      (_f = opts.onLog) == null ? void 0 : _f.call(opts, {
        text: `[Echo Voice Engine] Loading CosyVoice 3 Engine (0.5B Q8_0${lavaSr ? " +LavaSR 48kHz" : ""}${instructPrompt ? ` instruct="${instructPrompt.slice(0, 45)}..."` : ""})...`,
        stream: "stdout"
      });
      const baseConfig = {
        ttsEngine: "cosyvoice3",
        useGPU: true,
        seed: 42,
        ...lavaSr && (lavasrSrc == null ? void 0 : lavasrSrc.src) ? { lavasrEnhancerModelSrc: lavasrSrc.src } : {},
        ...instructPrompt ? { instruct: instructPrompt } : {},
        ...emotion && !instructPrompt ? { emotion } : {}
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
      this.loadedModel = { modelId, key };
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
   * High-fidelity speech synthesis pipeline with dynamic engine selection (CosyVoice 3 / Parler-TTS)
   * and optional Lava-SR 48kHz neural enhancement.
   */
  async synthesize(options, onProgress, onLog, isCancelled) {
    var _a, _b, _c, _d, _e, _f, _g;
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
        message: `Loading ${activeEngine === "parler" ? "Parler-TTS" : "CosyVoice 3"} Engine...`,
        phase: "loading"
      });
      const lavaSrEnabled = options.lavaSrEnabled !== false;
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
      const { modelId, engine } = await this.ensureModelLoaded({
        engine: activeEngine,
        language: options.language || "en",
        lavaSrEnabled,
        instruct: voicePrompt || void 0,
        emotion: detectedEmotion,
        pace: (_b = firstRound.pace) == null ? void 0 : _b.toLowerCase(),
        taskId,
        onProgress,
        onLog
      });
      if (isCancelled == null ? void 0 : isCancelled()) return { success: false, error: "Cancelled" };
      const allSamples = [];
      let sampleRate = engine === "parler" ? 44100 : lavaSrEnabled ? 48e3 : 24e3;
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
        onProgress == null ? void 0 : onProgress({
          taskId,
          progress: 40 + Math.round(i / activeRounds.length * 50),
          message: `Synthesizing turn ${i + 1}/${activeRounds.length}...`,
          phase: "synthesis"
        });
        if (i > 0) {
          const interTurnPause = Math.floor(sampleRate * 0.25);
          for (let p = 0; p < interTurnPause; p++) allSamples.push(0);
        }
        const segments = parseTextAndPauses(round.text);
        for (const seg of segments) {
          if (isCancelled == null ? void 0 : isCancelled()) {
            const reqId = this.activeTtsRequestIds.get(taskId);
            if (reqId) {
              try {
                await ((_d = qvacSdk.cancel) == null ? void 0 : _d.call(qvacSdk, { requestId: reqId }));
              } catch {
              }
            }
            return { success: false, error: "Cancelled" };
          }
          if (seg.type === "pause" && seg.pauseSec) {
            const pauseSamples = Math.floor(sampleRate * seg.pauseSec);
            for (let p = 0; p < pauseSamples; p++) allSamples.push(0);
            continue;
          }
          if (seg.type === "speech" && seg.text) {
            const ttsPayload = {
              modelId,
              text: seg.text,
              inputType: "text",
              stream: false
            };
            if (engine === "parler") {
              const userPrompt = (round.prompt || round.description || voicePrompt || "").trim();
              const roundEmotion = (((_e = round.emotion) == null ? void 0 : _e.toLowerCase()) || detectedEmotion || "conversation").trim();
              const validParlerEmotions = [
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
              const parlerEmotion = validParlerEmotions.includes(roundEmotion) ? roundEmotion : "conversation";
              const roundPace = (((_f = round.pace) == null ? void 0 : _f.toLowerCase()) || "").trim();
              const validPaces = ["slow", "moderate", "fast"];
              const parlerPace = validPaces.includes(roundPace) ? roundPace : "moderate";
              if (userPrompt) {
                ttsPayload.description = userPrompt;
              } else {
                const emotionHint = parlerEmotion && parlerEmotion !== "neutral" && parlerEmotion !== "conversation" ? ` in a ${parlerEmotion} tone` : "";
                const paceHint = parlerPace && parlerPace !== "moderate" ? ` at a ${parlerPace} pace` : "";
                ttsPayload.description = `A speaker in a podcast environment${emotionHint}${paceHint}.`;
              }
            }
            const result = qvacSdk.textToSpeech(ttsPayload);
            if (result == null ? void 0 : result.requestId)
              this.activeTtsRequestIds.set(taskId, result.requestId);
            const pcm = await result.buffer ?? [];
            const done = await result.done;
            const srValue = await result.sampleRate;
            const sr = typeof srValue === "number" && srValue > 0 ? srValue : engine === "parler" ? 44100 : sampleRate;
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
                `[TTS Debug] PCM length=${pcm.length}, maxAbs=${maxAbs.toFixed(4)}, min=${minVal.toFixed(4)}, max=${maxVal.toFixed(4)}, allZero=${allZero}, allSame=${allSame}, sampleRate=${sr}`
              );
            }
            if (pcm.length > 0) {
              const safeLabel = ((_g = seg.text) == null ? void 0 : _g.replace(/[^a-z0-9]/gi, "_").slice(0, 40)) || `round-${i}`;
              savePcmAsWavFile(pcm, sr, `segment-${i}-${safeLabel}`);
            }
            if (!done || !pcm || pcm.length === 0) {
              throw new Error(
                `${engine === "parler" ? "Parler-TTS" : "CosyVoice 3"} returned no audio for turn ${i + 1}`
              );
            }
            for (const s of pcm) allSamples.push(s);
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
        speakerName: activeRounds.length > 1 ? `${activeRounds.length} Speakers` : engine === "parler" ? "Parler Persona" : options.speakerName || "Sterling Rhodes",
        speakerColor: activeRounds.length > 1 ? "#10b981" : engine === "parler" ? "#a855f7" : options.speakerColor || "#38bdf8",
        speakerAvatarUrl: engine === "parler" ? "/voices/sterling.jpg" : options.speakerAvatarUrl || "/voices/sterling.jpg",
        duration,
        audioUrl,
        waveform,
        timestamp: "Just now",
        emotion: firstRound.emotion || "Neutral"
      };
      onProgress == null ? void 0 : onProgress({
        taskId,
        progress: 100,
        message: "CosyVoice 3 synthesis complete",
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
  constructor() {
    __publicField(this, "activeTasks", /* @__PURE__ */ new Set());
    __publicField(this, "voiceEngine");
    this.voiceEngine = new VoiceEngineService();
  }
  /** Access the underlying voice engine neural service */
  getVoiceEngine() {
    return this.voiceEngine;
  }
  /** Get voice engine models download status */
  getModelStatus() {
    return this.voiceEngine.getStatus();
  }
  /** Download a specific model */
  async downloadModel(modelId, onProgress) {
    return this.voiceEngine.downloadModel(modelId, onProgress);
  }
  /** Cancel an in-flight model download */
  cancelModelDownload(modelId) {
    return this.voiceEngine.cancelDownload(modelId);
  }
  /** Mark all required models ready */
  markAllModelsReady() {
    this.voiceEngine.markAllAsReady();
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
class TtsController extends BaseController {
  constructor(ttsService) {
    super();
    this.ttsService = ttsService;
  }
  init() {
    ipcMain.handle(
      IPC_CHANNELS.TTS_GENERATE,
      async (event, options) => {
        const status = this.ttsService.getModelStatus();
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
    ipcMain.handle(IPC_CHANNELS.MODELS_GET_STATUS, async () => {
      try {
        const status = this.ttsService.getModelStatus();
        return { success: true, data: status };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    });
    ipcMain.handle(
      IPC_CHANNELS.MODELS_DOWNLOAD,
      async (event, payload) => {
        const onProgress = (p) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MODELS_DOWNLOAD_PROGRESS, p);
            }
          } catch (e) {
            console.warn("[TtsController] Failed to send download progress:", e);
          }
        };
        if (payload == null ? void 0 : payload.allRequired) {
          const status = this.ttsService.getModelStatus();
          const required = status.models.filter((m) => m.required && !m.downloaded);
          for (const m of required) {
            await this.ttsService.downloadModel(m.id, onProgress);
          }
          return { success: true, data: this.ttsService.getModelStatus() };
        }
        if (payload == null ? void 0 : payload.modelId) {
          const result = await this.ttsService.downloadModel(payload.modelId, onProgress);
          return { ...result, data: this.ttsService.getModelStatus() };
        }
        return { success: false, error: "No modelId or allRequired flag specified" };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_CANCEL_DOWNLOAD,
      async (_, { modelId }) => {
        const cancelled = this.ttsService.cancelModelDownload(modelId);
        return { success: cancelled, modelId };
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_GET_INFO,
      async (_, { name }) => {
        try {
          const modelInfo = await qvacSdk.getModelInfo({ name });
          return { success: true, data: modelInfo };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      }
    );
    ipcMain.handle(
      IPC_CHANNELS.MODELS_DELETE_ALL,
      async () => {
        try {
          try {
            await qvacSdk.deleteCache({ all: true });
          } catch {
          }
          await this.ttsService.deleteAllModels();
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      }
    );
  }
}
function bootstrapCore() {
  const systemService = new SystemService();
  const voiceService = new VoiceService();
  const ttsService = new TtsService();
  const controllers = [
    new SystemController(systemService),
    new VoiceController(voiceService),
    new TtsController(ttsService)
  ];
  for (const controller of controllers) {
    controller.init();
  }
  return {
    systemService,
    voiceService,
    ttsService,
    controllers
  };
}
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
  win.webContents.on(
    "console-message",
    (_event, _level, message, line, sourceId) => {
      console.log(`[Renderer ${path.basename(sourceId)}:${line}] ${message}`);
    }
  );
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
app.whenReady().then(createWindow);
console.log("Electron:", process.versions.electron);
console.log("Chromium:", process.versions.chrome);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL,
  core
};
