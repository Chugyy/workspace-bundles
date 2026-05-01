import { config } from '../config.js'
import { sshService } from './ssh.service.js'
import { notifier } from './notifier.js'

interface TerminalSessionInfo {
  tmuxSessionName: string
  displayName: string
  createdAt: number
  timeout: number
  warningNotified: boolean
}

class SessionManager {
  private sessions: Map<string, TerminalSessionInfo> = new Map()
  private watchdogInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // No watchdog — sessions persist until manually killed
  }

  addSession(terminalId: string, displayName: string, timeout?: number): TerminalSessionInfo {
    const info: TerminalSessionInfo = {
      tmuxSessionName: terminalId.replace(/[^a-zA-Z0-9_-]/g, '-'),
      displayName,
      createdAt: Date.now(),
      timeout: timeout ?? config.terminal.defaultTimeout,
      warningNotified: false,
    }
    this.sessions.set(terminalId, info)
    return info
  }

  removeSession(terminalId: string): void {
    this.sessions.delete(terminalId)
  }

  getSession(terminalId: string): TerminalSessionInfo | undefined {
    return this.sessions.get(terminalId)
  }

  getAllSessions(): { id: string; info: TerminalSessionInfo; remainingMs: number }[] {
    return Array.from(this.sessions.entries()).map(([id, info]) => ({
      id,
      info,
      remainingMs: Math.max(0, info.timeout - (Date.now() - info.createdAt)),
    }))
  }

  extendSession(terminalId: string, additionalMs: number): void {
    const session = this.sessions.get(terminalId)
    if (!session) return
    session.timeout += additionalMs
    session.warningNotified = false
  }

  setSessionTimeout(terminalId: string, timeoutMs: number): void {
    const session = this.sessions.get(terminalId)
    if (!session) return
    session.timeout = timeoutMs
    session.warningNotified = false
  }

  private startWatchdog(): void {
    this.watchdogInterval = setInterval(async () => {
      const now = Date.now()
      for (const [id, session] of this.sessions.entries()) {
        const remaining = session.timeout - (now - session.createdAt)

        if (remaining <= 0) {
          try {
            await sshService.killTmuxSession(session.tmuxSessionName)
          } catch {
            // session may already be gone
          }
          this.sessions.delete(id)
          notifier.sendExpired(session.displayName).catch(() => {})
        } else if (remaining <= config.terminal.warningBefore && !session.warningNotified) {
          session.warningNotified = true
          const remainingMin = Math.ceil(remaining / 60000)
          notifier.sendWarning(session.displayName, remainingMin).catch(() => {})
        }
      }
    }, 60_000)
  }

  destroy(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
      this.watchdogInterval = null
    }
  }
}

export const sessionManager = new SessionManager()
