import { createHashRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Playground } from '@/pages/Playground'
import { Models } from '@/pages/Models'
import { Settings } from '@/pages/Settings'
import { TextToSpeechPage } from '@/pages/TextToSpeech'
import {
  VoiceCreationPage,
  VoiceChangerPage,
  SpeechToTextPage,
  MusicPage,
  AudiobooksPage,
  VoicesPage,
  StudioPage,
  FlowsPage,
  ChatPage,
  AssetsPage,
  SoundEffectsPage,
  ImageVideoPage,
  VoiceIsolatorPage,
  DubbingPage,
  DevelopersPage,
  VoiceCloningPage,
  VoiceChangingPage,
  StoriesPage,
} from '@/pages/VoiceFeatures'

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'voices',
        element: <VoicesPage />,
      },
      {
        path: 'studio',
        element: <StudioPage />,
      },
      {
        path: 'flows',
        element: <FlowsPage />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'assets',
        element: <AssetsPage />,
      },
      {
        path: 'text-to-speech',
        element: <TextToSpeechPage />,
      },
      {
        path: 'voice-creation',
        element: <VoiceCreationPage />,
      },
      {
        path: 'voice-cloning',
        element: <VoiceCloningPage />,
      },
      {
        path: 'sound-effects',
        element: <SoundEffectsPage />,
      },
      {
        path: 'image-video',
        element: <ImageVideoPage />,
      },
      {
        path: 'voice-isolator',
        element: <VoiceIsolatorPage />,
      },
      {
        path: 'voice-changer',
        element: <VoiceChangerPage />,
      },
      {
        path: 'voice-changing',
        element: <VoiceChangingPage />,
      },
      {
        path: 'music',
        element: <MusicPage />,
      },
      {
        path: 'speech-to-text',
        element: <SpeechToTextPage />,
      },
      {
        path: 'dubbing',
        element: <DubbingPage />,
      },
      {
        path: 'audiobooks',
        element: <AudiobooksPage />,
      },
      {
        path: 'stories-generation',
        element: <StoriesPage />,
      },
      {
        path: 'developers',
        element: <DevelopersPage />,
      },
      {
        path: 'playground',
        element: <Playground />,
      },
      {
        path: 'models',
        element: <Models />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
