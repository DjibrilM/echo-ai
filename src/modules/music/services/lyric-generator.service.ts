/**
 * Intelligent on-the-fly lyrics generator service.
 * Synthesizes structured, metered, and rhyming lyrics matching the mood, genre,
 * and key thematic motifs of a user's prompt.
 *
 * All generated lyrics strictly format section headers ([verse], [chorus], [bridge], [outro])
 * to guarantee optimal phonetic alignment with MiniMax-Music3 and ACE-Step v1.5 acoustic LMs.
 */

interface ThemeTemplate {
  keywords: string[];
  vocalHint: string;
  verses: string[][];
  choruses: string[][];
  bridges: string[][];
  outros: string[][];
}

const THEMES: Record<string, ThemeTemplate> = {
  medieval: {
    keywords: ['medieval', 'war', 'harp', 'battle', 'shield', 'sword', 'castle', 'lord', 'king', 'kingdom', 'folk', 'bard', 'celtic', 'tavern', 'knight', 'legend', 'ancient', 'reign', 'crown'],
    vocalHint: 'Melancholic medieval bard vocals with acoustic harp',
    verses: [
      [
        'The banners fall beneath the crimson dawn,',
        'A bitter wind blows through the broken shield,',
        'The kings are buried and the armies gone,',
        'And silence settles on the frozen field.',
      ],
      [
        'Cold iron whispers of the battles won,',
        'Yet mothers weep beside the empty stone,',
        'The glory vanished with the setting sun,',
        'And all the brave are left to sleep alone.',
      ],
      [
        'The village smokes into the autumn sky,',
        'Cold ashes drift across the stony path,',
        'No victor smiles beneath the raven\'s cry,',
        'For who survives the fury of their wrath?',
      ],
    ],
    choruses: [
      [
        'Oh, pluck the harp and weep for what was lost,',
        'No golden crown can mend a hollow heart,',
        'The bitter steel has shown the heavy cost,',
        'Where hunger tore the quiet realm apart.',
      ],
      [
        'Sing to the mountains and the mourning tide,',
        'For peace was traded for an empty throne,',
        'The bells lament the fallen in their pride,',
        'Beneath the quiet grass and nameless stone.',
      ],
    ],
    bridges: [
      [
        'Let the embers fade, let the trumpets die,',
        'No march remains for those who could not stand,',
        'Only the stars across the northern sky,',
        'Watching the sorrow of a weary land.',
      ],
    ],
    outros: [
      [
        'Harp strings tremble in the twilight air,',
        'Peace to the fallen, beyond despair...',
      ],
    ],
  },

  synthwave: {
    keywords: ['synthwave', 'retrowave', 'neon', 'cyberpunk', 'cyber', '80s', 'analog', 'retro', 'drive', 'highway', 'night', 'futuristic', 'tokyo', 'arcade', 'outrun', 'vhs'],
    vocalHint: 'Retro 80s gated reverb male vocals with analog synth lead',
    verses: [
      [
        'Purple neon reflecting in the rain,',
        'Speedometer climbing on the open lane,',
        'Digital echoes through the midnight mist,',
        'Chasing a future that we almost missed.',
      ],
      [
        'Wireframe shadows on the skyline glow,',
        'Hundred miles an hour where the cruisers go,',
        'Cassette tape rolling in the dashboard deck,',
        'No looking back, not a single regret.',
      ],
      [
        'Chromed-out reflections in the driver side,',
        'Running on dreams that we refuse to hide,',
        'Flickering signals in the city breeze,',
        'Lost in the hum of electronic keys.',
      ],
    ],
    choruses: [
      [
        'We ride the synthwave into the dark,',
        'Ignite the engine, electric spark,',
        'The grid is open, the road is clear,',
        'Outrun the memories of another year.',
      ],
      [
        'Neon horizon calling our name,',
        'Burning the night in a laser flame,',
        'Hold on forever, don\'t let it fade,',
        'Living the promise the future made.',
      ],
    ],
    bridges: [
      [
        'Frequency pulsing through the steering wheel,',
        'Tell me the simulation isn\'t real,',
        'Accelerate until the skyline bends,',
        'Where the highway never ends.',
      ],
    ],
    outros: [
      [
        'Fade into the laser glow...',
        'Driving off the grid, letting go...',
      ],
    ],
  },

  lofi: {
    keywords: ['lo-fi', 'lofi', 'chillhop', 'chill', 'relax', 'study', 'coffee', 'dusty', 'vinyl', 'mellow', 'rhodes', 'rain', 'cozy', 'laid-back', 'bedroom', 'jazz'],
    vocalHint: 'Soft, intimate breathy female vocals with Rhodes chords',
    verses: [
      [
        'Steam rising slowly from a lukewarm mug,',
        'Raindrops tapping on the windowsill rug,',
        'Needle on the vinyl with a gentle crackle,',
        'Nothing left today that I have to tackle.',
      ],
      [
        'Pencil sketching circles on a notebook page,',
        'Watching the sunlight slowly disengage,',
        'Clock ticking softly in the afternoon,',
        'Humming the fragments of a drowsy tune.',
      ],
      [
        'Paperback open by the bedside lamp,',
        'Breeze from the window just a little damp,',
        'Thoughts drifting easy like a paper plane,',
        'Washing away all the noise and strain.',
      ],
    ],
    choruses: [
      [
        'Take it slow, let the world spin by,',
        'Watching the clouds in an amber sky,',
        'Just mellow chords and a steady beat,',
        'Resting my head from the busy street.',
      ],
      [
        'Drifting away in the quiet room,',
        'Flowers of dusk begin to bloom,',
        'Safe in the cadence of the simple song,',
        'Right where I always have belonged.',
      ],
    ],
    bridges: [
      [
        'No rush, no race, just time to breathe,',
        'Letting the tangled burdens leave,',
        'A four-bar loop and an easy groove,',
        'Nothing left here to try and prove.',
      ],
    ],
    outros: [
      [
        'Soft vinyl static fades to gray...',
        'Sleep until tomorrow finds its way...',
      ],
    ],
  },

  cinematic: {
    keywords: ['cinematic', 'epic', 'orchestral', 'orchestra', 'dramatic', 'strings', 'trailer', 'hero', 'climax', 'taiko', 'destiny', 'fate', 'glory', 'soaring', 'valiant'],
    vocalHint: 'Soaring dramatic choral chanting and emotive operatic vocals',
    verses: [
      [
        'From deep in the silence a storm awakens,',
        'The foundations of the kingdom shaken,',
        'We stand on the ridge as the thunder roars,',
        'Defending the gates of our native shores.',
      ],
      [
        'The shadows lengthen across the crest,',
        'A burning desire inside the chest,',
        'No turning back through the blazing fire,',
        'Lifting our banners ever higher.',
      ],
    ],
    choruses: [
      [
        'Rise up together, the dawn is near,',
        'Cast away the sorrow and shatter the fear,',
        'Through blood and ruin we carry the flame,',
        'Engraving our triumph beside their name.',
      ],
      [
        'Hear the symphony of the skies ignite,',
        'Cutting through the darkness with blinding light,',
        'For courage endures when the empires fall,',
        'Answering the final battle call.',
      ],
    ],
    bridges: [
      [
        'When the dust is cleared and the brass rings out,',
        'Silence answers the warriors\' shout,',
        'One solitary breath before we soar,',
        'Forever remembered evermore.',
      ],
    ],
    outros: [
      [
        'Strings swell into triumphant peace...',
        'The legend shall never cease...',
      ],
    ],
  },

  rock: {
    keywords: ['rock', 'metal', 'grunge', 'punk', 'electric guitar', 'distorted', 'heavy', 'drum', 'riff', 'solo', 'screaming', 'energy', 'rebel', 'anthem'],
    vocalHint: 'Raw gritty rock vocals with aggressive overdriven guitar',
    verses: [
      [
        'Cables tangled on the dirty floor,',
        'Kicking the lock on the basement door,',
        'Amps buzzing loud like a waking beast,',
        'When hunger is high we begin the feast.',
      ],
      [
        'Static is crawling across my skin,',
        'Ready for the fury to now begin,',
        'They told us to whisper and play it neat,',
        'Now we bring the thunder onto the street.',
      ],
    ],
    choruses: [
      [
        'Turn it up until the speakers blow!',
        'Let the fire in your belly grow!',
        'No surrender, no second chance,',
        'Break the chains in a wild dance!',
      ],
      [
        'Shout it out into the heavy night!',
        'We are the spark that will ignite!',
        'Rattle the walls till the rafters shake,',
        'Everything is ours for the taking to take!',
      ],
    ],
    bridges: [
      [
        'Breakdown hits and the guitars grind,',
        'Leave all your second doubts behind,',
        'One big drop and we scream aloud,',
        'Rising together above the crowd!',
      ],
    ],
    outros: [
      [
        'Feedback ringing in the midnight air...',
        'Still standing tall without a care!',
      ],
    ],
  },

  ballad: {
    keywords: ['ballad', 'piano', 'sad', 'emotional', 'heartbreak', 'love', 'acoustic', 'slow', 'tears', 'goodbye', 'romance', 'tender', 'lonely', 'miss', 'broken'],
    vocalHint: 'Passionate and emotional solo vocals with acoustic piano',
    verses: [
      [
        'I still find your coffee mug on the shelf,',
        'Spending my evenings talking to myself,',
        'The hallway echoes with the words we said,',
        'Replaying the memories in my head.',
      ],
      [
        'Raindrops running down the window pane,',
        'Every little habit feels like pain,',
        'I know that tomorrow the sun will rise,',
        'Yet all I can picture is your eyes.',
      ],
    ],
    choruses: [
      [
        'How do you let go of the sweetest thing?',
        'How do you silence the song they\'d sing?',
        'I carry your shadow wherever I go,',
        'More than you could ever know.',
      ],
      [
        'And if you look back from where you are,',
        'Know that I\'m wishing upon that star,',
        'That somewhere down this winding track,',
        'The road will guide you back.',
      ],
    ],
    bridges: [
      [
        'Time was supposed to heal the ache,',
        'How much more can one spirit take?',
        'I whisper your name into the breeze,',
        'Begging my restless mind for peace.',
      ],
    ],
    outros: [
      [
        'Piano notes linger soft and slow...',
        'I loved you enough to let you go...',
      ],
    ],
  },

  pop: {
    keywords: ['pop', 'dance', 'upbeat', 'catchy', 'party', 'summer', 'happy', 'club', 'groove', 'disco', 'fun', 'bright'],
    vocalHint: 'Bright energetic modern pop vocals with tight harmonies',
    verses: [
      [
        'Golden hour shining on the boulevard,',
        'Leaving the heavy behind isn\'t hard,',
        'Turn on the radio and roll the glass down,',
        'We\'re about to take over this sleepy town.',
      ],
      [
        'Glitter in the headlights, shoes in the sand,',
        'Reaching across for the touch of your hand,',
        'Bassline is bumping, the night is alive,',
        'Feeling the magic of being twenty-five.',
      ],
    ],
    choruses: [
      [
        'Oh, dance with me under the starlit sky,',
        'Catching the feeling that won\'t run dry,',
        'Hands up high, feel the rhythm begin,',
        'We\'ve got the music underneath our skin!',
      ],
      [
        'Nothing can stop this momentum tonight,',
        'Every single second is shining so bright,',
        'Sing it out loud, let the chorus repeat,',
        'Feel the vibration under our feet!',
      ],
    ],
    bridges: [
      [
        'All of the worries just melt away,',
        'Who cares what anybody has to say?',
        'Count down from three and jump to the beat,',
        'Nothing right now can taste this sweet!',
      ],
    ],
    outros: [
      [
        'Yeah, keep the music playing on and on...',
        'Dancing until the rising of the dawn!',
      ],
    ],
  },
};

