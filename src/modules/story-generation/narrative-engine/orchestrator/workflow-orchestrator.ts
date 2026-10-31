import type { IModelProvider } from '../model/model-provider.interface.ts';
import { StoryGraph } from '../memory/story-graph.ts';
import { ContextBuilder } from '../memory/context-builder.ts';
import { MutationManager } from '../memory/mutation-manager.ts';
import { PersistenceManager } from '../memory/persistence.ts';
import { FailurePolicy } from './failure-policy.ts';
import { WorkflowStateStore } from './workflow-state-store.ts';
import { CreativeIntentNormalizer } from '../agents/intent-normalizer.agent.ts';
import { WorldAndCharacterDesigner } from '../agents/world-designer.agent.ts';
import { StoryArchitect } from '../agents/story-architect.agent.ts';
import { NarrativeIntegrityReviewer } from '../agents/narrative-reviewer.agent.ts';
import { MainStoryDirector } from '../agents/story-director.agent.ts';
import { SpecializedWritingAgent } from '../agents/writing.agent.ts';
import { SceneReviewer } from '../agents/scene-reviewer.agent.ts';
import { NarrationDirector } from '../agents/narration-director.agent.ts';
import type { RawCreativePrompt, CreativeIntent } from '../types/creative-intent.types.ts';
import type { NarrativeBlueprint } from '../types/blueprint.types.ts';
import type { WorkflowExecutionSnapshot, WorkflowStage } from '../types/workflow.types.ts';
import type { PerformanceScript } from '../types/narration.types.ts';

export interface OrchestratorOptions {
  maxScenesToProduce?: number;
  enableAudioPreparation?: boolean;
  onProgress?: (stage: WorkflowStage, message: string) => void;
  onToken?: (token: string) => void;
}

export class WorkflowOrchestrator {
  private readonly failurePolicy: FailurePolicy;
  private readonly normalizer: CreativeIntentNormalizer;
  private readonly worldDesigner: WorldAndCharacterDesigner;
  private readonly storyArchitect: StoryArchitect;
  private readonly narrativeReviewer: NarrativeIntegrityReviewer;
  private readonly writingAgent: SpecializedWritingAgent;
  private readonly modelProvider: IModelProvider;
  private readonly storyGraph: StoryGraph;
  private readonly persistence?: PersistenceManager;
  private readonly sceneReviewer: SceneReviewer;
  private readonly narrationDirector: NarrationDirector;

  constructor(
    modelProvider: IModelProvider,
    storyGraph: StoryGraph,
    persistence?: PersistenceManager,
    failurePolicy?: FailurePolicy,
  ) {
    this.modelProvider = modelProvider;
    this.storyGraph = storyGraph;
    this.persistence = persistence;
    this.failurePolicy = failurePolicy || new FailurePolicy();
    this.normalizer = new CreativeIntentNormalizer(this.modelProvider);
    this.worldDesigner = new WorldAndCharacterDesigner(this.modelProvider);
    this.storyArchitect = new StoryArchitect(this.modelProvider);
    this.narrativeReviewer = new NarrativeIntegrityReviewer(this.modelProvider);
    this.writingAgent = new SpecializedWritingAgent(this.modelProvider);
    this.sceneReviewer = new SceneReviewer(this.modelProvider);
    this.narrationDirector = new NarrationDirector(this.modelProvider, this.storyGraph);
  }

