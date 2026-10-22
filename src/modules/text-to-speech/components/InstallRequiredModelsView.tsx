
import React, { useState } from 'react'
import { Download, CheckCircle2, Cpu, Sparkles } from 'lucide-react'
import { useVoiceEngineModels } from '../store/voiceEngineStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const InstallRequiredModelsView: React.FC = () => {
  const {
    selectedEngine,
    setSelectedEngine,
    models,
    allRequiredReady,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
  } = useVoiceEngineModels()

  const [isStartingAll, setIsStartingAll] = useState(false)

  // Filter models relevant to the selected engine
  const activeEngineModels = models.filter(
    (model) => model.engine === selectedEngine || model.engine === 'shared'
  )

  const requiredModels = activeEngineModels.filter(
    (model) => model.category === 'backbone' || model.required
  )

  const totalSizeGb = (
    requiredModels.reduce((total, model) => total + model.sizeBytes, 0) /
    (1024 * 1024 * 1024)
  ).toFixed(1)

  const anyDownloading = Object.keys(downloadingModels).length > 0

  const handleInstallAll = async () => {
    setIsStartingAll(true)

    try {
      await downloadAllRequired()
    } finally {
      setIsStartingAll(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Set up Voice Engine Models
          </h1>

          <p className="text-sm text-muted-foreground">
            Choose your neural TTS engine based on your hardware and requirements.
          </p>

          {/* Engine Selector Segmented Tabs */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedEngine('cosyvoice3')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer',
                selectedEngine === 'cosyvoice3'
                  ? 'border-white/30 bg-white/10 text-white shadow-sm'
                  : 'border-[#27272a] bg-[#161619] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Cpu className="size-3.5 text-emerald-400" />
                <span>CosyVoice 3</span>
              </div>
              <span className="text-[11px] text-zinc-400 leading-tight">
                M-Series Mac & Voice Cloning
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedEngine('parler')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer',
                selectedEngine === 'parler'
                  ? 'border-white/30 bg-white/10 text-white shadow-sm'
                  : 'border-[#27272a] bg-[#161619] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Sparkles className="size-3.5 text-purple-400" />
                <span>Parler-TTS Mini</span>
              </div>
              <span className="text-[11px] text-zinc-400 leading-tight">
                12 Emotions & Fast Prompts
              </span>
            </button>
          </div>
        </header>

        <div className="space-y-2">
          {activeEngineModels.map((model) => {
            const download = downloadingModels[model.id]
            const isDownloading = !!download
            const progress = Math.max(
              0,
              Math.min(100, Math.round(download?.percentage ?? 0)),
            )
            const isReady = model.downloaded

            return (
              <div
                key={model.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {model.name}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {model.sizeFormatted}
                    </p>
                  </div>

                  {isReady ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4" />
                      Ready
                    </span>
                  ) : isDownloading ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelDownload(model.id)}
                      className="shrink-0 text-muted-foreground"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadModel(model.id)}
                      className="shrink-0"
                    >
                      <Download className="mr-1.5 size-3.5" />
                      Download
                    </Button>
                  )}
                </div>

                {isDownloading && (
                  <div className="mt-3 space-y-1.5">
                    <div
                      className="h-1 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`Downloading ${model.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <div
                        className="h-full rounded-full bg-foreground transition-[width] duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <p className="text-right text-xs text-muted-foreground">
                      {progress}%
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          onClick={handleInstallAll}
          disabled={isStartingAll || anyDownloading || allRequiredReady}
          className="w-full"
        >
          {allRequiredReady
            ? 'All models ready'
            : isStartingAll
              ? 'Starting downloads...'
              : `Download all (${totalSizeGb} GB)`}
        </Button>
      </div>
    </div>
  )
}
