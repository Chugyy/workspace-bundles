'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './message'
import type { Message, SessionStatus, ToolUseBlock } from '@/types/sessions'

interface ChatMessagesProps {
  messages: Message[]
  status: SessionStatus
  isStreaming: boolean
  activeTool: ToolUseBlock | null
}

export function ChatMessages({ messages, status, activeTool }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, status])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 pt-8 pb-4 max-w-3xl mx-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} activeTool={activeTool} />
        ))}

        {status === 'active' && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-muted/60">
              <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
