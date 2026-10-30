import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { MusicScreen } from '@/modules/music'
import { BeatsScreen } from '@/modules/beats'
import {
  TextToSpeechIcon,
  VoiceCreationIcon,
  VoiceChangerIcon,
  SpeechToTextIcon,
  AudiobooksIcon,
  VoicesIcon,
  StudioIcon,
  FlowsIcon,
  ChatIcon,
  AssetsIcon,
  SoundEffectsIcon,
  ImageVideoIcon,
  VoiceIsolatorIcon,
  DubbingIcon,
  DevelopersIcon,
} from '@/components/icons'
import { Play, Mic, Upload, Volume2, BookOpen, Camera, User } from 'lucide-react'

export const VoiceCloningPage = VoiceCreationPage
export const VoiceChangingPage = VoiceChangerPage
export const StoriesPage = AudiobooksPage

export function TextToSpeechPage() {
  const [text, setText] = useState(
    "In the quiet of the morning, when the world is still half asleep, possibilities begin to awaken."
  )
  const [voice, setVoice] = useState("Rachel")

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <TextToSpeechIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Text to Speech</h1>
          <p className="text-sm text-muted-foreground">
            Convert written text into natural, emotive human speech using neural voice models.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold">Script</label>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to synthesize..."
              className="resize-none"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.length} characters</span>
              <Button size="sm" className="gap-2">
                <Play className="size-3.5 fill-current" /> Generate Speech
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Voice Selection</h3>
            <div className="flex flex-col gap-2">
              {["Rachel (Calm & Expressive)", "Adam (Deep & Authoritative)", "Antoni (Energetic)", "Bella (Soft & Gentle)"].map((v) => {
                const name = v.split(" ")[0]
                return (
                  <button
                    key={v}
                    onClick={() => setVoice(name)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                      voice === name ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted/50"
                    }`}
                  >
                    <span>{v}</span>
                    <Volume2 className="size-3.5 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const PRESET_AVATARS = [
  { name: 'Sterling', url: '/voices/sterling.jpg' },
  { name: 'Serena', url: '/voices/serena.jpg' },
  { name: 'Chloe', url: '/voices/chloe.jpg' },
  { name: 'Jax', url: '/voices/jax.jpg' },
  { name: 'Alistair', url: '/voices/alistair.jpg' },
  { name: 'Eleanor', url: '/voices/eleanor.jpg' },
]

export function VoiceCreationPage() {
  const [voiceName, setVoiceName] = useState('')
  const [voiceTags, setVoiceTags] = useState('')
  const [voiceFaceUrl, setVoiceFaceUrl] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <VoiceCreationIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Creation</h1>
          <p className="text-sm text-muted-foreground">
            Create An Instant Or Professional Digital Replica Of Any Voice From Audio Samples.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 flex flex-col gap-4 border-dashed border-2">
          <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Upload className="size-6" />
            </div>
            <h3 className="font-semibold text-sm">Upload Reference Samples</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Upload Clear Audio Recordings (At Least 1 Minute Of Clean Speech Without Background Noise).
            </p>
            <Button size="sm" variant="outline" className="mt-2">
              Browse Audio Files
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-sm">Voice Clone Details</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Voice Name</label>
              <Input
                value={voiceName}
                onChange={(e) => {
                  const capitalized = e.target.value.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase())
                  setVoiceName(capitalized)
                }}
                placeholder="E.g. Narrator Voice"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Labels / Tags</label>
              <Input
                value={voiceTags}
                onChange={(e) => {
                  const capitalized = e.target.value.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase())
                  setVoiceTags(capitalized)
                }}
                placeholder="E.g. Conversational, Deep, British"
              />
            </div>

            {/* Optional Voice Face / Avatar selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-muted-foreground block">Voice Face (Optional)</label>
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 border">
                {/* Circular face preview */}
                <div
                  onClick={() => document.getElementById('voice-face-upload-page')?.click()}
                  className="relative size-12 shrink-0 rounded-full overflow-hidden bg-muted border flex items-center justify-center cursor-pointer hover:opacity-80 transition-all shadow-inner group"
                  title="Click To Upload Voice Face Photo"
                >
                  {voiceFaceUrl ? (
                    <img src={voiceFaceUrl} alt="Voice Face" className="size-full object-cover" />
                  ) : (
                    <User className="size-5 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="size-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      accept="image/*"
                      id="voice-face-upload-page"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          setVoiceFaceUrl(url)
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => document.getElementById('voice-face-upload-page')?.click()}
                      className="h-8 px-2.5 text-xs flex items-center gap-1.5"
                    >
                      <Camera className="size-3.5" />
                      <span>Upload Photo</span>
                    </Button>

                    {voiceFaceUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setVoiceFaceUrl(null)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove Photo
                      </Button>
                    )}

                    {/* Preset faces */}
                    <div className="flex items-center gap-1">
                      {PRESET_AVATARS.map((avatar) => (
                        <button
                          key={avatar.name}
                          type="button"
                          onClick={() => setVoiceFaceUrl(avatar.url)}
                          className={`size-6 rounded-full overflow-hidden border transition-all cursor-pointer hover:scale-110 ${
                            voiceFaceUrl === avatar.url ? 'ring-2 ring-primary scale-105' : 'opacity-60 hover:opacity-100'
                          }`}
                          title={avatar.name}
                        >
                          <img src={avatar.url} alt={avatar.name} className="size-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Add A Portrait Photo To Personalize This Voice Card
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button className="w-full">Create Instant Voice Clone</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function VoiceChangerPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <VoiceChangerIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Changer</h1>
          <p className="text-sm text-muted-foreground">
            Speech-to-Speech: Modify vocal identity, timbre, and accent while retaining pacing and emotions.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Input Audio</h3>
            <Badge variant="outline">Source</Badge>
          </div>
          <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center">
            <Mic className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Record speech or drag audio file here</p>
            <Button size="sm" variant="outline">Record Audio</Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Target Identity</h3>
            <Badge variant="secondary">Output</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Select the voice identity into which the input performance will be transformed.
          </p>
          <div className="flex flex-col gap-2">
            <Badge className="w-fit">Daniel (Newsreader)</Badge>
            <Badge variant="outline" className="w-fit">Callum (Storyteller)</Badge>
          </div>
          <Button className="mt-auto">Transform Voice</Button>
        </Card>
      </div>
    </div>
  )
}

export function SpeechToTextPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <SpeechToTextIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Speech to Text</h1>
          <p className="text-sm text-muted-foreground">
            Transcribe conversations, interviews, and audio files with word-level timestamps.
          </p>
        </div>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Transcription Session</span>
          <Button size="sm" className="gap-2">
            <Mic className="size-3.5" /> Start Live Recording
          </Button>
        </div>
        <div className="min-h-[200px] rounded-lg bg-muted/40 p-4 border flex items-center justify-center text-xs text-muted-foreground">
          Ready to transcribe. Click Start Live Recording or upload an audio recording.
        </div>
      </Card>
    </div>
  )
}

export function SongsPage() {
  return <MusicScreen />
}

export function BeatsPage() {
  return <BeatsScreen />
}

export function MusicPage() {
  return <MusicScreen />
}

export function AudiobooksPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <AudiobooksIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audiobooks & Stories</h1>
          <p className="text-sm text-muted-foreground">
            Produce long-form narration, podcasts, and multi-speaker stories with dynamic character voices.
          </p>
        </div>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Manuscript / Script</h3>
          <Badge variant="secondary">Multi-Speaker</Badge>
        </div>
        <Textarea
          rows={5}
          placeholder="Paste or write your manuscript here..."
        />
        <div className="flex justify-end">
          <Button size="sm" className="gap-2">
            <BookOpen className="size-3.5" /> Synthesize Project
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Generic feature wrapper for other sidebar items
export function GenericFeaturePage({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="p-8 flex flex-col items-center justify-center text-center gap-3 border">
        <div className="p-4 rounded-full bg-muted/60 text-muted-foreground">
          <Icon className="size-8" />
        </div>
        <h3 className="text-base font-semibold">{title} Workspace</h3>
        <p className="text-xs text-muted-foreground max-w-md">
          {description} Connect your local workspace to begin.
        </p>
        <Button size="sm" className="mt-2">
          Open {title}
        </Button>
      </Card>
    </div>
  )
}

export function VoicesPage() {
  return (
    <GenericFeaturePage
      title="Voices"
      description="Explore community voices, manage your custom voice library, and configure voice settings."
      icon={VoicesIcon}
    />
  )
}

export function StudioPage() {
  return (
    <GenericFeaturePage
      title="Studio"
      description="Direct and orchestrate long-form spoken content with granular control over pronunciations and timing."
      icon={StudioIcon}
    />
  )
}

export function FlowsPage() {
  return (
    <GenericFeaturePage
      title="Flows"
      description="Build multi-step generation flows across speech, image, and voice models."
      icon={FlowsIcon}
    />
  )
}

export function ChatPage() {
  return (
    <GenericFeaturePage
      title="Chat"
      description="Conversational AI agents with ultra-low latency audio responses and live websocket integration."
      icon={ChatIcon}
    />
  )
}

export function AssetsPage() {
  return (
    <GenericFeaturePage
      title="Assets"
      description="Manage audio clips, voice samples, and generated sound files stored in your workspace."
      icon={AssetsIcon}
    />
  )
}

export function SoundEffectsPage() {
  return (
    <GenericFeaturePage
      title="Sound Effects"
      description="Create cinematic sound effects, foley, and ambient audio from natural language descriptions."
      icon={SoundEffectsIcon}
    />
  )
}

export function ImageVideoPage() {
  return (
    <GenericFeaturePage
      title="Image & Video"
      description="Generate and synchronize synthetic voices with visual avatars and video clips."
      icon={ImageVideoIcon}
    />
  )
}

export function VoiceIsolatorPage() {
  return (
    <GenericFeaturePage
      title="Voice Isolator"
      description="Remove room echo, wind, background noise, and music to isolate pristine studio-grade vocal tracks."
      icon={VoiceIsolatorIcon}
    />
  )
}

export function DubbingPage() {
  return (
    <GenericFeaturePage
      title="Dubbing"
      description="Automatically translate and dub video and audio into 29+ languages while preserving the original voice."
      icon={DubbingIcon}
    />
  )
}

export function DevelopersPage() {
  return (
    <GenericFeaturePage
      title="Developers"
      description="Access API documentation, manage API keys, inspect webhooks, and explore SDKs."
      icon={DevelopersIcon}
    />
  )
}
