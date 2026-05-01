import type { FastifyLoggerOptions } from 'fastify'

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

export const loggerConfig: FastifyLoggerOptions | boolean = isTest
  ? false
  : isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : true
