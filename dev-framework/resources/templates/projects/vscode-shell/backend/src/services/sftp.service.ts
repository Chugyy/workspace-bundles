import SftpClient from 'ssh2-sftp-client'
import { posix } from 'path'
import { config } from '../config.js'
import { sshService } from './ssh.service.js'
import type { FileEntry } from '../types/index.js'

class SftpService {
  private client: SftpClient
  private connected = false

  constructor() {
    this.client = new SftpClient()
    this.setupErrorHandlers()
  }

  private setupErrorHandlers(): void {
    this.client.on('error', () => {
      this.connected = false
    })

    this.client.on('close', () => {
      this.connected = false
    })

    this.client.on('end', () => {
      this.connected = false
    })
  }

  async connect(): Promise<void> {
    this.client = new SftpClient()
    this.setupErrorHandlers()

    await this.client.connect({
      host: config.ssh.host,
      port: config.ssh.port,
      username: config.ssh.username,
      ...(config.ssh.privateKey
        ? { privateKey: config.ssh.privateKey }
        : { password: config.ssh.password }),
    })
    this.connected = true
  }

  async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  resolveSafePath(relativePath: string): string {
    const root = config.sftp.rootPath
    const resolved = posix.resolve(root, '.' + posix.sep + relativePath)

    if (!resolved.startsWith(root + posix.sep) && resolved !== root) {
      throw new PathTraversalError(`Access denied: path escapes root directory`)
    }

    return resolved
  }

  async list(relativePath: string): Promise<FileEntry[]> {
    await this.ensureConnected()
    const remotePath = this.resolveSafePath(relativePath)

    const entries = await this.client.list(remotePath)

    return entries
      .filter((e) => e.name !== '.' && e.name !== '..')
      .map((e) => ({
        name: e.name,
        path: posix.join(relativePath, e.name),
        type: e.type === 'd' ? 'directory' : 'file',
        size: e.size,
        modified: e.modifyTime,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      }) as FileEntry[]
  }

  async read(relativePath: string): Promise<string> {
    await this.ensureConnected()
    const remotePath = this.resolveSafePath(relativePath)

    const buffer = await this.client.get(remotePath)
    if (Buffer.isBuffer(buffer)) return buffer.toString('utf-8')
    if (typeof buffer === 'string') return buffer
    throw new Error('Unexpected response type from SFTP get')
  }

  async write(relativePath: string, content: string): Promise<void> {
    await this.ensureConnected()
    const remotePath = this.resolveSafePath(relativePath)
    await this.client.put(Buffer.from(content, 'utf-8'), remotePath)
  }

  async stat(relativePath: string): Promise<{ size: number; modifyTime: number }> {
    await this.ensureConnected()
    const remotePath = this.resolveSafePath(relativePath)
    const stats = await this.client.stat(remotePath)
    return { size: stats.size ?? 0, modifyTime: stats.modifyTime ?? 0 }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureConnected()
    const safeOld = this.resolveSafePath(oldPath)
    const safeNew = this.resolveSafePath(newPath)
    await this.client.rename(safeOld, safeNew)
  }

  async delete(relativePath: string): Promise<void> {
    await this.ensureConnected()
    const safePath = this.resolveSafePath(relativePath)
    const stats = await this.client.stat(safePath)
    if (stats.isDirectory) {
      await this.client.rmdir(safePath, true)
    } else {
      await this.client.delete(safePath)
    }
  }

  async mkdir(relativePath: string): Promise<void> {
    await this.ensureConnected()
    const safePath = this.resolveSafePath(relativePath)
    await this.client.mkdir(safePath, true)
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    await this.ensureConnected()
    const safeSrc = this.resolveSafePath(srcPath)
    const safeDest = this.resolveSafePath(destPath)
    await sshService.exec(`cp -r '${safeSrc}' '${safeDest}'`)
  }

  async uploadBuffer(relativePath: string, buffer: Buffer): Promise<void> {
    await this.ensureConnected()
    const safePath = this.resolveSafePath(relativePath)
    await this.client.put(buffer, safePath)
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end()
      this.connected = false
    }
  }
}

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathTraversalError'
  }
}

export const sftpService = new SftpService()
