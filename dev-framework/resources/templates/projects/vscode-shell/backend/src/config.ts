import { readFileSync } from 'fs'

interface Config {
  port: number
  host: string
  auth: {
    password: string
    sessionSecret: string
    sessionMaxAge: number
  }
  ssh: {
    host: string
    port: number
    username: string
    privateKey?: Buffer
    password?: string
  }
  sftp: {
    rootPath: string
  }
  cors: {
    origin: string[]
  }
  terminal: {
    defaultTimeout: number
    warningBefore: number
  }
  telegram?: {
    botToken: string
    chatId: string
  }
}

function loadConfig(): Config {
  const requiredEnvVars = ['AUTH_PASSWORD', 'SESSION_SECRET', 'SSH_HOST', 'SSH_USERNAME']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) throw new Error(`Missing required env var: ${envVar}`)
  }

  if (process.env.SESSION_SECRET!.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }

  let privateKey: Buffer | undefined
  if (process.env.SSH_PRIVATE_KEY_PATH) {
    privateKey = readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
  }

  if (!privateKey && !process.env.SSH_PASSWORD) {
    throw new Error('Either SSH_PRIVATE_KEY_PATH or SSH_PASSWORD must be set')
  }

  return {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    auth: {
      password: process.env.AUTH_PASSWORD!,
      sessionSecret: process.env.SESSION_SECRET!,
      sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
    },
    ssh: {
      host: process.env.SSH_HOST!,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USERNAME!,
      privateKey,
      password: process.env.SSH_PASSWORD,
    },
    sftp: {
      rootPath: process.env.SFTP_ROOT_PATH || '/root',
    },
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()),
    },
    terminal: {
      defaultTimeout: parseInt(process.env.TERMINAL_TIMEOUT || '7200000'),
      warningBefore: parseInt(process.env.TERMINAL_WARNING_BEFORE || '300000'),
    },
    ...(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? {
          telegram: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID,
          },
        }
      : {}),
  }
}

export const config = loadConfig()
