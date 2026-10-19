import { Link, useLocation } from "react-router-dom"
import {
  SidebarToggleIcon,
  SettingsIcon,
  HomeIcon,
  VoicesIcon,
  StudioIcon,
  FlowsIcon,
  ChatIcon,
  AssetsIcon,
  TextToSpeechIcon,
  VoiceCloningIcon,
  VoiceCreationIcon,
  SoundEffectsIcon,
  ImageVideoIcon,
  VoiceIsolatorIcon,
  VoiceChangingIcon,
  VoiceChangerIcon,
  SpeechToTextIcon,
  MusicIcon,
  DubbingIcon,
  StoriesGenerationIcon,
  AudiobooksIcon,
  DevelopersIcon,
} from "@/components/icons"
import { Sparkles, Play } from "lucide-react"

function getRouteData(pathname: string) {
  switch (pathname) {
    case "/":
      return { title: "Home", icon: HomeIcon }
    case "/voices":
      return { title: "Voices", icon: VoicesIcon }
    case "/studio":
      return { title: "Studio", icon: StudioIcon }
    case "/flows":
      return { title: "Flows", icon: FlowsIcon }
    case "/chat":
      return { title: "Chat", icon: ChatIcon }
    case "/assets":
      return { title: "Assets", icon: AssetsIcon }
    case "/text-to-speech":
      return { title: "Text To Speech", icon: TextToSpeechIcon }
    case "/voice-cloning":
      return { title: "Voice Cloning", icon: VoiceCloningIcon }
    case "/voice-creation":
      return { title: "Voice Creation", icon: VoiceCreationIcon }
    case "/sound-effects":
      return { title: "Sound Effects", icon: SoundEffectsIcon }
    case "/image-video":
      return { title: "Image & Video", icon: ImageVideoIcon }
    case "/voice-isolator":
      return { title: "Voice Isolator", icon: VoiceIsolatorIcon }
    case "/voice-changing":
      return { title: "Voice Changing", icon: VoiceChangingIcon }
    case "/voice-changer":
      return { title: "Voice Changer", icon: VoiceChangerIcon }
    case "/music":
      return { title: "Music", icon: MusicIcon }
    case "/speech-to-text":
      return { title: "Speech To Text", icon: SpeechToTextIcon }
    case "/dubbing":
      return { title: "Dubbing", icon: DubbingIcon }
    case "/stories-generation":
      return { title: "Stories Generation", icon: StoriesGenerationIcon }
    case "/audiobooks":
      return { title: "Audiobooks", icon: AudiobooksIcon }
    case "/developers":
      return { title: "Developers", icon: DevelopersIcon }
    case "/settings":
      return { title: "Settings", icon: SettingsIcon }
    case "/playground":
      return { title: "Playground", icon: Play }
    case "/models":
      return { title: "Models", icon: Sparkles }
    default:
      return { title: "Voice Isolator", icon: VoiceIsolatorIcon }
  }
}

interface HeaderProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const location = useLocation()
  const { title, icon: PageIcon } = getRouteData(location.pathname)

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#262629] bg-[#0f0f10] px-4 select-none">
      {/* Left side: Sidebar Toggle, Separator, Page Icon & Page Title */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex size-7 items-center justify-center rounded-md text-[#9d9da4] hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label="Toggle Sidebar"
        >
          <SidebarToggleIcon className="size-[18px]" />
        </button>

        <div className="h-4 w-px bg-white/[0.08] mx-0.5" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <PageIcon className="size-4 text-zinc-300 shrink-0" />
          <span className="text-[13.5px] font-semibold text-white tracking-tight">
            {title}
          </span>
        </div>
      </div>

      {/* Right side: Setting Icon */}
      <div className="flex items-center gap-1.5">
        <Link
          to="/settings"
          className="flex size-7 items-center justify-center rounded-md text-[#9d9da4] hover:bg-white/[0.06] hover:text-white transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="size-[19px]" />
        </Link>
      </div>
    </header>
  )
}
