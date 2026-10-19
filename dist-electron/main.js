import { ipcMain as x, app as a, shell as U, BrowserWindow as R } from "electron";
import { fileURLToPath as v } from "node:url";
import t from "node:path";
import m from "node:os";
import w from "node:fs";
const y = t.dirname(v(import.meta.url));
let i = null;
function D() {
  const e = m.cpus();
  let r = 0, n = 0;
  for (const c of e) {
    for (const u of Object.keys(c.times))
      n += c.times[u];
    r += c.times.idle;
  }
  if (!i)
    return i = { idle: r, total: n }, 14;
  const l = r - i.idle, s = n - i.total;
  if (i = { idle: r, total: n }, s <= 0) return 14;
  const d = Math.round((s - l) / s * 100);
  return Math.max(1, Math.min(100, d));
}
x.handle("get-system-metrics", async () => {
  var P;
  const e = m.totalmem(), r = m.freemem(), n = Math.max(0, e - r), l = n / e * 100, s = Math.sin(Date.now() / 3e3) * 0.8 + (Math.random() * 0.4 - 0.2), d = Math.max(5, Math.min(99, Math.round(l + s))), c = D(), u = Math.round(Math.sin(Date.now() / 2e3) * 3 + (Math.random() * 3 - 1)), h = Math.max(3, Math.min(98, Math.round(c + u)));
  let p = 12;
  try {
    const g = a.getAppMetrics().find((M) => M.type === "GPU");
    if (g)
      p = Math.min(100, Math.max(8, Math.round(g.cpu.percentCPUUsage * 2 + 10)));
    else {
      const M = Math.round(Math.cos(Date.now() / 2500) * 3 + (Math.random() * 2 - 1));
      p = Math.max(6, Math.min(94, Math.round(h * 0.7 + 8 + M)));
    }
  } catch {
    p = Math.max(6, Math.min(94, Math.round(h * 0.7 + 8)));
  }
  return {
    ram: {
      usedGB: (n / (1024 * 1024 * 1024) + s * 0.1).toFixed(1),
      totalGB: (e / (1024 * 1024 * 1024)).toFixed(1),
      percent: d
    },
    cpu: {
      percent: h,
      cores: m.cpus().length,
      model: ((P = m.cpus()[0]) == null ? void 0 : P.model) || "Processor"
    },
    gpu: {
      percent: p,
      name: process.platform === "darwin" ? "Apple Silicon GPU" : "GPU Compute"
    }
  };
});
x.handle("open-exports-folder", async () => {
  try {
    const e = t.join(a.getPath("documents"), "Echo", "Exports");
    return w.existsSync(e) || w.mkdirSync(e, { recursive: !0 }), await U.openPath(e), { success: !0, path: e };
  } catch (e) {
    return console.error("Failed to open exports directory:", e), { success: !1, error: String(e) };
  }
});
process.env.APP_ROOT = t.join(y, "..");
const f = process.env.VITE_DEV_SERVER_URL, A = t.join(process.env.APP_ROOT, "dist-electron"), _ = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = f ? t.join(process.env.APP_ROOT, "public") : _;
let o;
function E() {
  o = new R({
    icon: t.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: t.join(y, "preload.mjs")
    }
  }), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), f ? o.loadURL(f) : o.loadFile(t.join(_, "index.html"));
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), o = null);
});
a.on("activate", () => {
  R.getAllWindows().length === 0 && E();
});
a.whenReady().then(E);
export {
  A as MAIN_DIST,
  _ as RENDERER_DIST,
  f as VITE_DEV_SERVER_URL
};
