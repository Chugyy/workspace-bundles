import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolBlock } from './tool-block'
import type { FileAttachment, Message, ToolUseBlock } from '@/types/sessions'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ChatMessageProps {
  message: Message
  activeTool: ToolUseBlock | null
}

function extractToolUses(message: Message): ToolUseBlock[] {
  const c = message.content as unknown as { blocks?: { type: string }[] }
  if (!Array.isArray(c.blocks)) return []
  return c.blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use') as ToolUseBlock[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentList({ attachments }: { attachments: FileAttachment[] }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {attachments.map((att) => {
        const url = `${API_URL}/files/${att.file_id}`
        const isImage = att.mime_type.startsWith('image/')

        if (isImage) {
          return (
            <a key={att.file_id} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={att.filename}
                className="max-h-48 max-w-full rounded-lg object-contain border border-white/20"
              />
            </a>
          )
        }

        return (
          <a
            key={att.file_id}
            href={url}
            download={att.filename}
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
          >
            <span className="truncate font-medium">{att.filename}</span>
            <span className="shrink-0 text-xs opacity-70">{formatSize(att.size)}</span>
          </a>
        )
      })}
    </div>
  )
}

const markdownComponents = {
  p: ({ children }: any) => <p className="mb-3 last:mb-0 text-base leading-7">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-3 ml-5 list-disc space-y-1 text-base">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-base">{children}</ol>,
  li: ({ children }: any) => <li className="text-base leading-7">{children}</li>,
  h1: ({ children }: any) => <h1 className="mb-3 text-2xl font-bold">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mb-2 text-xl font-semibold">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mb-2 text-lg font-semibold">{children}</h3>,
  code: ({ className, children }: any) =>
    className ? (
      <code className="block rounded-lg bg-muted px-4 py-3 font-mono text-sm overflow-x-auto">{children}</code>
    ) : (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
    ),
  pre: ({ children }: any) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }: any) => (
    <blockquote className="mb-3 border-l-4 border-primary/40 pl-4 text-muted-foreground italic text-base">{children}</blockquote>
  ),
  table: ({ children }: any) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-base">{children}</table>
    </div>
  ),
  th: ({ children }: any) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
  td: ({ children }: any) => <td className="border border-border px-3 py-2">{children}</td>,
  hr: () => <hr className="my-4 border-border" />,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
}

export function ChatMessage({ message, activeTool }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // User bubble — right-aligned, constrained width
  if (isUser) {
    const text = (message.content as { text?: string }).text ?? ''
    const attachments = message.content.attachments ?? []
    if (!text && attachments.length === 0) return null
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-base leading-7">
          {text && <span className="whitespace-pre-wrap break-words">{text}</span>}
          {attachments.length > 0 && <AttachmentList attachments={attachments} />}
        </div>
      </div>
    )
  }

  // Tool-use cards — full width accordion
  const toolUses = extractToolUses(message)
  if (toolUses.length > 0) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {toolUses.map((tool) => (
          <ToolBlock key={tool.id} tool={tool} isActive={activeTool?.id === tool.id} />
        ))}
      </div>
    )
  }

  // Final result — full width, no bubble, markdown rendered
  if (message.content.type === 'result') {
    const result = (message.content as { result?: string }).result ?? ''
    if (!result) return null
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-full text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {result}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  // Text-only assistant blocks (intermediate messages between tool calls)
  const textContent = (message.content as { blocks?: { type: string; text?: string }[] }).blocks
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n\n') ?? ''

  if (textContent) {
    return (
      <div className="flex w-full justify-start">
        <div className="w-full max-w-full text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {textContent}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  return null
}
