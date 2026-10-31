import { StoryGraphStateSchema } from '../types/story-graph.types.ts';
import type {
  StoryGraphState,
  CanonicalSceneRecord,
  PlotThread,
  TimelineEvent,
  CommittedMutation,
} from '../types/story-graph.types.ts';
import type {
  CharacterProfile,
  CharacterEpistemicState,
  WorldLocation,
  WorldFact,
  WorldBuildingManifest,
} from '../types/character.types.ts';
import type { SceneContract } from '../types/blueprint.types.ts';

export class StoryGraph {
  private state: StoryGraphState;

  constructor(initialState?: StoryGraphState) {
    if (initialState) {
      this.state = StoryGraphStateSchema.parse(initialState);
    } else {
      this.state = {
        projectId: `proj-${Date.now()}`,
        title: 'Untitled Narrative',
        characters: {},
        epistemicStates: {},
        locations: {},
        worldFacts: [],
        plotThreads: {},
        scenes: {},
        sceneExecutionOrder: [],
        timeline: [],
        unresolvedMysteries: [],
        establishedRevelations: [],
        version: 1,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  public getState(): StoryGraphState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public initializeFromManifest(projectId: string, title: string, manifest: WorldBuildingManifest): void {
    this.state.projectId = projectId;
    this.state.title = title;

    for (const char of manifest.characters) {
      this.state.characters[char.id] = char;
    }

    for (const [charId, epistemic] of Object.entries(manifest.initialEpistemicStates)) {
      this.state.epistemicStates[charId] = epistemic;
    }

    for (const loc of manifest.locations) {
      this.state.locations[loc.id] = loc;
    }

    this.state.worldFacts = [...manifest.rulesAndConstraints];
    this.state.updatedAt = new Date().toISOString();
    this.state.version++;
  }

  public getCharacter(id: string): CharacterProfile | undefined {
    return this.state.characters[id];
  }

  public getEpistemicState(id: string): CharacterEpistemicState | undefined {
    return this.state.epistemicStates[id];
  }

  public getLocation(id: string): WorldLocation | undefined {
    return this.state.locations[id];
  }

  public getScene(id: string): CanonicalSceneRecord | undefined {
    return this.state.scenes[id];
  }

  public getAllScenes(): CanonicalSceneRecord[] {
    return this.state.sceneExecutionOrder.map((id) => this.state.scenes[id]).filter(Boolean);
  }

  public getPreviousScene(currentSceneId: string): CanonicalSceneRecord | undefined {
    const idx = this.state.sceneExecutionOrder.indexOf(currentSceneId);
    if (idx > 0) {
      const prevId = this.state.sceneExecutionOrder[idx - 1];
      return this.state.scenes[prevId];
    }
    if (idx === -1 && this.state.sceneExecutionOrder.length > 0) {
      const lastId = this.state.sceneExecutionOrder[this.state.sceneExecutionOrder.length - 1];
      return this.state.scenes[lastId];
    }
    return undefined;
  }

  public commitScene(
    contract: SceneContract,
    prose: string,
    summary: string,
    mutations: CommittedMutation[],
  ): void {
    const record: CanonicalSceneRecord = {
      contract,
      prose,
      summary,
      wordCount: prose.trim().split(/\s+/).length,
      generatedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      mutationsApplied: mutations,
    };

    this.state.scenes[contract.id] = record;
    if (!this.state.sceneExecutionOrder.includes(contract.id)) {
      this.state.sceneExecutionOrder.push(contract.id);
    }

    this.state.updatedAt = new Date().toISOString();
    this.state.version++;
  }

  public addTimelineEvent(event: TimelineEvent): void {
    this.state.timeline.push(event);
    this.state.timeline.sort((a, b) => a.chronologicalIndex - b.chronologicalIndex);
  }

  public addPlotThread(thread: PlotThread): void {
    this.state.plotThreads[thread.id] = thread;
  }

  public updatePlotThread(threadId: string, status: PlotThread['status'], resolvedInSceneId?: string): void {
    if (this.state.plotThreads[threadId]) {
      this.state.plotThreads[threadId].status = status;
      if (resolvedInSceneId) {
        this.state.plotThreads[threadId].resolvedInSceneId = resolvedInSceneId;
      }
    }
  }

  public addWorldFact(fact: WorldFact): void {
    const exists = this.state.worldFacts.some((f) => f.statement === fact.statement);
    if (!exists) {
      this.state.worldFacts.push(fact);
    }
  }

  public addRevelation(revelation: string): void {
    if (!this.state.establishedRevelations.includes(revelation)) {
      this.state.establishedRevelations.push(revelation);
    }
  }

  public addUnresolvedMystery(mystery: string): void {
    if (!this.state.unresolvedMysteries.includes(mystery)) {
      this.state.unresolvedMysteries.push(mystery);
    }
  }

  public resolveMystery(mystery: string): void {
    this.state.unresolvedMysteries = this.state.unresolvedMysteries.filter((m) => m !== mystery);
  }
}
