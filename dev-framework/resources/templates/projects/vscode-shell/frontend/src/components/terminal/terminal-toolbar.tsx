'use client'

import { useState, useRef } from 'react'
import { Mic, Square, Loader2, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsUp, ChevronsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { terminalService } from '@/services/terminal/terminal.service'
import { terminalRegistry } from '@/services/terminal/terminal.registry'
import { transcriptionService } from '@/services/transcription/service'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface TerminalToolbarProps {
  terminalId: string
}

type ModifierState = {
  ctrl: boolean
  shift: boolean
  alt: boolean
}

function sendKey(terminalId: string, key: string) {
  const ws = terminalService.getSocket(terminalId)
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(key)
  }
}

function KeyButton({
  label,
  onPress,
  active,
  className,
}: {
  label: string | React.ReactNode
  onPress: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress() }}
      className={`shrink-0 h-[34px] px-2.5 rounded text-[11px] font-medium transition-colors ${
        active
          ? 'bg-[#0078d4] text-white'
          : 'bg-[#3e3e3e] text-[#cccccc] active:bg-[#505050]'
      } ${className ?? ''}`}
    >
      {label}
    </button>
  )
}

export function TerminalToolbar({ terminalId }: TerminalToolbarProps) {
  const isMobile = useIsMobile()
  const [modifiers, setModifiers] = useState<ModifierState>({ ctrl: false, shift: false, alt: false })
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  if (!isMobile) return null

  const toggleModifier = (mod: keyof ModifierState) => {
    setModifiers((prev) => ({ ...prev, [mod]: !prev[mod] }))
  }

  const sendWithModifiers = (key: string, ctrlCode?: string) => {
    if (modifiers.ctrl && ctrlCode) {
      sendKey(terminalId, ctrlCode)
    } else if (modifiers.ctrl) {
      // Ctrl + letter → send control character
      const code = key.toUpperCase().charCodeAt(0) - 64
      if (code > 0 && code < 27) {
        sendKey(terminalId, String.fromCharCode(code))
      }
    } else {
      sendKey(terminalId, key)
    }
    // Reset modifiers after use
    setModifiers({ ctrl: false, shift: false, alt: false })
  }

  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setIsRecording(false)
        setIsTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const text = await transcriptionService.transcribe(blob)
          // Type the transcribed text into the terminal
          sendKey(terminalId, text)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      // Microphone access denied
    }
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-center bg-[#252526] border-t border-[#3e3e3e] pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setExpanded(true)}
          className="h-[28px] px-3 text-[11px] text-[#8b8b8b]"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#252526] border-t border-[#3e3e3e] pb-[max(12px,env(safe-area-inset-bottom))]">
      {/* Row 1: Modifier keys + common shortcuts */}
      <ScrollArea className="w-full" type="scroll">
        <div className="flex items-center gap-1.5 px-2 py-1.5 min-w-max">
          <KeyButton
            label={<ChevronsUp className="w-3.5 h-3.5" />}
            onPress={() => terminalRegistry.get(terminalId)?.scrollLines(-5)}
            className="bg-[#0e639c] text-white active:bg-[#1177bb]"
          />
          <KeyButton
            label={<ChevronsDown className="w-3.5 h-3.5" />}
            onPress={() => terminalRegistry.get(terminalId)?.scrollLines(5)}
            className="bg-[#0e639c] text-white active:bg-[#1177bb]"
          />

          <div className="w-px h-5 bg-[#3e3e3e] shrink-0" />

          <KeyButton label="Esc" onPress={() => sendKey(terminalId, '\x1b')} />
          <KeyButton label="Tab" onPress={() => sendWithModifiers('\t')} />
          <KeyButton label="Ctrl" onPress={() => toggleModifier('ctrl')} active={modifiers.ctrl} />
          <KeyButton label="Shift" onPress={() => toggleModifier('shift')} active={modifiers.shift} />
          <KeyButton label="Alt" onPress={() => toggleModifier('alt')} active={modifiers.alt} />

          <div className="w-px h-5 bg-[#3e3e3e] shrink-0" />

          <KeyButton label="Ctrl+C" onPress={() => sendKey(terminalId, '\x03')} />
          <KeyButton label="Ctrl+D" onPress={() => sendKey(terminalId, '\x04')} />
          <KeyButton label="Ctrl+Z" onPress={() => sendKey(terminalId, '\x1a')} />
          <KeyButton label="Ctrl+L" onPress={() => sendKey(terminalId, '\x0c')} />
          <KeyButton label="Ctrl+A" onPress={() => sendKey(terminalId, '\x01')} />
          <KeyButton label="Ctrl+E" onPress={() => sendKey(terminalId, '\x05')} />

          <div className="w-px h-5 bg-[#3e3e3e] shrink-0" />

          <KeyButton label={<ArrowUp className="w-3.5 h-3.5" />} onPress={() => sendKey(terminalId, '\x1b[A')} />
          <KeyButton label={<ArrowDown className="w-3.5 h-3.5" />} onPress={() => sendKey(terminalId, '\x1b[B')} />
          <KeyButton label={<ArrowLeft className="w-3.5 h-3.5" />} onPress={() => sendKey(terminalId, '\x1b[D')} />
          <KeyButton label={<ArrowRight className="w-3.5 h-3.5" />} onPress={() => sendKey(terminalId, '\x1b[C')} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Row 2: Voice + collapse */}
      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex items-center gap-1.5">
          {isTranscribing ? (
            <Button size="icon" variant="ghost" disabled className="h-8 w-8 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
          ) : isRecording ? (
            <Button size="icon" variant="destructive" onClick={handleMicClick} className="h-8 w-8 rounded-full">
              <Square className="w-3 h-3 fill-current" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={handleMicClick} className="h-8 w-8 text-[#8b8b8b]">
              <Mic className="w-4 h-4" />
            </Button>
          )}
          {isRecording && (
            <span className="text-[11px] text-red-400 animate-pulse">Recording...</span>
          )}
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="h-[28px] px-2 text-[#8b8b8b]"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
