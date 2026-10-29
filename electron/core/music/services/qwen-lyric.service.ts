import * as qvacSdk from '@qvac/sdk';

/**
 * Service for generating structured song lyrics using local Qwen3-1.7B Instruct LLM.
 *
 * Streams generated tokens in real-time directly to the UI, formatting lyrics
 * with strict acoustic markers ([verse], [chorus], [bridge], [outro]) for
 * MiniMax-Music3 and ACE-Step v1.5 audio generation.
 */
export class QwenLyricService {
  private static instance: QwenLyricService;
  private activeModelId: string | null = null;
  private isLoadingModel = false;

  public static getInstance(): QwenLyricService {
    if (!QwenLyricService.instance) {
      QwenLyricService.instance = new QwenLyricService();
    }
    return QwenLyricService.instance;
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
      return modelId;
    } catch (err) {
      console.error('[QwenLyricService] ✖ Failed to load Qwen3-1.7B:', err);
      throw err;
    } finally {
      this.isLoadingModel = false;
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
    const cleanPrompt = (prompt || '').trim() || 'A soulful, emotional song about life and hope';

    try {
      const modelId = await this.ensureModelLoaded(onProgress);

      const systemPrompt = `You are an elite, Grammy-award winning songwriter.
Write complete, poetic, rhyming song lyrics based on the user's musical song description.

Formatting Rules:
1. Organize into canonical musical sections with tags:
[verse]
[chorus]
[verse]
[bridge]
[chorus]
[outro]
2. Output ONLY the lyrics and section tags. Never output conversational remarks, intros, or commentary.
3. Use natural rhyming (AABB or ABAB) and musical meter that is easy to sing.
4. Capture the exact mood, imagery, and style requested in the description.`;

      const userPrompt = `Write song lyrics for this description: "${cleanPrompt}"`;

      const run = qvacSdk.completion({
        modelId,
        history: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        captureThinking: true,
        stream: true,
      });

      let fullLyrics = '';
      for await (const event of run.events) {
        if (event.type === 'contentDelta' && event.text) {
          fullLyrics += event.text;
          onToken?.(event.text);
        }
      }

      const final = await run.final;
      const resultText = (final.contentText || fullLyrics).trim();

      // Ensure at least one section tag exists
      const sanitizedResult = resultText.startsWith('[') ? resultText : `[verse]\n${resultText}`;

      return { lyrics: sanitizedResult, engine: 'qwen-1.7b' };
    } catch (err) {
      console.warn('[QwenLyricService] Qwen streaming failed, using fallback lyric generator:', err);
      // Fallback: fast structured lyrical synthesis
      const fallbackLyrics = this.getFallbackLyrics(cleanPrompt);
      // Simulate token streaming for smooth UI transition
      for (const char of fallbackLyrics) {
        onToken?.(char);
        await new Promise((r) => setTimeout(r, 6));
      }
      return { lyrics: fallbackLyrics, engine: 'fallback' };
    }
  }

  /**
   * Fast rule-based fallback if LLM is unreachable or offline
   */
  private getFallbackLyrics(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (/(medieval|celtic|harp|fantasy|bard|tavern|folk)/.test(lower)) {
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

    if (/(synthwave|retro|neon|cyberpunk|80s)/.test(lower)) {
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

    // Default romantic/emotional lyric sheet
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
