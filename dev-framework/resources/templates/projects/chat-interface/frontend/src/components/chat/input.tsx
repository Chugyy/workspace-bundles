'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { ArrowUp, Square, Plus, Mic, X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SessionStatus } from '@/types/sessions'
import { transcriptionService } from '@/services/transcription/service'
import { useModels } from '@/services/models/hooks'

const isRejectedType = (file: File) =>
  file.type.startsWith('audio/') || file.type.startsWith('video/')

interface ChatInputProps {
  status: SessionStatus
  onSend: (prompt: string, files?: File[], model?: string) => void
  onStop: () => void
  disabled?: boolean
}

export function ChatInput({ status, onSend, onStop, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isActive = status === 'active'

  const { data: models = [] } = useModels()
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const effectiveModelId = selectedModelId ?? models[0]?.id ?? null
  const selectedModel = models.find((m) => m.id === effectiveModelId)

  const shortName = (displayName: string) =>
    displayName.replace('Claude ', '')

  const handleSend = () => {
    const prompt = value.trim()
    if (!prompt || isActive || disabled) return
    onSend(prompt, files.length ? files : undefined, effectiveModelId ?? undefined)
    setValue('')
    setFiles([])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(f => !isRejectedType(f))
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
      setIsTranscribing(true)
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const text = await transcriptionService.transcribe(blob)
        setValue(prev => prev ? `${prev} ${text}` : text)
      } finally {
        setIsTranscribing(false)
      }
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }

  return (
    <div className="px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col max-w-3xl mx-auto bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm rounded-2xl px-3 pt-2 pb-2">

        {/* File attachment chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {files.map((file, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1 max-w-[200px]"
              >
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Row 1 — Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Claude…"
          disabled={disabled}
          rows={1}
          className="resize-none min-h-[44px] max-h-[200px] text-base border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 bg-transparent px-1"
        />

        {/* Row 2 — Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Add file"
              disabled={isActive || disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-4" />
            </Button>

            {/* Model selector */}
            {models.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isActive || disabled}
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground font-normal"
                  >
                    {selectedModel ? shortName(selectedModel.display_name) : '…'}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px]">
                  {models.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onSelect={() => setSelectedModelId(m.id)}
                      className={m.id === effectiveModelId ? 'font-medium' : ''}
                    >
                      {m.display_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isTranscribing ? (
              <Button size="icon-sm" variant="ghost" disabled aria-label="Transcribing…" className="rounded-full">
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : isRecording ? (
              <Button size="icon-sm" variant="destructive" onClick={handleMicClick} aria-label="Stop recording" className="rounded-full">
                <Square className="size-3 fill-current" />
              </Button>
            ) : (
              <Button size="icon-sm" variant="ghost" aria-label="Voice message" disabled={isActive || disabled} onClick={handleMicClick}>
                <Mic className="size-4" />
              </Button>
            )}
            {isActive ? (
              <Button size="icon-sm" variant="destructive" onClick={onStop} aria-label="Stop" className="rounded-full">
                <Square className="size-4" />
              </Button>
            ) : (
              <Button size="icon-sm" onClick={handleSend} disabled={!value.trim() || disabled} aria-label="Send" className="rounded-full">
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
