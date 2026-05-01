import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { FileEntry } from '../src/types/index.js'

const mockSftpService = {
  list: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  stat: vi.fn(),
}

class MockPathTraversalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathTraversalError'
  }
}

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
  sftpService: mockSftpService,
  PathTraversalError: MockPathTraversalError,
}))

let app: FastifyInstance
let sessionCookie: string

beforeAll(async () => {
  const { buildApp } = await import('../src/index.js')
  app = await buildApp()
  await app.ready()

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { password: 'test-password' },
  })

  const rawCookie = loginResponse.headers['set-cookie'] as string
  sessionCookie = rawCookie.split(';')[0]
})

afterAll(async () => {
  await app.close()
})

describe('GET /api/files/list', () => {
  it('returns sorted FileEntry[] with directories first', async () => {
    const mockEntries: FileEntry[] = [
      { name: 'readme.md', path: '/readme.md', type: 'file', size: 100, modified: 1700000000 },
      { name: 'src', path: '/src', type: 'directory', size: 0, modified: 1700000000 },
      { name: 'docs', path: '/docs', type: 'directory', size: 0, modified: 1700000000 },
    ]
    mockSftpService.list.mockResolvedValueOnce(mockEntries)

    const response = await app.inject({
      method: 'GET',
      url: '/api/files/list?path=/',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<FileEntry[]>()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(3)
  })

  it('returns 403 on path traversal attack', async () => {
    mockSftpService.list.mockRejectedValueOnce(
      new MockPathTraversalError('Access denied: path escapes root directory'),
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/files/list?path=../../etc',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toHaveProperty('error')
  })
})

describe('GET /api/files/read', () => {
  it('returns file content for .md files', async () => {
    mockSftpService.read.mockResolvedValueOnce('# Hello World')

    const response = await app.inject({
      method: 'GET',
      url: '/api/files/read?path=/readme.md',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ content: string; path: string }>()
    expect(body.content).toBe('# Hello World')
    expect(body.path).toBe('/readme.md')
  })

  it('returns 400 for non-.md files', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/read?path=/script.js',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toHaveProperty('error')
    expect(mockSftpService.read).not.toHaveBeenCalled()
  })

  it('returns 400 for .ts files', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/read?path=/index.ts',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when path is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/read',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 403 on path traversal attack', async () => {
    mockSftpService.read.mockRejectedValueOnce(
      new MockPathTraversalError('Access denied: path escapes root directory'),
    )

    const response = await app.inject({
      method: 'GET',
      url: '/api/files/read?path=/../../etc/passwd.md',
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(403)
  })
})

describe('PUT /api/files/write', () => {
  it('writes .md file successfully', async () => {
    mockSftpService.write.mockResolvedValueOnce(undefined)

    const response = await app.inject({
      method: 'PUT',
      url: '/api/files/write',
      payload: { path: '/notes.md', content: '# Notes' },
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true })
  })

  it('returns 400 for non-.md file write attempt', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/files/write',
      payload: { path: '/script.sh', content: 'rm -rf /' },
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(400)
    expect(mockSftpService.write).not.toHaveBeenCalled()
  })

  it('returns 403 on path traversal attack', async () => {
    mockSftpService.write.mockRejectedValueOnce(
      new MockPathTraversalError('Access denied: path escapes root directory'),
    )

    const response = await app.inject({
      method: 'PUT',
      url: '/api/files/write',
      payload: { path: '/../../etc/cron.md', content: 'malicious' },
      headers: { cookie: sessionCookie },
    })

    expect(response.statusCode).toBe(403)
  })
})
