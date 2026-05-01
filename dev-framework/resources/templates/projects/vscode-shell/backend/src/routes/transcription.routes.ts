import type { FastifyInstance } from 'fastify'
import OpenAI from 'openai'
import { Readable } from 'stream'

export async function transcriptionRoutes(app: FastifyInstance): Promise<void> {
  await app.register((await import('@fastify/multipart')).default, {
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  })

  app.post('/api/transcribe', async (request, reply) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return reply.status(500).send({ error: 'OPENAI_API_KEY not configured' })
    }

    const file = await request.file()
    if (!file) {
      return reply.status(400).send({ error: 'No audio file provided' })
    }

    const buffer = await file.toBuffer()
    const openai = new OpenAI({ apiKey })

    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: new File([buffer], file.filename || 'audio.webm', { type: file.mimetype }),
    })

    return reply.send({ text: response.text })
  })
}
