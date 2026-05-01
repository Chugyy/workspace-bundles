'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { sessionsService, sessionKeys } from './service'
import type { ContentBlock, Message, SessionHistory, StreamEvent, ToolUseBlock } from '@/types/sessions'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useSession(sessionId: string | null) {
  return useQuery<SessionHistory>({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    queryFn: () => sessionsService.getHistory(sessionId!),
    enabled: !!sessionId && sessionId !== 'new',
    // Slow fallback polling in case SSE fails to connect
    refetchInterval: (query) => {
      const status = query.state.data?.session.status
      return status === 'active' ? 5000 : false
    },
  })
}

export function useSessionStream(sessionId: string | null) {
  const queryClient = useQueryClient()
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolUseBlock | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId || sessionId === 'new') return

    setActiveTool(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''
    const es = new EventSource(`${API_URL}/sessions/${sessionId}/events?token=${token ?? ''}`)
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      const event: StreamEvent = JSON.parse(e.data)

      // Inject each message into the cache as it arrives → real-time display
      if (event.type === 'assistant') {
        setIsStreaming(true)
        const content: Message['content'] = { type: 'assistant', blocks: event.blocks }

        queryClient.setQueryData<SessionHistory>(
          sessionKeys.detail(sessionId),
          (old) => {
            if (!old) return old
            const liveMessage: Message = {
              id: `live-${Date.now()}-${Math.random()}`,
              sessionId,
              role: 'assistant',
              content,
              sequenceNumber: old.messages.length,
              createdAt: new Date().toISOString(),
            }
            return { ...old, messages: [...old.messages, liveMessage] }
          }
        )
      }

      if (event.type === 'assistant') {
        const toolBlock = event.blocks.find((b): b is ToolUseBlock => b.type === 'tool_use')
        setActiveTool(toolBlock ?? null)
      }

      if (event.type === 'tool_result') {
        queryClient.setQueryData<SessionHistory>(
          sessionKeys.detail(sessionId),
          (old) => {
            if (!old) return old
            return {
              ...old,
              messages: old.messages.map((msg) => {
                const blocks = (msg.content as { blocks?: ContentBlock[] }).blocks
                if (!blocks?.some((b) => b.type === 'tool_use' && (b as ToolUseBlock).id === event.tool_use_id)) return msg
                return {
                  ...msg,
                  content: {
                    ...msg.content,
                    blocks: blocks.map((b) =>
                      b.type === 'tool_use' && (b as ToolUseBlock).id === event.tool_use_id
                        ? { ...b, output: event.content, is_error: event.is_error }
                        : b
                    ),
                  },
                }
              }),
            }
          }
        )
        setActiveTool(null)
      }

      if (event.type === 'completed' || event.type === 'stopped' || event.type === 'error') {
        setIsStreaming(false)
        setActiveTool(null)
        es.close()
        // Replace live messages with real DB data
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
      }
    }

    es.onerror = () => {
      setIsStreaming(false)
      setActiveTool(null)
      es.close()
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [sessionId, queryClient])

  return { isStreaming, activeTool }
}

export function useSessions(params?: {
  status?: string
  workspace_id?: string
  sort_by?: string
  sort_order?: string
  search?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: [...sessionKeys.lists(), params],
    queryFn: () => sessionsService.list(params),
  })
}

export function useStartSession() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ prompt, allowedTools, files, workspaceId, model }: { prompt: string; allowedTools?: string[]; files?: File[]; workspaceId?: string; model?: string }) =>
      sessionsService.start(prompt, allowedTools, files, workspaceId, model),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
      router.push(`/chat/${session.id}`)
    },
  })
}

export function useSendMessage(sessionId: string) {
  const queryClient = useQueryClient()
  const queryKey = sessionKeys.detail(sessionId)

  return useMutation({
    mutationFn: ({ prompt, files }: { prompt: string; files?: File[] }) =>
      sessionsService.send(sessionId, prompt, files),

    onMutate: async ({ prompt }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<SessionHistory>(queryKey)

      queryClient.setQueryData<SessionHistory>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          messages: [
            ...old.messages,
            {
              id: `optimistic-${Date.now()}`,
              sessionId,
              role: 'user' as const,
              content: { type: 'user', text: prompt },
              sequenceNumber: old.messages.length,
              createdAt: new Date().toISOString(),
            },
          ],
        }
      })

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

export function useStopSession(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => sessionsService.stop(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

export function useDeleteSession() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionsService.delete(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.removeQueries({ queryKey: sessionKeys.detail(sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
      if (pathname === `/chat/${sessionId}`) {
        router.push('/chat/new')
      }
    },
  })
}
