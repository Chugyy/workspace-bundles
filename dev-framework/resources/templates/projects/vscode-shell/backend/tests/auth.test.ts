import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

vi.mock('../src/config.js', () => ({
  config: {
    port: 3001,
    host: '0.0.0.0',
    auth: { password: 'correct-password', sessionSecret: 'test-secret-32-chars-minimum!!', sessionMaxAge: 86400000 },
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

describe('POST /api/auth/login', () => {
  it('returns 200 and sets session cookie with correct password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'correct-password' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
    expect(response.headers['set-cookie']).toBeDefined()
    expect(response.headers['set-cookie']).toContain('session_token')
    expect(response.headers['set-cookie']).toContain('HttpOnly')
  })

  it('returns 401 with wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'wrong-password' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'Invalid password' })
  })

  it('returns 400 with missing password field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears session cookie', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'correct-password' },
    })

    const cookie = loginResponse.headers['set-cookie'] as string
    const sessionToken = cookie.split(';')[0]

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: sessionToken },
    })

    expect(logoutResponse.statusCode).toBe(200)
    expect(logoutResponse.json()).toEqual({ success: true })
    const setCookieHeader = logoutResponse.headers['set-cookie'] as string
    expect(setCookieHeader).toContain('session_token=;')
  })
})

describe('Protected routes', () => {
  it('returns 401 when accessing protected route without cookie', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/list',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('allows access to protected route with valid session cookie', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'correct-password' },
    })

    const cookie = loginResponse.headers['set-cookie'] as string
    const sessionToken = cookie.split(';')[0]

    const { sftpService } = await import('../src/services/sftp.service.js')
    vi.mocked(sftpService.list).mockResolvedValueOnce([])

    const response = await app.inject({
      method: 'GET',
      url: '/api/files/list',
      headers: { cookie: sessionToken },
    })

    expect(response.statusCode).toBe(200)
  })
})
