'use client'

import { useState } from 'react'
import { ChevronRightIcon, ClipboardCopyIcon, DownloadIcon, FileIcon, FolderIcon, MoreHorizontalIcon, Trash2Icon, Files, MoveIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MoveDialog } from './move-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { BrowseEntry } from '@/types/workspaces'
import type { FileContainerService } from '@/types/files'

function useBrowseContainer(service: FileContainerService, path: string, enabled = true) {
  return useQuery({
    queryKey: [...service.cacheKey, 'browse', service.id, path],
    queryFn: () => service.browse(path),
    enabled,
  })
}

function EntryActions({ service, fullPath }: { service: FileContainerService; fullPath: string }) {
  const queryClient = useQueryClient()
  const [dialogMode, setDialogMode] = useState<'move' | 'copy' | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: service.cacheKey })

  const handleDuplicate = async () => { await service.duplicateFile(fullPath); invalidate() }
  const handleDownload = () => window.open(service.fileDownloadUrl(fullPath), '_blank')
  const handleDelete = async () => { await service.deleteFile(fullPath); invalidate() }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className="shrink-0 rounded p-0.5 opacity-0 group-hover/entry:opacity-100 data-[state=open]:opacity-100 hover:bg-accent transition-opacity"
          >
            <MoreHorizontalIcon size={14} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem className="gap-2 text-xs" onClick={handleDuplicate}>
            <Files size={13} /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs" onClick={async () => {
            try {
              const { content, type } = await service.readFile(fullPath)
              if (type === 'text') await navigator.clipboard.writeText(content)
              else handleDownload()
            } catch { handleDownload() }
          }}>
            <ClipboardCopyIcon size={13} /> Copy content
          </DropdownMenuItem>
          {service.copyFileTo && (
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => setDialogMode('copy')}>
              <Files size={13} /> Copy to…
            </DropdownMenuItem>
          )}
          {service.moveFileTo && (
            <DropdownMenuItem className="gap-2 text-xs" onClick={() => setDialogMode('move')}>
              <MoveIcon size={13} /> Move to…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2 text-xs" onClick={handleDownload}>
            <DownloadIcon size={13} /> Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive" onClick={handleDelete}>
            <Trash2Icon size={13} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogMode && service.copyFileTo && service.moveFileTo && (
        <MoveDialog
          open
          onOpenChange={open => { if (!open) setDialogMode(null) }}
          mode={dialogMode}
          sourceWorkspaceId={service.id}
          sourcePath={fullPath}
        />
      )}
    </>
  )
}

function DirNode({ service, parentPath, entry, depth, selectedFile, onSelectFile }: {
  service: FileContainerService
  parentPath: string
  entry: BrowseEntry
  depth: number
  selectedFile: string | null
  onSelectFile: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
  const { data } = useBrowseContainer(service, fullPath, expanded)

  return (
    <>
      <div
        className="group/entry flex items-center gap-1.5 px-2 py-1 hover:bg-muted/60 rounded-sm cursor-pointer"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRightIcon size={12} className={cn('shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        <FolderIcon size={14} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-sm flex-1 min-w-0">{entry.name}</span>
        <EntryActions service={service} fullPath={fullPath} />
      </div>

      {expanded && data?.entries.map(child =>
        child.type === 'dir' ? (
          <DirNode key={child.name} service={service} parentPath={fullPath} entry={child} depth={depth + 1} selectedFile={selectedFile} onSelectFile={onSelectFile} />
        ) : (
          <FileNode key={child.name} service={service} parentPath={fullPath} entry={child} depth={depth + 1} isSelected={selectedFile === `${fullPath}/${child.name}`} onSelect={onSelectFile} />
        )
      )}
    </>
  )
}

function FileNode({ service, parentPath, entry, depth, isSelected, onSelect }: {
  service: FileContainerService
  parentPath: string
  entry: BrowseEntry
  depth: number
  isSelected: boolean
  onSelect: (path: string) => void
}) {
  const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

  return (
    <div
      className={cn('group/entry flex items-center gap-1.5 px-2 py-1 hover:bg-muted/60 rounded-sm cursor-pointer', isSelected && 'bg-muted font-medium')}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
      onClick={() => onSelect(fullPath)}
    >
      <FileIcon size={14} className="shrink-0 text-muted-foreground" />
      <span className="truncate text-sm flex-1 min-w-0">{entry.name}</span>
      <EntryActions service={service} fullPath={fullPath} />
    </div>
  )
}

interface Props {
  service: FileContainerService
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

export function FileExplorer({ service, selectedFile, onSelectFile }: Props) {
  const { data, isLoading } = useBrowseContainer(service, '')

  if (isLoading) return <p className="text-xs text-muted-foreground p-4">Loading…</p>

  return (
    <div className="flex flex-col h-full w-56 shrink-0 border-r">
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <span className="text-sm font-semibold">Files</span>
        <a href={service.downloadUrl()} download>
          <Button variant="ghost" size="icon" className="size-7" title="Download (.zip)">
            <DownloadIcon size={14} />
          </Button>
        </a>
      </div>

      <div className="flex-1 overflow-y-auto py-1 pr-1">
        {data?.entries.map(entry =>
          entry.type === 'dir' ? (
            <DirNode key={entry.name} service={service} parentPath="" entry={entry} depth={0} selectedFile={selectedFile} onSelectFile={onSelectFile} />
          ) : (
            <FileNode key={entry.name} service={service} parentPath="" entry={entry} depth={0} isSelected={selectedFile === entry.name} onSelect={onSelectFile} />
          )
        )}
        {data?.entries.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">Empty.</p>
        )}
      </div>
    </div>
  )
}
