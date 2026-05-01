import { apiClient } from '@/lib/api-client'
import type { Session, SessionHistory, SessionListResponse } from '@/types/sessions'

export const sessionsService = {
  async start(prompt: string, allowedTools: string[] = [], files: File[] = [], workspaceId?: string, model?: string): Promise<Session> {
    const formData = new FormData()
    formData.append('prompt', prompt)
    if (allowedTools.length) formData.append('allowed_tools', allowedTools.join(','))
    if (workspaceId) formData.append('workspace_id', workspaceId)
    if (model) formData.append('model', model)
    files.forEach(f => formData.append('files', f))
    const { data } = await apiClient.post('/sessions/start', formData)
    return data
  },

  async send(sessionId: string, prompt: string, files: File[] = []): Promise<Session> {
    const formData = new FormData()
    formData.append('prompt', prompt)
    files.forEach(f => formData.append('files', f))
    const { data } = await apiClient.post(`/sessions/${sessionId}/send`, formData)
    return data
  },

  async stop(sessionId: string): Promise<Session> {
    const { data } = await apiClient.post(`/sessions/${sessionId}/stop`)
    return data
  },

  async getHistory(sessionId: string): Promise<SessionHistory> {
    const { data } = await apiClient.get(`/sessions/${sessionId}`)
    return data
  },

  async list(params?: {
    status?: string
    workspace_id?: string
    sort_by?: string
    sort_order?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<SessionListResponse> {
    const { data } = await apiClient.get('/sessions', { params })
    return data
  },

  async delete(sessionId: string): Promise<void> {
    await apiClient.delete(`/sessions/${sessionId}`)
  },
}

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
}
