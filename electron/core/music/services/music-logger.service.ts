import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';

export interface GenerationFailureContext {
  taskId: string;
  engine: string;
  stage: string;
  error: any;
  options?: any;
  resolvedPaths?: {
    lmModelSrc?: string;
    synthModelSrc?: string;
    ditModelSrc?: string;
    vaeModelSrc?: string;
    textEncModelSrc?: string;
  };
}

export class MusicLoggerService {
  private static instance: MusicLoggerService;
  private primaryLogPath: string;
  private mirrorLogPath: string;

  public static getInstance(): MusicLoggerService {
    if (!MusicLoggerService.instance) {
      MusicLoggerService.instance = new MusicLoggerService();
    }
    return MusicLoggerService.instance;
  }

  constructor() {
    // 1. Primary log path in userData
    let userDataDir: string;
    try {
      userDataDir = app?.getPath ? app.getPath('userData') : process.cwd();
    } catch {
      userDataDir = process.cwd();
    }

    const primaryLogsDir = path.join(userDataDir, 'logs');
    if (!fs.existsSync(primaryLogsDir)) {
      try {
        fs.mkdirSync(primaryLogsDir, { recursive: true });
      } catch {}
    }
    this.primaryLogPath = path.join(primaryLogsDir, 'music-generation.log');

    // 2. Mirror log in workspace for developer direct access
    const mirrorLogsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(mirrorLogsDir)) {
      try {
        fs.mkdirSync(mirrorLogsDir, { recursive: true });
      } catch {}
    }
    this.mirrorLogPath = path.join(mirrorLogsDir, 'music-generation.log');

    // Rotate if existing log exceeds 15MB
    this.rotateIfNecessary(this.primaryLogPath);
    this.rotateIfNecessary(this.mirrorLogPath);

