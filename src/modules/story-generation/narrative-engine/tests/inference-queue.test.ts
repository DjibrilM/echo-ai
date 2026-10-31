import test from 'node:test';
import assert from 'node:assert/strict';
import { InferenceQueue } from '../model/inference-queue.ts';

test('InferenceQueue: serializes tasks under maxConcurrency = 1', async () => {
  const queue = new InferenceQueue(1);
  const executionLog: string[] = [];
  let concurrentRunning = 0;
  let maxObservedConcurrency = 0;

  const createTask = (id: string, delayMs: number) => {
    return async () => {
      concurrentRunning++;
      if (concurrentRunning > maxObservedConcurrency) {
        maxObservedConcurrency = concurrentRunning;
      }
      executionLog.push(`start:${id}`);
      await new Promise((r) => setTimeout(r, delayMs));
      executionLog.push(`end:${id}`);
      concurrentRunning--;
      return id;
    };
  };

  const results = await Promise.all([
    queue.run(createTask('task1', 40)),
    queue.run(createTask('task2', 20)),
    queue.run(createTask('task3', 10)),
  ]);

  assert.deepEqual(results, ['task1', 'task2', 'task3']);
  assert.equal(maxObservedConcurrency, 1, 'Observed concurrency should never exceed 1');
  assert.deepEqual(executionLog, [
    'start:task1',
    'end:task1',
    'start:task2',
    'end:task2',
    'start:task3',
    'end:task3',
  ]);
});

test('InferenceQueue: handles errors without stalling future queue items', async () => {
  const queue = new InferenceQueue(1);

  const failingTask = async () => {
    throw new Error('Model crashed');
  };

  const succeedingTask = async () => {
    return 'recovered';
  };

  await assert.rejects(async () => {
    await queue.run(failingTask);
  }, /Model crashed/);

  const res = await queue.run(succeedingTask);
  assert.equal(res, 'recovered');
  assert.equal(queue.isBusy, false);
});

