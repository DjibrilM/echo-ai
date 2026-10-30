import * as qvacSdk from '@qvac/sdk';

/**
 * Service for generating structured song lyrics using local Qwen3-1.7B Instruct LLM.
 *
 * Streams generated tokens in real-time directly to the UI, formatting lyrics
 * with strict acoustic markers ([verse], [chorus], [bridge], [outro]) for
 * MiniMax-Music3 and ACE-Step v1.5 audio generation.
 *
 * Highly optimized for low latency:
 * - reasoning_budget: 0 and captureThinking: false eliminate deep thinking pauses.
 * - 7s first-token watchdog with seamless instant-fallback synthesizer.
 * - Idle unload timer keeps model in memory across tweaks while protecting MiniMax unified memory.
 */
export class QwenLyricService {
  private static instance: QwenLyricService;
  private activeModelId: string | null = null;
  private isLoadingModel = false;
  private idleUnloadTimer: NodeJS.Timeout | null = null;

  public static getInstance(): QwenLyricService {
    if (!QwenLyricService.instance) {
      QwenLyricService.instance = new QwenLyricService();
    }
    return QwenLyricService.instance;
  }

  /**
   * Resets the idle unload timer to keep model in unified memory across iterative prompt adjustments.
   * Auto-unloads after 4 minutes of inactivity.
   */
  private touchActivity(): void {
    if (this.idleUnloadTimer) {
      clearTimeout(this.idleUnloadTimer);
      this.idleUnloadTimer = null;
    }
    this.idleUnloadTimer = setTimeout(() => {
      console.log('[QwenLyricService] Idle timeout reached (4m), releasing model memory');
      this.unload().catch(() => {});
    }, 4 * 60 * 1000);
  }

  /**
   * Ensures the Qwen3-1.7B Instruct model is loaded into memory on Apple Metal GPU.
   */
  public async ensureModelLoaded(onProgress?: (progress: qvacSdk.ModelProgressUpdate) => void): Promise<string> {
    if (this.activeModelId) {
      return this.activeModelId;
    }

    if (this.isLoadingModel) {
      // Wait for existing load operation to complete
      while (this.isLoadingModel) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.activeModelId) return this.activeModelId;
    }

