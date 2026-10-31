import test from 'node:test';
import assert from 'node:assert/strict';
import { StoryGraph } from '../memory/story-graph.ts';
import { MutationManager } from '../memory/mutation-manager.ts';
import type { WorldBuildingManifest } from '../types/character.types.ts';
import type { SceneContract } from '../types/blueprint.types.ts';

const createSampleManifest = (): WorldBuildingManifest => ({
  worldName: 'Outpost Epsilon-9',
  overview: 'Orbital comms station',
  technologyOrMagicLevel: 'Hard sci-fi',
  societalStructures: ['Station Directorate'],
  rulesAndConstraints: [
    {
      id: 'rule-01',
      category: 'technology',
      statement: 'Radio signals take 42 minutes to reach central relay.',
      isImmutable: true,
    },
  ],
  locations: [
    {
      id: 'loc-vault',
      name: 'Comms Vault',
      environmentType: 'Cryo room',
      description: 'Chamber with liquid helium coils',
      sensoryDetails: { sights: ['Amber phosphor'], sounds: ['Hum of pumps'], smellsOrAtmosphere: ['Ozone'] },
      currentCondition: 'Cold and operational',
    },
  ],
  characters: [
    {
      id: 'char-doyle',
      name: 'Sean Doyle',
      aliases: ['Doyle'],
      role: 'protagonist',
      personality: {
        traits: ['Meticulous', 'Guilt-ridden'],
        primaryMotivation: 'Uncover the signal origin',
        secondaryMotivations: [],
        coreFlaw: 'Obsessive refusal to follow orders',
        fears: ['Loss of sanity'],
        weaknesses: ['Insomnia'],
        internalContradictions: ['Loyal officer who operates an illegal decryptor'],
      },
      dialogueStyle: {
        vocabularyLevel: 'Naval technical',
        speechCadence: 'Measured',
        catchphrasesOrQuirks: ['Clears throat'],
        subtextTendency: 'Masks fear with protocol',
      },
      backstorySummary: 'Stationed on Epsilon-9 after the Mars incident.',
      relationships: [
        {
          targetCharacterId: 'char-chen',
          relationshipType: 'Commanding Officer',
          dynamic: 'Subordinate strained by distrust',
          trustScore: 0.2,
        },
      ],
    },
    {
      id: 'char-chen',
      name: 'Director Chen',
      aliases: ['Chen'],
      role: 'antagonist',
      personality: {
        traits: ['Ruthless', 'Diplomatic'],
        primaryMotivation: 'Suppress classified telemetry',
        secondaryMotivations: [],
        coreFlaw: 'Treats crew as disposable',
        fears: ['Scandal'],
        weaknesses: ['Arrogance'],
        internalContradictions: ['Despises the regime she enforces'],
      },
      dialogueStyle: {
        vocabularyLevel: 'Administrative',
        speechCadence: 'Smooth',
        catchphrasesOrQuirks: [],
        subtextTendency: 'Veiled threats',
      },
      backstorySummary: 'Director overseeing station closure.',
      relationships: [],
    },
  ],
  initialEpistemicStates: {
    'char-doyle': {
      characterId: 'char-doyle',
      knownFacts: ['The auxiliary deck is operational.'],
      falseBeliefs: ['Chen does not know about the decryptor.'],
      hiddenSecrets: ['Has an unauthorized decrypted tape.'],
      currentGoal: 'Isolate signal baseline.',
      emotionalState: 'Apprehensive',
      physicalLocationId: 'loc-vault',
    },
    'char-chen': {
      characterId: 'char-chen',
      knownFacts: ['Power spikes have been detected in the vault.'],
      falseBeliefs: [],
      hiddenSecrets: ['The signal is a military weapon test.'],
      currentGoal: 'Confiscate data before transmission.',
      emotionalState: 'Coldly confident',
      physicalLocationId: 'loc-vault',
    },
  },
});

