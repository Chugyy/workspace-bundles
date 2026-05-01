'use client'

import { use, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useWorkspaces, useUpdateWorkspaceColor } from '@/services/workspaces/hooks'
import { createWorkspaceService } from '@/services/workspaces/service'
import { FileExplorer } from '@/components/explorer/file-explorer'
import { FileViewer } from '@/components/explorer/file-viewer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { WORKSPACE_COLORS } from '@/lib/colors'

interface Props {
  params: Promise<{ workspaceId: string }>
}

export default function WorkspacePage({ params }: Props) {
  const { workspaceId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedFile = searchParams.get('file')

  const { data: workspaces = [] } = useWorkspaces()
  const workspace = workspaces.find(w => w.id === workspaceId)
  const updateColor = useUpdateWorkspaceColor()

  const service = useMemo(() => createWorkspaceService(workspaceId), [workspaceId])

  const handleSelectFile = (path: string) => {
    router.push(`/environments/${workspaceId}?file=${encodeURIComponent(path)}`)
  }

  return (
    <div className="flex flex-col h-dvh">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
        <SidebarTrigger />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="size-3 rounded-full shrink-0 cursor-pointer ring-1 ring-border" style={{ backgroundColor: workspace?.color ?? '#6b7280' }} title="Change color" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2">
            <div className="grid grid-cols-5 gap-1.5">
              {WORKSPACE_COLORS.map(color => (
                <button
                  key={color}
                  className="size-6 rounded-full ring-1 ring-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color, outline: workspace?.color === color ? '2px solid currentColor' : undefined, outlineOffset: '2px' }}
                  onClick={() => updateColor.mutate({ workspaceId, color })}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm font-medium truncate">{workspace?.name ?? 'Workspace'}</span>
        {selectedFile && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground truncate">{selectedFile}</span>
          </>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        <FileExplorer service={service} selectedFile={selectedFile} onSelectFile={handleSelectFile} />
        <FileViewer service={service} filePath={selectedFile} />
      </div>
    </div>
  )
}
