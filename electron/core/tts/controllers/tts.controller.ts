import { ipcMain } from 'electron'
import { BaseController } from '../../base.controller'
import { IPC_CHANNELS } from '../../ipc-channels'
import * as qvacSdk from '@qvac/sdk'
import type { TtsService } from '../services/tts.service'
import type { TtsGenerateOptions } from '../interfaces'

export class TtsController extends BaseController {
  constructor(private readonly ttsService: TtsService) {
    super()
  }

  public init(): void {
    // 1. Voice generation handler with live real-time IPC progress and terminal logs
    ipcMain.handle(
      IPC_CHANNELS.TTS_GENERATE,
      async (event: Electron.IpcMainInvokeEvent, options: TtsGenerateOptions) => {
        // Guard: refuse synthesis if required models are not downloaded
        const status = this.ttsService.getModelStatus()
        const requiredNotReady = status.models.filter((m) => m.required && !m.downloaded)
        if (requiredNotReady.length > 0) {
          return {
            success: false,
            error: `Required voice engine models not downloaded: ${requiredNotReady.map((m) => m.name).join(', ')}`,
          }
        }

        const sendProgress = (data: {
          taskId: string
          progress: number
          message: string
          phase: string
        }) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_PROGRESS, data)
            }
          } catch (err) {
            console.warn('[TtsController] Failed to send progress event:', err)
          }
        }

        const sendLog = (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: 'echo-ai',
                text: log.text,
                stream: log.stream,
                timestamp: new Date().toISOString(),
              })
            }
          } catch (err) {
            console.warn('[TtsController] Failed to send log event:', err)
          }
        }

        const result = await this.ttsService.generateSpeech(options, sendProgress, sendLog)

        if (result.success && result.data) {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_COMPLETE, {
                taskId: options.taskId,
                generation: result.data,
              })
            }
          } catch (err) {
            console.warn('[TtsController] Failed to send complete event:', err)
          }
        } else if (!result.success) {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TTS_ERROR, {
                taskId: options.taskId,
                error: result.error || 'Generation failed',
              })
            }
          } catch (err) {
            console.warn('[TtsController] Failed to send error event:', err)
          }
        }

        return result
      }
    )

    // 2. Cancel ongoing generation task
    ipcMain.handle(
      IPC_CHANNELS.TTS_CANCEL,
      async (_: Electron.IpcMainInvokeEvent, { taskId }: { taskId: string }) => {
        const cancelled = this.ttsService.cancelGeneration(taskId)
        return { success: cancelled, taskId }
      }
    )

    // 3. Echo Voice Engine models management IPC handlers
    ipcMain.handle(IPC_CHANNELS.MODELS_GET_STATUS, async () => {
      try {
        const status = this.ttsService.getModelStatus()
        return { success: true, data: status }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    })

    ipcMain.handle(
      IPC_CHANNELS.MODELS_DOWNLOAD,
      async (event: Electron.IpcMainInvokeEvent, payload: { modelId?: string; allRequired?: boolean }) => {
        const onProgress = (p: any) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MODELS_DOWNLOAD_PROGRESS, p)
            }
          } catch (e) {
            console.warn('[TtsController] Failed to send download progress:', e)
          }
        }

        if (payload?.allRequired) {
          const status = this.ttsService.getModelStatus()
          const required = status.models.filter((m) => m.required && !m.downloaded)
          for (const m of required) {
            await this.ttsService.downloadModel(m.id, onProgress)
          }
          return { success: true, data: this.ttsService.getModelStatus() }
        }

        if (payload?.modelId) {
          const result = await this.ttsService.downloadModel(payload.modelId, onProgress)
          return { ...result, data: this.ttsService.getModelStatus() }
        }

        return { success: false, error: 'No modelId or allRequired flag specified' }
      }
    )

    ipcMain.handle(
      IPC_CHANNELS.MODELS_CANCEL_DOWNLOAD,
      async (_: Electron.IpcMainInvokeEvent, { modelId }: { modelId: string }) => {
        const cancelled = this.ttsService.cancelModelDownload(modelId)
        return { success: cancelled, modelId }
      }
    )

    // 4. Get QVAC model info (cache/download status) via @qvac/sdk getModelInfo
    ipcMain.handle(
      IPC_CHANNELS.MODELS_GET_INFO,
      async (_: Electron.IpcMainInvokeEvent, { name }: { name: string }) => {
        try {
          const modelInfo = await qvacSdk.getModelInfo({ name })
          return { success: true, data: modelInfo }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      }
    )

    // 5. Delete all installed models from disk and reset engine state
    ipcMain.handle(
      IPC_CHANNELS.MODELS_DELETE_ALL,
      async () => {
        try {
          // Clear QVAC's internal cache (kv cache, model cache, etc.)
          try {
            await qvacSdk.deleteCache({ all: true })
          } catch {
            // deleteCache may not exist in all SDK versions; fall through to manual cleanup
          }

          // Delete model files from disk and reset engine state
          await this.ttsService.deleteAllModels()
          return { success: true }
        } catch (err) {
          return { success: false, error: String(err) }
        }
      }
    )
  }
}

