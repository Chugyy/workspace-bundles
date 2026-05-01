'use client'

import { useState } from 'react'
import { ChevronRightIcon, FolderIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaces } from '@/services/workspaces/hooks'
import { useBrowseWorkspace } from '@/services/workspaces/hooks'
import { workspacesService, workspaceKeys } from '@/services/workspaces/service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Lazy-loaded folder tree for browsing destinations
function FolderNode({
  workspaceId,
  parentPath,
  name,
  selectedPath,
  onSelect,
}: {
  workspaceId: string
  parentPath: string
  name: string
  selectedPath: string
  onSelect: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fullPath = parentPath ? `${parentPath}/${name}` : name
  const { data } = useBrowseWorkspace(expanded ? workspaceId : null, fullPath)
  const isSelected = selectedPath === fullPath
  const dirs = (data?.entries ?? []).filter(e => e.type === 'dir')

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5"
        >
          <ChevronRightIcon
            size={12}
            className={cn('text-muted-foreground transition-transform', expanded && 'rotate-90')}
          />
        </button>
        <button
          onClick={() => onSelect(fullPath)}
          className={cn(
            'flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1 text-sm rounded-sm hover:bg-muted/60',
            isSelected && 'bg-primary/10 text-primary font-medium'
          )}
        >
          <FolderIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{name}</span>
        </button>
      </div>
      {expanded && dirs.map(d => (
        <div key={d.name} className="pl-4">
          <FolderNode
            workspaceId={workspaceId}
            parentPath={fullPath}
            name={d.name}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        </div>
      ))}
    </>
  )
}

function WorkspaceTree({
  workspaceId,
  selectedWorkspaceId,
  selectedPath,
  onSelectWorkspace,
  onSelectPath,
}: {
  workspaceId: string
  selectedWorkspaceId: string
  selectedPath: string
  onSelectWorkspace: (id: string) => void
  onSelectPath: (path: string) => void
}) {
  const { data: workspaces = [] } = useWorkspaces()

  return (
    <div className="space-y-1">
      {workspaces.map(ws => {
        const isWsSelected = ws.id === selectedWorkspaceId
        return (
          <WorkspaceNode
            key={ws.id}
            workspace={ws}
            isWsSelected={isWsSelected}
            selectedPath={isWsSelected ? selectedPath : ''}
            onSelectWorkspace={onSelectWorkspace}
            onSelectPath={onSelectPath}
          />
        )
      })}
    </div>
  )
}

function WorkspaceNode({
  workspace,
  isWsSelected,
  selectedPath,
  onSelectWorkspace,
  onSelectPath,
}: {
  workspace: { id: string; name: string }
  isWsSelected: boolean
  selectedPath: string
  onSelectWorkspace: (id: string) => void
  onSelectPath: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(isWsSelected)
  const { data } = useBrowseWorkspace(expanded ? workspace.id : null, '')
  const isRoot = isWsSelected && selectedPath === ''
  const dirs = (data?.entries ?? []).filter(e => e.type === 'dir')

  const handleSelect = () => {
    onSelectWorkspace(workspace.id)
    onSelectPath('')
    setExpanded(true)
  }

  return (
    <div>
      <div className="flex items-center">
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-0.5">
          <ChevronRightIcon
            size={12}
            className={cn('text-muted-foreground transition-transform', expanded && 'rotate-90')}
          />
        </button>
        <button
          onClick={handleSelect}
          className={cn(
            'flex items-center gap-1.5 flex-1 min-w-0 px-1.5 py-1 text-sm rounded-sm hover:bg-muted/60 font-medium',
            isRoot && 'bg-primary/10 text-primary'
          )}
        >
          <FolderIcon size={14} className="shrink-0" />
          <span className="truncate">{workspace.name}</span>
        </button>
      </div>
      {expanded && (
        <div className="pl-4">
          {dirs.map(d => (
            <FolderNode
              key={d.name}
              workspaceId={workspace.id}
              parentPath=""
              name={d.name}
              selectedPath={isWsSelected ? selectedPath : ''}
              onSelect={p => { onSelectWorkspace(workspace.id); onSelectPath(p) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'move' | 'copy'
  sourceWorkspaceId: string
  sourcePath: string
}

export function MoveDialog({ open, onOpenChange, mode, sourceWorkspaceId, sourcePath }: Props) {
  const queryClient = useQueryClient()
  const [dstWorkspaceId, setDstWorkspaceId] = useState(sourceWorkspaceId)
  const [dstPath, setDstPath] = useState('')

  // Detect same location
  const sourceDir = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : ''
  const isSameLocation = dstWorkspaceId === sourceWorkspaceId && dstPath === sourceDir

  const handleConfirm = async () => {
    const fn = mode === 'move' ? workspacesService.moveFile : workspacesService.copyFile
    await fn(sourceWorkspaceId, sourcePath, dstWorkspaceId, dstPath)
    queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
    onOpenChange(false)
  }

  const fileName = sourcePath.includes('/') ? sourcePath.split('/').pop() : sourcePath
  const label = mode === 'move' ? 'Move' : 'Copy'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{label} "{fileName}"</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">Select a destination folder:</p>

        <div className="border rounded-md max-h-64 overflow-y-auto p-2">
          <WorkspaceTree
            workspaceId={sourceWorkspaceId}
            selectedWorkspaceId={dstWorkspaceId}
            selectedPath={dstPath}
            onSelectWorkspace={setDstWorkspaceId}
            onSelectPath={setDstPath}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={isSameLocation}>
            {isSameLocation ? `Already here` : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
