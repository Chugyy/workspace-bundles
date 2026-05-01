import type { Terminal } from '@xterm/xterm'

const terminals = new Map<string, Terminal>()

export const terminalRegistry = {
  set: (id: string, terminal: Terminal) => terminals.set(id, terminal),
  get: (id: string) => terminals.get(id),
  delete: (id: string) => terminals.delete(id),
}
