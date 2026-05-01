'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatToolInput } from '@/lib/utils'
import type { ToolUseBlock } from '@/types/sessions'

const TOOL_STYLE: Record<string, { border: string; bg: string; label: string }> = {
  Bash:         { border: 'border-l-amber-400',   bg: 'bg-amber-50/60 dark:bg-amber-950/20',   label: 'Bash' },
  Read:         { border: 'border-l-sky-400',     bg: 'bg-sky-50/60 dark:bg-sky-950/20',       label: 'Read' },
  Write:        { border: 'border-l-green-400',   bg: 'bg-green-50/60 dark:bg-green-950/20',   label: 'Write' },
  Edit:         { border: 'border-l-violet-400',  bg: 'bg-violet-50/60 dark:bg-violet-950/20', label: 'Edit' },
  MultiEdit:    { border: 'border-l-violet-400',  bg: 'bg-violet-50/60 dark:bg-violet-950/20', label: 'MultiEdit' },
  Glob:         { border: 'border-l-purple-400',  bg: 'bg-purple-50/60 dark:bg-purple-950/20', label: 'Glob' },
  Grep:         { border: 'border-l-purple-400',  bg: 'bg-purple-50/60 dark:bg-purple-950/20', label: 'Grep' },
  LS:           { border: 'border-l-slate-400',   bg: 'bg-slate-50/60 dark:bg-slate-950/20',   label: 'LS' },
  WebSearch:    { border: 'border-l-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', label: 'WebSearch' },
  WebFetch:     { border: 'border-l-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', label: 'WebFetch' },
  Task:         { border: 'border-l-cyan-400',    bg: 'bg-cyan-50/60 dark:bg-cyan-950/20',     label: 'Task' },
  TodoWrite:    { border: 'border-l-blue-400',    bg: 'bg-blue-50/60 dark:bg-blue-950/20',     label: 'TodoWrite' },
  TodoRead:     { border: 'border-l-slate-300',   bg: 'bg-slate-50/40 dark:bg-slate-950/10',   label: 'TodoRead' },
  NotebookEdit: { border: 'border-l-orange-400',  bg: 'bg-orange-50/60 dark:bg-orange-950/20', label: 'Notebook' },
}
const DEFAULT_TOOL_STYLE = { border: 'border-l-border', bg: 'bg-muted/40', label: '' }

function StatusDot({ tool, isActive }: { tool: ToolUseBlock; isActive: boolean }) {
  if (tool.is_error) return <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
  if (tool.output !== undefined) return <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
  if (isActive) return <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-slate-400/60 shrink-0" />
}

interface ToolBlockProps {
  tool: ToolUseBlock
  isActive: boolean
}

export function ToolBlock({ tool, isActive }: ToolBlockProps) {
  const [open, setOpen] = useState(false)
  const style = TOOL_STYLE[tool.name] ?? DEFAULT_TOOL_STYLE
  const detail = formatToolInput(tool.name, tool.input)

  return (
    <div className={`w-full rounded-lg border border-border/40 border-l-[3px] overflow-hidden ${style.border} ${style.bg}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <StatusDot tool={tool} isActive={isActive} />
        <span className="text-xs font-semibold tracking-wide uppercase text-foreground/60 shrink-0">
          {style.label || tool.name}
        </span>
        {detail && (
          <span className="font-mono text-sm text-foreground/80 truncate flex-1 min-w-0">{detail}</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-foreground/40 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/30 divide-y divide-border/30">
          <div className="px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 mb-1.5">Input</p>
            <pre className="font-mono text-xs text-foreground/70 whitespace-pre-wrap break-all">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>

          {tool.output !== undefined && (
            <div className="px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40 mb-1.5">Output</p>
              <pre className={`font-mono text-xs whitespace-pre-wrap break-all ${tool.is_error ? 'text-red-500/80' : 'text-foreground/70'}`}>
                {tool.output || '(empty)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
