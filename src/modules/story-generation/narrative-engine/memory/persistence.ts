import fs from 'node:fs';
import path from 'node:path';
import { StoryGraphStateSchema } from '../types/story-graph.types.ts';
import type { StoryGraphState } from '../types/story-graph.types.ts';
import { WorkflowExecutionSnapshotSchema } from '../types/workflow.types.ts';
import type { WorkflowExecutionSnapshot } from '../types/workflow.types.ts';

export class PersistenceManager {
  private readonly storageDir: string;

  constructor(customStorageDir?: string) {
    if (customStorageDir) {
      this.storageDir = customStorageDir;
    } else {
      this.storageDir = path.resolve(process.cwd(), 'data', 'narratives');
    }

    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err) {
        console.warn(`[PersistenceManager] Could not create storage directory ${this.storageDir}:`, err);
      }
    }
  }

  private getStoryGraphPath(projectId: string): string {
    return path.join(this.storageDir, `${projectId}.storygraph.json`);
  }

  private getWorkflowPath(projectId: string): string {
    return path.join(this.storageDir, `${projectId}.workflow.json`);
  }

  public saveStoryGraph(state: StoryGraphState): void {
    const filePath = this.getStoryGraphPath(state.projectId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(state, null, 2);

    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  public loadStoryGraph(projectId: string): StoryGraphState | null {
    const filePath = this.getStoryGraphPath(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return StoryGraphStateSchema.parse(parsed);
    } catch (err) {
      console.error(`[PersistenceManager] Failed to load StoryGraph for ${projectId}:`, err);
      return null;
    }
  }

  public saveWorkflowSnapshot(snapshot: WorkflowExecutionSnapshot): void {
    const filePath = this.getWorkflowPath(snapshot.projectId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(snapshot, null, 2);

    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  public loadWorkflowSnapshot(projectId: string): WorkflowExecutionSnapshot | null {
    const filePath = this.getWorkflowPath(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return WorkflowExecutionSnapshotSchema.parse(parsed);
    } catch (err) {
      console.error(`[PersistenceManager] Failed to load WorkflowSnapshot for ${projectId}:`, err);
      return null;
    }
  }

  public hasPersistedNarrative(projectId: string): boolean {
    return fs.existsSync(this.getStoryGraphPath(projectId));
  }
}
