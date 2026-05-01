import type { FastifyInstance } from 'fastify'
import { posix } from 'path'
import { sftpService, PathTraversalError } from '../services/sftp.service.js'
import { sshService } from '../services/ssh.service.js'
import type { WriteBody, PathBody, RenameBody, CopyMoveBody } from '../types/index.js'

export async function filesRoutes(app: FastifyInstance): Promise<void> {
  await app.register((await import('@fastify/multipart')).default, {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  })

  app.get<{ Querystring: { path?: string } }>('/api/files/list', async (request, reply) => {
    const relativePath = request.query.path || '/'

    try {
      const entries = await sftpService.list(relativePath)
      return reply.send(entries)
    } catch (err) {
      if (err instanceof PathTraversalError) {
        return reply.status(403).send({ error: err.message })
      }
      throw err
    }
  })

  app.get<{ Querystring: { path?: string } }>('/api/files/read', async (request, reply) => {
    const { path: filePath } = request.query

    if (!filePath) return reply.status(400).send({ error: 'path query parameter is required' })

    try {
      const content = await sftpService.read(filePath)
      return reply.send({ content, path: filePath })
    } catch (err) {
      if (err instanceof PathTraversalError) {
        return reply.status(403).send({ error: err.message })
      }
      throw err
    }
  })

  app.put<{ Body: WriteBody }>('/api/files/write', {
    schema: {
      body: {
        type: 'object',
        required: ['path', 'content'],
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { path: filePath, content } = request.body

      try {
        await sftpService.write(filePath, content)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post<{ Body: PathBody }>('/api/files/create-file', {
    schema: {
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { path: filePath } = request.body

      try {
        await sftpService.write(filePath, '')
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post<{ Body: PathBody }>('/api/files/create-directory', {
    schema: {
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { path: filePath } = request.body

      try {
        await sftpService.mkdir(filePath)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post<{ Body: RenameBody }>('/api/files/rename', {
    schema: {
      body: {
        type: 'object',
        required: ['oldPath', 'newPath'],
        properties: {
          oldPath: { type: 'string' },
          newPath: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { oldPath, newPath } = request.body

      try {
        await sftpService.rename(oldPath, newPath)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.delete<{ Body: PathBody }>('/api/files/delete', {
    schema: {
      body: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { path: filePath } = request.body

      try {
        await sftpService.delete(filePath)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post<{ Body: CopyMoveBody }>('/api/files/copy', {
    schema: {
      body: {
        type: 'object',
        required: ['srcPath', 'destPath'],
        properties: {
          srcPath: { type: 'string' },
          destPath: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { srcPath, destPath } = request.body

      try {
        await sftpService.copy(srcPath, destPath)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post<{ Body: CopyMoveBody }>('/api/files/move', {
    schema: {
      body: {
        type: 'object',
        required: ['srcPath', 'destPath'],
        properties: {
          srcPath: { type: 'string' },
          destPath: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { srcPath, destPath } = request.body

      try {
        await sftpService.rename(srcPath, destPath)
        return reply.send({ success: true })
      } catch (err) {
        if (err instanceof PathTraversalError) {
          return reply.status(403).send({ error: err.message })
        }
        throw err
      }
    },
  })

  app.post('/api/files/upload', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' })
    }

    // Extract destination directory from the 'path' field
    const pathField = data.fields.path
    const destDir = pathField && 'value' in pathField ? (pathField.value as string) : '/'

    const buffer = await data.toBuffer()
    const fileName = data.filename || 'uploaded-file'
    const destPath = posix.join(destDir, fileName)

    try {
      await sftpService.uploadBuffer(destPath, buffer)
      return reply.send({ success: true, path: destPath })
    } catch (err) {
      if (err instanceof PathTraversalError) {
        return reply.status(403).send({ error: err.message })
      }
      throw err
    }
  })

  app.get<{ Querystring: { path?: string } }>('/api/files/download-zip', async (request, reply) => {
    const relativePath = request.query.path
    if (!relativePath) return reply.status(400).send({ error: 'path query parameter is required' })

    try {
      const safePath = sftpService.resolveSafePath(relativePath)
      const name = posix.basename(relativePath) || 'download'

      // Create zip on the remote server and stream it back via SSH exec
      const zipCmd = `cd "${posix.dirname(safePath)}" && tar -czf - "${posix.basename(safePath)}"`
      const client = await sshService.getClient()

      return new Promise((resolve, reject) => {
        client.exec(zipCmd, (err, stream) => {
          if (err) return reject(err)

          reply.header('Content-Type', 'application/gzip')
          reply.header('Content-Disposition', `attachment; filename="${name}.tar.gz"`)
          reply.send(stream)
          stream.on('close', () => resolve(undefined))
          stream.on('error', reject)
        })
      })
    } catch (err) {
      if (err instanceof PathTraversalError) {
        return reply.status(403).send({ error: err.message })
      }
      throw err
    }
  })
}
