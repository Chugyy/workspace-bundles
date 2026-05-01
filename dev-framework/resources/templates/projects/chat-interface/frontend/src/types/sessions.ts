export type SessionStatus = 'active' | 'completed' | 'stopped' | 'error'

export interface Session {
  id: string
  claudeSessionId: string | null
  status: SessionStatus
  allowedTools: string | null
  workspaceId: string | null
  workspaceName: string | null
  workspaceColor: string | null
  initiatedBy: string
  firstMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface FileAttachment {
  file_id: string
  filename: string
  mime_type: string
  size: number
}

export interface MessageContent {
  type: string
  result?: string
  attachments?: FileAttachment[]
  [key: string]: unknown
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: MessageContent
  sequenceNumber: number
  createdAt: string
}

export interface SessionHistory {
  session: Session
  messages: Message[]
}

export interface SessionListResponse {
  sessions: Session[]
  total: number
}

// =====================================================
// SSE Stream Event Types
// =====================================================

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock

export interface AssistantStreamEvent {
  type: 'assistant'
  blocks: ContentBlock[]
}

export interface ResultStreamEvent {
  type: 'result'
  subtype: string
  result: string
}

export interface StatusStreamEvent {
  type: 'completed' | 'stopped' | 'error'
  message?: string
}

export interface ToolResultStreamEvent {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error: boolean
}

export type StreamEvent = AssistantStreamEvent | ResultStreamEvent | StatusStreamEvent | ToolResultStreamEvent
