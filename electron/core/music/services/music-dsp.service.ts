/**
 * Music DSP & Audio Mastering Service
 *
 * Provides studio post-processing for AI-generated music tracks:
 * 1. Subsonic High-Pass Filter (32Hz): Eliminates DC offset and sub-audible infrasonic rumble
 *    that wastes headroom and causes intermodulation distortion in vocal mids.
 * 2. Vocal Air & Brilliance High-Shelf Filter (+2.2 dB @ 9.5 kHz): Re-energizes high-frequency
 *    sibilance, consonants (s, t, k), and breath texture that neural vocoders smooth out.
 * 3. Studio Peak Normalization (-0.5 dBFS) & Transparent Soft Limiting: Guarantees zero digital
 *    clipping while delivering broadcast-level dynamic punch and clarity.
 */

export interface MusicDspOptions {
  enableHighPass?: boolean;
  highPassHz?: number;
  enableAirShelf?: boolean;
  airShelfHz?: number;
  airShelfGainDb?: number;
  enableNormalize?: boolean;
  targetPeakDb?: number;
  enableSoftLimiter?: boolean;
}

export class MusicDspService {
  private static instance: MusicDspService;

  public static getInstance(): MusicDspService {
    if (!MusicDspService.instance) {
      MusicDspService.instance = new MusicDspService();
    }
    return MusicDspService.instance;
  }

