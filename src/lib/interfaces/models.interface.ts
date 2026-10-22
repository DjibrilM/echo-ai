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
  downloadProgress?: number // 0 - 100
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