    this.writeRaw(`\n=== Music Logger Initialized [${new Date().toISOString()}] ===\nPrimary Log: ${this.primaryLogPath}\nMirror Log: ${this.mirrorLogPath}\n`);
  }

  private rotateIfNecessary(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.size > 15 * 1024 * 1024) {
          const backup = `${filePath}.${Date.now()}.bak`;
          fs.renameSync(filePath, backup);
        }
      }
    } catch {}
  }

  private writeRaw(content: string): void {
    try {
      fs.appendFileSync(this.primaryLogPath, content, 'utf-8');
    } catch (e) {
      console.warn('[MusicLogger] Failed to write primary log:', e);
    }

    if (this.mirrorLogPath !== this.primaryLogPath) {
      try {
        fs.appendFileSync(this.mirrorLogPath, content, 'utf-8');
      } catch {}
    }
  }

  public logInfo(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    let text = `[${timestamp}] [INFO] ${message}`;
    if (meta) {
      text += `\n  Metadata: ${JSON.stringify(meta, null, 2)}`;
    }
    text += '\n';
    this.writeRaw(text);
    console.log(`[MusicLogger] ${message}`);
  }

  public logSessionStart(options: {
    taskId: string;
    engine: string;
    caption: string;
    lyrics?: string;
    isInstrumental?: boolean;
    duration?: number;
    ditVariant?: string;
    seed?: number;
  }): void {
    const timestamp = new Date().toISOString();
    const divider = '='.repeat(80);
    const log = `
${divider}
[${timestamp}] ▸ STARTING MUSIC GENERATION
TaskId:         ${options.taskId}
Engine:         ${options.engine}
Caption:        "${options.caption}"
Lyrics:         ${options.lyrics ? `"${options.lyrics.slice(0, 100)}${options.lyrics.length > 100 ? '...' : ''}"` : '(none)'}
Instrumental:   ${Boolean(options.isInstrumental)}
Duration:       ${options.duration || 30}s
DiT Variant:    ${options.ditVariant || 'n/a'}
Seed:           ${options.seed ?? -1}
${divider}
`;
    this.writeRaw(log);
    console.log(`[MusicLogger] ▸ Generation Started for task: ${options.taskId} (Engine: ${options.engine})`);
  }

  public logMilestone(taskId: string, stage: string, detail?: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${taskId}] [${stage}] ${detail || ''}\n`;
    this.writeRaw(line);
    console.log(`[MusicLogger] [${taskId}] [${stage}] ${detail || ''}`);
  }

  public logProgress(taskId: string, stage: string, step: number, total: number, pct: number): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${taskId}] [PROGRESS] ${stage}: ${pct}% (${step}/${total})\n`;
    this.writeRaw(line);
  }

  public logSuccess(taskId: string, output: {
    durationMs: number;
    sampleRate: number;
    channels: number;
    wavFilePath?: string;
    audioUrl?: string;
  }): void {
    const timestamp = new Date().toISOString();
    const divider = '-'.repeat(80);
    const log = `
${divider}
[${timestamp}] ✓ MUSIC GENERATION SUCCEEDED
TaskId:         ${taskId}
Duration:       ${(output.durationMs / 1000).toFixed(2)}s
Format:         ${output.sampleRate} Hz, ${output.channels} ch
Output WAV:     ${output.wavFilePath}
${divider}
`;
    this.writeRaw(log);
    console.log(`[MusicLogger] ✓ Generation Succeeded: ${taskId} -> ${output.wavFilePath}`);
  }

  public logFailure(ctx: GenerationFailureContext): void {
    const timestamp = new Date().toISOString();
    const divider = '#'.repeat(80);

    const err = ctx.error;
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code || (err as any)?.errCode || 'UNKNOWN';
    const errorStack = err?.stack || '(No stack trace available)';
    const errorCause = err?.cause ? JSON.stringify(err.cause, null, 2) : undefined;
    const errorAdds = (err as any)?.adds;

    // Scan models cache directory to snapshot exact files on disk
    let cacheFilesSnapshot: string[] = [];
    const cacheDir = path.join(os.homedir(), '.qvac', 'models');
    try {
      if (fs.existsSync(cacheDir)) {
        cacheFilesSnapshot = fs.readdirSync(cacheDir).map((f) => {
          try {
            const st = fs.statSync(path.join(cacheDir, f));
            const mb = (st.size / (1024 * 1024)).toFixed(1);
            return `${f} (${mb} MB)`;
          } catch {
            return f;
          }
        });
      }
    } catch {}

    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));

    const log = `
${divider}
[${timestamp}] ✖ MUSIC GENERATION FAILED
TaskId:           ${ctx.taskId}
Engine:           ${ctx.engine}
Failure Stage:    ${ctx.stage}
Error Code:       ${errorCode}
Error Message:    ${errorMessage}
${errorAdds ? `Error Adds:       ${errorAdds}\n` : ''}${errorCause ? `Error Cause:      ${errorCause}\n` : ''}
Stack Trace:
${errorStack}

Options Provided:
${JSON.stringify(ctx.options || {}, null, 2)}

Resolved Model Paths:
${JSON.stringify(ctx.resolvedPaths || {}, null, 2)}

Models Cache Directory (${cacheDir}):
${cacheFilesSnapshot.length > 0 ? cacheFilesSnapshot.map((f) => `  - ${f}`).join('\n') : '  (Directory empty or inaccessible)'}

System Resources:
  Platform:       ${os.platform()}-${os.arch()}
  Free Memory:    ${freeMemMb} MB / ${totalMemMb} MB (${Math.round((freeMemMb / totalMemMb) * 100)}% free)
  Node Version:   ${process.version}
${divider}
`;
    this.writeRaw(log);
    console.error(`[MusicLogger] ✖ Generation Failed for ${ctx.taskId} (Engine: ${ctx.engine}, Stage: ${ctx.stage}): ${errorMessage}`);
    if (errorStack) {
      console.error(errorStack);
    }
  }

  public getRecentLogs(limitLines = 200): string {
    try {
      if (!fs.existsSync(this.primaryLogPath)) {
        return 'No music generation logs recorded yet.';
      }
      const raw = fs.readFileSync(this.primaryLogPath, 'utf-8');
      const lines = raw.split('\n');
      if (lines.length <= limitLines) {
        return raw;
      }
      return lines.slice(lines.length - limitLines).join('\n');
    } catch (err: any) {
      return `Failed to read logs: ${err?.message || String(err)}`;
    }
  }

  public clearLogs(): boolean {
    try {
      if (fs.existsSync(this.primaryLogPath)) {
        fs.writeFileSync(this.primaryLogPath, '', 'utf-8');
      }
      if (fs.existsSync(this.mirrorLogPath) && this.mirrorLogPath !== this.primaryLogPath) {
        fs.writeFileSync(this.mirrorLogPath, '', 'utf-8');
      }
      return true;
    } catch {
      return false;
    }
  }

  public getLogFilePaths(): { primary: string; mirror?: string } {
    return {
      primary: this.primaryLogPath,
      mirror: this.mirrorLogPath !== this.primaryLogPath ? this.mirrorLogPath : undefined,
    };
  }
}
