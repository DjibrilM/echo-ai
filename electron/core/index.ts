import { BaseController } from './base.controller'
import { SystemService, SystemController } from './system'
import { VoiceService, VoiceController } from './voices'
import { TtsService, TtsController } from './tts'

export * from './base.controller'
export * from './ipc-channels'
export * from './system'
export * from './voices'
export * from './tts'

export interface CoreContext {
  systemService: SystemService
  voiceService: VoiceService
  ttsService: TtsService
  controllers: BaseController[]
}

/**
 * Bootstrap all isolated core services and controllers with dependency injection
 */
export function bootstrapCore(): CoreContext {
  // 1. Instantiate separated single-responsibility core services
  const systemService = new SystemService()
  const voiceService = new VoiceService()
  const ttsService = new TtsService()

  // 2. Initialize controllers with injected services (Constructor Injection)
  const controllers: BaseController[] = [
    new SystemController(systemService),
    new VoiceController(voiceService),
    new TtsController(ttsService),
  ]

  // 3. Initialize and bind IPC handlers on all controllers
  for (const controller of controllers) {
    controller.init()
  }

  return {
    systemService,
    voiceService,
    ttsService,
    controllers,
  }
}
