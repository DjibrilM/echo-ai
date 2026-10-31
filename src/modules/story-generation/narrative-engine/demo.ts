import { QvacAdapter } from './model/qvac-adapter.ts';
import { StoryGraph } from './memory/story-graph.ts';
import { PersistenceManager } from './memory/persistence.ts';
import { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator.ts';
import { CosyVoiceAudioProducer } from './audio/cosyvoice-producer.ts';
import type { RawCreativePrompt } from './types/creative-intent.types.ts';

/**
 * End-to-end interactive demo of the Modular AI Narrative Orchestration Engine.
 * Run with: node src/modules/story-generation/narrative-engine/demo.ts
 */
async function main() {
  console.log('='.repeat(80));
  console.log('   MODULAR AI NARRATIVE ORCHESTRATION ENGINE (Echo-AI)');
  console.log('   Model Provider: Live QVAC Gemma 4 Local Inference');
  console.log('   Audio Engine: CosyVoice 3 Neural Voice Processing');
  console.log('='.repeat(80));

  const modelProvider = new QvacAdapter();
  await modelProvider.initialize();

  const storyGraph = new StoryGraph();
  const persistence = new PersistenceManager();
  const orchestrator = new WorkflowOrchestrator(modelProvider, storyGraph, persistence);
  const audioProducer = new CosyVoiceAudioProducer({ useLiveQvacEngine: true });

  const prompt: RawCreativePrompt = {
    rawPrompt: 'A veteran deep-space communications officer at an isolated orbital outpost intercepts an archaic analog distress call from a colonial transport lost a century ago, while his commanding officer attempts to enforce a classified silence.',
    genreHints: ['Hard Sci-Fi', 'Psychological Thriller', 'Mystery'],
    format: 'short_story',
    constraints: ['No faster-than-light radio', 'Grounded signal physics'],
  };

  console.log('\n[Stage 1] Launching Narrative Pipeline with prompt:\n', prompt.rawPrompt, '\n');

  const result = await orchestrator.run(prompt, {
    maxScenesToProduce: 2,
    enableAudioPreparation: true,
    onProgress: (stage, message) => {
      console.log(`[${new Date().toISOString().slice(11, 19)}] [${stage}] ${message}`);
    },
  });

  console.log('\n' + '='.repeat(80));
  console.log('   PIPELINE EXECUTION COMPLETE');
  console.log('='.repeat(80));

  const intent = result.snapshot.intent;
  console.log(`\nStory Title: ${intent?.title}`);
  console.log(`Premise: ${intent?.premise}`);
  console.log(`Primary Genre: ${intent?.primaryGenre} (${intent?.subgenres.join(', ')})`);
  console.log(`Tone: ${intent?.tone.join(', ')}`);

  const graphState = result.storyGraph.getState();
  console.log(`\nCast of Characters (${Object.keys(graphState.characters).length}):`);
  for (const char of Object.values(graphState.characters)) {
    const epistemic = graphState.epistemicStates[char.id];
    console.log(`  - ${char.name} (${char.role})`);
    console.log(`    Motivation: ${char.personality.primaryMotivation}`);
    console.log(`    Known Facts: ${epistemic ? epistemic.knownFacts.length : 0}`);
    console.log(`    Secret: ${epistemic?.hiddenSecrets[0] || 'None'}`);
  }

  const producedScenes = result.storyGraph.getAllScenes();
  console.log(`\nScenes Generated: ${producedScenes.length}`);
  for (const scene of producedScenes) {
    console.log(`\n--- Scene: ${scene.contract.title} (${scene.contract.id}) ---`);
    console.log(`Word Count: ${scene.prose.split(/\\s+/).length}`);
    console.log(`Status: ${scene.contract.status}`);
    console.log(`Prose Preview:\n${scene.prose.slice(0, 300)}...\n`);
  }

  if (result.performanceScripts && result.performanceScripts.length > 0) {
    for (const perfScript of result.performanceScripts) {
      console.log(`Performance Utterances: ${perfScript.segments.length}`);
      console.log(`Assembling CosyVoice 3 Audio with natural voice processing...`);
      const sceneAudio = await audioProducer.assembleSceneAudio(perfScript);
      console.log(`Audio File: ${sceneAudio.masterAudioFilePath}`);
      console.log(`Total Audio Duration: ${(sceneAudio.totalDurationMs / 1000).toFixed(1)}s`);
      console.log(`Sound Effects Applied: ${sceneAudio.soundEffectsApplied}`);
    }
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err);
  process.exit(1);
});