    this.isLoadingModel = true;
    try {
      console.log('[QwenLyricService] ▸ Loading Qwen3-1.7B Instruct LLM for lyric generation...');
      const modelId = await qvacSdk.loadModel({
        modelSrc: qvacSdk.QWEN3_1_7B_INST_Q4,
        onProgress: (p) => {
          onProgress?.(p);
        },
      });
      this.activeModelId = modelId;
      console.log(`[QwenLyricService] ✓ Qwen3-1.7B loaded successfully with ID: ${modelId}`);
      this.touchActivity();
      return modelId;
    } catch (err) {
      console.error('[QwenLyricService] ✖ Failed to load Qwen3-1.7B:', err);
      throw err;
    } finally {
      this.isLoadingModel = false;
    }
  }

  /**
   * Unloads the Qwen lyric model to release unified memory.
   * Called before heavy MiniMax runs or on idle timeout.
   */
  public async unload(): Promise<void> {
    if (this.idleUnloadTimer) {
      clearTimeout(this.idleUnloadTimer);
      this.idleUnloadTimer = null;
    }
    const modelId = this.activeModelId;
    if (!modelId) return;
    this.activeModelId = null;
    try {
      await qvacSdk.unloadModel({ modelId });
      console.log('[QwenLyricService] ✓ Qwen3-1.7B unloaded to free memory');
    } catch (err) {
      console.warn('[QwenLyricService] Warning unloading Qwen3-1.7B:', err);
    }
  }

  /**
   * Generates song lyrics from a description, streaming tokens in real time.
   */
  public async generateLyricsStream(
    prompt: string,
    onToken?: (token: string) => void,
    onProgress?: (p: qvacSdk.ModelProgressUpdate) => void
  ): Promise<{ lyrics: string; engine: 'qwen-1.7b' | 'fallback' }> {
    this.touchActivity();
    const cleanPrompt = (prompt || '').trim() || 'A soulful, emotional song about life and hope';

    try {
      const modelId = await this.ensureModelLoaded(onProgress);

      const systemPrompt = `You are a professional hit songwriter.
Write structured, rhyming song lyrics based on the musical prompt.

Formatting Rules:
1. Immediately start outputting lyrics using standard section headers:
[verse]
[chorus]
[verse]
[chorus]
[bridge]
[outro]
2. Output ONLY the song lyrics and section tags. Never output conversational remarks, intros, or explanations.
3. Keep verses and chorus punchy, rhyming, and easy to sing.`;

      const userPrompt = `Write song lyrics for: "${cleanPrompt}". Output only the lyrics starting with [verse].`;

      // Fast streaming completion without reasoning delays
      const run = qvacSdk.completion({
        modelId,
        history: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        captureThinking: false,
        stream: true,
        generationParams: {
          reasoning_budget: 0,
          predict: 420,
          temp: 0.75,
          top_p: 0.9,
          repeat_penalty: 1.15,
          frequency_penalty: 0.25,
          presence_penalty: 0.25,
        },
      });

      let fullLyrics = '';
      let firstTokenReceived = false;
      let hasTimedOut = false;

      // Watchdog timer: If no token is emitted within 7 seconds, cancel and use high-speed fallback
      const watchdog = setTimeout(() => {
        if (!firstTokenReceived) {
          hasTimedOut = true;
          console.warn('[QwenLyricService] First token watchdog timed out (7s). Canceling run & activating fast synthesizer.');
          try {
            qvacSdk.cancel({ requestId: run.requestId }).catch(() => {});
          } catch {}
        }
      }, 7000);

      try {
        for await (const event of run.events) {
          if (hasTimedOut) break;

          // CRITICAL: Only process 'contentDelta' events.
          // The inference engine emits both 'rawDelta' and 'contentDelta' per token.
          // Reading (event as any).text indiscriminately caused every token to be emitted twice.
          if (event.type === 'contentDelta' && event.text) {
            const cleaned = event.text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '');
            if (cleaned) {
              if (!firstTokenReceived) {
                firstTokenReceived = true;
                clearTimeout(watchdog);
              }
              fullLyrics += cleaned;
              onToken?.(cleaned);
            }
          }
        }
      } catch (streamErr) {
        console.warn('[QwenLyricService] Stream iteration warning/end:', streamErr);
      } finally {
        clearTimeout(watchdog);
      }

      const resultText = fullLyrics.trim();

      // If timed out or output is too short, smoothly stream fallback lyrics
      if (!firstTokenReceived || resultText.length < 30) {
        console.warn('[QwenLyricService] LLM output insufficient or timed out, synthesizing genre-tailored lyrics.');
        const fallbackLyrics = this.getFallbackLyrics(cleanPrompt);
        for (const char of fallbackLyrics) {
          onToken?.(char);
          await new Promise((r) => setTimeout(r, 4));
        }
        this.touchActivity();
        return { lyrics: fallbackLyrics, engine: 'fallback' };
      }

      const sanitizedResult = resultText.startsWith('[') ? resultText : `[verse]\n${resultText}`;
      this.touchActivity();
      return { lyrics: sanitizedResult, engine: 'qwen-1.7b' };
    } catch (err) {
      console.warn('[QwenLyricService] Qwen lyric generation failed, activating fallback:', err);
      const fallbackLyrics = this.getFallbackLyrics(cleanPrompt);
      for (const char of fallbackLyrics) {
        onToken?.(char);
        await new Promise((r) => setTimeout(r, 4));
      }
      this.touchActivity();
      return { lyrics: fallbackLyrics, engine: 'fallback' };
    }
  }

  /**
   * Fast rule-based genre-tailored lyrical synthesizer
   */
  private getFallbackLyrics(prompt: string): string {
    const lower = prompt.toLowerCase();

    // 1. Medieval / Folk / Acoustic / Fantasy
    if (/(medieval|celtic|harp|fantasy|bard|tavern|folk|acoustic|woodland|castle)/.test(lower)) {
      return `[verse]
The banners fall beneath the crimson dawn,
A bitter wind blows through the broken shield,
The kings are buried and the armies gone,
And silence settles on the frozen field.

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[verse]
The village smokes into the autumn sky,
Cold ashes drift across the stony path,
No victor smiles beneath the raven's cry,
For who survives the fury of their wrath?

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[bridge]
Let the embers fade, let the trumpets die,
No march remains for those who could not stand,
Only the stars across the northern sky,
Watching the weeping of a weary land.

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
    }

    // 2. Synthwave / Cyberpunk / Retro / Electro / EDM / Dance
    if (/(synthwave|retro|neon|cyberpunk|80s|electronic|dance|edm|techno|club|future)/.test(lower)) {
      return `[verse]
Purple neon reflecting in the rain,
Speedometer climbing on the open lane,
Digital echoes through the midnight mist,
Chasing a future that we almost missed.

[chorus]
We ride the synthwave into the dark,
Ignite the engine, electric spark,
The grid is open, the road is clear,
Nothing can touch us while we are here!

[verse]
Chromed-out reflections in the driver side,
Running on dreams that we refuse to hide,
Flickering signals in the city breeze,
Lost in the hum of electronic keys.

[chorus]
We ride the synthwave into the dark,
Ignite the engine, electric spark,
The grid is open, the road is clear,
Nothing can touch us while we are here!

[bridge]
Accelerate past the boundary line,
Out of the shadows into the shine,
Analog pulses guiding the way,
Running forever away from the day.

[outro]
Synth pads fading into the night...
Driving forever into the light...`;
    }

    // 3. Hip-hop / Rap / Trap / Drill / Urban
    if (/(hip hop|hip-hop|rap|trap|drill|urban|rhyme|beats|808|freestyle)/.test(lower)) {
      return `[verse]
Step on the pavement, concrete cold,
Writing out stories that were never told,
Mic in my hand and the bassline deep,
Counting my blessings while the city sleep.
Came from the bottom with a vision in sight,
Turning every shadow into blinding light.

[chorus]
Turn up the sound, let the rhythm ignite,
We taking over in the dead of the night,
They counted us out, but we rewriting the game,
Nothing is ever gonna feel the same!

[verse]
Heavy 808s bumping through the avenue,
Staying focused on the things I gotta do,
Stacking up the bars like a fortress wall,
Never gonna buckle, never gonna fall.

[chorus]
Turn up the sound, let the rhythm ignite,
We taking over in the dead of the night,
They counted us out, but we rewriting the game,
Nothing is ever gonna feel the same!

[bridge]
From the underground straight to the top,
This momentum is never gonna stop,
Hands to the ceiling, let the speakers blow,
Everything we got is on the show.

[outro]
Yeah... city lights fading out slow...
Turn the volume down low...`;
    }

    // 4. Rock / Metal / Punk / Grunge
    if (/(rock|metal|punk|grunge|guitar|heavy|distortion|electric)/.test(lower)) {
      return `[verse]
Feedback screaming through an ancient amp,
Damp dirty basement by a single lamp,
Calloused fingers digging in the wire,
Spitting out sparks to a roaring fire.

[chorus]
Tear down the walls, let the thunder roll,
Something inside is taking full control,
Turn it to eleven, break the master key,
Tonight we're screaming till we set it free!

[verse]
Cracked leather jackets in the pouring storm,
Breaking the mold of what they call the norm,
Heartbeat pounding like a double kick drum,
Waiting for the promised day to come.

[chorus]
Tear down the walls, let the thunder roll,
Something inside is taking full control,
Turn it to eleven, break the master key,
Tonight we're screaming till we set it free!

[bridge]
No surrender, no giving in,
This is where the revolution begins!
Hear the distortion tearing the sky,
We were born to live, not just survive!

[outro]
Power chords ring until the lights go out...
This is what rock and roll is all about!`;
    }

    // 5. Pop / Upbeat / Energetic / Joyful
    if (/(pop|upbeat|happy|joy|bright|fun|summer|danceable)/.test(lower)) {
      return `[verse]
Sunlight breaking through the morning trees,
Walking down the sidewalk with a summer breeze,
Got a brand new melody inside my head,
Dancing through the words that we left unsaid.

[chorus]
Oh, can you feel that vibrant beat?
Lifting everybody right up off their feet!
Shining like gold in the afternoon sun,
The good times have only just begun!

[verse]
Window rolled down singing every line,
Everything is falling right in line,
Catching your smile across the room,
Chasing away every ounce of gloom.

[chorus]
Oh, can you feel that vibrant beat?
Lifting everybody right up off their feet!
Shining like gold in the afternoon sun,
The good times have only just begun!

[bridge]
Spin me around, don't let it end,
Here with my lover and my best friend,
Higher and higher we're taking flight,
We're glowing brighter than the stars tonight!

[outro]
Yeah, keep that feeling in your heart...
A beautiful ending to a brand new start...`;
    }

    // 6. Default: Soulful, emotional ballad
    return `[verse]
Raindrops running down the window pane,
Every little memory feels so plain,
I know that tomorrow the sun will rise,
Yet all I can picture is your eyes.

[chorus]
And if you look back from where you are,
Know that I'm wishing upon that star,
That somewhere down this winding track,
The road will guide you back.

[verse]
I still find your coffee mug on the shelf,
Spending my evenings talking to myself,
The hallway echoes with the words we said,
Replaying the moments in my head.

[chorus]
And if you look back from where you are,
Know that I'm wishing upon that star,
That somewhere down this winding track,
The road will guide you back.

[bridge]
Time was supposed to heal the ache,
How much more can one spirit take?
I whisper your name into the breeze,
Begging my restless mind for peace.

[outro]
Piano notes linger soft and slow...
I loved you enough to let you go...`;
  }
}
