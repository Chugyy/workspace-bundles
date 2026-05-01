'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, Tab, WorkspaceState } from '@/types/workspace.types'
import { apiClient } from '@/lib/api-client'
import { terminalService } from '@/services/terminal/terminal.service'

const DEFAULT_TERMINAL_TIMEOUT = 7200000 // 2 hours

interface WorkspaceContextValue extends WorkspaceState {
  activeSession: Session | null
  activeTab: Tab | null
  loaded: boolean
  addSession: (name?: string) => void
  removeSession: (sessionId: string) => void
  renameSession: (sessionId: string, name: string) => void
  setActiveSession: (sessionId: string) => void
  addTab: (sessionId: string, filePath: string, fileName: string) => void
  addTerminalTab: (sessionId: string) => Promise<string>
  closeTab: (sessionId: string, tabId: string) => void
  setActiveTab: (sessionId: string, tabId: string) => void
  setTabDirty: (sessionId: string, tabId: string, isDirty: boolean) => void
  setTabContent: (sessionId: string, tabId: string, content: string) => void
  setTabSavedContent: (sessionId: string, tabId: string, savedContent: string) => void
  setTabPreview: (sessionId: string, tabId: string, isPreview: boolean) => void
  reorderTab: (sessionId: string, fromIndex: number, toIndex: number) => void
  setFileTreeRootPath: (path: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const DEFAULT_STATE: WorkspaceState = {
  sessions: [],
  activeSessionId: null,
  fileTreeRootPath: '/',
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

function stripForSave(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    sessions: state.sessions.map((s) => ({
      ...s,
      tabs: s.tabs.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, savedContent, ...rest } = t
        return rest
      }),
    })),
  }
}

