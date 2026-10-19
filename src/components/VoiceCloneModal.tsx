import { useState } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import {
  Upload,
  Mic,
  Square,
  RotateCcw,
  Play,
  Pause,
  User,
  Camera,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { cn } from '@/lib/utils'
import { PRESET_AVATARS, Voice } from '@/modules/text-to-speech'

export interface VoiceCloneModalProps {
  isOpen: boolean
  cloneMode: 'upload' | 'record'
  isRecording: boolean
  recordedDuration: number
  isPlayingRecording: boolean
  cloneVoiceName: string
  onClose: () => void
  onSetCloneMode: (mode: 'upload' | 'record') => void
  onStartRecord: () => void
  onStopRecord: () => void
  onTogglePlayRecording: () => void
  onStreamReady: (stream: MediaStream) => void
  onStreamEnd: () => void
  onSaveVoice: (voice: Voice) => void
}

export function VoiceCloneModal({
  isOpen,
  cloneMode,
  isRecording,
  recordedDuration,
  isPlayingRecording,
  cloneVoiceName,
  onClose,
  onSetCloneMode,
  onStartRecord,
  onStopRecord,
  onTogglePlayRecording,
  onStreamReady,
  onStreamEnd,
  onSaveVoice,
}: VoiceCloneModalProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [voiceName, setVoiceName] = useState<string>(cloneVoiceName || '')
  const [cloneGender, setCloneGender] = useState<'Female' | 'Male' | 'Neutral'>('Female')
  const [cloneDescription, setCloneDescription] = useState<string>('')
  const [cloneAvatarUrl, setCloneAvatarUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleSave = async () => {
    if (!voiceName.trim() || (!uploadedFile && recordedDuration === 0)) return
    setIsProcessing(true)

    await new Promise((r) => setTimeout(r, 600))

    const newVoice: Voice = {
      id: `cloned-${Date.now()}`,
      name: voiceName.trim(),
      description: cloneDescription.trim() || 'Custom Cloned Voice',
      category: 'cloned',
      color: '#3b82f6',
      avatarUrl: cloneAvatarUrl || '/voices/sterling.jpg',
      initials: voiceName.trim().charAt(0).toUpperCase() || 'C',
      gender: cloneGender,
      tags: ['Cloned', 'Custom'],
      referenceAudioName: uploadedFile?.name || 'Microphone Recording',
    }

    setIsProcessing(false)
    onSaveVoice(newVoice)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] w-full max-h-[88vh] bg-[#121214] border border-white/10 text-white p-0 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-white/[0.08] shrink-0">
          <DialogTitle className="text-base font-semibold text-white tracking-tight">
            Bring Your Own Voice (Instant Voice Clone)
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 mt-0.5">
            Upload A Short Audio Sample Or Record Directly To Clone A Custom Voice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 sidebar-scrollbar">
          {/* Audio Source Segmented Control */}
          <LayoutGroup id="cloneModalTabs">
            <div className="flex rounded-xl bg-[#18181b] p-1 border-none relative select-none">
              <button
                type="button"
                onClick={() => onSetCloneMode('upload')}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none',
                  cloneMode === 'upload' ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {cloneMode === 'upload' && (
                  <motion.div
                    layoutId="activeCloneTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white/10 rounded-lg shadow-xs"
                  />
                )}
                <Upload className="size-3.5 relative z-10" />
                <span className="relative z-10">Upload Audio</span>
              </button>
              <button
                type="button"
                onClick={() => onSetCloneMode('record')}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none',
                  cloneMode === 'record' ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {cloneMode === 'record' && (
                  <motion.div
                    layoutId="activeCloneTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white/10 rounded-lg shadow-xs"
                  />
                )}
                <Mic className="size-3.5 relative z-10" />
                <span className="relative z-10">Record Microphone</span>
              </button>
            </div>
          </LayoutGroup>

          {/* Content with Horizontal Translation */}
          <div className="overflow-hidden relative w-full max-w-full min-w-0">
            <motion.div
              className="flex w-full items-start"
              animate={{ x: `-${cloneMode === 'upload' ? 0 : 100}%` }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
            >
              {/* Tab 1: Upload Audio */}
              <div className="w-full shrink-0 min-w-0">
                <div
                  className={cn(
                    'relative rounded-2xl border border-dashed p-4 text-center transition-all h-[165px] flex flex-col items-center justify-center',
                    uploadedFile
                      ? 'border-white/20 bg-white/[0.03]'
                      : 'border-zinc-800 hover:border-zinc-600 bg-[#121214]'
                  )}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setUploadedFile(e.target.files[0])
                        if (!voiceName) {
                          setVoiceName(e.target.files[0].name.replace(/\.[^/.]+$/, ''))
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />

                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300">
                      <Upload className="size-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">
                        {uploadedFile
                          ? uploadedFile.name
                          : 'Drag And Drop Audio File, Or Click To Browse'}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {uploadedFile
                          ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Audio Sample Ready`
                          : 'Supports MP3, WAV, M4A Or FLAC (5–30 Seconds Recommended)'}
                      </p>
                    </div>
                    {uploadedFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUploadedFile(null)
                        }}
                        className="text-[11px] text-zinc-400 hover:text-white mt-1 underline cursor-pointer relative z-10 h-auto p-0 hover:bg-transparent"
                      >
                        Remove File
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab 2: Record Microphone */}
              <div className="w-full shrink-0 min-w-0">
                <div className="rounded-2xl border-none bg-[#18181b]/50 p-4 text-center h-[165px] flex flex-col items-center justify-center gap-2.5">
                  <div className="w-full h-16 flex items-center justify-center px-4 overflow-hidden min-w-0">
                    <LiveWaveform
                      active={isRecording}
                      barWidth={3}
                      barGap={1.5}
                      barRadius={3}
                      height={56}
                      fadeEdges={true}
                      fadeWidth={24}
                      mode="static"
                      onStreamReady={onStreamReady}
                      onStreamEnd={onStreamEnd}
                      className="w-full h-full text-zinc-300"
                    />
                  </div>

                  {/* Record button and replay preview */}
                  <div className="flex items-center justify-center gap-3">
                    {isRecording ? (
                      <Button
                        type="button"
                        size="icon"
                        onClick={onStopRecord}
                        className="flex size-12 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20 transition-all cursor-pointer shadow-md border-none"
                        title="Stop Recording"
                      >
                        <Square className="size-4.5 fill-current" />
                      </Button>
                    ) : recordedDuration > 0 ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={onStartRecord}
                          className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border-none text-white transition-all cursor-pointer shadow-sm"
                          title="Record Again"
                        >
                          <RotateCcw className="size-4 text-zinc-300" />
                        </Button>

                        <Button
                          type="button"
                          onClick={onTogglePlayRecording}
                          className="flex items-center gap-2 h-10 px-4 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all cursor-pointer shadow-md border-none"
                        >
                          {isPlayingRecording ? (
                            <>
                              <Pause className="size-3.5 fill-current" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="size-3.5 fill-current" />
                              <span>Replay Recording</span>
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        onClick={onStartRecord}
                        className="flex size-12 items-center justify-center rounded-full bg-white hover:bg-zinc-200 text-black transition-all cursor-pointer shadow-md border-none"
                        title="Start Recording"
                      >
                        <Mic className="size-5" />
                      </Button>
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-400">
                    {isRecording
                      ? `Recording... 00:${recordedDuration < 10 ? '0' : ''}${recordedDuration} • Click Square To Stop`
                      : recordedDuration > 0
                      ? isPlayingRecording
                        ? 'Playing Back Your Voice Sample...'
                        : `Sample Captured (${recordedDuration}s) • Click Replay Recording To Listen`
                      : 'Click To Record Sample'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Voice Metadata Fields */}
          <div className="grid grid-cols-2 gap-5 pt-3">
            <div className="space-y-2.5">
              <label className="text-xs font-medium text-zinc-300 block">Voice Name</label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => {
                  const capitalized = e.target.value.replace(/(?:^|\s)\S/g, (char) =>
                    char.toUpperCase()
                  )
                  setVoiceName(capitalized)
                }}
                placeholder="E.g. Narrator, Alex, My Voice"
                className="w-full h-10 rounded-xl border-none bg-[#18181b] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-medium text-zinc-300 block">Gender</label>
              <div className="flex h-10 items-center rounded-xl bg-[#18181b] border-none p-1">
                {(['Female', 'Male', 'Neutral'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCloneGender(g)}
                    className={cn(
                      'flex-1 h-full rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      cloneGender === g ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-medium text-zinc-300 block">Description (Optional)</label>
            <input
              type="text"
              value={cloneDescription}
              onChange={(e) => setCloneDescription(e.target.value)}
              placeholder="E.g. Warm, Conversational, Deep Timbre"
              className="w-full h-10 rounded-xl border-none bg-[#18181b] px-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>

          {/* Optional Voice Face / Avatar selection */}
          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-medium text-zinc-300 block">Voice Face (Optional)</label>
            <div className="flex items-center gap-3.5 rounded-xl bg-[#18181b] p-3">
              <div
                onClick={() => document.getElementById('voice-face-upload')?.click()}
                className="relative size-12 shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all shadow-inner group"
                title="Click To Upload Voice Face Photo"
              >
                {cloneAvatarUrl ? (
                  <img src={cloneAvatarUrl} alt="Voice Face" className="size-full object-cover" />
                ) : (
                  <User className="size-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
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
                    id="voice-face-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCloneAvatarUrl(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => document.getElementById('voice-face-upload')?.click()}
                    className="h-8 px-3 text-[11px] rounded-lg bg-white/10 hover:bg-white/15 text-white border-none cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="size-3" />
                    <span>Upload Photo</span>
                  </Button>

                  {cloneAvatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setCloneAvatarUrl(null)}
                      className="h-8 px-2 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Remove Photo
                    </Button>
                  )}

                  <span className="text-[11px] text-zinc-500 hidden sm:inline">Or Choose Character</span>

                  <div className="flex items-center gap-1.5">
                    {PRESET_AVATARS.map((avatar) => (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setCloneAvatarUrl(avatar.url)}
                        className={cn(
                          'size-7 rounded-full overflow-hidden border transition-all cursor-pointer hover:scale-110',
                          cloneAvatarUrl === avatar.url
                            ? 'border-white ring-2 ring-white/40 opacity-100 scale-105'
                            : 'border-white/10 hover:border-white/40 opacity-60 hover:opacity-100'
                        )}
                        title={avatar.name}
                      >
                        <img src={avatar.url} alt={avatar.name} className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10.5px] text-zinc-500">
                  Add A Portrait Photo To Personalize This Voice Card
                </p>
              </div>
            </div>
          </div>

          {/* Processing banner */}
          {isProcessing && (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-3 text-xs text-zinc-300">
              <RefreshCw className="size-4 animate-spin shrink-0 text-zinc-400" />
              <span>Analyzing Voice Sample And Generating Profile...</span>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-white/[0.08] bg-[#121214] shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-10 px-5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 text-white border-none cursor-pointer transition-colors shadow-none"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={
              isProcessing ||
              !voiceName.trim() ||
              (!uploadedFile && recordedDuration === 0)
            }
            onClick={handleSave}
            className="h-10 px-5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-all shadow-sm active:scale-98 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-none"
          >
            {isProcessing ? 'Creating Voice...' : 'Create Voice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
