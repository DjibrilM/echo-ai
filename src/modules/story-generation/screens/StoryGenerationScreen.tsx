import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryGeneration } from '../hooks/useStoryGeneration.ts';
import { useStoryModels } from '../store/storyModelsStore.ts';
import { StoryTopSubHeader } from '../components/StoryTopSubHeader.tsx';
import { StoryHomeView } from '../components/StoryHomeView.tsx';
import { StoryStudioView } from '../components/StoryStudioView.tsx';
import { InstallRequiredStoryModelsView } from '../components/InstallRequiredStoryModelsView.tsx';
import type { StoryProjectSummary } from '../types.ts';

export const StoryGenerationScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    promptInput,
    setPromptInput,
    isGenerating,
    progress,
    activeProject,
    graphState,
    performanceScripts,
    audioResults,
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
    startStoryGeneration,
  } = useStoryGeneration();

  const { allRequiredReady } = useStoryModels();

  const handleReturnToPreviousScreen = () => {
    navigate(-1);
  };

  const handleGenerateClick = () => {
    startStoryGeneration(promptInput, 2);
  };

  const handleSelectStory = (story: StoryProjectSummary) => {
    setPromptInput({
      rawPrompt: story.premise,
      genreHints: [story.primaryGenre, ...story.subgenres],
      format: story.format as any,
    });
    setActiveTab('studio');
  };

  const handleDeleteStory = (storyId: string) => {
    setSavedStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  const handleNewStory = () => {
    setPromptInput({
      rawPrompt: '',
      genreHints: ['Speculative Fiction'],
      format: 'short_story',
    });
    setActiveTab('studio');
  };

  // STRICT REQUIREMENT: Download missing models first before entering generation interface
  if (!allRequiredReady) {
    return (
      <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#0f0f10] text-[#f4f4f5] select-none relative">
        <StoryTopSubHeader
          activeTab="models"
          onSelectTab={() => {}}
          onBack={handleReturnToPreviousScreen}
          storiesCount={0}
          tracksCount={0}
        />
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 sidebar-scrollbar">
          <InstallRequiredStoryModelsView
            onBack={handleReturnToPreviousScreen}
            onContinue={() => setActiveTab('stories')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#0f0f10] text-[#f4f4f5] select-none relative">
      <StoryTopSubHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBack={handleReturnToPreviousScreen}
        storiesCount={savedStories.length}
        tracksCount={performanceScripts.length}
        isGenerating={isGenerating}
        onNewStory={activeTab === 'studio' ? undefined : handleNewStory}
      />

      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'studio' ? 'overflow-hidden' : 'overflow-y-auto sidebar-scrollbar'}`}>
        {activeTab === 'stories' && (
          <StoryHomeView
            promptInput={promptInput}
            onChangePromptInput={setPromptInput}
            onGenerate={handleGenerateClick}
            isGenerating={isGenerating}
            stories={savedStories}
            onSelectStory={handleSelectStory}
            onDeleteStory={handleDeleteStory}
          />
        )}

        {activeTab === 'studio' && (
          <StoryStudioView
            promptInput={promptInput}
            onChangePromptInput={setPromptInput}
            onGenerate={handleGenerateClick}
            isGenerating={isGenerating}
            progress={progress}
            activeProject={activeProject}
            graphState={graphState}
            performanceScripts={performanceScripts}
            audioResults={audioResults}
            voicePrompt={voicePrompt}
            onChangeVoicePrompt={setVoicePrompt}
            cfgScale={cfgScale}
            onChangeCfgScale={setCfgScale}
            stability={stability}
            onChangeStability={setStability}
            similarity={similarity}
            onChangeSimilarity={setSimilarity}
            lavaSrEnabled={lavaSrEnabled}
            onToggleLavaSr={() => setLavaSrEnabled(!lavaSrEnabled)}
          />
        )}

        {activeTab === 'models' && (
          <InstallRequiredStoryModelsView
            onBack={() => setActiveTab('stories')}
            onContinue={() => setActiveTab('stories')}
          />
        )}
      </div>
    </div>
  );
};
