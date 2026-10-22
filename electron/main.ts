import "./init-env";
import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bootstrapCore } from "./core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Bootstrap all modular core services & controllers with dependency injection
export const core = bootstrapCore();

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Forward renderer console logs to main terminal output for immediate visibility
  win.webContents.on(
    "console-message",
    (_event, _level, message, line, sourceId) => {
      console.log(`[Renderer ${path.basename(sourceId)}:${line}] ${message}`);
    },
  );

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[Renderer Crashed]:", details);
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
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
