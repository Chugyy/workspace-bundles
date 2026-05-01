import type { FastifyRequest, FastifyReply } from 'fastify'

const PUBLIC_PATHS = ['/api/auth/login', '/api/health', '/ws/terminal']

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const path = request.url.split('?')[0]

  if (PUBLIC_PATHS.includes(path)) return

  const signedToken = request.cookies['session_token']
  if (!signedToken) {
    reply.status(401).send({ error: 'Unauthorized' })
    return
  }

  const result = request.unsignCookie(signedToken)
  if (!result.valid || !result.value) {
    reply.status(401).send({ error: 'Unauthorized' })
    return
  }
}
