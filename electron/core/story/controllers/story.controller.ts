import { ipcMain } from 'electron';
import { BaseController } from '../../base.controller';
import { IPC_CHANNELS } from '../../ipc-channels';
import type { StoryService, StoryProgressPayload } from '../services/story.service';

export class StoryController extends BaseController {
  constructor(private readonly storyService: StoryService) {
    super();
  }

  public init(): void {
    ipcMain.handle(
      IPC_CHANNELS.STORY_GENERATE,
      async (event: Electron.IpcMainInvokeEvent, payload: { prompt: any; options?: any }) => {
        const onProgress = (p: StoryProgressPayload) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.STORY_PROGRESS, p);
            }
          } catch (e) {
            console.warn('[StoryController] Failed to send progress event:', e);
          }
        };

        const result = await this.storyService.generateStory(
          payload.prompt,
          payload.options,
          onProgress,
        );

        if (result.success) {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.STORY_COMPLETE, result.data);
            }
          } catch (e) {
            console.warn('[StoryController] Failed to send completion event:', e);
          }
        } else {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.STORY_ERROR, { error: result.error });
            }
          } catch (e) {
            console.warn('[StoryController] Failed to send error event:', e);
          }
        }

        return result;
      },
    );
  }
}

