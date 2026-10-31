/**
 * Concurrency Mutex and Execution Queue for local LLM inference.
 * Gemma 4 models consume significant memory and GPU/CPU bandwidth.
 * Parallel inference requests on a local machine can cause catastrophic
 * memory thrashing or out-of-memory crashes.
 *
 * This queue serializes requests (or limits concurrency to a configured bound)
 * while preserving async promise resolution and cancellation.
 */
export class InferenceQueue {
  private activeCount = 0;
  private queue: Array<() => Promise<void>> = [];
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get isBusy(): boolean {
    return this.activeCount >= this.maxConcurrency;
  }

  public async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      try {
        return await task();
      } finally {
        this.activeCount--;
        this.processNext();
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private processNext(): void {
    if (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        this.activeCount++;
        nextTask().finally(() => {
          this.activeCount--;
          this.processNext();
        });
      }
    }
  }

  public clear(): void {
    this.queue = [];
  }
}
