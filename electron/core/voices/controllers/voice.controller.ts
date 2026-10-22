import { ipcMain } from 'electron'
import { BaseController } from '../../base.controller'
import { IPC_CHANNELS } from '../../ipc-channels'
import type { VoiceService } from '../services/voice.service'

export class VoiceController extends BaseController {
  constructor(private readonly voiceService: VoiceService) {
    super()
  }

  public init(): void {
    // 1. Scan voice samples packages and read header info.json
    ipcMain.handle(IPC_CHANNELS.VOICES_SCAN, async () => {
      return this.voiceService.scanVoicePackages()
    })

    // Legacy channel alias for backward compatibility
    ipcMain.handle(IPC_CHANNELS.LEGACY_SCAN_VOICE_SAMPLES, async () => {
      return this.voiceService.scanVoicePackages()
    })

    // 2. Load detailed voice list for a package folder
    ipcMain.handle(
      IPC_CHANNELS.VOICES_LOAD,
      async (_: Electron.IpcMainInvokeEvent, { folder, list }: { folder: string; list?: string }) => {
        return this.voiceService.loadVoicesForPackage(folder, list)
      }
    )
  }
}
