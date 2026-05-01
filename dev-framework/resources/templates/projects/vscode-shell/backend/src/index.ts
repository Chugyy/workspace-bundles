import 'dotenv/config'
import Fastify from 'fastify'
import { config } from './config.js'
import { loggerConfig } from './utils/logger.js'
import { registerCors } from './plugins/cors.js'
import { registerCookie } from './plugins/cookie.js'
import { registerWebSocket } from './plugins/websocket.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import { healthRoutes } from './routes/health.routes.js'
import { authRoutes } from './routes/auth.routes.js'
import { filesRoutes } from './routes/files.routes.js'
import { terminalHandler } from './websocket/terminal.handler.js'
import { terminalsRoutes } from './routes/terminals.routes.js'
import { workspaceRoutes } from './routes/workspace.routes.js'
import { transcriptionRoutes } from './routes/transcription.routes.js'

export async function buildApp() {
  const app = Fastify({ logger: loggerConfig })

  await registerCors(app)
  await registerCookie(app)
  await registerWebSocket(app)

  app.addHook('preHandler', authMiddleware)

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(filesRoutes)
  await app.register(terminalHandler)
  await app.register(terminalsRoutes)
  await app.register(workspaceRoutes)
  await app.register(transcriptionRoutes)

  return app
}

async function start(): Promise<void> {
  const app = await buildApp()

  try {
    await app.listen({ port: config.port, host: config.host })
    app.log.info(`Server listening on ${config.host}:${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
  start()
}
