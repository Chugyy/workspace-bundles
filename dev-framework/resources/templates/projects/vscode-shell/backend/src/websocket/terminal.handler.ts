import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { sshService } from '../services/ssh.service.js'
import { sessionManager } from '../services/session-manager.js'
import type { ResizeMessage } from '../types/index.js'

function parseMessage(raw: string): { type: 'resize'; resize: ResizeMessage } | { type: 'kill' } | { type: 'data'; data: string } {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed !== null && typeof parsed === 'object' && 'type' in parsed) {
      const msg = parsed as Record<string, unknown>
      if (msg.type === 'resize') return { type: 'resize', resize: parsed as ResizeMessage }
      if (msg.type === 'kill') return { type: 'kill' }
    }
  } catch {
    // not JSON — treat as raw keystroke data
  }
  return { type: 'data', data: raw }
}

export async function terminalHandler(app: FastifyInstance): Promise<void> {
  app.get('/ws/terminal', { websocket: true }, async (socket: WebSocket, request) => {
    const query = request.query as Record<string, string>
    const tmuxSession = query.tmuxSession

    if (!tmuxSession) {
      app.log.warn('[WS] Missing tmuxSession query param')
      socket.close(4002, 'Missing tmuxSession')
      return
    }

    app.log.info(`[WS] Attaching to tmux session: ${tmuxSession}`)

    let shell: Awaited<ReturnType<typeof sshService.attachTmuxSession>> | null = null

    try {
      shell = await sshService.attachTmuxSession(tmuxSession)
      app.log.info('[WS] Attached to tmux session')
    } catch (err) {
      app.log.error({ err }, '[WS] Failed to attach tmux session')
      socket.close(4003, 'SSH connection failed')
      return
    }

    let sendBuffer = ''
    let sendTimer: ReturnType<typeof setTimeout> | null = null
    const BATCH_INTERVAL = 8

    const flushBuffer = () => {
      if (sendBuffer && socket.readyState === socket.OPEN) {
        socket.send(sendBuffer)
        sendBuffer = ''
      }
      sendTimer = null
    }

    shell.on('data', (data: Buffer) => {
      sendBuffer += data.toString('utf-8')
      if (sendBuffer.length > 4096) {
        if (sendTimer) { clearTimeout(sendTimer); sendTimer = null }
        flushBuffer()
      } else if (!sendTimer) {
        sendTimer = setTimeout(flushBuffer, BATCH_INTERVAL)
      }
    })

    shell.on('close', () => {
      app.log.info('[WS] SSH shell closed')
      if (socket.readyState === socket.OPEN) {
        socket.close(1000, 'Shell closed')
      }
    })

    shell.on('error', (err: Error) => {
      app.log.error({ err }, 'Shell error')
      if (socket.readyState === socket.OPEN) {
        socket.close(4004, 'Shell error')
      }
    })

    socket.on('message', async (raw: Buffer | string) => {
      if (!shell) return

      const message = raw.toString('utf-8')
      const parsed = parseMessage(message)

      if (parsed.type === 'resize') {
        shell.setWindow(parsed.resize.rows, parsed.resize.cols, 0, 0)
      } else if (parsed.type === 'kill') {
        app.log.info(`[WS] Kill requested for session: ${tmuxSession}`)
        try {
          await sshService.killTmuxSession(tmuxSession)
          sessionManager.removeSession(tmuxSession)
        } catch (err) {
          app.log.error({ err }, '[WS] Failed to kill tmux session')
        }
        socket.close(1000, 'Session killed')
      } else {
        shell.write(parsed.data)
      }
    })

    socket.on('close', () => {
      if (sendTimer) { clearTimeout(sendTimer); sendTimer = null }
      flushBuffer()
      if (shell) {
        shell.end()
        shell = null
      }
    })

    socket.on('error', (err: Error) => {
      app.log.error({ err }, 'WebSocket error')
      if (shell) {
        shell.end()
        shell = null
      }
    })
  })
}
