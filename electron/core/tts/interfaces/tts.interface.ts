export interface TtsSpeechRound {
  id: string
  voiceId: string
  text: string
  speed?: number
  emotion?: string
  pace?: string
  prompt?: string
  description?: string
}

export interface TtsGenerateOptions {
  taskId: string
  rounds: TtsSpeechRound[]
  speakerName?: string
  speakerColor?: string
  speakerAvatarUrl?: string
  referenceAudioSrc?: string
  language?: string
  prompt?: string
  description?: string
  voicePrompt?: string
  stability?: number
  similarity?: number
  cfgScale?: number
  lavaSrEnabled?: boolean
  speed?: number
  historyIndex?: number
  engine?: 'cosyvoice3' | 'parler'
}

export interface TtsGenerationOutput {
  id: string
  roundIndex: number
  title: string
  textSnippet: string
  speakerName: string
  speakerColor: string
  speakerAvatarUrl: string
  duration: number
  audioUrl: string
  waveform: number[]
  timestamp: string
  emotion?: string
}

export type TtsProgressCallback = (data: {
  taskId: string
  progress: number
  message: string
  phase: string
}) => void

export type TtsLogCallback = (log: {
  text: string
  stream: 'stdout' | 'stderr' | 'system'
}) => void

export interface TtsGenerateResult {
  success: boolean
  data?: TtsGenerationOutput
  error?: string
}

export interface TtsCancelResult {
  success: boolean
  taskId: string
}

export interface VoiceModelInfo {
  id: string
  name: string
  descriptorName: string
  sizeBytes: number
  sizeFormatted: string
  description: string
  category: 'backbone' | 'vocoder' | 'enhancer' | 'multilingual'
  engine?: 'cosyvoice3' | 'parler' | 'shared'
  required: boolean
  downloaded: boolean
  status: 'idle' | 'downloading' | 'ready' | 'error'
  downloadProgress?: number // 0-100
  downloadedBytes?: number
  downloadSpeed?: string
  error?: string
}

export interface VoiceModelStatusResult {
  ready: boolean
  allRequiredDownloaded: boolean
  models: VoiceModelInfo[]
  cacheDirectory: string
}

export interface ModelDownloadProgressPayload {
  modelId: string
  percentage: number
  downloaded: number
  total: number
  speed?: string
}

