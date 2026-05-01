import type { FastifyInstance } from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { config } from '../config.js'

export async function registerCookie(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie, {
    secret: config.auth.sessionSecret,
    hook: 'onRequest',
    parseOptions: {},
  })
}
