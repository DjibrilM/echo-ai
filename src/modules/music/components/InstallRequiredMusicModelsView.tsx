import React, { useState } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { useMusicModels } from '../store/musicModelsStore'
import { Button } from '@/components/ui/button'

export interface InstallRequiredMusicModelsViewProps {
  onBack?: () => void
  onContinue?: () => void
}

export const InstallRequiredMusicModelsView: React.FC<InstallRequiredMusicModelsViewProps> = ({
  onBack,
  onContinue,
}) => {
  const {
    minimaxModels,
    remainingSizeFormatted,
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

  const handleContinue = () => {
    if (onContinue) {
      onContinue()
    } else if (onBack) {
      onBack()
    }
  }

  return (
    <div className="flex h-full w-full flex-1 items-center justify-center overflow-y-auto p-6 select-none bg-[#0f0f10] text-[#f4f4f5]">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Set up Songs Engine Models
          </h1>

          <p className="text-sm text-muted-foreground">
            Download MiniMax Music-v3 neural models and Qwen lyric generator for high-fidelity human vocals, lyric generation, and complete song composition.
          </p>
        </header>

        {/* Model Cards List matching TTS and Story download UI */}
        <div className="space-y-2">
          {minimaxModels.map((model) => {
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
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-white font-medium">
                      <CheckCircle2 className="size-4 text-white" />
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
                      className="shrink-0 text-white"
                    >
                      <Download className="mr-1.5 size-3.5 text-white" />
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
                        className="h-full rounded-full bg-white transition-[width] duration-200"
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
        {allRequiredReady ? (
          <Button
            type="button"
            onClick={handleContinue}
            className="w-full bg-white hover:bg-zinc-200 text-black font-medium"
          >
            Continue to Songs
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleInstallAll}
            disabled={isStartingAll || anyDownloading}
            className="w-full"
          >
            {isStartingAll
              ? 'Starting downloads...'
              : `Download all (${remainingSizeFormatted})`}
          </Button>
        )}
      </div>
    </div>
  )
}
