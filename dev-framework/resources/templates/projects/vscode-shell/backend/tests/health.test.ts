import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

vi.mock('../src/config.js', () => ({
  config: {
    port: 3001,
    host: '0.0.0.0',
    auth: { password: 'test-password', sessionSecret: 'test-secret-32-chars-minimum!!', sessionMaxAge: 86400000 },
    ssh: { host: 'localhost', port: 22, username: 'test' },
    sftp: { rootPath: '/root' },
    cors: { origin: 'http://localhost:3000' },
  },
}))

vi.mock('../src/services/ssh.service.js', () => ({
  sshService: { isConnected: () => false, createShell: vi.fn(), disconnect: vi.fn() },
}))

vi.mock('../src/services/sftp.service.js', () => ({
  sftpService: { list: vi.fn(), read: vi.fn(), write: vi.fn(), stat: vi.fn() },
  PathTraversalError: class PathTraversalError extends Error {},
}))

let app: FastifyInstance

beforeAll(async () => {
  const { buildApp } = await import('../src/index.js')
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; ssh: string; timestamp: string }>()
    expect(body.status).toBe('ok')
    expect(body).toHaveProperty('ssh')
    expect(body).toHaveProperty('timestamp')
  })
})
