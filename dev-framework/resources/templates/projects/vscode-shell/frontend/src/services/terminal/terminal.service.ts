import { apiClient } from '@/lib/api-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

class TerminalService {
  private sockets: Map<string, WebSocket> = new Map()

  connect(terminalId: string, tmuxSessionName: string): WebSocket {
    if (this.sockets.has(terminalId)) {
      const existing = this.sockets.get(terminalId)!
      if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
        return existing
      }
      this.sockets.delete(terminalId)
    }

    const url = `${WS_URL}/ws/terminal?tmuxSession=${tmuxSessionName}`
    const socket = new WebSocket(url)
    this.sockets.set(terminalId, socket)
    return socket
  }

  disconnect(terminalId: string): void {
    const socket = this.sockets.get(terminalId)
    if (socket) {
      socket.close()
      this.sockets.delete(terminalId)
    }
  }

  getSocket(terminalId: string): WebSocket | undefined {
    return this.sockets.get(terminalId)
  }

  async createSession(id: string, displayName: string, timeout?: number): Promise<{ tmuxSessionName: string }> {
    const { data } = await apiClient.post('/terminals', { id, displayName, timeout })
    return data
  }

  async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`/terminals/${id}`)
  }

  async extendSession(id: string, additionalMs: number): Promise<{ newRemainingMs: number }> {
    const { data } = await apiClient.post(`/terminals/${id}/extend`, { additionalMs })
    return data
  }

  async listSessions(): Promise<Array<{ id: string; displayName: string; remainingMs: number }>> {
    const { data } = await apiClient.get('/terminals')
    return data
  }
}

export const terminalService = new TerminalService()