  /**
   * Post-processes raw interleaved PCM audio buffer into studio-mastered audio.
   * Returns a new Uint8Array with the mastered PCM samples.
   */
  public masterPcm(
    pcm: Uint8Array,
    sampleRate: number,
    channels: number,
    bitsPerSample: number,
    options: MusicDspOptions = {}
  ): { masteredPcm: Uint8Array; peakBeforeDb: number; peakAfterDb: number; details: string } {
    if (!pcm || pcm.byteLength === 0 || channels <= 0 || sampleRate <= 0) {
      return { masteredPcm: pcm, peakBeforeDb: -99, peakAfterDb: -99, details: 'empty pcm' };
    }

    const {
      enableHighPass = true,
      highPassHz = 32,
      enableAirShelf = true,
      airShelfHz = 9500,
      airShelfGainDb = 2.2,
      enableNormalize = true,
      targetPeakDb = -0.5,
      enableSoftLimiter = true,
    } = options;

    const numSamples = bitsPerSample === 16 ? Math.floor(pcm.byteLength / 2) : Math.floor(pcm.byteLength / 4);
    const floatSamples = new Float32Array(numSamples);

    // 1. Decode PCM to normalized Float32 [-1.0, 1.0]
    if (bitsPerSample === 16) {
      const int16View = new Int16Array(pcm.buffer, pcm.byteOffset, numSamples);
      for (let i = 0; i < numSamples; i++) {
        floatSamples[i] = int16View[i] / 32768.0;
      }
    } else if (bitsPerSample === 32) {
      const float32View = new Float32Array(pcm.buffer, pcm.byteOffset, numSamples);
      floatSamples.set(float32View);
    } else {
      // Unsupported bit depth, return raw
      return { masteredPcm: pcm, peakBeforeDb: 0, peakAfterDb: 0, details: 'unsupported bit depth' };
    }

    // Measure initial peak
    let maxInitial = 0.00001;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxInitial) maxInitial = abs;
    }
    const peakBeforeDb = 20 * Math.log10(maxInitial);

    // 2. High-Pass Filter: Biquad Butterworth 2nd order at highPassHz
    if (enableHighPass && highPassHz > 0 && highPassHz < sampleRate / 2) {
      this.applyHighPassFilter(floatSamples, sampleRate, channels, highPassHz);
    }

    // 3. High-Shelf Presence / Vocal Air Filter: High-shelf filter at airShelfHz
    if (enableAirShelf && airShelfGainDb !== 0 && airShelfHz < sampleRate / 2) {
      this.applyHighShelfFilter(floatSamples, sampleRate, channels, airShelfHz, airShelfGainDb);
    }

    // 4. Peak Normalization
    let maxFiltered = 0.00001;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxFiltered) maxFiltered = abs;
    }

    if (enableNormalize && maxFiltered > 0.0001) {
      const targetLinear = Math.pow(10, targetPeakDb / 20);
      const gain = targetLinear / maxFiltered;
      for (let i = 0; i < numSamples; i++) {
        floatSamples[i] *= gain;
      }
    }

    // 5. Transparent Soft Limiter (Smooth saturation above 0.95 to eliminate digital overs)
    if (enableSoftLimiter) {
      const threshold = 0.94;
      const margin = 1.0 - threshold;
      for (let i = 0; i < numSamples; i++) {
        const x = floatSamples[i];
        if (x > threshold) {
          floatSamples[i] = threshold + margin * Math.tanh((x - threshold) / margin);
        } else if (x < -threshold) {
          floatSamples[i] = -threshold + margin * Math.tanh((x + threshold) / margin);
        }
      }
    }

    // Measure post-processing peak
    let maxFinal = 0.00001;
    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(floatSamples[i]);
      if (abs > maxFinal) maxFinal = abs;
    }
    const peakAfterDb = 20 * Math.log10(maxFinal);

    // 6. Encode back to original PCM format
    const masteredPcm = new Uint8Array(pcm.byteLength);
    if (bitsPerSample === 16) {
      const outView = new Int16Array(masteredPcm.buffer, masteredPcm.byteOffset, numSamples);
      for (let i = 0; i < numSamples; i++) {
        // Clamp to [-1.0, 1.0] before scaling
        const val = Math.max(-1.0, Math.min(1.0, floatSamples[i]));
        outView[i] = val < 0 ? Math.round(val * 32768) : Math.round(val * 32767);
      }
    } else if (bitsPerSample === 32) {
      const outView = new Float32Array(masteredPcm.buffer, masteredPcm.byteOffset, numSamples);
      outView.set(floatSamples);
    }

    const details = `HighPass: ${highPassHz}Hz | AirShelf: +${airShelfGainDb}dB @ ${airShelfHz}Hz | Peak: ${peakBeforeDb.toFixed(1)}dBFS -> ${peakAfterDb.toFixed(1)}dBFS`;
    return { masteredPcm, peakBeforeDb, peakAfterDb, details };
  }

  /**
   * Applies a 2nd-order Butterworth High-Pass Biquad Filter per channel
   */
  private applyHighPassFilter(samples: Float32Array, sampleRate: number, channels: number, cutoffHz: number): void {
    const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const Q = 0.70710678; // Butterworth Q
    const alpha = sinW0 / (2 * Q);

    const b0 = (1 + cosW0) / 2;
    const b1 = -(1 + cosW0);
    const b2 = (1 + cosW0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha;

    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;

    for (let ch = 0; ch < channels; ch++) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = ch; i < samples.length; i += channels) {
        const x0 = samples[i];
        const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        samples[i] = y0;
      }
    }
  }

  /**
   * Applies a High-Shelf Presence / Vocal Air Biquad Filter per channel
   */
  private applyHighShelfFilter(samples: Float32Array, sampleRate: number, channels: number, cutoffHz: number, gainDb: number): void {
    const A = Math.pow(10, gainDb / 40);
    const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const S = 1.0; // Shelf slope parameter
    const alpha = (sinW0 / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;

    const b0 = A * ((A + 1) + (A - 1) * cosW0 + twoSqrtAAlpha);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    const b2 = A * ((A + 1) + (A - 1) * cosW0 - twoSqrtAAlpha);
    const a0 = (A + 1) - (A - 1) * cosW0 + twoSqrtAAlpha;
    const a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    const a2 = (A + 1) - (A - 1) * cosW0 - twoSqrtAAlpha;

    const nb0 = b0 / a0;
    const nb1 = b1 / a0;
    const nb2 = b2 / a0;
    const na1 = a1 / a0;
    const na2 = a2 / a0;

    for (let ch = 0; ch < channels; ch++) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = ch; i < samples.length; i += channels) {
        const x0 = samples[i];
        const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        samples[i] = y0;
      }
    }
  }
}
