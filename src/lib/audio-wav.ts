/**
 * Audio synthesis & WAV encoding utilities for Wavesurfer and audio playback.
 */

/**
 * Convert an AudioBuffer to a standard 16-bit PCM WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const channelData: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i))
  }

  const length = buffer.length * numChannels * 2
  const arrayBuffer = new ArrayBuffer(44 + length)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // RIFF Chunk
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  writeString(8, 'WAVE')

  // fmt Subchunk
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, bitDepth, true)

  // data Subchunk
  writeString(36, 'data')
  view.setUint32(40, length, true)

  // 16-bit PCM samples
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

/**
 * Synthesize a speech preview WAV audio buffer using OfflineAudioContext.
 * Renders in a couple of milliseconds and returns a blob URL for Wavesurfer.
 */
export async function createSyntheticSpeechWavUrl(
  text: string,
  speed = 1.0,
  pitchOffset = 0
): Promise<{ url: string; duration: number; blob: Blob }> {
  try {
    const sampleRate = 24000
    const words = text.split(/\s+/).filter(Boolean)
    const totalDuration = Math.max(3, Math.min(16, (Math.max(1, words.length) * 0.42) / speed))
    const length = Math.ceil(sampleRate * totalDuration)

    const OfflineCtxClass =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext

    const offlineCtx = new OfflineCtxClass(1, length, sampleRate)
    const now = 0

    const masterGain = offlineCtx.createGain()
    masterGain.gain.setValueAtTime(0.2, now)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration)
    masterGain.connect(offlineCtx.destination)

    const osc1 = offlineCtx.createOscillator()
    const osc2 = offlineCtx.createOscillator()
    const filter = offlineCtx.createBiquadFilter()

    osc1.type = 'sawtooth'
    osc2.type = 'triangle'

    const baseFreq = 160 + (text.length % 40) + pitchOffset
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

    const renderedBuffer = await offlineCtx.startRendering()
    const blob = audioBufferToWavBlob(renderedBuffer)
    const url = URL.createObjectURL(blob)

    return { url, duration: Math.round(totalDuration), blob }
  } catch (err) {
    console.error('Error synthesizing WAV preview:', err)
    const emptyBlob = new Blob([], { type: 'audio/wav' })
    return { url: '', duration: 8, blob: emptyBlob }
  }
}

/**
 * Synchronously generate a pleasant speech formant WAV file.
 * Takes < 1ms and returns an instantly playable blob URL.
 */
export function createSyntheticWavUrlSync(
  text: string = 'Generated speech preview',
  durationSec = 8
): { url: string; duration: number } {
  try {
    const sampleRate = 22050
    const duration = Math.max(3, Math.min(16, durationSec))
    const numSamples = Math.floor(sampleRate * duration)
    const arrayBuffer = new ArrayBuffer(44 + numSamples * 2)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    // RIFF Chunk
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + numSamples * 2, true)
    writeString(8, 'WAVE')

    // fmt Subchunk
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // PCM
    view.setUint16(20, 1, true)  // Linear quantization
    view.setUint16(22, 1, true)  // Mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // Byte rate
    view.setUint16(32, 2, true)  // Block align
    view.setUint16(34, 16, true) // Bits per sample

    // data Subchunk
    writeString(36, 'data')
    view.setUint32(40, numSamples * 2, true)

    // Formant speech-like audio synthesis
    const baseFreq = 160 + (text.length % 40)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      const wordMod = Math.sin(t * 8) * 0.5 + 0.5
      const s1 = Math.sin(2 * Math.PI * baseFreq * t) * 0.18
      const s2 = Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.12
      const s3 = Math.sin(2 * Math.PI * (baseFreq * 2.2) * t) * 0.08
      const env = Math.max(0, 1 - t / duration) * (0.3 + 0.7 * wordMod)
      const sample = Math.max(-1, Math.min(1, (s1 + s2 + s3) * env))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(44 + i * 2, intSample, true)
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    return { url, duration }
  } catch (err) {
    console.error('Error creating synchronous WAV:', err)
    return { url: '', duration: durationSec }
  }
}

/**
 * Merges multiple audio blobs/URLs sequentially with natural conversational pause gaps.
 * Uses Web Audio API AudioContext to decode PCM data, stitch channels, and re-encode to a 16-bit WAV.
 *
 * This enables the multi-round audio merging pipeline, ensuring individual speaker rounds
 * can be as long as needed (up to 4,096 chars per turn) without hitting single-take token limits
 * or experiencing voice drift, and then combined into a single unified dialogue audio file.
 *
 * @param audioSources Array of audio Blobs or URLs for each speaker round
 * @param pauseSec Duration of natural silence between speaker rounds in seconds (default: 0.45s)
 * @returns Object with the merged Blob, playable Object URL, and total duration in seconds
 */
export async function mergeAudioBuffersOrBlobs(
  audioSources: (Blob | string)[],
  pauseSec = 0.45
): Promise<{ url: string; duration: number; blob: Blob }> {
  try {
    if (audioSources.length === 0) {
      const emptyBlob = new Blob([], { type: 'audio/wav' })
      return { url: '', duration: 0, blob: emptyBlob }
    }

    if (audioSources.length === 1) {
      const src = audioSources[0]
      if (src instanceof Blob) {
        return { url: URL.createObjectURL(src), duration: 0, blob: src }
      }
      return { url: src, duration: 0, blob: new Blob() }
    }

    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioCtx = new AudioCtxClass()

    // 1. Fetch & decode all round audio buffers
    const decodedBuffers: AudioBuffer[] = await Promise.all(
      audioSources.map(async (item) => {
        const arrayBuffer =
          typeof item === 'string'
            ? await fetch(item).then((r) => r.arrayBuffer())
            : await item.arrayBuffer()
        return audioCtx.decodeAudioData(arrayBuffer)
      })
    )

    const sampleRate = decodedBuffers[0].sampleRate
    const numChannels = Math.max(...decodedBuffers.map((b) => b.numberOfChannels))
    const pauseSamples = Math.round(sampleRate * pauseSec)

    // 2. Compute total sample length across all rounds + silence pauses
    const totalSamples = decodedBuffers.reduce(
      (acc, buf, idx) => acc + buf.length + (idx < decodedBuffers.length - 1 ? pauseSamples : 0),
      0
    )

    // 3. Create unified AudioBuffer
    const mergedBuffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate)
    let offset = 0

    // 4. Sequentially copy PCM data across channels
    for (const buf of decodedBuffers) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sourceData = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1))
        mergedBuffer.getChannelData(ch).set(sourceData, offset)
      }
      offset += buf.length + pauseSamples
    }

    // 5. Convert combined buffer into a standard 16-bit PCM WAV Blob
    const mergedBlob = audioBufferToWavBlob(mergedBuffer)
    const mergedUrl = URL.createObjectURL(mergedBlob)

    return {
      url: mergedUrl,
      duration: Math.round(mergedBuffer.duration),
      blob: mergedBlob,
    }
  } catch (err) {
    console.error('Error merging speaker round audios:', err)
    const emptyBlob = new Blob([], { type: 'audio/wav' })
    return { url: '', duration: 0, blob: emptyBlob }
  }
}
