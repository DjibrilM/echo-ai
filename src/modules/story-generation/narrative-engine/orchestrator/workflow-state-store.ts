import type {
  WorkflowExecutionSnapshot,
  WorkflowStage,
  TaskExecutionRecord,
} from '../types/workflow.types.ts';
import type { CreativeIntent } from '../types/creative-intent.types.ts';
import type { NarrativeBlueprint, BlueprintReviewResult } from '../types/blueprint.types.ts';
import type { SceneReviewResult } from '../types/scene.types.ts';
import { PersistenceManager } from '../memory/persistence.ts';

export class WorkflowStateStore {
  private snapshot: WorkflowExecutionSnapshot;
  private readonly persistence?: PersistenceManager;

  constructor(
    projectId: string,
    persistence?: PersistenceManager,
    initialSnapshot?: WorkflowExecutionSnapshot,
  ) {
    this.persistence = persistence;
    if (initialSnapshot) {
      this.snapshot = initialSnapshot;
    } else {
      this.snapshot = {
        workflowId: `wf-${Date.now()}`,
        projectId,
        currentStage: 'INITIALIZED',
        blueprintReviews: [],
        sceneRetryCounts: {},
        sceneReviews: {},
        completedSceneIds: [],
        taskHistory: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  public getSnapshot(): WorkflowExecutionSnapshot {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  public setStage(stage: WorkflowStage, reason?: string): void {
    this.snapshot.currentStage = stage;
    if (reason) {
      this.snapshot.escalationReason = reason;
    }
    this.snapshot.lastUpdated = new Date().toISOString();
    this.persist();
  }

  public setIntent(intent: CreativeIntent): void {
    this.snapshot.intent = intent;
    this.persist();
  }

  public setBlueprint(blueprint: NarrativeBlueprint): void {
    this.snapshot.blueprint = blueprint;
    this.persist();
  }

  public recordBlueprintReview(review: BlueprintReviewResult): void {
    this.snapshot.blueprintReviews.push(review);
    this.persist();
  }

  public recordSceneReview(sceneId: string, review: SceneReviewResult): void {
    if (!this.snapshot.sceneReviews[sceneId]) {
      this.snapshot.sceneReviews[sceneId] = [];
    }
    this.snapshot.sceneReviews[sceneId].push(review);
    this.persist();
  }

  public incrementSceneRetry(sceneId: string): number {
    const current = this.snapshot.sceneRetryCounts[sceneId] || 0;
    const next = current + 1;
    this.snapshot.sceneRetryCounts[sceneId] = next;
    this.persist();
    return next;
  }

  public markSceneCompleted(sceneId: string): void {
    if (!this.snapshot.completedSceneIds.includes(sceneId)) {
      this.snapshot.completedSceneIds.push(sceneId);
    }
    this.persist();
  }

  public logTask(record: TaskExecutionRecord): void {
    this.snapshot.taskHistory.push(record);
    this.persist();
  }

  private persist(): void {
    if (this.persistence) {
      try {
        this.persistence.saveWorkflowSnapshot(this.snapshot);
      } catch (err) {
        console.warn('[WorkflowStateStore] Failed to persist workflow snapshot:', err);
      }
    }
  }
}
