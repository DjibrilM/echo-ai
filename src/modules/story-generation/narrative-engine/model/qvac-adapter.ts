import path from 'node:path';
import fs from 'node:fs';
import {
  loadModel,
  unloadModel,
  completion,
  getModelInfo,
  GEMMA4_4B_MULTIMODAL_Q6_K,
  GEMMA4_2B_MULTIMODAL_Q6_K,
} from '@qvac/sdk';
import type {
  IModelProvider,
  InferenceRequest,
  InferenceResponse,
  ModelRuntimeConfig,
} from './model-provider.interface.ts';
import { extractStructuredJson } from './json-extractor.ts';
import { InferenceQueue } from './inference-queue.ts';

// Bootstrap Bare RPC initialization timeout and worker binary path before invoking QVAC SDK
if (typeof process !== 'undefined' && process?.env) {
  if (!process.env.QVAC_RPC_INIT_TIMEOUT_MS) {
    process.env.QVAC_RPC_INIT_TIMEOUT_MS = '120000';
  }
  if (!process.env.QVAC_WORKER_PATH && typeof process.cwd === 'function') {
    try {
      const candidate = path.resolve(process.cwd(), 'node_modules/@qvac/sdk/dist/src/worker/index.js');
      if (typeof fs !== 'undefined' && typeof fs.existsSync === 'function' && fs.existsSync(candidate)) {
        try {
          process.env.QVAC_WORKER_PATH = fs.realpathSync(candidate);
        } catch {
          process.env.QVAC_WORKER_PATH = candidate;
        }
      }
    } catch {
      // Ignored in non-standard runtimes
    }
  }
}

/**
 * Production QVAC Model Adapter for local LLM inference using Gemma 4.
 * Integrates directly with @qvac/sdk to execute structured generation,
 * JSON object constraints, token streaming, and thinking traces.
 */
export class QvacAdapter implements IModelProvider {
  private _modelId: string = '';
  private _isInitialized: boolean = false;
  private readonly queue: InferenceQueue;
  private static inFlightLoadPromise: Promise<string> | null = null;
  private timeoutMs: number = 600_000; // 10 min default for CPU / Metal inference

  constructor(concurrency = 1) {
    this.queue = new InferenceQueue(concurrency);
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  public get modelId(): string {
    return this._modelId;
  }

  public async initialize(config?: ModelRuntimeConfig): Promise<void> {
    if (this._isInitialized && this._modelId) {
      return;
    }

    if (config?.timeoutMs) {
      this.timeoutMs = config.timeoutMs;
    }

    // Deduplicate concurrent load requests
    if (QvacAdapter.inFlightLoadPromise) {
      this._modelId = await QvacAdapter.inFlightLoadPromise;
      this._isInitialized = true;
      return;
    }

    QvacAdapter.inFlightLoadPromise = this.doLoadModel(config).finally(() => {
      QvacAdapter.inFlightLoadPromise = null;
    });

    this._modelId = await QvacAdapter.inFlightLoadPromise;
    this._isInitialized = true;
  }

  private async doLoadModel(config?: ModelRuntimeConfig): Promise<string> {
    const requestedName = config?.modelId;
    let modelDescriptor: any = GEMMA4_4B_MULTIMODAL_Q6_K;

    if (requestedName === 'GEMMA4_2B_MULTIMODAL_Q6_K') {
      modelDescriptor = GEMMA4_2B_MULTIMODAL_Q6_K;
    } else if (requestedName && typeof requestedName === 'object') {
      modelDescriptor = requestedName;
    }

    const ctxSize = config?.ctxSize || 128_000;
    const device = config?.device === 'cpu' ? 'cpu' : undefined;

    let resolvedModelId = modelDescriptor?.modelId || 'gemma-4';

    try {
      if (modelDescriptor && typeof loadModel === 'function') {
        const loadPromise = loadModel({
          modelSrc: modelDescriptor,
          modelConfig: {
            ctx_size: ctxSize,
            ...(device ? { device } : {}),
          },
        });
        resolvedModelId = await loadPromise;
      }
    } catch (err: any) {
      // Error code 52200 indicates model instance is already loaded in QVAC runtime
      if (err?.code === 52200 && typeof getModelInfo === 'function') {
        try {
          const info = await getModelInfo(modelDescriptor);
          if (info?.loadedInstances && info.loadedInstances.length > 0) {
            resolvedModelId = info.loadedInstances[0].registryId;
          }
        } catch {
          // Keep default resolvedModelId
        }
      } else {
        throw new Error(`[QvacAdapter] Failed to load Gemma 4 model: ${err.message || String(err)}`);
      }
    }

    return resolvedModelId;
  }

  public async generateCompletion<T>(request: InferenceRequest<T>): Promise<InferenceResponse<T>> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    return this.queue.run(async () => {
      const startTime = Date.now();

      // Build conversation history conforming to Gemma 4 prompt structure
      const history: Array<{ role: string; content: string }> = [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      // Native responseFormat constraint if requested
      const responseFormat = request.responseSchema ? { type: 'json_object' as const } : undefined;

      const completionParams: any = {
        modelId: this._modelId,
        history,
        maxTokens: request.maxTokens || 4000,
        stream: request.stream !== false,
        captureThinking: true,
        toolDialect: 'gemma4',
        ...(responseFormat ? { responseFormat } : {}),
        ...(request.kvCacheKey ? { kvCache: request.kvCacheKey } : {}),
      };

      const run = completion(completionParams);

      let streamedText = '';
      let thinkingText = '';

      const streamPromise = (async () => {
        if (run.events && request.stream !== false) {
          for await (const event of run.events as AsyncIterable<any>) {
            if (event.type === 'thinkingDelta' && event.text) {
              thinkingText += event.text;
              request.onThinking?.(event.text);
            } else if (event.type === 'contentDelta' && event.text) {
              streamedText += event.text;
              request.onToken?.(event.text);
            }
          }
        }
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Inference timed out after ${this.timeoutMs / 1000}s`)),
          this.timeoutMs,
        ),
      );

      // Await final completion with timeout
      const finalResult: any = await Promise.race([
        Promise.all([streamPromise, run.final]).then(([, res]) => res),
        timeoutPromise,
      ]);

      const rawText =
        finalResult?.cacheableAssistantContent ||
        finalResult?.contentText ||
        streamedText ||
        finalResult?.raw?.fullText ||
        '';

      const durationMs = Date.now() - startTime;

      let parsed: T | undefined = undefined;
      if (request.responseSchema) {
        parsed = extractStructuredJson<T>(rawText, request.responseSchema);
      }

      return {
        rawText,
        parsed,
        thinking: thinkingText || finalResult?.thinking || undefined,
        durationMs,
        modelId: this._modelId,
      };
    });
  }

  public async unload(): Promise<void> {
    if (this._modelId && typeof unloadModel === 'function') {
      try {
        await unloadModel({ modelId: this._modelId });
      } catch (err) {
        console.warn('[QvacAdapter] Failed to unload model:', err);
      }
    }
    this._isInitialized = false;
    this._modelId = '';
  }
}