function buildTerminalTab(id: string, terminalCount: number, tmuxSessionName: string): Tab {
  return {
    id,
    type: 'terminal',
    name: `Terminal ${terminalCount + 1}`,
    tmuxSessionName,
    createdAt: Date.now(),
    timeout: DEFAULT_TERMINAL_TIMEOUT,
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(DEFAULT_STATE)
  const [loaded, setLoaded] = useState(false)

  // Load workspace state from server on mount
  useEffect(() => {
    apiClient
      .get('/workspace')
      .then(({ data }) => {
        setState(data)
        setLoaded(true)
      })
      .catch(() => {
        setState(DEFAULT_STATE)
        setLoaded(true)
      })
  }, [])

  // Debounced save to server on state changes
  const saveToServer = useMemo(
    () =>
      debounce((s: WorkspaceState) => {
        apiClient.put('/workspace', stripForSave(s)).catch(() => {})
      }, 500),
    []
  )

  useEffect(() => {
    if (loaded) saveToServer(state)
  }, [state, loaded, saveToServer])

  const updateSession = useCallback(
    (sessionId: string, updater: (session: Session) => Session) => {
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? updater(s) : s
        ),
      }))
    },
    []
  )

  const addSession = useCallback((name?: string) => {
    const id = generateId()
    const terminalTabId = generateId()
    const tmuxSessionName = `term-${terminalTabId.replace(/[^a-zA-Z0-9_-]/g, '-')}`

    terminalService
      .createSession(terminalTabId, `Terminal 1`)
      .catch((err) => console.error('Failed to create terminal session:', err))

    const session: Session = {
      id,
      name: name || `Session ${Date.now()}`,
      tabs: [buildTerminalTab(terminalTabId, 0, tmuxSessionName)],
      activeTabId: terminalTabId,
    }
    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
      activeSessionId: prev.activeSessionId ?? id,
    }))
  }, [])

  const removeSession = useCallback((sessionId: string) => {
    setState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== sessionId)
      const activeSessionId =
        prev.activeSessionId === sessionId
          ? (remaining[remaining.length - 1]?.id ?? null)
          : prev.activeSessionId
      return { ...prev, sessions: remaining, activeSessionId }
    })
  }, [])

  const renameSession = useCallback(
    (sessionId: string, name: string) => {
      updateSession(sessionId, (s) => ({ ...s, name }))
    },
    [updateSession]
  )

  const setActiveSession = useCallback((sessionId: string) => {
    setState((prev) => ({ ...prev, activeSessionId: sessionId }))
  }, [])

  const addTab = useCallback(
    (sessionId: string, filePath: string, fileName: string) => {
      updateSession(sessionId, (session) => {
        const existing = session.tabs.find((t) => t.type === 'file' && t.path === filePath)
        if (existing) {
          return { ...session, activeTabId: existing.id }
        }
        const tab: Tab = {
          id: generateId(),
          type: 'file',
          path: filePath,
          name: fileName,
          isDirty: false,
        }
        return {
          ...session,
          tabs: [...session.tabs, tab],
          activeTabId: tab.id,
        }
      })
    },
    [updateSession]
  )

  const addTerminalTab = useCallback(
    async (sessionId: string): Promise<string> => {
      const id = generateId()
      const tmuxSessionName = `term-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`

      // Determine terminal count before update for naming
      setState((prev) => {
        const session = prev.sessions.find((s) => s.id === sessionId)
        const terminalCount = session?.tabs.filter((t) => t.type === 'terminal').length ?? 0
        const tab = buildTerminalTab(id, terminalCount, tmuxSessionName)

        return {
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, tabs: [...s.tabs, tab], activeTabId: id }
              : s
          ),
        }
      })

      // Create tmux session on server
      try {
        await terminalService.createSession(id, `Terminal`, undefined)
      } catch (err) {
        console.error('Failed to create terminal session:', err)
      }

      return id
    },
    []
  )

  const closeTab = useCallback(
    (sessionId: string, tabId: string) => {
      // Find tab to check type before removing
      setState((prev) => {
        const session = prev.sessions.find((s) => s.id === sessionId)
        const tab = session?.tabs.find((t) => t.id === tabId)

        if (tab?.type === 'terminal') {
          terminalService.deleteSession(tabId).catch(() => {})
        }

        return {
          ...prev,
          sessions: prev.sessions.map((s) => {
            if (s.id !== sessionId) return s
            const tabs = s.tabs.filter((t) => t.id !== tabId)
            let activeTabId = s.activeTabId
            if (activeTabId === tabId) {
              const idx = s.tabs.findIndex((t) => t.id === tabId)
              activeTabId = tabs[idx]?.id ?? tabs[idx - 1]?.id ?? null
            }
            return { ...s, tabs, activeTabId }
          }),
        }
      })
    },
    []
  )

  const setActiveTab = useCallback(
    (sessionId: string, tabId: string) => {
      updateSession(sessionId, (s) => ({ ...s, activeTabId: tabId }))
    },
    [updateSession]
  )

  const setTabDirty = useCallback(
    (sessionId: string, tabId: string, isDirty: boolean) => {
      updateSession(sessionId, (session) => ({
        ...session,
        tabs: session.tabs.map((t) =>
          t.id === tabId ? { ...t, isDirty } : t
        ),
      }))
    },
    [updateSession]
  )

  const setTabContent = useCallback(
    (sessionId: string, tabId: string, content: string) => {
      updateSession(sessionId, (session) => ({
        ...session,
        tabs: session.tabs.map((t) =>
          t.id === tabId ? { ...t, content } : t
        ),
      }))
    },
    [updateSession]
  )

  const setTabSavedContent = useCallback(
    (sessionId: string, tabId: string, savedContent: string) => {
      updateSession(sessionId, (session) => ({
        ...session,
        tabs: session.tabs.map((t) =>
          t.id === tabId ? { ...t, savedContent } : t
        ),
      }))
    },
    [updateSession]
  )

  const setTabPreview = useCallback(
    (sessionId: string, tabId: string, isPreview: boolean) => {
      updateSession(sessionId, (session) => ({
        ...session,
        tabs: session.tabs.map((t) =>
          t.id === tabId ? { ...t, isPreview } : t
        ),
      }))
    },
    [updateSession]
  )

  const reorderTab = useCallback(
    (sessionId: string, fromIndex: number, toIndex: number) => {
      updateSession(sessionId, (session) => {
        const tabs = [...session.tabs]
        const [moved] = tabs.splice(fromIndex, 1)
        tabs.splice(toIndex, 0, moved)
        return { ...session, tabs }
      })
    },
    [updateSession]
  )

  const setFileTreeRootPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, fileTreeRootPath: path }))
  }, [])

  const activeSession =
    state.sessions.find((s) => s.id === state.activeSessionId) ?? null
  const activeTab = activeSession?.tabs.find((t) => t.id === activeSession.activeTabId) ?? null

  return (
    <WorkspaceContext.Provider
      value={{
        ...state,
        activeSession,
        activeTab,
        loaded,
        addSession,
        removeSession,
        renameSession,
        setActiveSession,
        addTab,
        addTerminalTab,
        closeTab,
        setActiveTab,
        setTabDirty,
        setTabContent,
        setTabSavedContent,
        setTabPreview,
        reorderTab,
        setFileTreeRootPath,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
