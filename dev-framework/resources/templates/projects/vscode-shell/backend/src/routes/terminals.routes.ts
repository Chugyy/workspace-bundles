import type { FastifyInstance } from 'fastify'
import { sshService } from '../services/ssh.service.js'
import { sessionManager } from '../services/session-manager.js'

interface CreateTerminalBody {
  id: string
  displayName: string
  timeout?: number
}

interface ExtendBody {
  additionalMs: number
}

interface SetTimeoutBody {
  timeout: number
}

export async function terminalsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/terminals', async (_request, reply) => {
    const sessions = sessionManager.getAllSessions().map(({ id, info, remainingMs }) => ({
      id,
      displayName: info.displayName,
      tmuxSessionName: info.tmuxSessionName,
      createdAt: info.createdAt,
      timeout: info.timeout,
      remainingMs,
    }))
    return reply.send(sessions)
  })

  app.post('/api/terminals', async (request, reply) => {
    const { id, displayName, timeout } = request.body as CreateTerminalBody

    if (!id || !displayName) {
      return reply.status(400).send({ error: 'id and displayName are required' })
    }

    const info = sessionManager.addSession(id, displayName, timeout)

    try {
      await sshService.createTmuxSession(info.tmuxSessionName)
    } catch (err) {
      sessionManager.removeSession(id)
      return reply.status(500).send({ error: 'Failed to create tmux session' })
    }

    return reply.status(201).send({ success: true, tmuxSessionName: info.tmuxSessionName })
  })

  app.post('/api/terminals/:id/extend', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { additionalMs } = request.body as ExtendBody

    if (!additionalMs || typeof additionalMs !== 'number') {
      return reply.status(400).send({ error: 'additionalMs must be a number' })
    }

    const session = sessionManager.getSession(id)
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    sessionManager.extendSession(id, additionalMs)

    const updated = sessionManager.getSession(id)!
    const remainingMs = Math.max(0, updated.timeout - (Date.now() - updated.createdAt))
    return reply.send({ success: true, newRemainingMs: remainingMs })
  })

  app.put('/api/terminals/:id/timeout', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { timeout } = request.body as SetTimeoutBody

    if (!timeout || typeof timeout !== 'number') {
      return reply.status(400).send({ error: 'timeout must be a number' })
    }

    const session = sessionManager.getSession(id)
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    sessionManager.setSessionTimeout(id, timeout)
    return reply.send({ success: true })
  })

  app.delete('/api/terminals/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const session = sessionManager.getSession(id)
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' })
    }

    try {
      await sshService.killTmuxSession(session.tmuxSessionName)
    } catch {
      // tmux session may not exist on remote, proceed
    }

    sessionManager.removeSession(id)
    return reply.send({ success: true })
  })
}
