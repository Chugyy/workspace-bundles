'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRightIcon, FileIcon, FolderIcon, Settings2Icon, SparklesIcon } from 'lucide-react'
import { useProfiles, useProfileItems } from '@/services/profiles/hooks'
import { useApplyProfile } from '@/services/workspaces/hooks'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types/workspaces'
import type { ProfileItem } from '@/types/profiles'

// ---------------------------------------------------------------------------
// Tree data model
// ---------------------------------------------------------------------------

type TreeNode = {
  id: string
  label: string
  type: 'file' | 'folder'
  filePaths: string[]
  isNew: boolean
  children?: TreeNode[]
}

function buildNodes(parentPath: string | null, items: ProfileItem[]): TreeNode[] {
  const prefix = parentPath ? parentPath + '/' : ''

  const directFiles = items.filter(i =>
    i.type === 'file' && i.path.startsWith(prefix) && !i.path.slice(prefix.length).includes('/')
  )
  const directDirs = items.filter(i =>
    i.type === 'dir' && i.path.startsWith(prefix) && !i.path.slice(prefix.length).includes('/')
  )

  return [
    ...directFiles.map(f => ({
      id: f.path,
      label: f.path.slice(prefix.length),
      type: 'file' as const,
      filePaths: [f.path],
      isNew: f.isNew,
    })),
    ...directDirs.map(dir => {
      const allFilesUnder = items.filter(i => i.type === 'file' && i.path.startsWith(dir.path + '/'))
      return {
        id: dir.path,
        label: dir.path.slice(prefix.length),
        type: 'folder' as const,
        filePaths: allFilesUnder.map(i => i.path),
        isNew: allFilesUnder.every(i => i.isNew),
        children: buildNodes(dir.path, items),
      }
    }),
  ]
}

function buildTree(items: ProfileItem[]): TreeNode[] {
  return buildNodes(null, items)
}

// ---------------------------------------------------------------------------
// Checkbox with indeterminate support
// ---------------------------------------------------------------------------

type CheckState = 'checked' | 'unchecked' | 'indeterminate'

function TreeCheckbox({ state, onChange }: { state: CheckState; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'indeterminate'
      ref.current.checked = state === 'checked'
    }
  }, [state])

  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 shrink-0 rounded cursor-pointer accent-primary"
      onChange={onChange}
    />
  )
}

// ---------------------------------------------------------------------------
// Tree node row
// ---------------------------------------------------------------------------

