import type { FastifyInstance } from 'fastify'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'

const WORKSPACE_FILE = join(process.cwd(), 'data', 'workspace.json')

const DEFAULT_WORKSPACE = {
  sessions: [],
  activeSessionId: null,
  fileTreeRootPath: '/',
}

type Tab = Record<string, unknown>
type Session = Record<string, unknown> & { tabs?: Tab[] }
type WorkspaceState = Record<string, unknown> & { sessions?: Session[] }

function stripTabContent(state: WorkspaceState): WorkspaceState {
  if (!state.sessions) return state
  return {
    ...state,
    sessions: state.sessions.map((session) => ({
      ...session,
      tabs: session.tabs?.map((tab) => {
        const { content: _c, savedContent: _s, ...rest } = tab as Tab & { content?: unknown; savedContent?: unknown }
        return rest
      }),
    })),
  }
}

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/workspace', async (_request, reply) => {
    try {
      const raw = await readFile(WORKSPACE_FILE, 'utf-8')
      return reply.send(JSON.parse(raw))
    } catch {
      return reply.send(DEFAULT_WORKSPACE)
    }
  })

  app.put('/api/workspace', async (request, reply) => {
    const state = stripTabContent(request.body as WorkspaceState)

    try {
      await mkdir(dirname(WORKSPACE_FILE), { recursive: true })
      await writeFile(WORKSPACE_FILE, JSON.stringify(state, null, 2), 'utf-8')
      return reply.send({ success: true })
    } catch (err) {
      app.log.error({ err }, '[Workspace] Failed to save workspace')
      return reply.status(500).send({ error: 'Failed to save workspace' })
    }
  })
}
