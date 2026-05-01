import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the most relevant display string from a tool's input object.
 * Returns a concise, human-readable description of what the tool is doing.
 */
export function formatToolInput(name: string, input: Record<string, unknown>): string {
  const str = (v: unknown) => String(v ?? '').trim()
  const truncate = (s: string, n = 120) => s.length > n ? s.slice(0, n) + '…' : s

  switch (name) {
    case 'Bash':
      return truncate(str(input.command))
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return str(input.file_path)
    case 'Glob':
      return str(input.pattern)
    case 'Grep':
      return input.path
        ? `${str(input.pattern)} in ${str(input.path)}`
        : str(input.pattern)
    case 'LS':
      return str(input.path)
    case 'WebSearch':
      return truncate(str(input.query))
    case 'WebFetch':
      return truncate(str(input.url))
    case 'Task':
      return truncate(str(input.description || input.subagent_type || input.prompt))
    case 'TodoWrite': {
      const todos = (input.todos as { content: string }[]) ?? []
      return truncate(`${todos.length} todo(s): ${todos.map(t => t.content).join(', ')}`)
    }
    case 'TodoRead':
      return ''
    case 'NotebookEdit':
      return str(input.notebook_path)
    default:
      return truncate(
        Object.values(input)
          .filter(v => v !== null && typeof v !== 'object')
          .map(String)
          .join(' · ')
      )
  }
}
