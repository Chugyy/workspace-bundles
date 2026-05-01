'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useWorkspace } from '@/contexts/workspace-context'
import { SessionCreate } from './session-create'
import { SessionItem } from './session-item'

interface SessionListProps {
  onSessionSelect?: () => void
}

export function SessionList({ onSessionSelect }: SessionListProps) {
  const { sessions, activeSessionId } = useWorkspace()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3e3e3e]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
          Sessions
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-[11px] text-[#6b6b6b] px-2 py-2">
              No sessions. Create one to get started.
            </p>
          ) : (
            sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSessionSelect={onSessionSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-2">
        <SessionCreate />
      </div>
    </div>
  )
}
