import { z } from 'zod';

export interface InferenceMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface InferenceRequest<T = unknown> {
  promptId: string;
  systemPrompt: string;
  messages: InferenceMessage[];
  maxTokens?: number;
  temperature?: number;
  responseSchema?: z.ZodType<T>;
  schemaName?: string;
  kvCacheKey?: string;
  stream?: boolean;
  onToken?: (delta: string) => void;
  onThinking?: (delta: string) => void;
}

export interface InferenceResponse<T = unknown> {
  rawText: string;
  parsed?: T;
  thinking?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
  };
  durationMs: number;
  modelId: string;
}

export interface ModelRuntimeConfig {
  modelId?: string;
  device?: 'cpu' | 'gpu';
  ctxSize?: number;
  timeoutMs?: number;
}

export interface IModelProvider {
  readonly isInitialized: boolean;
  readonly modelId: string;
  initialize(config?: ModelRuntimeConfig): Promise<void>;
  generateCompletion<T>(request: InferenceRequest<T>): Promise<InferenceResponse<T>>;
  unload(): Promise<void>;
}

