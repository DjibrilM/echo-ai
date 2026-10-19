import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Cpu, Zap } from 'lucide-react'

export function Models() {
  const models = [
    {
      name: "Eleven Multilingual v2",
      description: "State-of-the-art multilingual voice generation with natural emotion.",
      category: "Speech",
      status: "Active",
    },
    {
      name: "Eleven Flash v2.5",
      description: "Ultra-low latency real-time conversational voice synthesis.",
      category: "Real-time",
      status: "Active",
    },
    {
      name: "Eleven English v1",
      description: "Classic foundational English voice synthesis model.",
      category: "Speech",
      status: "Legacy",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">AI Models</h1>
        <p className="text-sm text-muted-foreground">
          Browse and configure available AI synthesis and transcription models.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {models.map((model) => (
          <Card key={model.name} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </div>
                <Badge variant={model.status === "Active" ? "default" : "secondary"}>
                  {model.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-base mb-1">{model.name}</h3>
              <p className="text-xs text-muted-foreground">{model.description}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 pt-4 border-t">
              <span className="flex items-center gap-1">
                <Cpu className="size-3.5" /> {model.category}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Zap className="size-3.5" /> High throughput
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
