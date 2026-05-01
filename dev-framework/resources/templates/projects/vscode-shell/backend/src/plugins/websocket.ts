import type { FastifyInstance } from 'fastify'
import fastifyWebsocket from '@fastify/websocket'

export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576,
      perMessageDeflate: false, // Disable compression — reduces latency for small messages
    },
  })
}
