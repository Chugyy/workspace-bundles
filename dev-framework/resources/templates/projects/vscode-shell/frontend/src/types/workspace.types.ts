export interface Tab {
  id: string
  type: 'file' | 'terminal'
  name: string
  // file-specific
  path?: string
  isDirty?: boolean
  content?: string
  savedContent?: string // last saved/loaded content from server, used for dirty comparison
  isPreview?: boolean
  // terminal-specific
  tmuxSessionName?: string
  timeout?: number   // duration in ms
  createdAt?: number // timestamp ms
}

export interface Session {
  id: string
  name: string
  tabs: Tab[]
  activeTabId: string | null
}

export interface WorkspaceState {
  sessions: Session[]
  activeSessionId: string | null
  fileTreeRootPath: string
}
