'use client'

import { useState } from 'react'
import { BoxIcon, PlusIcon, Trash2 } from 'lucide-react'
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace } from '@/services/workspaces/hooks'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function WorkspaceList({ selectedId, onSelect }: Props) {
  const { data: workspaces = [] } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [wsToDelete, setWsToDelete] = useState<string | null>(null)

  const filtered = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    if (!newName.trim()) return
    createWorkspace.mutate(newName.trim(), {
      onSuccess: (ws) => {
        onSelect(ws.id)
        setCreateOpen(false)
        setNewName('')
      },
    })
  }

  const handleConfirmDelete = () => {
    if (!wsToDelete) return
    deleteWorkspace.mutate(wsToDelete, {
      onSettled: () => {
        setWsToDelete(null)
        if (selectedId === wsToDelete) onSelect('')
      },
    })
  }

  const wsToDeleteName = workspaces.find(w => w.id === wsToDelete)?.name

  return (
    <div className="flex flex-col h-full w-40 shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center justify-between">
          <SidebarGroupLabel className="px-0">Workspaces</SidebarGroupLabel>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-3.5" />
            <span className="sr-only">New workspace</span>
          </Button>
        </div>
        <SidebarInput
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filtered.map(ws => {
              const isActive = ws.id === selectedId
              const isDefault = ws.name === 'default'
              return (
                <SidebarMenuItem key={ws.id} className={`group/item relative ${isDefault ? 'opacity-50' : ''}`}>
                  <SidebarMenuButton
                    isActive={isActive}
                    className="h-auto py-2 pr-8"
                    onClick={() => onSelect(ws.id)}

                  >
                    <BoxIcon size={14} className="shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{ws.name}</span>
                    </div>
                  </SidebarMenuButton>
                  {!isDefault && (
                    <button
                      onClick={() => setWsToDelete(ws.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                      aria-label="Delete workspace"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </SidebarMenuItem>
              )
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {search ? 'No results.' : 'No workspaces yet.'}
              </p>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="my-project"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createWorkspace.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!wsToDelete} onOpenChange={open => !open && setWsToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete "{wsToDeleteName}" and all its files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWsToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteWorkspace.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
