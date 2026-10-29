import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { MusicEngineService } from './music-engine.service';
import type {
  MusicGenerateOptions,
  MusicEditOptions,
  MusicUnderstandOptions,
  MusicUnderstandResult,
  MusicGenerationOutput,
  MusicGenerateResult,
  MusicProgressPayload,
  MusicModelStatusResult,
} from '../interfaces';

export class MusicService {
  private activeTasks = new Set<string>();
  private engineService: MusicEngineService;
  private historyFilePath: string;
  private historyCache: MusicGenerationOutput[] = [];

  constructor() {
    this.engineService = new MusicEngineService();

    try {
      const userData = app?.getPath ? app.getPath('userData') : process.cwd();
      this.historyFilePath = path.join(userData, 'music-history.json');
      this.loadHistoryFromDisk();
    } catch {
      this.historyFilePath = path.join(process.cwd(), 'music-history.json');
    }
  }

  private sanitizeItem(item: MusicGenerationOutput): MusicGenerationOutput {
    const clean = { ...item };
    if (clean.wavFilePath && fs.existsSync(clean.wavFilePath)) {
      clean.audioUrl = `echo-media://${clean.wavFilePath}`;
    } else if (clean.audioUrl && clean.audioUrl.startsWith('data:') && clean.audioUrl.length > 50000) {
      // Strip oversized inline data URI to prevent IPC buffer explosion
      clean.audioUrl = '';
    }
    return clean;
  }

  private loadHistoryFromDisk(): void {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.historyCache = parsed.map((item) => this.sanitizeItem(item));
        }
      }
    } catch (e) {
      console.warn('[MusicService] Could not read music history:', e);
      this.historyCache = [];
    }
  }

  private saveHistoryToDisk(): void {
    try {
      const sanitized = this.historyCache.slice(0, 100).map((item) => this.sanitizeItem(item));
      fs.writeFileSync(this.historyFilePath, JSON.stringify(sanitized, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[MusicService] Could not write music history:', e);
    }
  }

  public getModelStatus(): MusicModelStatusResult {
    return this.engineService.getStatus();
  }

  public async assessFit(engine?: 'acestep' | 'minimax', ditVariant?: any) {
    return this.engineService.assessFit(engine, ditVariant);
  }

  public async unloadModel(): Promise<boolean> {
    return this.engineService.unload();
  }

  public cancelGeneration(taskId: string): boolean {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      return this.engineService.cancel(taskId);
    }
    return false;
  }

  public isCancelled(taskId: string): boolean {
    return !this.activeTasks.has(taskId);
  }

  public async generateMusic(
    options: MusicGenerateOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void
  ): Promise<MusicGenerateResult> {
    const { taskId } = options;
    this.activeTasks.add(taskId);

    try {
      const result = await this.engineService.generate(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      );

      if (result.success && result.data) {
        this.historyCache.unshift(result.data);
        this.saveHistoryToDisk();
      }

      return result;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  public async editMusic(
    options: MusicEditOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void
  ): Promise<MusicGenerateResult> {
    const { taskId } = options;
    this.activeTasks.add(taskId);

    try {
      const result = await this.engineService.edit(
        options,
        onProgress,
        onLog,
        () => this.isCancelled(taskId)
      );

      if (result.success && result.data) {
        this.historyCache.unshift(result.data);
        this.saveHistoryToDisk();
      }

      return result;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  public async understandMusic(
    options: MusicUnderstandOptions,
    onProgress?: (progress: MusicProgressPayload) => void,
    onLog?: (log: { text: string; stream: 'stdout' | 'stderr' | 'system' }) => void
  ): Promise<{ success: boolean; data?: MusicUnderstandResult; error?: string }> {
    return this.engineService.understand(options, onProgress, onLog);
  }

  public listHistory(): MusicGenerationOutput[] {
    return this.historyCache;
  }

  public getHistoryItem(id: string): MusicGenerationOutput | undefined {
    return this.historyCache.find((h) => h.id === id || h.taskId === id);
  }

  public saveHistoryItem(item: MusicGenerationOutput): boolean {
    const index = this.historyCache.findIndex((h) => h.id === item.id);
    if (index >= 0) {
      this.historyCache[index] = item;
    } else {
      this.historyCache.unshift(item);
    }
    this.saveHistoryToDisk();
    return true;
  }

  public deleteHistoryItem(id: string): boolean {
    const initialLen = this.historyCache.length;
    this.historyCache = this.historyCache.filter((h) => h.id !== id);
    if (this.historyCache.length !== initialLen) {
      this.saveHistoryToDisk();
      return true;
    }
    return false;
  }

  public clearHistory(): boolean {
    this.historyCache = [];
    this.saveHistoryToDisk();
    return true;
  }

  public getGenerationLogs(limitLines?: number): string {
    return this.engineService.getRecentLogs(limitLines);
  }

  public clearGenerationLogs(): boolean {
    return this.engineService.clearLogs();
  }
}
