import { atom, useAtom } from 'jotai';
import type {
  StoryTab,
  StoryGenerationProgress,
  RawCreativePrompt,
  NarrativeProjectSnapshot,
  StoryGraphState,
  ProducedSceneAudio,
  PerformanceScript,
  StoryProjectSummary,
} from '../types.ts';

export const defaultSavedStories: StoryProjectSummary[] = [
  {
    id: 'story-1',
    title: 'The Frequency of Silence',
    primaryGenre: 'Hard Sci-Fi',
    subgenres: ['Psychological Thriller', 'Mystery'],
    premise:
      'A veteran deep-space communications officer at an isolated orbital outpost intercepts an archaic analog distress call from a colonial transport lost a century ago, while his commanding officer attempts to enforce a classified silence.',
    format: 'short_story',
    totalScenes: 3,
    completedScenes: 3,
    totalWords: 1420,
    audioDurationSeconds: 252,
    status: 'completed',
    lastUpdated: 'Today',
  },
  {
    id: 'story-2',
    title: 'The Clockwork Confession',
    primaryGenre: 'Mystery',
    subgenres: ['Historical Fiction', 'Horror'],
    premise:
      'A disgraced physician in 1890s London is summoned to an anatomical society gala where a clockwork automaton appears to confess to an unsolved murder in the voice of the missing heiress.',
    format: 'audio_drama',
    totalScenes: 4,
    completedScenes: 4,
    totalWords: 2150,
    audioDurationSeconds: 405,
    status: 'completed',
    lastUpdated: 'Yesterday',
  },
  {
    id: 'story-3',
    title: 'Blackout Protocol',
    primaryGenre: 'Cyberpunk',
    subgenres: ['Crime Fiction', 'Thriller'],
    premise:
      'During a scheduled three-minute power grid blackout in Neo-Shinjuku, a rogue neuro-courier discovers the memory shard she is smuggling belongs to the syndicate boss who ordered the hit on her crew.',
    format: 'short_story',
    totalScenes: 2,
    completedScenes: 2,
    totalWords: 1180,
    audioDurationSeconds: 210,
    status: 'completed',
    lastUpdated: '3 days ago',
  },
];

export const storyActiveTabAtom = atom<StoryTab>('stories');

export const storyPromptInputAtom = atom<RawCreativePrompt>({
  rawPrompt:
    'A veteran deep-space communications officer at an isolated orbital outpost intercepts an archaic analog distress call from a colonial transport lost a century ago, while his commanding officer attempts to enforce a classified silence.',
  genreHints: ['Hard Sci-Fi', 'Psychological Thriller', 'Mystery'],
  format: 'short_story',
  constraints: ['No faster-than-light radio', 'Grounded signal physics'],
});

export const storyIsGeneratingAtom = atom<boolean>(false);

export const storyProgressAtom = atom<StoryGenerationProgress | null>(null);

export const storyActiveProjectAtom = atom<NarrativeProjectSnapshot | null>(null);

export const storyGraphStateAtom = atom<StoryGraphState | null>(null);

export const storyPerformanceScriptsAtom = atom<PerformanceScript[]>([]);

export const storyAudioResultsAtom = atom<Record<string, ProducedSceneAudio>>({});

export const storyErrorAtom = atom<string | null>(null);

export const storySavedListAtom = atom<StoryProjectSummary[]>(defaultSavedStories);

export const storyVoicePromptAtom = atom<string>('Cinematic audio drama with intense pauses and emotional whispers');
export const storyCfgScaleAtom = atom<number>(1.5);
export const storyStabilityAtom = atom<number>(0.7);
export const storySimilarityAtom = atom<number>(0.85);
export const storyLavaSrEnabledAtom = atom<boolean>(true);

export function useStoryGenerationStore() {
  const [activeTab, setActiveTab] = useAtom(storyActiveTabAtom);
  const [promptInput, setPromptInput] = useAtom(storyPromptInputAtom);
  const [isGenerating, setIsGenerating] = useAtom(storyIsGeneratingAtom);
  const [progress, setProgress] = useAtom(storyProgressAtom);
  const [activeProject, setActiveProject] = useAtom(storyActiveProjectAtom);
  const [graphState, setGraphState] = useAtom(storyGraphStateAtom);
  const [performanceScripts, setPerformanceScripts] = useAtom(storyPerformanceScriptsAtom);
  const [audioResults, setAudioResults] = useAtom(storyAudioResultsAtom);
  const [error, setError] = useAtom(storyErrorAtom);
  const [savedStories, setSavedStories] = useAtom(storySavedListAtom);
  const [voicePrompt, setVoicePrompt] = useAtom(storyVoicePromptAtom);
  const [cfgScale, setCfgScale] = useAtom(storyCfgScaleAtom);
  const [stability, setStability] = useAtom(storyStabilityAtom);
  const [similarity, setSimilarity] = useAtom(storySimilarityAtom);
  const [lavaSrEnabled, setLavaSrEnabled] = useAtom(storyLavaSrEnabledAtom);

  return {
    activeTab,
    setActiveTab,
    promptInput,
    setPromptInput,
    isGenerating,
    setIsGenerating,
    progress,
    setProgress,
    activeProject,
    setActiveProject,
    graphState,
    setGraphState,
    performanceScripts,
    setPerformanceScripts,
    audioResults,
    setAudioResults,
    error,
    setError,
    savedStories,
    setSavedStories,
    voicePrompt,
    setVoicePrompt,
    cfgScale,
    setCfgScale,
    stability,
    setStability,
    similarity,
    setSimilarity,
    lavaSrEnabled,
    setLavaSrEnabled,
  };
}
