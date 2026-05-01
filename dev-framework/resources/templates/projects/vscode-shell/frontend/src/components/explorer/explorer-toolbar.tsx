'use client'

import { ChevronsDownUp, FilePlus, FolderPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useQueryClient } from '@tanstack/react-query'
import { fileKeys } from '@/services/files/files.service'

interface ExplorerToolbarProps {
  onCollapseAll: () => void
  onNewFile: () => void
  onNewFolder: () => void
}

export function ExplorerToolbar({ onCollapseAll, onNewFile, onNewFolder }: ExplorerToolbarProps) {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.removeQueries({ queryKey: fileKeys.all })
    queryClient.invalidateQueries({ queryKey: fileKeys.all, refetchType: 'all' })
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#3e3e3e]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#bbbbbb]">
        Explorer
      </span>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNewFile}>
              <FilePlus className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New File</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNewFolder}>
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Folder</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onCollapseAll}>
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Collapse all</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
