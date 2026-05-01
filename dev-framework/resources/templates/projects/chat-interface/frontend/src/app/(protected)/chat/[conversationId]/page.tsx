'use client'

import { use, useEffect, useState } from 'react'
import { FolderOpenIcon } from 'lucide-react'
import { useStartSession, useSendMessage, useStopSession, useSession, useSessionStream } from '@/services/sessions/hooks'
import { useWorkspaces } from '@/services/workspaces/hooks'
import { ChatMessages } from '@/components/chat/messages'
import { ChatInput } from '@/components/chat/input'
import { WorkspaceSelector, useDefaultWorkspaceId } from '@/components/workspace/selector'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface Props {
  params: Promise<{ conversationId: string }>
}

export default function ChatPage({ params }: Props) {
  const { conversationId } = use(params)
  const isNew = conversationId === 'new'

  const { data, isLoading } = useSession(isNew ? null : conversationId)
  const { isStreaming, activeTool } = useSessionStream(isNew ? null : conversationId)
  const startSession = useStartSession()
  const sendMessage = useSendMessage(conversationId)
  const stopSession = useStopSession(conversationId)

  const defaultWorkspaceId = useDefaultWorkspaceId()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const { data: workspaces = [] } = useWorkspaces()

  useEffect(() => {
    if (!selectedWorkspaceId && defaultWorkspaceId) {
      setSelectedWorkspaceId(defaultWorkspaceId)
    }
  }, [defaultWorkspaceId, selectedWorkspaceId])

  const session = data?.session
  const messages = data?.messages ?? []
  const status = isStreaming ? 'active' : (session?.status ?? 'completed')

  const activeWorkspaceId = isNew ? selectedWorkspaceId : session?.workspaceId
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  const handleSend = (prompt: string, files?: File[], model?: string) => {
    if (isNew) {
      startSession.mutate({ prompt, files, workspaceId: selectedWorkspaceId ?? undefined, model })
    } else {
      sendMessage.mutate({ prompt, files })
    }
  }

  const handleStop = () => {
    stopSession.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center text-muted-foreground text-sm">
        Loading session…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
        <SidebarTrigger />
        <span className="text-sm font-medium text-muted-foreground truncate flex-1">
          {isNew ? 'New conversation' : `Session ${conversationId.slice(0, 8)}…`}
        </span>
        {activeWorkspace && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpenIcon size={13} />
            {activeWorkspace.name}
          </span>
        )}
      </div>

      {/* Messages / New conversation setup */}
      {isNew ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-muted-foreground">Select a workspace, then start your conversation.</p>
          <WorkspaceSelector
            value={selectedWorkspaceId}
            onChange={setSelectedWorkspaceId}
          />
        </div>
      ) : (
        <ChatMessages
          messages={messages}
          status={status}
          isStreaming={isStreaming}
          activeTool={activeTool}
        />
      )}

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          status={isNew ? 'completed' : status}
          onSend={handleSend}
          onStop={handleStop}
          disabled={startSession.isPending || sendMessage.isPending}
        />
      </div>

    </div>
  )
}
