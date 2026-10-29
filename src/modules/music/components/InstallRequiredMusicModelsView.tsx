import React, { useState } from 'react'
import { Download, CheckCircle2, ArrowRight } from 'lucide-react'
import { useMusicModels } from '../store/musicModelsStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InstallRequiredMusicModelsViewProps {
  onBack?: () => void
  onContinue?: () => void
}

export const InstallRequiredMusicModelsView: React.FC<InstallRequiredMusicModelsViewProps> = ({
  onBack,
  onContinue,
}) => {
  const {
    selectedEngine,
    setSelectedEngine,
    activeEngineModels,
    totalSizeGb,
    allRequiredReady,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
  } = useMusicModels()

  const [isStartingAll, setIsStartingAll] = useState(false)
  const anyDownloading = Object.keys(downloadingModels).length > 0

  const handleInstallAll = async () => {
    if (allRequiredReady) {
      if (onContinue) {
        onContinue()
      } else if (onBack) {
        onBack()
      }
      return
    }
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
            Set up Music Engine Models
          </h1>

          <p className="text-sm text-muted-foreground">
            Choose your neural music generation engine based on your hardware and requirements.
          </p>

          {/* Engine Selector Segmented Tabs - Parity with Voice Engine Selector */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedEngine('acestep')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer',
                selectedEngine === 'acestep'
                  ? 'border-white/30 bg-white/10 text-white shadow-sm'
                  : 'border-[#27272a] bg-[#161619] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <span>ACE-Step v1.5</span>
              </div>
              <span className="text-[11px] text-zinc-400 leading-tight">
                Fast Turbo DiT & 5Hz LM (4 models • 3.3 GB)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedEngine('minimax')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer',
                selectedEngine === 'minimax'
                  ? 'border-white/30 bg-white/10 text-white shadow-sm'
                  : 'border-[#27272a] bg-[#161619] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <span>MiniMax Music</span>
              </div>
              <span className="text-[11px] text-zinc-400 leading-tight">
                Neural Music3 Transformer & Vocoder (2 models • 2.3 GB)
              </span>
            </button>
          </div>
        </header>

        {/* Model Cards List */}
        <div className="space-y-2">
          {activeEngineModels.map((model) => {
            const download = downloadingModels[model.id]
            const isDownloading = !!download
            const progress = Math.max(
              0,
              Math.min(100, Math.round(download?.percentage ?? 0))
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
                      {model.sizeFormatted} &bull; {model.description}
                    </p>
                  </div>

                  {isReady ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      Ready
                    </span>
                  ) : isDownloading ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelDownload(model.id)}
                      className="shrink-0 text-muted-foreground hover:text-white"
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
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`Downloading ${model.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate max-w-[320px]">
                        {download?.speed || 'Downloading...'}
                      </span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Master Action Button */}
        <div className="space-y-2">
          <Button
            type="button"
            onClick={handleInstallAll}
            disabled={isStartingAll || anyDownloading}
            className="w-full"
          >
            {allRequiredReady ? (
              <span className="flex items-center gap-1.5">
                <span>All models ready &bull; Continue to Music</span>
                <ArrowRight className="size-4" />
              </span>
            ) : isStartingAll ? (
              'Starting downloads...'
            ) : (
              `Download all (${totalSizeGb} GB)`
            )}
          </Button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer select-none"
            >
              {allRequiredReady ? 'Return to Activities' : 'Skip for now and return'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
