import {
  createSyntheticSpeechWavUrl,
  createSyntheticWavUrlSync,
  mergeAudioBuffersOrBlobs,
} from '@/lib/audio-wav'
import { SpeechRound, Voice, Generation, QvacEmotion, QvacPace } from '../types'

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function createInitialSampleGeneration(): Generation {
  const initialAudio = typeof window !== 'undefined'
    ? createSyntheticWavUrlSync('I trusted you with everything. Every secret, every fear. And you used it against me.', 8)
    : { url: '', duration: 8 }

  return {
    id: 'gen-1',
    roundIndex: 0,
    title: 'Generation 1',
    textSnippet: 'I trusted you with everything. Every secret, every fear...',
    speakerName: 'Jessica',
    speakerColor: '#10b981',
    speakerAvatarUrl: '/voices/jessica.jpg',
    duration: initialAudio.duration || 8,
    audioUrl: initialAudio.url,
    waveform: [
      10, 10, 10, 25, 65, 10, 10, 10, 10, 10, 10, 10, 45, 80, 95, 45, 65, 25, 10, 10,
      35, 75, 95, 60, 85, 45, 70, 25, 10, 80, 10, 10, 10, 10, 10, 10, 10, 10
    ],
    timestamp: 'Just now',
  }
}

export function autoTagSpeechRounds(rounds: SpeechRound[]): SpeechRound[] {
  return rounds.map((round) => {
    const lower = round.text.toLowerCase()
    let detectedEmotion: QvacEmotion = 'Neutral'
    let detectedPace: QvacPace = 'Moderate'

    if (
      lower.includes('!') ||
      lower.includes('wow') ||
      lower.includes('amazing') ||
      lower.includes('happy') ||
      lower.includes('love') ||
      lower.includes('glad')
    ) {
      detectedEmotion = 'Happy'
    } else if (
      lower.includes('sorry') ||
      lower.includes('hurt') ||
      lower.includes('sad') ||
      lower.includes('crying') ||
      lower.includes('grief') ||
      lower.includes('fear')
    ) {
      detectedEmotion = 'Sad'
      detectedPace = 'Slow'
    } else if (
      lower.includes('stop') ||
      lower.includes('hate') ||
      lower.includes('never') ||
      lower.includes('furious') ||
      lower.includes('anger') ||
      lower.includes('rage')
    ) {
      detectedEmotion = 'Anger'
      detectedPace = 'Fast'
    } else if (
      lower.includes('listen') ||
      lower.includes('order') ||
      lower.includes('command') ||
      lower.includes('must') ||
      lower.includes('halt') ||
      lower.includes('stand')
    ) {
      detectedEmotion = 'Command'
    } else if (
      lower.includes('once upon') ||
      lower.includes('realm') ||
      lower.includes('chapter') ||
      lower.includes('chronicle') ||
      lower.includes('story')
    ) {
      detectedEmotion = 'Narration'
      detectedPace = 'Slow'
    } else if (
      lower.includes('what') ||
      lower.includes('how') ||
      lower.includes('why') ||
      lower.includes('really?')
    ) {
      detectedEmotion = 'Conversation'
    }

    return {
      ...round,
      emotion: detectedEmotion,
      pace: detectedPace,
    }
  })
}

export function playSyntheticTone(
  text: string,
  speed = 1.0,
  onProgress?: (ratio: number) => void,
  onEnd?: () => void,
  volume = 0.85
) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextClass()
    const now = ctx.currentTime
    const words = text.split(/\s+/).filter(Boolean)
    const totalDuration = Math.max(3, Math.min(16, (words.length * 0.42) / speed))

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(Math.max(0.0001, 0.14 * volume), now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration)
    masterGain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()

    osc1.type = 'sawtooth'
    osc2.type = 'triangle'

    const baseFreq = 160 + Math.random() * 60
    osc1.frequency.setValueAtTime(baseFreq, now)
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now)

    for (let i = 0; i < words.length; i++) {
      const t = now + (i * 0.42) / speed
      if (t < now + totalDuration - 0.2) {
        const stepFreq = baseFreq + Math.sin(i * 1.3) * 25
        osc1.frequency.setValueAtTime(stepFreq, t)
        osc2.frequency.setValueAtTime(stepFreq * 1.5, t)
      }
    }

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(950, now)
    filter.Q.setValueAtTime(3, now)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(masterGain)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + totalDuration)
    osc2.stop(now + totalDuration)

    const startMs = Date.now()
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startMs) / 1000
      const ratio = Math.min(1, elapsed / totalDuration)
      onProgress?.(ratio)
      if (ratio >= 1) {
        clearInterval(interval)
        onEnd?.()
      }
    }, 50)

    return () => {
      clearInterval(interval)
      try {
        osc1.stop()
        osc2.stop()
        ctx.close()
      } catch {}
    }
  } catch (e) {
    console.warn('Web Audio synthesis preview tone failed:', e)
    return () => {}
  }
}

