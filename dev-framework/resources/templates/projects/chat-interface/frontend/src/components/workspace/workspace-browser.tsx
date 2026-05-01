'use client'

import { useState } from 'react'
import { ChevronRightIcon, DownloadIcon, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import { useBrowseWorkspace } from '@/services/workspaces/hooks'
import { workspacesService } from '@/services/workspaces/service'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Workspace } from '@/types/workspaces'

function formatSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface BrowserPanelProps {
  workspace: Workspace
}

function BrowserPanel({ workspace }: BrowserPanelProps) {
  const [path, setPath] = useState('')
  const { data, isLoading } = useBrowseWorkspace(workspace.id, path)

  const breadcrumbs = path ? path.split('/').filter(Boolean) : []

  const navigate = (segment: string) => {
    setPath(path ? `${path}/${segment}` : segment)
  }

  const navigateTo = (index: number) => {
    setPath(breadcrumbs.slice(0, index + 1).join('/'))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground px-1 py-2 border-b flex-wrap">
        <button
          className="hover:text-foreground font-medium"
          onClick={() => setPath('')}
        >
          {workspace.name}
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRightIcon className="size-3" />
            <button
              className="hover:text-foreground"
              onClick={() => navigateTo(i)}
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-muted-foreground px-2 py-4">Loading…</p>
        ) : (
          <ul className="py-1">
            {data?.entries.map((entry) => (
              <li key={entry.name}>
                {entry.type === 'dir' ? (
                  <button
                    onClick={() => navigate(entry.name)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded-sm text-left"
                  >
                    <FolderIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{entry.name}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <FileIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{entry.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatSize(entry.size)}</span>
                  </div>
                )}
              </li>
            ))}
            {data?.entries.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">Empty directory.</p>
            )}
          </ul>
        )}
      </div>

      {/* Download */}
      <div className="border-t p-2">
        <a href={workspacesService.downloadUrl(workspace.id)} download>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <DownloadIcon className="size-3.5" />
            Download workspace
          </Button>
        </a>
      </div>
    </div>
  )
}

interface Props {
  workspace: Workspace
  trigger?: React.ReactNode
}

export function WorkspaceBrowser({ workspace, trigger }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <FolderOpenIcon className="size-3.5" />
            {workspace.name}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-sm flex items-center gap-2">
            <FolderOpenIcon className="size-4" />
            {workspace.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-2">
          <BrowserPanel workspace={workspace} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