test('StoryGraph: initializes state correctly and maintains character knowledge boundaries', () => {
  const graph = new StoryGraph();
  const manifest = createSampleManifest();
  graph.initializeFromManifest('proj-test', 'Test Title', manifest);

  const doyle = graph.getCharacter('char-doyle');
  const doyleState = graph.getEpistemicState('char-doyle');
  const chenState = graph.getEpistemicState('char-chen');

  assert.ok(doyle);
  assert.equal(doyle?.name, 'Sean Doyle');
  assert.deepEqual(doyleState?.knownFacts, ['The auxiliary deck is operational.']);

  // Verify Chen does NOT know Doyle's secret
  assert.ok(!chenState?.knownFacts.includes('Has an unauthorized decrypted tape.'));
  // Verify Doyle does NOT know Chen's military secret
  assert.ok(!doyleState?.knownFacts.includes('The signal is a military weapon test.'));
});

test('MutationManager: applies valid character_knowledge mutation with provenance', () => {
  const graph = new StoryGraph();
  graph.initializeFromManifest('proj-test', 'Test Title', createSampleManifest());
  const manager = new MutationManager(graph);

  const committed = manager.applyMutation(
    {
      id: 'mut-1',
      type: 'character_knowledge',
      targetEntityId: 'char-doyle',
      action: 'add',
      payload: { newFact: 'Hyperion transport was lost in 2084.' },
      justification: 'Doyle reads the decoded manifest.',
    },
    'scene-01',
  );

  assert.equal(committed.appliedSuccessfully, true);
  assert.equal(committed.sourceSceneId, 'scene-01');

  // Verify Doyle gained knowledge
  const doyleState = graph.getEpistemicState('char-doyle');
  assert.ok(doyleState?.knownFacts.includes('Hyperion transport was lost in 2084.'));

  // Verify Chen did NOT gain knowledge (no leakage)
  const chenState = graph.getEpistemicState('char-chen');
  assert.ok(!chenState?.knownFacts.includes('Hyperion transport was lost in 2084.'));
});

test('MutationManager: rejects invalid mutations without altering state', () => {
  const graph = new StoryGraph();
  graph.initializeFromManifest('proj-test', 'Test Title', createSampleManifest());
  const manager = new MutationManager(graph);

  // Missing target entity
  assert.throws(() => {
    manager.applyMutation(
      {
        id: 'mut-bad',
        type: 'character_knowledge',
        targetEntityId: 'non-existent-character',
        action: 'add',
        payload: { newFact: 'something' },
        justification: 'test',
      },
      'scene-01',
    );
  }, /Target character "non-existent-character" does not exist/);

  // Missing justification
  assert.throws(() => {
    manager.applyMutation(
      {
        id: 'mut-no-just',
        type: 'character_state',
        targetEntityId: 'char-doyle',
        action: 'update',
        payload: { emotionalState: 'Happy' },
        justification: '',
      },
      'scene-01',
    );
  }, /missing required dramatic justification/);
});

test('StoryGraph: commits approved scene and links previous scenes', () => {
  const graph = new StoryGraph();
  graph.initializeFromManifest('proj-test', 'Test Title', createSampleManifest());

  const contract: SceneContract = {
    id: 'scene-01',
    chapterId: 'ch-01',
    sceneIndex: 0,
    title: 'The Intercept',
    objective: 'Discover signal',
    participatingCharacterIds: ['char-doyle'],
    focusCharacterId: 'char-doyle',
    locationId: 'loc-vault',
    openingConditions: 'Night shift',
    requiredEvents: ['Signal spikes'],
    requiredRevelations: [],
    characterMotivationsInScene: { 'char-doyle': 'Survive' },
    emotionalShift: { from: 'Tired', to: 'Alert' },
    continuityConstraints: [],
    expectedClosingConditions: 'Signal recorded',
    dependencies: [],
    targetWordCount: 500,
    beats: [],
    status: 'approved',
  };

  graph.commitScene(
    contract,
    'Doyle sat in the cold vault. The CRT monitor flickered.',
    'Doyle discovers the anomalous signal in the vault.',
    [],
  );

  const scene = graph.getScene('scene-01');
  assert.ok(scene);
  assert.equal(scene.wordCount, 10);
  assert.equal(scene.summary, 'Doyle discovers the anomalous signal in the vault.');

  const prev = graph.getPreviousScene('scene-02');
  assert.equal(prev?.contract.id, 'scene-01');
});