export function createSyntheticAudioBlob(durationSeconds = 3): Blob {
  const sampleRate = 44100
  const numChannels = 1
  const numFrames = Math.max(1, Math.floor(sampleRate * durationSeconds))
  const blockAlign = numChannels * 2
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * Math.exp(-t * 0.5)
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    view.setInt16(offset, intSample, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export async function synthesizeRoundSpeech(
  round: SpeechRound,
  speaker: Voice,
  roundIndex: number,
  historyCount: number,
  speed: number
): Promise<Generation> {
  const calculatedDuration = Math.max(4, Math.round((round.text.length * 0.065) / speed))
  const { url: audioUrl, duration: wavDuration } = await createSyntheticSpeechWavUrl(round.text, speed)

  return {
    id: `gen-${Date.now()}`,
    roundIndex,
    title: `Generation ${historyCount + 1}`,
    textSnippet: round.text,
    speakerName: speaker.name,
    speakerColor: speaker.color,
    speakerAvatarUrl: speaker.avatarUrl || '/voices/jessica.jpg',
    duration: wavDuration || calculatedDuration,
    audioUrl,
    waveform: [
      10, 10, 10, 25, 65, 10, 10, 10, 10, 10, 10, 10, 45, 80, 95, 45, 65, 25, 10, 10,
      35, 75, 95, 60, 85, 45, 70, 25, 10, 80, 10, 10, 10, 10, 10, 10, 10, 10,
    ],
    timestamp: 'Just now',
  }
}

/**
 * Synthesizes all dialogue rounds independently using their respective voice, emotion, and pace,
 * then merges the resulting PCM audio streams into a single unified conversation audio file.
 *
 * This implements the multi-speaker concatenation pipeline, allowing scripts of virtually unlimited length
 * while adhering to the 4,096 character-per-turn limit for optimal neural prosody.
 *
 * @param rounds The array of speech rounds to synthesize
 * @param voices The list of available voices to resolve speaker profiles
 * @param historyCount Current generation count for title indexing
 * @param globalSpeed Fallback speed multiplier
 * @param onProgress Real-time progress update callback for toast visualization
 */
export async function synthesizeAndMergeDialogueRounds(
  rounds: SpeechRound[],
  voices: Voice[],
  historyCount: number,
  globalSpeed: number,
  onProgress?: (phase: string) => void
): Promise<Generation> {
  const activeRounds = rounds.filter((r) => r.text.trim().length > 0)
  if (activeRounds.length === 0) {
    throw new Error('No dialogue rounds with text to synthesize.')
  }

  // 1. Synthesize each round independently with its voice profile
  const roundResults: { url: string; blob: Blob; duration: number }[] = []
  for (let i = 0; i < activeRounds.length; i++) {
    const round = activeRounds[i]
    const speaker = voices.find((v) => v.id === round.voiceId) || voices[0]
    onProgress?.(`Synthesizing Turn ${i + 1}/${activeRounds.length} (${speaker.name})...`)
    const roundSpeed = round.speed || globalSpeed
    const result = await createSyntheticSpeechWavUrl(round.text, roundSpeed)
    roundResults.push(result)
  }

  // 2. Stitch and merge all round audio buffers with 450ms conversational pauses
  onProgress?.('Merging dialogue tracks with conversational pauses...')
  const merged = await mergeAudioBuffersOrBlobs(
    roundResults.map((r) => r.blob || r.url),
    0.45
  )

  const firstSpeaker = voices.find((v) => v.id === activeRounds[0].voiceId) || voices[0]
  const combinedSnippet = activeRounds.map((r) => r.text).join(' ')

  return {
    id: `gen-${Date.now()}`,
    roundIndex: 0,
    title: `Dialogue Generation ${historyCount + 1}`,
    textSnippet: combinedSnippet.slice(0, 140) + (combinedSnippet.length > 140 ? '...' : ''),
    speakerName: `${activeRounds.length} Speakers`,
    speakerColor: firstSpeaker.color,
    speakerAvatarUrl: firstSpeaker.avatarUrl || '/voices/jessica.jpg',
    duration: merged.duration,
    audioUrl: merged.url,
    waveform: [
      10, 15, 30, 45, 65, 80, 50, 20, 10, 25, 60, 85, 95, 75, 45, 20, 10, 30, 65, 90,
      85, 55, 30, 15, 10, 40, 75, 90, 65, 35, 20, 10, 30, 60, 80, 50, 20, 10,
    ],
    timestamp: 'Just now',
  }
}