  public async run(
    prompt: RawCreativePrompt,
    options?: OrchestratorOptions,
  ): Promise<{
    snapshot: WorkflowExecutionSnapshot;
    storyGraph: StoryGraph;
    performanceScripts?: PerformanceScript[];
  }> {
    const notify = (stage: WorkflowStage, msg: string) => {
      options?.onProgress?.(stage, msg);
    };

    // Initialize model provider
    if (!this.modelProvider.isInitialized) {
      await this.modelProvider.initialize();
    }

    const projectId = `proj-${Date.now()}`;
    const stateStore = new WorkflowStateStore(projectId, this.persistence);
    const mutationManager = new MutationManager(this.storyGraph);
    const contextBuilder = new ContextBuilder(this.storyGraph);
    const storyDirector = new MainStoryDirector(this.storyGraph, contextBuilder);

    // -------------------------------------------------------------
    // STAGE 1: Creative Input Gateway (Normalizer)
    // -------------------------------------------------------------
    stateStore.setStage('NORMALIZING_INTENT');
    notify('NORMALIZING_INTENT', 'Analyzing raw prompt and normalizing creative intent...');

    const intent: CreativeIntent = await this.normalizer.normalize(prompt);
    stateStore.setIntent(intent);
    notify('NORMALIZING_INTENT', `Normalized intent: "${intent.title}" (${intent.primaryGenre})`);

    // -------------------------------------------------------------
    // STAGE 2: World and Character Designer
    // -------------------------------------------------------------
    stateStore.setStage('DESIGNING_WORLD_AND_CHARACTERS');
    notify('DESIGNING_WORLD_AND_CHARACTERS', 'Designing world rules, locations, and multidimensional characters...');

    const worldManifest = await this.worldDesigner.design(intent);
    this.storyGraph.initializeFromManifest(projectId, intent.title, worldManifest);
    if (this.persistence) {
      this.persistence.saveStoryGraph(this.storyGraph.getState());
    }
    notify('DESIGNING_WORLD_AND_CHARACTERS', `World created: ${worldManifest.worldName} with ${worldManifest.characters.length} characters.`);

    // -------------------------------------------------------------
    // STAGE 3: Story Architect (Initial Blueprint Creation)
    // -------------------------------------------------------------
    stateStore.setStage('ARCHITECTING_BLUEPRINT');
    notify('ARCHITECTING_BLUEPRINT', 'Drafting end-to-end narrative blueprint from opening to ending...');

    let blueprint: NarrativeBlueprint = await this.storyArchitect.createBlueprint(intent, worldManifest);
    stateStore.setBlueprint(blueprint);
    notify('ARCHITECTING_BLUEPRINT', `Blueprint drafted with ${blueprint.acts.length} acts.`);

    // -------------------------------------------------------------
    // STAGE 4: Narrative Integrity Review (Max 2 Passes)
    // -------------------------------------------------------------
    stateStore.setStage('REVIEWING_BLUEPRINT_PASS_1');
    notify('REVIEWING_BLUEPRINT_PASS_1', 'Performing Pass 1 Narrative Integrity Review...');

    let reviewResult = await this.narrativeReviewer.reviewBlueprint(blueprint, worldManifest);
    stateStore.recordBlueprintReview(reviewResult);

    if (!reviewResult.isApproved) {
      notify('REVISING_BLUEPRINT', `Pass 1 requested revisions: ${reviewResult.overallAssessment}`);
      stateStore.setStage('REVISING_BLUEPRINT');

      // Architect revises blueprint
      blueprint = await this.storyArchitect.reviseBlueprint(blueprint, reviewResult);
      stateStore.setBlueprint(blueprint);

      // Pass 2 Review
      stateStore.setStage('REVIEWING_BLUEPRINT_PASS_2');
      notify('REVIEWING_BLUEPRINT_PASS_2', 'Performing Pass 2 Narrative Integrity Review...');
      reviewResult = await this.narrativeReviewer.reviewBlueprint(blueprint, worldManifest);
      stateStore.recordBlueprintReview(reviewResult);

      if (!reviewResult.isApproved) {
        // Escalate! Strictly prevent infinite loop
        stateStore.setStage(
          'ESCALATED_NEEDS_INTERVENTION',
          `Blueprint rejected after 2 review passes: ${reviewResult.overallAssessment}`,
        );
        notify('ESCALATED_NEEDS_INTERVENTION', 'Review rejected twice. Escalated to human operator.');
        return {
          snapshot: stateStore.getSnapshot(),
          storyGraph: this.storyGraph,
        };
      }
    }

    // Blueprint Approved
    blueprint.reviewStatus = 'approved';
    stateStore.setBlueprint(blueprint);
    stateStore.setStage('BLUEPRINT_APPROVED');
    notify('BLUEPRINT_APPROVED', 'Narrative Blueprint officially approved. Transitioning to Execution Layer.');

    // -------------------------------------------------------------
    // STAGE 5: Narrative Execution Loop (Director, Writer, Scene Reviewer)
    // -------------------------------------------------------------
    const maxScenes = options?.maxScenesToProduce ?? 999;
    let scenesProduced = 0;

    while (scenesProduced < maxScenes) {
      const nextContract = storyDirector.getNextSceneToProduce(blueprint);
      if (!nextContract) {
        break; // All planned scenes completed
      }

      stateStore.setStage('EXECUTING_SCENE');
      notify('EXECUTING_SCENE', `Producing Scene #${nextContract.sceneIndex + 1}: "${nextContract.title}"...`);

      let currentRetry = 0;
      let sceneApproved = false;
      let revisionNotes: string | undefined = undefined;

      while (!sceneApproved && currentRetry < 2) {
        currentRetry++;
        stateStore.incrementSceneRetry(nextContract.id);

        const task = storyDirector.createWritingTask(nextContract, intent, revisionNotes);
        const draft = await this.writingAgent.draftScene(task, options?.onToken);

        // Scene Review
        stateStore.setStage('REVIEWING_SCENE');
        notify('REVIEWING_SCENE', `Reviewing draft for Scene #${nextContract.sceneIndex + 1} (Attempt ${currentRetry})...`);

        const sceneReview = await this.sceneReviewer.reviewScene(
          nextContract,
          draft,
          task.projection,
          currentRetry,
        );
        stateStore.recordSceneReview(nextContract.id, sceneReview);

        if (sceneReview.isApproved) {
          // Commit Scene to Authoritative Story Graph
          stateStore.setStage('COMMITTING_SCENE');
          notify('COMMITTING_SCENE', `Committing approved Scene #${nextContract.sceneIndex + 1} to Story Graph...`);

          const committedMutations = [];
          for (const mut of draft.proposedMutations) {
            try {
              const applied = mutationManager.applyMutation(mut, nextContract.id);
              committedMutations.push(applied);
            } catch (err: any) {
              console.warn(`[Orchestrator] Mutation dropped: ${err.message}`);
            }
          }

          this.storyGraph.commitScene(nextContract, draft.prose, draft.summary, committedMutations);
          if (this.persistence) {
            this.persistence.saveStoryGraph(this.storyGraph.getState());
          }

          stateStore.markSceneCompleted(nextContract.id);
          sceneApproved = true;
          scenesProduced++;
          notify('COMMITTING_SCENE', `Scene #${nextContract.sceneIndex + 1} committed successfully (${draft.wordCount} words).`);
        } else {
          revisionNotes = sceneReview.requiredRevisions.join('\n');
          notify('REVIEWING_SCENE', `Scene draft rejected: ${sceneReview.overallCritique}`);
        }
      }

      if (!sceneApproved) {
        stateStore.setStage(
          'ESCALATED_NEEDS_INTERVENTION',
          `Scene ${nextContract.id} failed review after ${currentRetry} attempts.`,
        );
        notify('ESCALATED_NEEDS_INTERVENTION', `Scene ${nextContract.id} revision limit exhausted.`);
        return {
          snapshot: stateStore.getSnapshot(),
          storyGraph: this.storyGraph,
        };
      }
    }

    // -------------------------------------------------------------
    // STAGE 6: Audio Performance Preparation (Narration Director)
    // -------------------------------------------------------------
    const performanceScripts: PerformanceScript[] = [];

    if (options?.enableAudioPreparation !== false) {
      stateStore.setStage('PREPARING_AUDIO');
      notify('PREPARING_AUDIO', 'Directing audio performance and sound design for approved scenes...');

      const scenes = this.storyGraph.getAllScenes();
      for (const scene of scenes) {
        const perfScript = await this.narrationDirector.preparePerformance(scene);
        performanceScripts.push(perfScript);
      }
      notify('PREPARING_AUDIO', `Generated audio performance scripts for ${performanceScripts.length} scenes.`);
    }

    stateStore.setStage('COMPLETED');
    notify('COMPLETED', 'Narrative production pipeline completed successfully.');

    return {
      snapshot: stateStore.getSnapshot(),
      storyGraph: this.storyGraph,
      performanceScripts,
    };
  }

  /**
   * Resumes an existing workflow run from its last committed state.
   */
  public async resume(
    projectId: string,
    options?: OrchestratorOptions,
  ): Promise<{
    snapshot: WorkflowExecutionSnapshot;
    storyGraph: StoryGraph;
    performanceScripts?: PerformanceScript[];
  }> {
    if (!this.persistence) {
      throw new Error('[WorkflowOrchestrator] PersistenceManager is required for workflow resumption');
    }

    const savedGraph = this.persistence.loadStoryGraph(projectId);
    const savedSnapshot = this.persistence.loadWorkflowSnapshot(projectId);

    if (!savedGraph || !savedSnapshot) {
      throw new Error(`[WorkflowOrchestrator] No persisted state found for project: ${projectId}`);
    }

    const restoredGraph = new StoryGraph(savedGraph);
    const restoredOrchestrator = new WorkflowOrchestrator(
      this.modelProvider,
      restoredGraph,
      this.persistence,
      this.failurePolicy,
    );

    const intentPrompt: RawCreativePrompt = {
      rawPrompt: savedSnapshot.intent?.premise || 'Resuming story execution',
      format: savedSnapshot.intent?.format,
    };

    return restoredOrchestrator.run(intentPrompt, options);
  }
}
