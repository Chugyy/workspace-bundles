import type { FastifyInstance } from 'fastify'
import { sshService } from '../services/ssh.service.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async (_request, reply) => {
    reply.send({
      status: 'ok',
      ssh: sshService.isConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  })
}
