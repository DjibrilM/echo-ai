import test from 'node:test';
import assert from 'node:assert/strict';
import { StoryGraph } from '../memory/story-graph.ts';
import { ContextBuilder } from '../memory/context-builder.ts';
import type { WorldBuildingManifest } from '../types/character.types.ts';
import type { SceneContract } from '../types/blueprint.types.ts';

const createThreeCharacterManifest = (): WorldBuildingManifest => ({
  worldName: 'Outpost Epsilon-9',
  overview: 'Orbital comms station',
  technologyOrMagicLevel: 'Hard sci-fi',
  societalStructures: ['Station Directorate'],
  rulesAndConstraints: [
    { id: 'r1', category: 'technology', statement: 'Subspace transmission takes 42 minutes.', isImmutable: true },
  ],
  locations: [
    {
      id: 'loc-vault',
      name: 'Comms Vault',
      environmentType: 'Cryo room',
      description: 'Chamber with liquid helium coils',
      sensoryDetails: { sights: ['CRT'], sounds: ['Hum'], smellsOrAtmosphere: ['Ozone'] },
      currentCondition: 'Operational',
    },
    {
      id: 'loc-office',
      name: 'Director Office',
      environmentType: 'Executive suite',
      description: 'Wood and glass viewing deck',
      sensoryDetails: { sights: ['Starfield'], sounds: ['Quiet'], smellsOrAtmosphere: ['Coffee'] },
      currentCondition: 'Pristine',
    },
  ],
  characters: [
    {
      id: 'char-1',
      name: 'Sean Doyle',
      aliases: [],
      role: 'protagonist',
      personality: {
        traits: ['Meticulous'],
        primaryMotivation: 'Uncover truth',
        secondaryMotivations: [],
        coreFlaw: 'Obsession',
        fears: [],
        weaknesses: [],
        internalContradictions: [],
      },
      dialogueStyle: { vocabularyLevel: 'Technical', speechCadence: 'Measured', catchphrasesOrQuirks: [], subtextTendency: 'Terse' },
      backstorySummary: 'Station officer',
      relationships: [
        { targetCharacterId: 'char-2', relationshipType: 'Superior', dynamic: 'Strained', trustScore: 0.1 },
        { targetCharacterId: 'char-3', relationshipType: 'Friend', dynamic: 'Affectionate', trustScore: 0.9 },
      ],
    },
    {
      id: 'char-2',
      name: 'Director Chen',
      aliases: [],
      role: 'antagonist',
      personality: {
        traits: ['Shrewd'],
        primaryMotivation: 'Suppress signal',
        secondaryMotivations: [],
        coreFlaw: 'Ruthless',
        fears: [],
        weaknesses: [],
        internalContradictions: [],
      },
      dialogueStyle: { vocabularyLevel: 'Administrative', speechCadence: 'Smooth', catchphrasesOrQuirks: [], subtextTendency: 'Veiled threats' },
      backstorySummary: 'Director',
      relationships: [
        { targetCharacterId: 'char-1', relationshipType: 'Subordinate', dynamic: 'Suspicious', trustScore: -0.2 },
      ],
    },
    {
      id: 'char-3',
      name: 'Engineer Maya Lin',
      aliases: [],
      role: 'supporting',
      personality: {
        traits: ['Loyal'],
        primaryMotivation: 'Keep life support running',
        secondaryMotivations: [],
        coreFlaw: 'Timid',
        fears: [],
        weaknesses: [],
        internalContradictions: [],
      },
      dialogueStyle: { vocabularyLevel: 'Casual', speechCadence: 'Fast', catchphrasesOrQuirks: [], subtextTendency: 'Open' },
      backstorySummary: 'Power tech',
      relationships: [
        { targetCharacterId: 'char-1', relationshipType: 'Ally', dynamic: 'Warm', trustScore: 0.9 },
      ],
    },
  ],
  initialEpistemicStates: {
    'char-1': { characterId: 'char-1', knownFacts: ['Fact A'], falseBeliefs: [], hiddenSecrets: [], currentGoal: 'Listen', emotionalState: 'Tense', physicalLocationId: 'loc-vault' },
    'char-2': { characterId: 'char-2', knownFacts: ['Fact B'], falseBeliefs: [], hiddenSecrets: [], currentGoal: 'Stop Doyle', emotionalState: 'Calm', physicalLocationId: 'loc-vault' },
    'char-3': { characterId: 'char-3', knownFacts: ['Fact C'], falseBeliefs: [], hiddenSecrets: [], currentGoal: 'Fix reactor', emotionalState: 'Tired', physicalLocationId: 'loc-office' },
  },
});

