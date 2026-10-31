import { z } from 'zod';
import type { IModelProvider, InferenceRequest, InferenceResponse } from '../model/model-provider.interface.ts';

export abstract class BaseAgent {
  protected readonly modelProvider: IModelProvider;
  protected readonly maxRetries: number;

  constructor(
    modelProvider: IModelProvider,
    maxRetries = 2,
  ) {
    this.modelProvider = modelProvider;
    this.maxRetries = maxRetries;
  }

  /**
   * Executes a strongly typed LLM inference request with automatic schema validation
   * and bounded retries if validation fails.
   */
  protected async invokeStructured<T>(
    request: Omit<InferenceRequest<T>, 'promptId'> & { promptId?: string },
    schema: z.ZodType<T>,
  ): Promise<T> {
    const promptId = request.promptId || `${this.constructor.name}_${Date.now()}`;
    let lastError: Error | null = null;
    let feedback = '';

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const messages = [...request.messages];
        if (feedback) {
          messages.push({
            role: 'user',
            content: `Your previous response failed validation with the following issue:\n${feedback}\n\nPlease output ONLY a corrected, strictly valid JSON object matching the required schema.`,
          });
        }

        const fullRequest: InferenceRequest<T> = {
          ...request,
          promptId,
          messages,
          responseSchema: schema,
        };

        const response: InferenceResponse<T> = await this.modelProvider.generateCompletion(fullRequest);

        if (response.parsed) {
          return response.parsed;
        }

        throw new Error('No parsed output returned by model provider');
      } catch (err: any) {
        lastError = err;
        feedback = err.message || String(err);
        console.warn(`[${this.constructor.name}] Attempt ${attempt} failed: ${feedback}`);
      }
    }

    throw new Error(
      `[${this.constructor.name}] Exceeded maximum retries (${this.maxRetries}). Last error: ${lastError?.message}`,
    );
  }
}
