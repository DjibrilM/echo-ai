import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, Volume2, Sparkles, AudioWaveform } from 'lucide-react'

export function Playground() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Audio Playground</h1>
        <p className="text-sm text-muted-foreground">
          Test conversational AI, voice generation, and audio waveform components.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AudioWaveform className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Live Speech & Synthesis</h2>
            </div>
            <Badge variant="secondary">ElevenLabs</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Interact with speech streaming and realtime audio transcription.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant={isPlaying ? "destructive" : "default"}
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-2"
            >
              {isPlaying ? <Mic className="size-4 animate-pulse" /> : <Mic className="size-4" />}
              {isPlaying ? "Stop Listening" : "Start Conversation"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Volume2 className="size-4" />
              Test Audio Out
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Voice Models & Presets</h2>
            </div>
            <Badge variant="outline">Radix Nova</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Switch voices, configure latency settings, and manage speech dictionaries.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">Adam (Deep & Confident)</Badge>
            <Badge variant="secondary">Rachel (Warm & Natural)</Badge>
            <Badge variant="secondary">Charlie (Energetic)</Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}
