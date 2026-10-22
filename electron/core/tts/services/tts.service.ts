import type {
  TtsGenerateOptions,
  TtsProgressCallback,
  TtsLogCallback,
  TtsGenerateResult,
  VoiceModelStatusResult,
  ModelDownloadProgressPayload,
} from '../interfaces'
import { VoiceEngineService } from './voice-engine.service'

export class TtsService {
  private activeTasks = new Set<string>()
  private voiceEngine: VoiceEngineService

  constructor() {
    this.voiceEngine = new VoiceEngineService()
  }

  /** Access the underlying voice engine neural service */
  public getVoiceEngine(): VoiceEngineService {
    return this.voiceEngine
  }

  /** Get voice engine models download status */
  public getModelStatus(): VoiceModelStatusResult {
    return this.voiceEngine.getStatus()
  }

  /** Download a specific model */
  public async downloadModel(
    modelId: string,
    onProgress?: (p: ModelDownloadProgressPayload) => void
  ): Promise<{ success: boolean; modelId: string; error?: string }> {
    return this.voiceEngine.downloadModel(modelId, onProgress)
  }

  /** Cancel an in-flight model download */
  public cancelModelDownload(modelId: string): boolean {
    return this.voiceEngine.cancelDownload(modelId)
  }

  /** Mark all required models ready */
  public markAllModelsReady(): void {
    this.voiceEngine.markAllAsReady()
  }

  /** Delete all installed models from disk and reset engine state */
  public async deleteAllModels(): Promise<boolean> {
    return this.voiceEngine.deleteAllModels()
  }

  /** Cancel an active generation task + underlying QVAC request */
  public cancelGeneration(taskId: string): boolean {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId)
      try {
        ;(this.voiceEngine as any).cancelSynthesis?.(taskId)
      } catch {}
      return true
    }
    return false
  }

  /** Check if a task was cancelled */
  public isCancelled(taskId: string): boolean {
    return !this.activeTasks.has(taskId)
  }

  /** High-fidelity speech synthesis pipeline using Echo Voice Engine prompt-driven voice design */
  public async generateSpeech(
    options: TtsGenerateOptions,
    onProgress?: TtsProgressCallback,
    onLog?: TtsLogCallback
  ): Promise<TtsGenerateResult> {
    const { taskId } = options
    this.activeTasks.add(taskId)

    try {
      return await this.voiceEngine.synthesize(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      )
    } finally {
      this.activeTasks.delete(taskId)
    }
  }
}
