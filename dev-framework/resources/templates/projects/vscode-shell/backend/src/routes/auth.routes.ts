import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import type { LoginBody } from '../types/index.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  await app.register(async (instance) => {
    await instance.register(
      (await import('@fastify/rate-limit')).default,
      {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          error: 'Too many login attempts. Try again in 1 minute.',
        }),
      },
    )

    instance.post<{ Body: LoginBody }>('/api/auth/login', {
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string' },
          },
        },
      },
      handler: async (request, reply) => {
        const { password } = request.body

        if (password !== config.auth.password) {
          return reply.status(401).send({ error: 'Invalid password' })
        }

        const token = randomUUID()
        const isProduction = process.env.NODE_ENV === 'production'

        reply.setCookie('session_token', token, {
          signed: true,
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: config.auth.sessionMaxAge / 1000,
        })

        return reply.send({ success: true })
      },
    })
  })

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie('session_token', { path: '/' })
    return reply.send({ success: true })
  })
}