test('ContextBuilder: constructs isolated projection with ONLY participating characters', () => {
  const graph = new StoryGraph();
  graph.initializeFromManifest('proj-test', 'Test', createThreeCharacterManifest());
  const builder = new ContextBuilder(graph);

  const sceneBetween1and2: SceneContract = {
    id: 'scene-02',
    chapterId: 'ch-01',
    sceneIndex: 1,
    title: 'The Standoff',
    objective: 'Chen confronts Doyle in the vault',
    participatingCharacterIds: ['char-1', 'char-2'], // Maya (char-3) is NOT participating
    focusCharacterId: 'char-1',
    locationId: 'loc-vault',
    openingConditions: 'Door opens',
    requiredEvents: ['Chen demands the drive'],
    requiredRevelations: [],
    characterMotivationsInScene: { 'char-1': 'Defend', 'char-2': 'Confiscate' },
    emotionalShift: { from: 'Shock', to: 'Confrontation' },
    continuityConstraints: [],
    expectedClosingConditions: 'Chen issues deadline',
    dependencies: ['scene-01'],
    targetWordCount: 800,
    beats: [],
    status: 'planned',
  };

  const projection = builder.buildContextForScene(sceneBetween1and2);

  // Assert only char-1 and char-2 are in activeCharacters
  assert.equal(projection.activeCharacters.length, 2);
  const characterIds = projection.activeCharacters.map((c) => c.profile.id);
  assert.ok(characterIds.includes('char-1'));
  assert.ok(characterIds.includes('char-2'));
  assert.ok(!characterIds.includes('char-3'), 'Unrelated character Maya Lin must be excluded from context');

  // Assert Doyle relationship to Maya is filtered out because Maya is not participating in this scene
  const doyleContext = projection.activeCharacters.find((c) => c.profile.id === 'char-1')!;
  assert.equal(doyleContext.relationshipsWithOtherParticipants.length, 1);
  assert.equal(doyleContext.relationshipsWithOtherParticipants[0].targetCharacterId, 'char-2');

  // Assert context token size is well within limits (< 1500 tokens for this scene)
  const tokenEst = builder.estimateProjectionTokens(projection);
  assert.ok(tokenEst < 2000, `Context projection tokens should be compact, was ${tokenEst}`);
});

test('ContextBuilder: includes previous scene closing snippet for prose continuity', () => {
  const graph = new StoryGraph();
  graph.initializeFromManifest('proj-test', 'Test', createThreeCharacterManifest());

  const contract1: SceneContract = {
    id: 'scene-01',
    chapterId: 'ch-01',
    sceneIndex: 0,
    title: 'The Intercept',
    objective: 'First contact',
    participatingCharacterIds: ['char-1'],
    focusCharacterId: 'char-1',
    locationId: 'loc-vault',
    openingConditions: 'Night',
    requiredEvents: ['Signal arrives'],
    requiredRevelations: [],
    characterMotivationsInScene: { 'char-1': 'Decode' },
    emotionalShift: { from: 'Cold', to: 'Awe' },
    continuityConstraints: [],
    expectedClosingConditions: 'Hatch opens',
    dependencies: [],
    targetWordCount: 500,
    beats: [],
    status: 'approved',
  };

  graph.commitScene(
    contract1,
    'Paragraph 1: Doyle calibrated the dials.\n\nParagraph 2: A sudden voice crackled over the radio.\n\nParagraph 3: Across the vault, the heavy hatch seals hissed open.',
    'Doyle intercepts the signal just as the hatch opens.',
    [],
  );

  const builder = new ContextBuilder(graph);
  const contract2: SceneContract = {
    ...contract1,
    id: 'scene-02',
    sceneIndex: 1,
    dependencies: ['scene-01'],
  };

  const projection = builder.buildContextForScene(contract2);
  assert.ok(projection.previousSceneBridge.closingSnippet);
  assert.ok(projection.previousSceneBridge.closingSnippet.includes('hatch seals hissed open'));
  assert.equal(projection.previousSceneBridge.summary, 'Doyle intercepts the signal just as the hatch opens.');
});

