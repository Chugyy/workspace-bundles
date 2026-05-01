'use client'

import { useState, useCallback } from 'react'
import { Terminal } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useWorkspace } from '@/contexts/workspace-context'
import { TabItem } from './tab-item'
import { CloseConfirmDialog } from './close-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSaveFile } from '@/services/files/files.hooks'
import { toast } from 'sonner'
import type { Tab } from '@/types/workspace.types'

export function TabBar() {
  const { activeSession, setActiveTab, closeTab, addTerminalTab, reorderTab } = useWorkspace()
  const { mutateAsync: saveFile } = useSaveFile()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [pendingClose, setPendingClose] = useState<Tab | null>(null)

  const handleCloseRequest = useCallback(
    (tab: Tab) => {
      if (!activeSession) return
      if (tab.isDirty && tab.type === 'file') {
        setPendingClose(tab)
      } else {
        closeTab(activeSession.id, tab.id)
      }
    },
    [activeSession, closeTab]
  )

  const handleSaveAndClose = useCallback(async () => {
    if (!pendingClose || !activeSession) return
    try {
      await saveFile({ path: pendingClose.path!, content: pendingClose.content ?? '' })
      toast.success('File saved')
    } catch {
      toast.error('Failed to save file')
      return
    }
    closeTab(activeSession.id, pendingClose.id)
    setPendingClose(null)
  }, [pendingClose, activeSession, saveFile, closeTab])

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingClose || !activeSession) return
    closeTab(activeSession.id, pendingClose.id)
    setPendingClose(null)
  }, [pendingClose, activeSession, closeTab])

  if (!activeSession) {
    return <div className="h-[38px] border-b border-[#3e3e3e] bg-[#252526]" />
  }

  const handleDragStart = (index: number) => setDragIndex(index)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderTab(activeSession.id, dragIndex, toIndex)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <>
      <div className="h-[38px] border-b border-[#3e3e3e] bg-[#252526] flex-shrink-0 flex">
        <ScrollArea className="flex-1 h-full [&>[data-radix-scroll-area-viewport]]:!overflow-y-hidden" type="scroll">
          <div className="flex h-[38px] flex-nowrap" role="tablist">
            {activeSession.tabs.map((tab, index) => (
              <TabItem
                key={tab.id}
                tab={tab}
                index={index}
                isActive={tab.id === activeSession.activeTabId}
                isDragOver={dropIndex === index && dragIndex !== index}
                onSelect={() => setActiveTab(activeSession.id, tab.id)}
                onClose={() => handleCloseRequest(tab)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-[38px] w-[36px] flex-shrink-0 rounded-none text-[#8b8b8b] hover:text-[#cccccc]"
              onClick={() => addTerminalTab(activeSession.id)}
            >
              <Terminal className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Terminal</TooltipContent>
        </Tooltip>
      </div>

      <CloseConfirmDialog
        open={!!pendingClose}
        fileName={pendingClose?.name ?? ''}
        onCancel={() => setPendingClose(null)}
        onDiscard={handleDiscardAndClose}
        onSave={handleSaveAndClose}
      />
    </>
  )
}
