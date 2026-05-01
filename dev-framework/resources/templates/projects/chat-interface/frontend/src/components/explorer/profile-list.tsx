'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontalIcon, PlusIcon, Trash2 } from 'lucide-react'
import { useProfiles, useCreateProfile, useDeleteProfile } from '@/services/profiles/hooks'
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
}

export function ProfileList({ selectedId }: Props) {
  const router = useRouter()
  const { data: profiles = [] } = useProfiles()
  const createProfile = useCreateProfile()
  const deleteProfile = useDeleteProfile()

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    if (!newName.trim()) return
    createProfile.mutate(newName.trim(), {
      onSuccess: (p) => {
        router.push(`/profiles/${p.id}`)
        setCreateOpen(false)
        setNewName('')
      },
    })
  }

  const handleDelete = () => {
    if (!toDelete) return
    deleteProfile.mutate(toDelete, {
      onSettled: () => {
        setToDelete(null)
        if (selectedId === toDelete) router.push('/profiles')
      },
    })
  }

  const toDeleteName = profiles.find(p => p.id === toDelete)?.name

  return (
    <div className="flex flex-col h-full w-40 shrink-0 border-r bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center justify-between">
          <SidebarGroupLabel className="px-0">Profiles</SidebarGroupLabel>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-3.5" />
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
            {filtered.map(p => {
              const isActive = p.id === selectedId
              const isDefault = p.name === 'default'
              return (
                <SidebarMenuItem key={p.id} className={`group/item relative ${isDefault ? 'opacity-50' : ''}`}>
                  <SidebarMenuButton
                    isActive={isActive}
                    className="h-auto py-2 pr-8"
                    onClick={() => router.push(`/profiles/${p.id}`)}
                  >
                    <SlidersHorizontalIcon size={14} className="shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{p.name}</span>
                    </div>
                  </SidebarMenuButton>
                  {!isDefault && (
                    <button
                      onClick={() => setToDelete(p.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover/item:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </SidebarMenuItem>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {search ? 'No results.' : 'No profiles yet.'}
              </p>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New profile</DialogTitle></DialogHeader>
          <Input
            placeholder="my-profile"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createProfile.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={open => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile</DialogTitle>
            <DialogDescription>
              This will permanently delete "{toDeleteName}" and all its files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProfile.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
