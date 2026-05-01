'use client'

import { Files, Terminal, Trash2, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/contexts/workspace-context'
import type { Session } from '@/types/workspace.types'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSessionSelect?: () => void
}

export function SessionItem({ session, isActive, onSessionSelect }: SessionItemProps) {
  const { setActiveSession, removeSession, renameSession } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session.name)

  const fileCount = session.tabs.filter((t) => t.type === 'file').length
  const terminalCount = session.tabs.filter((t) => t.type === 'terminal').length

  const handleRename = () => {
    if (name.trim()) {
      renameSession(session.id, name.trim())
    }
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'group flex flex-col px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] rounded-md',
        isActive && 'bg-[#37373d]'
      )}
      onClick={() => { setActiveSession(session.id); onSessionSelect?.() }}
    >
      <div className="flex items-center justify-between gap-1">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="h-5 text-xs py-0 px-1"
          />
        ) : (
          <span
            className={cn(
              'text-[13px] font-medium truncate',
              isActive ? 'text-white' : 'text-[#cccccc]'
            )}
          >
            {session.name}
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation()
              removeSession(session.id)
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="flex items-center gap-1 text-[11px] text-[#8b8b8b]">
          <Files className="w-3 h-3" />
          {fileCount}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#8b8b8b]">
          <Terminal className="w-3 h-3" />
          {terminalCount}
        </span>
      </div>
    </div>
  )
}
