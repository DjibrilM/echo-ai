/**
 * MusicSanitizerService
 *
 * Second-layer prompt, lyric, and request sanitizer for AI audio generation.
 * Specifically optimizes requests for MiniMax-Music3 and ACE-Step v1.5:
 *
 * 1. Strips conversational filler ("generate a...", "can you create...", "make a song...")
 * 2. Injects required vocal timbre cues when lyrics/vocals are requested so MiniMax never bypasses vocals.
 * 3. Formats lyrics with canonical section headers ([verse], [chorus], [bridge], [outro]).
 * 4. Extends arrangements for long durations (60s, 120s, 180s) to prevent MiniMax's LM
 *    from emitting an early `mm3.eos_audio` token after only ~20 seconds.
 */

export interface SanitizedMusicRequest {
  caption: string;
  lyrics: string;
  duration: number;
  maxFrames?: number;
  vocalHintInjected?: string;
  isInstrumental: boolean;
}

export interface MusicSanitizerOptions {
  caption: string;
  lyrics?: string;
  isInstrumental?: boolean;
  vocalMode?: 'instrumental' | 'manual' | 'auto';
  duration?: number;
  engine?: 'acestep' | 'minimax';
  bpm?: number;
  keyscale?: string;
  timesignature?: string;
  vocalLanguage?: string;
  ditVariant?: string;
  simpleMode?: boolean;
  taskType?: string;
}

export class MusicSanitizerService {
  private static instance: MusicSanitizerService;

  public static getInstance(): MusicSanitizerService {
    if (!MusicSanitizerService.instance) {
      MusicSanitizerService.instance = new MusicSanitizerService();
    }
    return MusicSanitizerService.instance;
  }

