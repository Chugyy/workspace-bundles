'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileIcon, SaveIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import type { FileContainerService } from '@/types/files'

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false })

function getMonacoLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript', tsx: 'typescript',
    jsx: 'javascript', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
    sh: 'shell', bash: 'shell', sql: 'sql', html: 'html', css: 'css',
    xml: 'xml', toml: 'ini', cfg: 'ini', ini: 'ini', env: 'shell',
    txt: 'plaintext', gitignore: 'plaintext', dockerignore: 'plaintext',
  }
  return map[ext] ?? 'plaintext'
}

interface Props {
  service: FileContainerService
  filePath: string | null
}

export function FileViewer({ service, filePath }: Props) {
  const { resolvedTheme } = useTheme()
  const queryClient = useQueryClient()
  const fileQueryKey = [...service.cacheKey, 'file', service.id, filePath]

  const { data, isLoading } = useQuery({
    queryKey: fileQueryKey,
    queryFn: () => service.readFile(filePath!),
    enabled: !!filePath,
  })

  const [localContent, setLocalContent] = useState<string | null>(null)
  const savedContentRef = useRef<string>('')
  const editorRef = useRef<unknown>(null)
  const isDirty = localContent !== null && localContent !== savedContentRef.current

  useEffect(() => {
    if (data?.content != null) {
      setLocalContent(data.content)
      savedContentRef.current = data.content
    }
  }, [data?.content, filePath])

  const saveMutation = useMutation({
    mutationFn: () => service.saveFile(filePath!, localContent ?? ''),
    onSuccess: () => {
      savedContentRef.current = localContent ?? ''
      queryClient.invalidateQueries({ queryKey: fileQueryKey })
    },
  })

  const handleSave = useCallback(() => {
    if (filePath && isDirty) saveMutation.mutate()
  }, [filePath, isDirty, saveMutation])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Select a file to view its content.
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

  const isBinary = data?.type === 'binary'
  const language = getMonacoLanguage(filePath)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <FileIcon size={14} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{filePath}</span>
        <span className="text-xs text-muted-foreground">{language}</span>
        <div className="ml-auto flex items-center gap-2">
          {isDirty && <span className="text-xs text-amber-500">unsaved</span>}
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" disabled={!isDirty || saveMutation.isPending} onClick={handleSave}>
            <SaveIcon size={12} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {isBinary ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{data?.content}</div>
      ) : (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={language}
            value={localContent ?? ''}
            onChange={v => setLocalContent(v ?? '')}
            onMount={editor => { editorRef.current = editor }}
            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, automaticLayout: true, padding: { top: 12 } }}
          />
        </div>
      )}
    </div>
  )
}