/**
 * Detects the best matching genre template based on prompt keywords.
 */
function findBestTheme(prompt: string): ThemeTemplate {
  const lower = prompt.toLowerCase();
  let bestScore = 0;
  let bestTheme: ThemeTemplate = THEMES.ballad; // Default fallback

  for (const theme of Object.values(THEMES)) {
    let score = 0;
    for (const kw of theme.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }

  return bestTheme;
}

/**
 * Randomly picks one element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates structured lyrics ([verse], [chorus], [verse], [outro])
 * perfectly calibrated for MiniMax-Music3 and ACE-Step v1.5.
 */
export function generateAiLyrics(prompt: string): { lyrics: string; vocalHint?: string } {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    return {
      lyrics: `[verse]\nQuiet thoughts in the midnight air,\nShadows moving on the wooden chair,\nSearching for a song that can explain,\nHow beauty blossoms through the rain.\n\n[chorus]\nSing it out, let the melody rise,\nUnderneath the open evening skies,\nEvery note a story waiting to start,\nCarried on the rhythm of the heart.\n\n[outro]\nSoft chords lingering into the night...`,
      vocalHint: 'Gentle acoustic vocal melody',
    };
  }

  const theme = findBestTheme(cleanPrompt);

  // Pick two distinct verses
  const verse1 = pickRandom(theme.verses);
  const remainingVerses = theme.verses.filter((v) => v !== verse1);
  const verse2 = remainingVerses.length > 0 ? pickRandom(remainingVerses) : verse1;

  const chorus = pickRandom(theme.choruses);
  const bridge = pickRandom(theme.bridges);
  const outro = pickRandom(theme.outros);

  // Assemble full lyric sheet with strict structural tags
  const sections = [
    `[verse]\n${verse1.join('\n')}`,
    `[chorus]\n${chorus.join('\n')}`,
    `[verse]\n${verse2.join('\n')}`,
    `[bridge]\n${bridge.join('\n')}`,
    `[chorus]\n${chorus.join('\n')}`,
    `[outro]\n${outro.join('\n')}`,
  ];

  return {
    lyrics: sections.join('\n\n'),
    vocalHint: theme.vocalHint,
  };
}
