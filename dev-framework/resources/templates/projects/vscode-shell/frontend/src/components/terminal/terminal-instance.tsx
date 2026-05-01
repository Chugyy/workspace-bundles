'use client'

import { useRef } from 'react'
import { useTerminal } from '@/hooks/use-terminal'

interface TerminalInstanceProps {
  terminalId: string
  tmuxSessionName: string
  isActive: boolean
}

export function TerminalInstance({ terminalId, tmuxSessionName, isActive }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useTerminal(terminalId, tmuxSessionName, containerRef, isActive)

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        position: isActive ? 'relative' : 'absolute',
        height: '100%',
        width: '100%',
        top: 0,
        left: 0,
      }}
    />
  )
}