  /**
   * Sanitizes prompt, lyrics, and arrangements incorporating all selected UI options
   * (vocalMode, BPM, keyscale, time signature, duration, vocal language, etc.).
   */
  public sanitize(options: MusicSanitizerOptions): SanitizedMusicRequest {
    const rawCaption = options.caption || '';
    const engine = options.engine || 'acestep';
    const duration = options.duration && options.duration > 0 ? options.duration : 30;

    // 1. Decisively evaluate if Instrumental mode is requested
    const captionRequestsInstrumental = /\b(instrumental|no vocals?|no singing|without vocals?|backing track|karaoke|pure instrumental|solo piano|solo guitar|acoustic instrumental)\b/i.test(rawCaption);
    const isInstrumental = Boolean(
      options.vocalMode === 'instrumental' ||
      options.isInstrumental ||
      options.lyrics?.trim() === '[Instrumental]' ||
      captionRequestsInstrumental
    );

    // 2. Base caption cleaning (stripping conversational filler)
    let sanitizedCaption = this.stripConversationalMeta(rawCaption);

    // 3. Handle Vocals vs Pure Instrumental steering
    let vocalHintInjected: string | undefined;
    let sanitizedLyrics: string;

    if (isInstrumental) {
      // INSTRUMENTAL MODE:
      // Strip any conflicting vocal phrases that may have come from prompts, suggestions or templates
      sanitizedCaption = sanitizedCaption
        .replace(/\b(?:with\s+)?(?:clear\s+melodic\s+)?(?:singing\s+vocals?|singing|lead\s+vocals?|vocalist|singer|soprano|baritone|tenor|choir|voice)\b/gi, '')
        .replace(/\b(?:with\s+lyrics?|lyrics?)\b/gi, '')
        .replace(/\s*,\s*,+/g, ',')
        .trim();

      // Ensure explicit instrumental reinforcement for audio diffusion models
      if (!/\b(instrumental|backing track|no vocals)\b/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, instrumental backing track, no vocals, rich melodic instruments`;
      } else if (!/\bno vocals\b/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, no vocals`;
      }

      sanitizedLyrics = '[Instrumental]';
      vocalHintInjected = undefined;
    } else {
      // VOCAL MODE (Manual or Auto):
      // Clean any accidental "instrumental" words from prompt if user switched to vocal mode
      sanitizedCaption = sanitizedCaption
        .replace(/\b(?:pure\s+)?instrumental(?:\s+track|\s+version)?\b/gi, '')
        .replace(/\b(?:without|no)\s+vocals?\b/gi, '')
        .replace(/\s*,\s*,+/g, ',')
        .trim();

      // Check if user's prompt already explicitly defines vocal timbre
      const hasVocalDescriptor = /(vocal|singer|voice|singing|choir|soprano|baritone|tenor|lead vocals|vocalist|harmony)/i.test(sanitizedCaption);
      if (!hasVocalDescriptor) {
        vocalHintInjected = this.inferVocalTimbre(sanitizedCaption, options.vocalLanguage);
        sanitizedCaption = `${sanitizedCaption}, ${vocalHintInjected}`;
      }

      // Handle lyrics based on mode & engine
      if (options.vocalMode === 'manual' && options.lyrics && options.lyrics.trim() && options.lyrics.trim() !== '[Instrumental]') {
        sanitizedLyrics = this.formatLyricsForDuration(options.lyrics, sanitizedCaption, duration);
      } else if (engine === 'acestep' && !options.lyrics) {
        // For ACE-Step without explicit lyrics, leave empty so its native LM composes them via simpleMode
        sanitizedLyrics = '';
      } else {
        sanitizedLyrics = this.formatLyricsForDuration(options.lyrics, sanitizedCaption, duration);
      }
    }

    // 4. Inject Selected Musical Options for Deep Context
    // BPM / Tempo
    if (options.bpm && options.bpm > 0) {
      const hasBpm = /\b\d+\s*(?:bpm|beats\s+per\s+minute)\b/i.test(sanitizedCaption);
      if (!hasBpm) {
        sanitizedCaption = `${sanitizedCaption}, ${options.bpm} BPM`;
      }
    }

    // Key / Scale (e.g. "Eb major", "C minor")
    if (options.keyscale && options.keyscale.trim() && options.keyscale.toLowerCase() !== 'none') {
      const keyClean = options.keyscale.trim();
      const escapedKey = keyClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hasKey = new RegExp(`\\b${escapedKey}\\b`, 'i').test(sanitizedCaption) || /\b(?:in\s+key\s+of|key\s+of)\b/i.test(sanitizedCaption);
      if (!hasKey) {
        sanitizedCaption = `${sanitizedCaption}, in ${keyClean}`;
      }
    }

    // Time Signature (e.g. "3/4", "6/8")
    if (options.timesignature && options.timesignature.trim() && options.timesignature !== '4/4') {
      const timeClean = options.timesignature.trim();
      if (!sanitizedCaption.includes(timeClean)) {
        sanitizedCaption = `${sanitizedCaption}, ${timeClean} time signature`;
      }
    }

    // Vocal Language Context (when vocal track)
    if (!isInstrumental && options.vocalLanguage && options.vocalLanguage !== 'en') {
      const langMap: Record<string, string> = {
        es: 'Spanish',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        ru: 'Russian',
      };
      const langName = langMap[options.vocalLanguage.toLowerCase()];
      if (langName && !new RegExp(`\\b${langName}\\b`, 'i').test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, ${langName} vocals`;
      }
    }

    // Duration Progression Steering for arrangement continuity
    if (duration >= 120) {
      if (!/(extended|full-length|progression|arrangement|complete song)/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, full-length structured arrangement with progression`;
      }
    } else if (duration >= 60) {
      if (!/(progression|arrangement|structured)/i.test(sanitizedCaption)) {
        sanitizedCaption = `${sanitizedCaption}, structured track progression`;
      }
    }

    // Clean up trailing commas and spacing
    sanitizedCaption = sanitizedCaption
      .replace(/\s*,\s*,+/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // 5. Calculate MiniMax frames (25 fps)
    const maxFrames = engine === 'minimax' ? Math.max(750, Math.round(duration * 25)) : undefined;

    return {
      caption: sanitizedCaption.trim(),
      lyrics: sanitizedLyrics.trim(),
      duration,
      maxFrames,
      vocalHintInjected,
      isInstrumental,
    };
  }

  /**
   * Strips conversational filler like "generate a...", "make a song about..."
   */
  private stripConversationalMeta(text: string): string {
    let clean = text.trim();

    // Regex for conversational openings
    const conversationalPrefixes = [
      /^(?:can\s+you\s+)?(?:please\s+)?(?:generate|create|make|write|compose|produce)\s+(?:me\s+)?(?:a|an|the|some)?\s+/i,
      /^(?:i\s+(?:want|need|would\s+like)\s+(?:to\s+have\s+)?(?:a|an|the|some)?\s+)/i,
      /^(?:give\s+me\s+(?:a|an|the)?\s+)/i,
      /^(?:song\s+about\s+)/i,
      /^(?:track\s+about\s+)/i,
    ];

    for (const prefix of conversationalPrefixes) {
      clean = clean.replace(prefix, '');
    }

    // Capitalize first letter
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    // Clean multiple spaces and commas
    clean = clean.replace(/\s*,\s*,+/g, ',').replace(/\s{2,}/g, ' ');

    return clean;
  }

  /**
   * Infers the best vocal timbre matching the musical genre/theme and optional language
   */
  private inferVocalTimbre(caption: string, vocalLanguage?: string): string {
    const lower = caption.toLowerCase();
    const langMap: Record<string, string> = {
      es: 'Spanish',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
    };
    const langPrefix = vocalLanguage && vocalLanguage !== 'en' && langMap[vocalLanguage.toLowerCase()]
      ? `${langMap[vocalLanguage.toLowerCase()]} `
      : '';

    if (/(medieval|celtic|harp|fantasy|bard|tavern|folk|ancient|kingdom)/.test(lower)) {
      return `${langPrefix}haunting bard vocals, clear close-mic singing, natural human vibrato, acoustic studio production`;
    }
    if (/(synthwave|retrowave|cyberpunk|80s|neon|electro)/.test(lower)) {
      return `${langPrefix}crisp 80s gated reverb male vocals, polished lead vocal, punchy melodic synth hook`;
    }
    if (/(lo-fi|lofi|chillhop|coffee|relax|bedroom)/.test(lower)) {
      return `${langPrefix}soft breathy female vocals, intimate close-mic acoustic presence, clear pronunciation`;
    }
    if (/(rock|metal|punk|grunge|electric guitar|heavy)/.test(lower)) {
      return `${langPrefix}raw energetic rock vocals, powerful singing voice, clear vocal consonants`;
    }
    if (/(cinematic|epic|orchestral|orchestra|trailer|hero)/.test(lower)) {
      return `${langPrefix}soaring dramatic vocals, rich choral harmonies, expansive dynamic range`;
    }
    if (/(ballad|piano|sad|emotional|heartbreak|acoustic|love|romance|romantic)/.test(lower)) {
      return `${langPrefix}heartfelt emotional solo vocals, warm studio acoustic presence, intimate vocal nuance, close-mic singing`;
    }
    if (/(pop|dance|disco|summer|happy|party)/.test(lower)) {
      return `${langPrefix}bright modern pop vocals, crisp high-end clarity, infectious melodic chorus`;
    }
    if (/(r&b|soul|jazz|blues)/.test(lower)) {
      return `${langPrefix}smooth soulful vocals, rich vocal harmonics, clear diction`;
    }

    return `${langPrefix}expressive lead singing vocals, crisp close-mic presence, natural human vibrato, studio vocal clarity`;
  }

  /**
   * Formats, tags, and extends lyrics according to duration so the model
   * doesn't stop prematurely at ~20 seconds.
   */
  private formatLyricsForDuration(rawLyrics: string | undefined, caption: string, duration: number): string {
    let clean = (rawLyrics || '').trim();

    // If completely empty, generate clean stanzas
    if (!clean) {
      return this.generateDefaultLyricsForTheme(caption, duration);
    }

    // Normalize existing section tags to lowercase: [Verse], (Chorus), Verse 1:, etc.
    clean = clean.replace(/\[?(?:verse\s*\d*|\(verse\s*\d*\)|verse\s*\d*:)\]?/gi, '[verse]');
    clean = clean.replace(/\[?(?:chorus|\(chorus\)|chorus:)\]?/gi, '[chorus]');
    clean = clean.replace(/\[?(?:bridge|\(bridge\)|bridge:)\]?/gi, '[bridge]');
    clean = clean.replace(/\[?(?:outro|\(outro\)|outro:)\]?/gi, '[outro]');
    clean = clean.replace(/\[?(?:intro|\(intro\)|intro:)\]?/gi, '[intro]');

    // Strip markdown formatting like **bold** or # headings
    clean = clean.replace(/\*\*(.*?)\*\*/g, '$1');
    clean = clean.replace(/#{1,6}\s*/g, '');

    // Ensure the lyrics start with an intro or verse tag
    if (!clean.startsWith('[')) {
      clean = `[verse]\n${clean}`;
    }

    // Check how many sections exist
    const tagMatches = clean.match(/\[(verse|chorus|bridge|outro|intro)\]/gi) || [];

    // For long tracks (>=120s or 180s), if the user only gave a single short verse,
    // repeat the chorus and add structure so MiniMax's LM doesn't emit eos_audio at 20s
    if (duration >= 120 && tagMatches.length < 3) {
      // Find the verse content
      const lines = clean.split('\n').filter((l) => l.trim() && !l.startsWith('['));
      if (lines.length > 0) {
        const verseLines = lines.slice(0, Math.min(4, lines.length)).join('\n');
        const chorusLines = lines.length > 4 ? lines.slice(4).join('\n') : verseLines;

        clean = [
          `[verse]\n${verseLines}`,
          `[chorus]\n${chorusLines}`,
          `[verse]\n${verseLines}`,
          `[chorus]\n${chorusLines}`,
          `[bridge]\nCarried on the melody, through the passing time...`,
          `[chorus]\n${chorusLines}`,
          `[outro]\nFading softly into the end...`,
        ].join('\n\n');
      }
    } else if (duration >= 60 && tagMatches.length < 2) {
      clean = `${clean}\n\n[chorus]\n${clean.replace(/\[verse\]/g, '').trim()}\n\n[outro]\nFading with the music...`;
    }

    return clean;
  }

  /**
   * Generates a complete, multi-section lyric sheet tailored to the duration.
   */
  private generateDefaultLyricsForTheme(caption: string, duration: number): string {
    const lower = caption.toLowerCase();

    if (/(medieval|war|harp|battle|castle)/.test(lower)) {
      if (duration >= 120) {
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

[chorus]
Oh, pluck the harp and sing for what was lost,
No golden crown can mend a hollow heart,
The bitter iron counts the heavy cost,
Where sorrow tore the brotherhood apart.

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
      }

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

[outro]
Harp strings tremble in the twilight air,
Peace to the fallen, beyond despair...`;
    }

    // Default universal lyrical arrangement
    return `[verse]
Whispers moving through the midnight air,
Chasing shadows on the quiet street,
Finding a melody that we can share,
Where the harmony and rhythm meet.

[chorus]
Sing it out loud, let the music rise,
Lighting the darkness beneath the skies,
Every single beat a brand new start,
Echoing the feelings of the heart.

[outro]
Soft chords fading into the night...`;
  }
}
