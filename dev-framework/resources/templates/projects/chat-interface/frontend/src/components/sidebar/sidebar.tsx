'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpDownIcon, BoxIcon, CalendarIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, FilterIcon, FolderIcon, PlusIcon, SlidersHorizontalIcon, Trash2, XIcon } from 'lucide-react'
import { useSessions, useDeleteSession } from '@/services/sessions/hooks'
import { useWorkspaces, useDeleteWorkspace, useRenameWorkspace } from '@/services/workspaces/hooks'
import { useProfiles } from '@/services/profiles/hooks'
import { useLayout, useSaveLayout } from '@/services/layout/hooks'
import { CreateWorkspaceDialog } from '@/components/workspace/create-dialog'
import type { LayoutNode } from '@/types/layout'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const PAGE_SIZE = 15
const P = 'px-3' // unified horizontal padding

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type SortOption = { key: string; order: string; label: string; icon: React.ReactNode }

const SORT_OPTIONS: SortOption[] = [
  { key: 'updated_at', order: 'desc', label: 'Last activity', icon: <ClockIcon size={13} /> },
  { key: 'created_at', order: 'desc', label: 'Newest first', icon: <CalendarIcon size={13} /> },
  { key: 'created_at', order: 'asc', label: 'Oldest first', icon: <CalendarIcon size={13} /> },
]

