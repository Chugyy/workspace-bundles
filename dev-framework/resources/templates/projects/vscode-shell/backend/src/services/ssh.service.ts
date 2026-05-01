import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import { config } from '../config.js'

class SshService {
  private client: Client | null = null
  private connected = false
  private reconnecting = false

  private buildConnectConfig(): ConnectConfig {
    return {
      host: config.ssh.host,
      port: config.ssh.port,
      username: config.ssh.username,
      ...(config.ssh.privateKey
        ? { privateKey: config.ssh.privateKey }
        : { password: config.ssh.password }),
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
        compress: ['none'],
      },
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      readyTimeout: 10000,
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client()

      this.client.on('ready', () => {
        this.connected = true
        this.reconnecting = false
        resolve()
      })

      this.client.on('error', (err) => {
        this.connected = false
        if (!this.reconnecting) reject(err)
      })

      this.client.on('close', () => {
        this.connected = false
        this.scheduleReconnect()
      })

      this.client.on('end', () => {
        this.connected = false
      })

      this.client.connect(this.buildConnectConfig())
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return
    this.reconnecting = true

    setTimeout(async () => {
      try {
        await this.connect()
      } catch {
        this.reconnecting = false
        this.scheduleReconnect()
      }
    }, 5000)
  }

  async getClient(): Promise<Client> {
    if (!this.connected || !this.client) {
      await this.connect()
    }
    return this.client!
  }

  async createShell(): Promise<ClientChannel> {
    const client = await this.getClient()

    return new Promise((resolve, reject) => {
      client.shell(
        { term: 'xterm-256color', cols: 80, rows: 24 },
        (err, stream) => {
          if (err) return reject(err)
          resolve(stream)
        },
      )
    })
  }

  async createTmuxSession(sessionName: string): Promise<void> {
    const client = await this.getClient()
    const safeName = sessionName.replace(/[^a-zA-Z0-9_-]/g, '-')
    return new Promise((resolve, reject) => {
      client.exec(`tmux new-session -d -s ${safeName}`, (err, stream) => {
        if (err) return reject(err)
        stream.on('close', () => resolve())
        stream.on('data', () => {})
        stream.stderr.on('data', () => {})
      })
    })
  }

  async attachTmuxSession(sessionName: string): Promise<ClientChannel> {
    const client = await this.getClient()
    const safeName = sessionName.replace(/[^a-zA-Z0-9_-]/g, '-')
    return new Promise((resolve, reject) => {
      // Use shell() instead of exec() — tmux needs a proper interactive PTY
      // The shell runs "tmux new-session -A -s name" which creates OR attaches
      client.shell(
        { term: 'xterm-256color', cols: 80, rows: 24 },
        (err, stream) => {
          if (err) return reject(err)
          // Attach/create tmux session then disable mouse mode so xterm.js scroll works natively
          stream.write(`cd ~/shell && tmux new-session -A -s ${safeName} \\; set -g mouse off\n`)
          resolve(stream)
        },
      )
    })
  }

  async killTmuxSession(sessionName: string): Promise<void> {
    const client = await this.getClient()
    const safeName = sessionName.replace(/[^a-zA-Z0-9_-]/g, '-')
    return new Promise((resolve, reject) => {
      client.exec(`tmux kill-session -t ${safeName} 2>/dev/null; echo done`, (err, stream) => {
        if (err) return reject(err)
        stream.on('close', () => resolve())
        stream.on('data', () => {})
        stream.stderr.on('data', () => {})
      })
    })
  }

  async listTmuxSessions(): Promise<string[]> {
    const client = await this.getClient()
    return new Promise((resolve, reject) => {
      client.exec('tmux list-sessions -F "#{session_name}" 2>/dev/null || echo ""', (err, stream) => {
        if (err) return reject(err)
        let output = ''
        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.on('close', () => {
          resolve(output.trim().split('\n').filter(Boolean))
        })
      })
    })
  }

  async exec(command: string): Promise<string> {
    const client = await this.getClient()
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) return reject(err)
        let stdout = ''
        let stderr = ''
        stream.on('data', (data: Buffer) => { stdout += data.toString() })
        stream.stderr.on('data', (data: Buffer) => { stderr += data.toString() })
        stream.on('close', (code: number) => {
          if (code !== 0) return reject(new Error(`Command failed (exit ${code}): ${stderr}`))
          resolve(stdout)
        })
      })
    })
  }

  disconnect(): void {
    if (this.client) {
      this.client.end()
      this.client = null
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected
  }
}

export const sshService = new SshService()
