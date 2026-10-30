import React, { useState } from 'react'
import { Download, CheckCircle2, ArrowRight } from 'lucide-react'
import { useBeatsModels } from '../store/beatsModelsStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InstallRequiredBeatsModelsViewProps {
  onBack?: () => void
  onContinue?: () => void
}

export const InstallRequiredBeatsModelsView: React.FC<InstallRequiredBeatsModelsViewProps> = ({
  onBack,
  onContinue,
}) => {
  const {
    models,
    totalSuiteSizeFormatted,
    remainingSizeFormatted,
    downloadedCount,
    totalCount,
    allRequiredReady,
    downloadingModels,
    downloadModel,
    downloadAllRequired,
    cancelDownload,
  } = useBeatsModels()

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

  const title = 'Set up ACE-Step Beats Models'
  const description =
    'Download ACE-Step 1.5 neural models (~3.3 GB) for rhythm synthesis, drum grooves, 808s, and instrumental beats.'

  return (
    <div className="flex h-full w-full flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          <p className="text-sm text-muted-foreground">
            {description}
          </p>

          {/* Engine Banner - ACE-Step for Beats */}
          <div className="grid grid-cols-1 pt-2">
            <div
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left',
                'border-white/30 bg-white/10 text-white shadow-sm'
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <span>ACE-Step v1.5 (Beats Engine)</span>
              </div>
              <span className="text-[11px] text-zinc-400 leading-tight">
                Fast Turbo DiT & 5Hz LM ({totalCount} models &bull; {totalSuiteSizeFormatted}
                {downloadedCount > 0 && !allRequiredReady && (
                  <span className="text-emerald-400 ml-1">
                    &bull; {downloadedCount}/{totalCount} ready ({remainingSizeFormatted} remaining)
                  </span>
                )}
                )
              </span>
            </div>
          </div>
        </header>

        {/* Model Cards List */}
        <div className="space-y-2">
          {models.map((model) => {
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
                className={cn(
                  'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
                  isReady
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : isDownloading
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border/60 bg-card/40'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {model.name}
                    </p>

                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {model.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span>{model.sizeFormatted}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{model.category}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-zinc-400">{model.id}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                        <CheckCircle2 className="size-4" />
                        <span>Ready</span>
                      </span>
                    ) : isDownloading ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelDownload(model.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => downloadModel(model.id)}
                        className="gap-1.5 text-xs"
                      >
                        <Download className="size-3.5" />
                        <span>Download</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress bar when downloading */}
                {isDownloading && (
                  <div className="space-y-1 pt-1">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
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
            className="w-full font-medium"
          >
            {allRequiredReady ? (
              <span className="flex items-center gap-1.5">
                <span>All models ready &bull; Continue to Beats</span>
                <ArrowRight className="size-4" />
              </span>
            ) : isStartingAll ? (
              'Starting downloads...'
            ) : downloadedCount > 0 ? (
              `Download remaining ${totalCount - downloadedCount} models (${remainingSizeFormatted} of ${totalSuiteSizeFormatted})`
            ) : (
              `Download all models (${totalSuiteSizeFormatted})`
            )}
          </Button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 cursor-pointer select-none"
            >
              {allRequiredReady ? 'Return to Activities' : 'Return to previous screen'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