export function ConversationSidebar() {
  const pathname = usePathname()

  // Conversations
  const [search, setSearch] = useState('')
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterWsId, setFilterWsId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const deleteSession = useDeleteSession()
  const { data } = useSessions({
    limit: 100,
    workspace_id: filterWsId ?? undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  })

  // Workspaces + Layout
  const [wsSearch, setWsSearch] = useState('')
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [wsToDelete, setWsToDelete] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const { data: workspaces = [] } = useWorkspaces()
  const { data: profiles = [] } = useProfiles()
  const deleteWorkspace = useDeleteWorkspace()
  const renameWorkspace = useRenameWorkspace()
  const { data: layoutData } = useLayout()
  const saveLayout = useSaveLayout()

  const wsMap = new Map(workspaces.map(ws => [ws.id, ws]))

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      next.has(folderId) ? next.delete(folderId) : next.add(folderId)
      return next
    })
  }

  // --- Rename ---
  const startEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingValue(currentName)
  }

  const commitRenameWorkspace = (wsId: string) => {
    const trimmed = editingValue.trim()
    if (trimmed && trimmed !== wsMap.get(wsId)?.name) {
      renameWorkspace.mutate({ workspaceId: wsId, name: trimmed })
    }
    setEditingId(null)
  }

  const commitRenameFolder = (folderId: string) => {
    const trimmed = editingValue.trim()
    if (!trimmed) { setEditingId(null); return }
    const currentTree = layoutData?.tree ?? []
    const renameInTree = (nodes: LayoutNode[]): LayoutNode[] =>
      nodes.map(n =>
        n.type === 'folder' && n.id === folderId
          ? { ...n, name: trimmed }
          : n.type === 'folder'
            ? { ...n, children: renameInTree(n.children) }
            : n
      )
    saveLayout.mutate(renameInTree(currentTree))
    setEditingId(null)
  }

  // --- Folder creation ---
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    const currentTree = layoutData?.tree ?? []
    const newFolder: LayoutNode = {
      type: 'folder',
      id: `f-${Date.now()}`,
      name: newFolderName.trim(),
      children: [],
    }
    saveLayout.mutate([...currentTree, newFolder])
    setNewFolderName('')
    setCreateFolderOpen(false)
  }

  // --- Drag and drop ---
  const removeNodeFromTree = (tree: LayoutNode[], nodeId: string): LayoutNode[] =>
    tree.filter(n => !(n.type === 'workspace' && n.id === nodeId)).map(n =>
      n.type === 'folder' ? { ...n, children: removeNodeFromTree(n.children, nodeId) } : n
    )

  const addNodeToFolder = (tree: LayoutNode[], folderId: string, node: LayoutNode): LayoutNode[] =>
    tree.map(n =>
      n.type === 'folder' && n.id === folderId
        ? { ...n, children: [...n.children, node] }
        : n.type === 'folder'
          ? { ...n, children: addNodeToFolder(n.children, folderId, node) }
          : n
    )

  const handleDrop = (targetFolderId: string | null) => {
    if (!draggedId) return
    const currentTree = layoutData?.tree ?? []
    const cleaned = removeNodeFromTree(currentTree, draggedId)
    const wsNode: LayoutNode = { type: 'workspace', id: draggedId }

    const newTree = targetFolderId
      ? addNodeToFolder(cleaned, targetFolderId, wsNode)
      : [...cleaned, wsNode]

    saveLayout.mutate(newTree)
    setDraggedId(null)
    setDropTarget(null)
  }

  const allSessions = data?.sessions ?? []
  const filtered = allSessions.filter((s) =>
    (s.firstMessage ?? s.id).toLowerCase().includes(search.toLowerCase())
  )
  const sessions = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  const wsToDeleteName = workspaces.find(w => w.id === wsToDelete)?.name
  const filterWs = workspaces.find(w => w.id === filterWsId)

  return (
    <>
      {/* ── Logo ── */}
      <SidebarHeader className={`${P} py-3`}>
        <Link href="/chat/new" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" width={28} height={28} className="rounded-md" />
          <span className="text-sm font-bold tracking-tight">Multimodal Agent</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>

        {/* ── Environments ── */}
        <SidebarGroup className={`${P} py-0 gap-1.5`}>
          <div className="flex items-center justify-between">
            <SidebarGroupLabel className="px-0 h-7">Environments</SidebarGroupLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <PlusIcon className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setCreateWsOpen(true)}>
                  <BoxIcon size={13} className="mr-2" />
                  New workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                  <FolderIcon size={13} className="mr-2" />
                  New folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <SidebarInput
            placeholder="Search…"
            value={wsSearch}
            onChange={e => setWsSearch(e.target.value)}
          />

          <SidebarMenu className="gap-0.5 mt-1">
            {(() => {
              const renderWsItem = (wsId: string, depth: number) => {
                const ws = wsMap.get(wsId)
                if (!ws) return null
                if (wsSearch && !ws.name.toLowerCase().includes(wsSearch.toLowerCase())) return null
                const wsPath = `/environments/${ws.id}`
                const isActive = pathname.startsWith(wsPath)
                const color = ws.color ?? '#9ca3af'
                const isDefault = ws.name === 'default'
                return (
                  <SidebarMenuItem
                    key={ws.id}
                    className={`group/item relative ${isDefault ? 'opacity-50 cursor-not-allowed' : ''}`}
                    draggable={!isDefault}
                    onDragStart={e => { if (isDefault) { e.preventDefault(); return } e.dataTransfer.effectAllowed = 'move'; setDraggedId(ws.id) }}
                    onDragEnd={() => { setDraggedId(null); setDropTarget(null) }}
                  >
                    <SidebarMenuButton
                      asChild isActive={isActive}
                      className={`h-8 rounded-md ${draggedId === ws.id ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: `${color}15`, paddingLeft: `${0.5 + depth * 0.75}rem` }}
                    >
                      <Link href={wsPath} onDoubleClick={e => { if (isDefault) return; e.preventDefault(); startEdit(ws.id, ws.name) }}>
                        <BoxIcon size={14} className="shrink-0 text-muted-foreground" />
                        {editingId === ws.id ? (
                          <input
                            className="flex-1 bg-transparent text-sm outline-none border-b border-primary min-w-0"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => commitRenameWorkspace(ws.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRenameWorkspace(ws.id); if (e.key === 'Escape') setEditingId(null) }}
                            onClick={e => e.preventDefault()}
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-sm">{ws.name}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {ws.name !== 'default' && (
                      <button
                        onClick={() => setWsToDelete(ws.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </SidebarMenuItem>
                )
              }

              const renderNode = (node: LayoutNode, depth: number): React.ReactNode => {
                if (node.type === 'workspace') return renderWsItem(node.id, depth)

                // Folder node
                const isCollapsed = collapsedFolders.has(node.id)
                const isDragOver = dropTarget === node.id
                if (wsSearch && !node.name.toLowerCase().includes(wsSearch.toLowerCase())) {
                  const hasMatch = node.children.some(c =>
                    c.type === 'workspace' ? wsMap.get(c.id)?.name.toLowerCase().includes(wsSearch.toLowerCase()) : true
                  )
                  if (!hasMatch) return null
                }
                return (
                  <div key={node.id}>
                    <SidebarMenuItem
                      className="group/folder relative"
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDropTarget(node.id) }}
                      onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null) }}
                      onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(node.id) }}
                    >
                      <SidebarMenuButton
                        className={`h-8 rounded-md transition-colors ${isDragOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
                        onClick={() => toggleFolder(node.id)}
                      >
                        {isCollapsed
                          ? <ChevronRightIcon size={13} className="shrink-0 text-muted-foreground" />
                          : <ChevronDownIcon size={13} className="shrink-0 text-muted-foreground" />}
                        <FolderIcon size={13} className="shrink-0 text-muted-foreground" />
                        {editingId === node.id ? (
                          <input
                            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-primary min-w-0"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => commitRenameFolder(node.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRenameFolder(node.id); if (e.key === 'Escape') setEditingId(null) }}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="truncate text-sm font-medium"
                            onDoubleClick={e => { e.stopPropagation(); startEdit(node.id, node.name) }}
                          >{node.name}</span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
                  </div>
                )
              }

              const tree = layoutData?.tree ?? []
              const unsortedIds = layoutData?.unsortedWorkspaceIds ?? []

              return (
                <div
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget('root') }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(null) }}
                  className={`min-h-[2rem] ${dropTarget === 'root' && draggedId ? 'ring-1 ring-primary/30 rounded-md' : ''}`}
                >
                  {tree.map(node => renderNode(node, 0))}
                  {unsortedIds.length > 0 && tree.length > 0 && (
                    <div className="text-[10px] text-muted-foreground px-2 py-1 mt-1 border-t border-border/50">Unsorted</div>
                  )}
                  {unsortedIds.map(id => renderWsItem(id, 0))}
                  {tree.length === 0 && unsortedIds.length === 0 && (
                    <p className="py-3 text-xs text-muted-foreground">
                      {wsSearch ? 'No results.' : 'No workspaces yet.'}
                    </p>
                  )}
                </div>
              )
            })()}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-3" />

        {/* ── Profiles ── */}
        <SidebarGroup className={`${P} py-0 gap-1.5`}>
          <div className="flex items-center justify-between">
            <SidebarGroupLabel className="px-0 h-7">Profiles</SidebarGroupLabel>
          </div>
          <SidebarMenu className="gap-0.5">
            {profiles.map(p => {
              const isActive = pathname.startsWith(`/profiles/${p.id}`)
              const isDefault = p.name === 'default'
              return (
                <SidebarMenuItem key={p.id} className={`group/item relative ${isDefault ? 'opacity-50' : ''}`}>
                  <SidebarMenuButton asChild isActive={isActive} className="h-8 rounded-md">
                    <Link href={`/profiles/${p.id}`}>
                      <SlidersHorizontalIcon size={14} className="shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{p.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="mx-3" />

        {/* ── Conversations ── */}
        <SidebarGroup className={`${P} py-0 gap-1.5`}>
          <div className="flex items-center justify-between">
            <SidebarGroupLabel className="px-0 h-7">Conversations</SidebarGroupLabel>
            <div className="flex items-center">
              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6">
                    <FilterIcon className={`size-3.5 ${filterWsId ? 'text-primary' : ''}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="text-xs" onClick={() => setFilterWsId(null)}>
                    All environments
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {workspaces.map(ws => (
                    <DropdownMenuItem key={ws.id} className="text-xs gap-2" onClick={() => setFilterWsId(ws.id)}>
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: ws.color ?? '#9ca3af' }} />
                      <span className="truncate">{ws.name}</span>
                      {ws.id === filterWsId && <span className="ml-auto text-primary text-[10px]">&#10003;</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6">
                    <ArrowUpDownIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {SORT_OPTIONS.map(opt => (
                    <DropdownMenuItem
                      key={`${opt.key}-${opt.order}`}
                      className="text-xs gap-2"
                      onClick={() => { setSortBy(opt.key); setSortOrder(opt.order) }}
                    >
                      {opt.icon}
                      {opt.label}
                      {opt.key === sortBy && opt.order === sortOrder && (
                        <span className="ml-auto text-primary text-[10px]">&#10003;</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* New */}
              <Button asChild variant="ghost" size="icon" className="size-6">
                <Link href="/chat/new">
                  <PlusIcon className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Active filter badge */}
          {filterWsId && filterWs && (
            <button
              onClick={() => setFilterWsId(null)}
              className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${filterWs.color ?? '#9ca3af'}20`,
                color: filterWs.color ?? '#9ca3af',
              }}
            >
              {filterWs.name}
              <XIcon size={10} />
            </button>
          )}

          <SidebarInput
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
          />

          <SidebarMenu className="gap-0.5 mt-1">
            {sessions.map((session) => {
              const isActive = pathname === `/chat/${session.id}`
              return (
                <SidebarMenuItem key={session.id} className="group/item relative">
                  <SidebarMenuButton asChild isActive={isActive} className="h-auto py-2 pr-8 rounded-md">
                    <Link href={`/chat/${session.id}`}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">
                          {session.firstMessage ?? session.id.slice(0, 8) + '…'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{formatDate(session.updatedAt)}</span>
                          {session.workspaceName && (
                            <span
                              className="inline-flex items-center rounded-full px-1.5 text-[10px] font-medium leading-4"
                              style={{
                                backgroundColor: `${session.workspaceColor ?? '#9ca3af'}20`,
                                color: session.workspaceColor ?? '#9ca3af',
                              }}
                            >
                              {session.workspaceName}
                            </span>
                          )}
                          {session.initiatedBy && session.initiatedBy !== 'human' && (
                            <span className="inline-flex items-center rounded-full px-1.5 text-[10px] font-medium leading-4 bg-violet-500/10 text-violet-500">
                              {session.initiatedBy.replace('agent:', '⚡ ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                  <button
                    onClick={() => setSessionToDelete(session.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </SidebarMenuItem>
              )
            })}

            {sessions.length === 0 && (
              <p className="py-3 text-xs text-muted-foreground">
                {search || filterWsId ? 'No results.' : 'No conversations yet.'}
              </p>
            )}

            {hasMore && (
              <button
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDownIcon size={12} />
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <div className={`mt-auto border-t ${P} py-2 flex items-center justify-between`}>
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>

      {/* ── Dialogs ── */}
      <CreateWorkspaceDialog open={createWsOpen} onOpenChange={setCreateWsOpen} navigateOnCreate />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!wsToDelete} onOpenChange={open => { if (!open) setWsToDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{wsToDeleteName}"</strong>, all its files, and all associated conversations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWsToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!wsToDelete) return
              deleteWorkspace.mutate(wsToDelete, {
                onSettled: () => setWsToDelete(null),
              })
            }} disabled={deleteWorkspace.isPending}>
              Delete workspace and conversations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              This will permanently delete the conversation and all its messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (!sessionToDelete) return; deleteSession.mutate(sessionToDelete, { onSettled: () => setSessionToDelete(null) }) }} disabled={deleteSession.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