function TreeNodeRow({
  node,
  depth,
  checked,
  expanded,
  onToggleCheck,
  onToggleExpand,
}: {
  node: TreeNode
  depth: number
  checked: Set<string>
  expanded: Set<string>
  onToggleCheck: (node: TreeNode) => void
  onToggleExpand: (id: string) => void
}) {
  const checkedCount = node.filePaths.filter(p => checked.has(p)).length
  const state: CheckState =
    checkedCount === 0 ? 'unchecked'
    : checkedCount === node.filePaths.length ? 'checked'
    : 'indeterminate'

  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children && node.children.length > 0

  return (
    <>
      <div
        className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/60 cursor-pointer group"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        <button
          className={cn('size-4 shrink-0 flex items-center justify-center', !hasChildren && 'invisible')}
          onClick={() => onToggleExpand(node.id)}
        >
          <ChevronRightIcon
            size={14}
            className={cn('text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
          />
        </button>

        <TreeCheckbox state={state} onChange={() => onToggleCheck(node)} />

        {node.type === 'folder'
          ? <FolderIcon size={15} className="shrink-0 text-muted-foreground" />
          : <FileIcon size={15} className="shrink-0 text-muted-foreground" />
        }

        <span className="truncate text-sm select-none" onClick={() => onToggleCheck(node)}>
          {node.label}
        </span>

        {node.isNew && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-500 shrink-0">
            <SparklesIcon size={10} />
            NEW
          </span>
        )}

        {node.type === 'folder' && node.filePaths.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground shrink-0 pr-1">
            {checkedCount}/{node.filePaths.length}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && node.children!.map(child => (
        <TreeNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          checked={checked}
          expanded={expanded}
          onToggleCheck={onToggleCheck}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Configurator panel (exported for reuse in chat header)
// ---------------------------------------------------------------------------

export interface ConfiguratorPanelProps {
  /** Existing workspace — if null, runs in standalone mode (no Apply button, reports selection via onSelectionChange) */
  workspace?: Workspace | null
  onApplied?: () => void
  /** Standalone mode: called whenever profile/items selection changes */
  onSelectionChange?: (selection: { profileId: string; items: string[] }) => void
}

export function ConfiguratorPanel({ workspace, onApplied, onSelectionChange }: ConfiguratorPanelProps) {
  const standalone = !workspace
  const { data: profiles = [] } = useProfiles()

  // Stable profile ID — only initialize once per mount
  const [selectedProfileId, setSelectedProfileId] = useState(
    () => workspace?.claudeProfileId ?? profiles[0]?.id ?? ''
  )
  // Sync if profiles load after mount
  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(workspace?.claudeProfileId ?? profiles[0].id)
    }
  }, [profiles.length, selectedProfileId, workspace?.claudeProfileId])

  const isNewProfile = standalone || selectedProfileId !== workspace?.claudeProfileId
  const { data: rawItems = [] } = useProfileItems(
    selectedProfileId || null,
    isNewProfile ? undefined : workspace?.id,
  )
  const applyProfile = useApplyProfile()

  // Compute initial checked from workspace or all-checked for new profile
  const initialChecked = useMemo(() => {
    if (rawItems.length === 0) return new Set<string>()
    if (isNewProfile) {
      return new Set(rawItems.filter(i => i.type === 'file').map(i => i.path))
    }
    return new Set(workspace?.includedItems ?? [])
  }, [rawItems, isNewProfile, workspace?.includedItems])

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const prevProfileRef = useRef(selectedProfileId)

  // Reset checked/expanded when profile or items change
  useEffect(() => {
    if (rawItems.length === 0) return
    const profileChanged = prevProfileRef.current !== selectedProfileId
    prevProfileRef.current = selectedProfileId

    if (profileChanged) {
      setChecked(new Set(rawItems.filter(i => i.type === 'file').map(i => i.path)))
    } else {
      setChecked(initialChecked)
    }
    setExpanded(new Set(rawItems.filter(i => i.type === 'dir' && !i.path.includes('/')).map(i => i.path)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfileId, rawItems.length])

  // Report selection changes in standalone mode
  useEffect(() => {
    if (standalone && selectedProfileId && checked.size > 0) {
      onSelectionChange?.({ profileId: selectedProfileId, items: Array.from(checked) })
    }
  }, [standalone, selectedProfileId, checked, onSelectionChange])

  const tree = buildTree(rawItems)

  const toggleCheck = (node: TreeNode) => {
    setChecked(prev => {
      const next = new Set(prev)
      const allChecked = node.filePaths.every(p => next.has(p))
      if (allChecked) {
        node.filePaths.forEach(p => next.delete(p))
      } else {
        node.filePaths.forEach(p => next.add(p))
      }
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleApply = () => {
    if (!workspace) return
    applyProfile.mutate(
      { workspaceId: workspace.id, profileId: selectedProfileId, items: Array.from(checked) },
      { onSuccess: () => onApplied?.() }
    )
  }

  return (
    <div className="flex flex-col h-full gap-3 py-2">
      {/* Profile selector */}
      <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select a profile…" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tree */}
      {tree.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {tree.map(node => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              checked={checked}
              expanded={expanded}
              onToggleCheck={toggleCheck}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      ) : selectedProfileId ? (
        <p className="text-sm text-muted-foreground">No items in this profile.</p>
      ) : null}

      {/* Apply button (only in workspace mode) */}
      {!standalone && (
        <div className="px-1 pb-2">
          <Button
            onClick={handleApply}
            disabled={!selectedProfileId || checked.size === 0 || applyProfile.isPending}
            className="w-full"
          >
            {applyProfile.isPending ? 'Applying…' : `Apply (${checked.size} files)`}
          </Button>
        </div>
      )}

      {/* Selection count (standalone mode) */}
      {standalone && tree.length > 0 && (
        <p className="text-xs text-muted-foreground">{checked.size} file{checked.size !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public Sheet component
// ---------------------------------------------------------------------------

interface Props {
  workspace: Workspace
  trigger?: React.ReactNode
  onApplied?: () => void
}

export function ProfileConfigurator({ workspace, trigger, onApplied }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
            <Settings2Icon className="size-3.5" />
            Configure
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-96 flex flex-col px-5">
        <SheetHeader>
          <SheetTitle className="text-sm flex items-center gap-2">
            <Settings2Icon className="size-4" />
            {workspace.name} — Claude profile
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <ConfiguratorPanel
            workspace={workspace}
            onApplied={() => { onApplied?.(); setOpen(false) }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
