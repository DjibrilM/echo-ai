import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CosyVoiceAudioProcessor,
  CosyVoiceAudioProducer,
} from '../audio/cosyvoice-producer.ts';
import type { PerformanceScript } from '../types/narration.types.ts';

test('CosyVoiceAudioProcessor: processes whisper cue with soft volume and breath padding', () => {
  const result = CosyVoiceAudioProcessor.processConversationalCues(
    'Static. I cannot decipher the harmonic.',
    'whispering',
    0.6,
  );

  assert.equal(result.volume, 'soft');
  assert.equal(result.pace, 'slow');
  assert.ok(result.processedText.startsWith('<breath>'));
  assert.ok(result.processedText.endsWith('<breath>'));
  assert.ok(result.detectedCues.includes('whisper'));
});

test('CosyVoiceAudioProcessor: processes furious shouting with strong tag, loud volume, and anger emotion', () => {
  const result = CosyVoiceAudioProcessor.processConversationalCues(
    'Step away from that console immediately!',
    'furious',
    0.9,
  );

  assert.equal(result.volume, 'loud');
  assert.equal(result.cosyEmotion, 'anger');
  assert.equal(result.pace, 'fast');
  assert.ok(result.processedText.includes('<strong>'));
  assert.ok(result.processedText.includes('</strong>'));
});

test('CosyVoiceAudioProcessor: transforms inline brackets [sigh], [gasp], [raise], [hmm]', () => {
  const raw = '[gasp] What was that? [sigh] It must be the relay. [raise]Get the lights![/raise]';
  const result = CosyVoiceAudioProcessor.processConversationalCues(raw, 'neutral');

  assert.ok(!result.processedText.includes('[gasp]'));
  assert.ok(!result.processedText.includes('[sigh]'));
  assert.ok(!result.processedText.includes('[raise]'));
  assert.ok(result.processedText.includes('<breath>'));
  assert.ok(result.processedText.includes('<strong>Get the lights!</strong>'));
  assert.ok(result.detectedCues.includes('gasp'));
  assert.ok(result.detectedCues.includes('breath'));
  assert.ok(result.detectedCues.includes('raise'));
});

test('CosyVoiceAudioProcessor: preserves XML tags during natural sentence splitting', () => {
  const longText =
    '<breath> The cryo-lines along the bulkheads exhaled a fine mist of frost. Below his boots, the six-ton titanium flywheel kept a phantom heartbeat through the deckplates. <strong>It sounded like a razor blade drawn across glass.</strong>';

  const chunks = CosyVoiceAudioProcessor.splitIntoNaturalSpeechChunks(longText, 15);
  assert.ok(chunks.length >= 2);
  // Verify XML tags are intact
  assert.ok(chunks.some((c) => c.includes('<breath>')));
  assert.ok(chunks.some((c) => c.includes('<strong>') && c.includes('</strong>')));
});

test('CosyVoiceAudioProcessor: generates acoustic room pause and crossfades samples', () => {
  const pause = CosyVoiceAudioProcessor.generateAcousticRoomPause(0.1, 24000);
  assert.equal(pause.length, 2400); // 0.1s * 24000 = 2400 samples

  const chunk1 = new Array(1000).fill(5000);
  const chunk2 = new Array(1000).fill(-5000);
  CosyVoiceAudioProcessor.crossfadeAppend(chunk1, chunk2, 24000, 10);

  // Assert smooth blend occurred
  assert.ok(chunk1.length > 1000);
});

test('CosyVoiceAudioProcessor: encodes valid RIFF WAV buffer', () => {
  const samples = [0, 1000, 2000, -2000, -1000, 0];
  const wavBuffer = CosyVoiceAudioProcessor.pcmToWavBuffer(samples, 24000);

  assert.equal(wavBuffer.toString('utf-8', 0, 4), 'RIFF');
  assert.equal(wavBuffer.toString('utf-8', 8, 12), 'WAVE');
  assert.equal(wavBuffer.readUInt32LE(24), 24000); // Sample rate
  assert.equal(wavBuffer.readUInt16LE(34), 16); // 16-bit PCM
});

test('CosyVoiceAudioProducer: produces segments and assembles master scene audio', async () => {
  const tempDir = path.join(os.tmpdir(), `echo-cosy-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const producer = new CosyVoiceAudioProducer(tempDir);

    const script: PerformanceScript = {
      sceneId: 'scene-test-01',
      sceneTitle: 'The Whispering Coil',
      voiceCast: {
        'char-doyle': {
          characterId: 'char-doyle',
          characterName: 'Sean Doyle',
          assignedVoiceId: 'TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0',
          engine: 'cosyvoice3',
          gender: 'male',
          pitchOffset: 0.0,
          naturalSpeed: 1.0,
        },
      },
      ambienceTrack: {
        ambienceId: 'amb-vault',
        description: 'Cold mechanical room hum',
        category: 'sci_fi',
        loop: true,
        volume: 0.3,
        fadeInMs: 1000,
        fadeOutMs: 1000,
      },
      segments: [
        {
          id: 'seg-01',
          utteranceIndex: 0,
          sceneId: 'scene-test-01',
          speakerId: 'char-doyle',
          speakerName: 'Sean Doyle',
          isDialogue: true,
          spokenText: 'Static. [whisper] I cannot decipher the harmonic.',
          voiceProfile: {
            characterId: 'char-doyle',
            characterName: 'Sean Doyle',
            assignedVoiceId: 'TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0',
            engine: 'cosyvoice3',
            gender: 'male',
            pitchOffset: 0.0,
            naturalSpeed: 1.0,
          },
          performance: {
            emotion: 'whispering',
            deliveryIntensity: 0.6,
            speedMultiplier: 1.0,
            prePauseMs: 150,
            postPauseMs: 250,
          },
          soundDesignCue: {
            soundEffectId: 'sfx-radio-static',
            sfxVolume: 0.4,
            sfxTriggerPoint: 'start',
          },
        },
        {
          id: 'seg-02',
          utteranceIndex: 1,
          sceneId: 'scene-test-01',
          speakerId: 'char-doyle',
          speakerName: 'Sean Doyle',
          isDialogue: true,
          spokenText: '[gasp] Wait... the carrier wave is stabilizing!',
          voiceProfile: {
            characterId: 'char-doyle',
            characterName: 'Sean Doyle',
            assignedVoiceId: 'TTS_COSYVOICE3_LLM_COSYVOICE_Q8_0',
            engine: 'cosyvoice3',
            gender: 'male',
            pitchOffset: 0.0,
            naturalSpeed: 1.05,
          },
          performance: {
            emotion: 'urgent',
            deliveryIntensity: 0.8,
            speedMultiplier: 1.1,
            prePauseMs: 100,
            postPauseMs: 300,
          },
        },
      ],
      estimatedDurationSeconds: 12.0,
    };

    const sceneAudio = await producer.assembleSceneAudio(script);

    assert.equal(sceneAudio.sceneId, 'scene-test-01');
    assert.equal(sceneAudio.segments.length, 2);
    assert.ok(sceneAudio.totalDurationMs > 0);
    assert.ok(fs.existsSync(sceneAudio.masterAudioFilePath));
    assert.equal(sceneAudio.ambienceApplied, true);
    assert.equal(sceneAudio.soundEffectsApplied, 1);

    const stats = fs.statSync(sceneAudio.masterAudioFilePath);
    assert.ok(stats.size > 1000, 'Master WAV file should be generated with valid audio bytes');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
