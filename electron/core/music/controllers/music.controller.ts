import { ipcMain } from 'electron';
import { BaseController } from '../../base.controller';
import { IPC_CHANNELS } from '../../ipc-channels';
import type { MusicService } from '../services/music.service';
import type {
  MusicGenerateOptions,
  MusicEditOptions,
  MusicUnderstandOptions,
  MusicGenerationOutput,
  MusicProgressPayload,
} from '../interfaces';
import type { ActivityRepositoryService } from '../../activity/services/activity-repository.service';
import { QwenLyricService } from '../services/qwen-lyric.service';

export class MusicController extends BaseController {
  constructor(
    private readonly musicService: MusicService,
    private readonly activityRepo?: ActivityRepositoryService
  ) {
    super();
  }

  public init(): void {
    // 1. Music generation handler with real-time progress and logs
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_GENERATE,
      async (event: Electron.IpcMainInvokeEvent, options: MusicGenerateOptions) => {
        const sendProgress = (data: MusicProgressPayload) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send progress event:', err);
          }
        };

        const sendLog = (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: 'echo-ai',
                text: log.text,
                stream: log.stream,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send log event:', err);
          }
        };

        const result = await this.musicService.generateMusic(options, sendProgress, sendLog);

        if (result.success && result.data) {
          this.saveMusicActivity(result.data);
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_COMPLETE, {
                taskId: options.taskId,
                generation: result.data,
              });
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send complete event:', err);
          }
        } else if (!result.success) {
          console.error(
            `[MusicController] ✖ Music generation failed for taskId ${options.taskId} (Engine: ${options.engine || 'acestep'}):`,
            result.error
          );
          sendLog({
            text: `✖ Music Generation Failed: ${result.error}`,
            stream: 'stderr',
          });
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_ERROR, {
                taskId: options.taskId,
                error: result.error || 'Music generation failed',
                details: (result as any).errorDetails,
              });
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send error event:', err);
          }
        }

        return result;
      }
    );

    // 2. Cancel in-flight generation
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_CANCEL,
      async (_event: Electron.IpcMainInvokeEvent, { taskId }: { taskId: string }) => {
        const cancelled = this.musicService.cancelGeneration(taskId);
        return { success: cancelled, taskId };
      }
    );

    // 3. Audio Edit handler
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_EDIT,
      async (event: Electron.IpcMainInvokeEvent, options: MusicEditOptions) => {
        const sendProgress = (data: MusicProgressPayload) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send progress event:', err);
          }
        };

        const sendLog = (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: 'echo-ai',
                text: log.text,
                stream: log.stream,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send log event:', err);
          }
        };

        const result = await this.musicService.editMusic(options, sendProgress, sendLog);
        if (result.success && result.data) {
          this.saveMusicActivity(result.data);
        }
        return result;
      }
    );

    // 4. Audio Understand handler
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_UNDERSTAND,
      async (event: Electron.IpcMainInvokeEvent, options: MusicUnderstandOptions) => {
        const sendProgress = (data: MusicProgressPayload) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_PROGRESS, data);
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send progress event:', err);
          }
        };

        const sendLog = (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.TERMINAL_LOG, {
                projectId: 'echo-ai',
                text: log.text,
                stream: log.stream,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.warn('[MusicController] Failed to send log event:', err);
          }
        };

        const result = await this.musicService.understandMusic(options, sendProgress, sendLog);
        return result;
      }
    );

    // 5. Get Model Status
    ipcMain.handle(IPC_CHANNELS.MUSIC_MODEL_STATUS, async () => {
      return {
        success: true,
        data: this.musicService.getModelStatus(),
      };
    });

    // 6. Assess Model Fit
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_ASSESS_FIT,
      async (
        _event: Electron.IpcMainInvokeEvent,
        payload?: { engine?: 'acestep' | 'minimax'; ditVariant?: string }
      ) => {
        return this.musicService.assessFit(payload?.engine, payload?.ditVariant);
      }
    );

    // 7. Unload Model
    ipcMain.handle(IPC_CHANNELS.MUSIC_UNLOAD_MODEL, async () => {
      const unloaded = await this.musicService.unloadModel();
      return { success: unloaded };
    });

    // 8. History operations
    ipcMain.handle(IPC_CHANNELS.MUSIC_HISTORY_LIST, async () => {
      return {
        success: true,
        data: this.musicService.listHistory(),
      };
    });

    ipcMain.handle(
      IPC_CHANNELS.MUSIC_HISTORY_SAVE,
      async (_event: Electron.IpcMainInvokeEvent, item: MusicGenerationOutput) => {
        const saved = this.musicService.saveHistoryItem(item);
        if (saved) {
          this.saveMusicActivity(item);
        }
        return { success: saved };
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.MUSIC_HISTORY_DELETE,
      async (_event: Electron.IpcMainInvokeEvent, { id }: { id: string }) => {
        const deleted = this.musicService.deleteHistoryItem(id);
        if (this.activityRepo) {
          this.activityRepo.deleteActivity(`act-music-${id}`).catch(console.error);
        }
        return { success: deleted };
      }
    );

    ipcMain.handle(IPC_CHANNELS.MUSIC_HISTORY_CLEAR, async () => {
      const cleared = this.musicService.clearHistory();
      return { success: cleared };
    });

    // 6. Music generation diagnostics logs
    ipcMain.handle(IPC_CHANNELS.MUSIC_GET_LOGS, async (_event, limitLines?: number) => {
      const logs = this.musicService.getGenerationLogs(limitLines);
      return { success: true, data: logs };
    });

    ipcMain.handle(IPC_CHANNELS.MUSIC_CLEAR_LOGS, async () => {
      const cleared = this.musicService.clearGenerationLogs();
      return { success: cleared };
    });

    // 10. Generate AI Lyrics with Qwen-1.7B Streaming
    ipcMain.handle(
      IPC_CHANNELS.MUSIC_GENERATE_LYRICS,
      async (event: Electron.IpcMainInvokeEvent, payload: { prompt: string; taskId?: string }) => {
        const taskId = payload.taskId || `lyric_task_${Date.now()}`;
        const onToken = (token: string) => {
          try {
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.MUSIC_LYRICS_TOKEN, { taskId, token });
            }
          } catch { }
        };

        try {
          const result = await QwenLyricService.getInstance().generateLyricsStream(payload.prompt, onToken);
          return { success: true, lyrics: result.lyrics, engine: result.engine, taskId };
        } catch (err: any) {
          console.error('[MusicController] Error generating lyrics with Qwen:', err);
          return { success: false, error: err?.message || 'Failed to generate lyrics', taskId };
        }
      }
    );
  }

  private saveMusicActivity(item: MusicGenerationOutput): void {
    if (!this.activityRepo) return;
    const rawCaption = item.caption || 'Music Track';
    const title = rawCaption.length > 50 ? `${rawCaption.slice(0, 47)}...` : rawCaption;
    const mediaAudioUrl = item.wavFilePath
      ? `echo-media://${item.wavFilePath}`
      : item.audioUrl && item.audioUrl.length > 50000
      ? ''
      : item.audioUrl;

    this.activityRepo
      .saveActivity({
        id: `act-music-${item.id}`,
        type: 'music',
        title,
        description: item.lyrics ? item.lyrics.slice(0, 160) : item.caption,
        category: 'Music Generation',
        subCategory: 'AudioGen',
        originId: item.id,
        originType: 'music',
        metadata: {
          taskId: item.taskId,
          caption: item.caption,
          lyrics: item.lyrics,
          audioUrl: mediaAudioUrl,
          wavFilePath: item.wavFilePath,
          durationMs: item.durationMs,
          duration: item.durationMs ? `${Math.round(item.durationMs / 1000)}s` : 'Audio',
          waveform: item.waveform || [],
          bpm: item.bpm,
          keyscale: item.keyscale,
          timesignature: item.timesignature,
          vocalLanguage: item.vocalLanguage,
          engine: 'acestep',
          cover: '/covers/got/direwolf.jpg',
        },
      })
      .catch((err) => console.error('[MusicController] Failed to auto-save activity:', err));
  }
}
