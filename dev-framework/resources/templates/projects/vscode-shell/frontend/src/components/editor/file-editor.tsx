'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFileContent, useSaveFile } from '@/services/files/files.hooks'
import { useWorkspace } from '@/contexts/workspace-context'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Tab } from '@/types/workspace.types'
import { MarkdownPreview } from './markdown-preview'

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirrorEditor = dynamic(() => import('./codemirror-editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

interface FileEditorProps {
  tab: Tab
  sessionId: string
}

function EditorSkeleton() {
  return (
    <div className="p-6 space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}

function getFileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

export function FileEditor({ tab, sessionId }: FileEditorProps) {
  const { data: fileContent, isLoading } = useFileContent(tab.path!)
  const { mutateAsync: saveFile } = useSaveFile()
  const { setTabDirty, setTabContent, setTabSavedContent, setTabPreview } = useWorkspace()
  const [isSaving, setIsSaving] = useState(false)

  const isPreview = tab.isPreview === true
  const setIsPreview = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof v === 'function' ? v(isPreview) : v
      setTabPreview(sessionId, tab.id, next)
    },
    [sessionId, tab.id, isPreview, setTabPreview]
  )

  const ext = getFileExtension(tab.name)
  const isMarkdown = ext === 'md'

  const content = tab.content ?? fileContent ?? ''
  const savedContent = tab.savedContent ?? fileContent ?? ''

  // Store saved baseline when server content first loads
  useEffect(() => {
    if (fileContent !== undefined && tab.savedContent === undefined) {
      setTabSavedContent(sessionId, tab.id, fileContent)
      setTabDirty(sessionId, tab.id, false)
    }
  }, [fileContent, tab.savedContent, sessionId, tab.id, setTabSavedContent, setTabDirty])

  const handleChange = useCallback(
    (newContent: string) => {
      setTabContent(sessionId, tab.id, newContent)
      setTabDirty(sessionId, tab.id, newContent !== savedContent)
    },
    [sessionId, tab.id, savedContent, setTabDirty, setTabContent]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveFile({ path: tab.path!, content })
      setTabSavedContent(sessionId, tab.id, content)
      setTabDirty(sessionId, tab.id, false)
      toast.success('File saved')
    } catch {
      toast.error('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }, [tab.path, tab.id, sessionId, content, saveFile, setTabDirty, setTabSavedContent])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v' && isMarkdown) {
        e.preventDefault()
        setIsPreview((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, isMarkdown])

  if (isLoading && tab.content === undefined) return <EditorSkeleton />

  // Preview mode (markdown only)
  if (isPreview && isMarkdown) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <EditorToolbar
          tab={tab}
          isMarkdown={isMarkdown}
          isPreview={isPreview}
          isSaving={isSaving}
          onTogglePreview={() => setIsPreview(false)}
          onSave={handleSave}
        />
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MarkdownPreview content={content} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <EditorToolbar
        tab={tab}
        isMarkdown={isMarkdown}
        isPreview={false}
        isSaving={isSaving}
        onTogglePreview={() => setIsPreview(true)}
        onSave={handleSave}
      />
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <CodeMirrorEditor
          value={content}
          extension={ext}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

// Toolbar with save button and optional preview toggle
function EditorToolbar({
  tab,
  isMarkdown,
  isPreview,
  isSaving,
  onTogglePreview,
  onSave,
}: {
  tab: Tab
  isMarkdown: boolean
  isPreview: boolean
  isSaving: boolean
  onTogglePreview: () => void
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 h-[32px] bg-[#252526] border-b border-[#3e3e3e] flex-shrink-0">
      <span className="text-[11px] text-[#8b8b8b]">
        {tab.isDirty && <span className="text-[#cccccc] ml-1">(modified)</span>}
      </span>
      <div className="flex items-center gap-2">
        {isMarkdown && (
          <button
            className="text-[11px] text-[#0078d4] hover:text-[#1a8fff]"
            onClick={onTogglePreview}
          >
            {isPreview ? 'Editor (⌘⇧V)' : 'Preview (⌘⇧V)'}
          </button>
        )}
        {tab.isDirty && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#cccccc] hover:text-white hover:bg-[#3e3e3e]"
                onClick={onSave}
                disabled={isSaving}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (⌘S)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
