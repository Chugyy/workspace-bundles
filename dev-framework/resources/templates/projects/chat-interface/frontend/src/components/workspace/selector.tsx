'use client'

import { useState } from 'react'
import { CheckIcon, ChevronDownIcon, FolderIcon, PlusIcon } from 'lucide-react'
import { useWorkspaces } from '@/services/workspaces/hooks'
import { CreateWorkspaceDialog } from './create-dialog'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Props {
  value: string | null
  onChange: (id: string) => void
}

export function WorkspaceSelector({ value, onChange }: Props) {
  const { data: workspaces = [] } = useWorkspaces()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const selected = workspaces.find(w => w.id === value)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            role="combobox"
            aria-expanded={open}
            variant="outline"
            className="w-56 justify-between border-input bg-background px-3 font-normal hover:bg-background focus-visible:outline-[3px]"
          >
            <span className={cn('flex items-center gap-2 truncate', !selected && 'text-muted-foreground')}>
              <FolderIcon className="size-3.5 shrink-0" />
              {selected ? selected.name : 'Select workspace'}
            </span>
            <ChevronDownIcon size={14} className="shrink-0 text-muted-foreground/80" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 border-input p-0">
          <Command>
            <CommandInput placeholder="Search workspace…" />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup>
                {workspaces.map(ws => (
                  <CommandItem
                    key={ws.id}
                    value={ws.name}
                    onSelect={() => { onChange(ws.id); setOpen(false) }}
                    className="gap-2"
                  >
                    <FolderIcon size={14} className="text-muted-foreground" />
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.id === value && <CheckIcon size={14} className="ml-auto shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => { setOpen(false); setCreateOpen(true) }}
                  className="gap-2 text-muted-foreground"
                >
                  <PlusIcon size={14} className="-ms-0.5" />
                  New workspace
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => onChange(id)}
      />
    </>
  )
}

export function useDefaultWorkspaceId(): string | null {
  const { data: workspaces = [] } = useWorkspaces()
  const defaultWs = workspaces.find(w => w.name === 'default') ?? workspaces[0]
  return defaultWs?.id ?? null
}
