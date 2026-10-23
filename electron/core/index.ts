import { BaseController } from './base.controller'
import { SystemService, SystemController } from './system'
import { ModelsService, ModelsController } from './models'
import { VoiceService, VoiceController, VoiceRepositoryService } from './voices'
import { TtsService, TtsController, ConversationRepositoryService } from './tts'
import { DatabaseService } from './db'

export * from './base.controller'
export * from './ipc-channels'
export * from './system'
export * from './models'
export * from './voices'
export * from './tts'
export * from './db'

export interface CoreContext {
  systemService: SystemService
  modelsService: ModelsService
  voiceService: VoiceService
  ttsService: TtsService
  dbService: DatabaseService
  controllers: BaseController[]
}

/**
 * Bootstrap all isolated core services and controllers with dependency injection
 */
export function bootstrapCore(): CoreContext {
  // 1. Initialize pure database infrastructure service
  const dbService = new DatabaseService()

  // 2. Instantiate domain repositories with injected dbService
  const voiceRepository = new VoiceRepositoryService(dbService)
  const conversationRepository = new ConversationRepositoryService(dbService)

  // 3. Instantiate domain services with injected repositories
  const systemService = new SystemService()
  const modelsService = new ModelsService()
  const voiceService = new VoiceService(voiceRepository)
  const ttsService = new TtsService(modelsService, conversationRepository)

  // 4. Initialize domain controllers with injected services (Constructor Injection)
  const controllers: BaseController[] = [
    new SystemController(systemService),
    new ModelsController(modelsService),
    new VoiceController(voiceService),
    new TtsController(ttsService),
  ]

  // 5. Initialize and bind IPC handlers on all controllers
  for (const controller of controllers) {
    controller.init()
  }

  return {
    systemService,
    modelsService,
    voiceService,
    ttsService,
    dbService,
    controllers,
  }
}
