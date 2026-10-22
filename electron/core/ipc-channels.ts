export const IPC_CHANNELS = {
  // Voices domain
  VOICES_SCAN: 'voices:scan',
  VOICES_LOAD: 'voices:load',
  VOICES_GET: 'voices:get',

  // Voice generation & TTS domain (Echo Voice Engine & QVAC)
  TTS_GENERATE: 'tts:generate',
  TTS_CANCEL: 'tts:cancel',
  TTS_PROGRESS: 'tts:progress',
  TTS_COMPLETE: 'tts:complete',
  TTS_ERROR: 'tts:error',

  // Models management domain (Echo Voice Engine weights)
  MODELS_GET_STATUS: 'models:get-status',
  MODELS_GET_INFO: 'models:get-info',
  MODELS_DELETE_ALL: 'models:delete-all',
  MODELS_DOWNLOAD: 'models:download',
  MODELS_DOWNLOAD_PROGRESS: 'models:download-progress',
  MODELS_CANCEL_DOWNLOAD: 'models:cancel-download',

  // System telemetry & utilities domain
  SYSTEM_GET_METRICS: 'system:getMetrics',
  SYSTEM_OPEN_EXPORTS: 'system:openExports',

  // Terminal Log domain
  TERMINAL_LOG: 'terminal:log',

  // Legacy channel aliases for backwards compatibility
  LEGACY_SCAN_VOICE_SAMPLES: 'scan-voice-samples',
  LEGACY_GET_SYSTEM_METRICS: 'get-system-metrics',
  LEGACY_OPEN_EXPORTS_FOLDER: 'open-exports-folder',
} as const;

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
