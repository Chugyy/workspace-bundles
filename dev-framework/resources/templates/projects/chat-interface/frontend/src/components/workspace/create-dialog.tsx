'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateWorkspace, useApplyProfile, useUpdateWorkspaceColor, useWorkspaces } from '@/services/workspaces/hooks'
import { workspaceKeys } from '@/services/workspaces/service'
import { ConfiguratorPanel } from './profile-configurator'
import { WORKSPACE_COLORS, DEFAULT_WORKSPACE_COLOR } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (workspaceId: string) => void
  navigateOnCreate?: boolean
}

export function CreateWorkspaceDialog({ open, onOpenChange, onCreated, navigateOnCreate }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const createWorkspace = useCreateWorkspace()
  const applyProfile = useApplyProfile()
  const updateColor = useUpdateWorkspaceColor()
  const { data: workspaces = [] } = useWorkspaces()

  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_WORKSPACE_COLOR)
  const selectionRef = useRef<{ profileId: string; items: string[] }>({ profileId: '', items: [] })

  const existingNames = useMemo(() => new Set(workspaces.map(w => w.name.toLowerCase())), [workspaces])
  const isDuplicate = name.trim().length > 0 && existingNames.has(name.trim().toLowerCase())
  const nameValid = name.trim().length > 0 && !isDuplicate

  useEffect(() => {
    if (open) {
      setName('')
      setColor(DEFAULT_WORKSPACE_COLOR)
      selectionRef.current = { profileId: '', items: [] }
    }
  }, [open])

  const handleSelectionChange = useCallback((sel: { profileId: string; items: string[] }) => {
    selectionRef.current = sel
  }, [])

  const handleCreate = () => {
    if (!nameValid) return
    const { profileId, items } = selectionRef.current

    createWorkspace.mutate(name.trim(), {
      onSuccess: async (ws) => {
        const done = () => {
          queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
          onCreated?.(ws.id)
          if (navigateOnCreate) router.push(`/environments/${ws.id}`)
          onOpenChange(false)
        }

        if (color !== DEFAULT_WORKSPACE_COLOR) {
          updateColor.mutate({ workspaceId: ws.id, color })
        }

        if (profileId && items.length > 0) {
          applyProfile.mutate({ workspaceId: ws.id, profileId, items }, { onSettled: done })
        } else {
          done()
        }
      },
    })
  }

  const isPending = createWorkspace.isPending || applyProfile.isPending || updateColor.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm">New workspace</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
          {/* Name */}
          <div className="space-y-1.5 shrink-0">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              className="h-9 text-sm"
              placeholder="my-project"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            {isDuplicate && (
              <p className="text-xs text-destructive">A workspace with this name already exists.</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5 shrink-0">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex items-center gap-1.5">
              {WORKSPACE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="size-5 rounded-full ring-1 ring-border hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: c,
                    outline: c === color ? '2px solid currentColor' : undefined,
                    outlineOffset: '2px',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Profile (copy-once during creation) */}
          <ConfiguratorPanel
            workspace={null}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!nameValid || isPending}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
