'use client'

import { useState, useCallback, useRef } from 'react'
import { PanelLeft, X } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useWorkspace } from '@/contexts/workspace-context'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FileTree } from '@/components/explorer/file-tree'
import { ExplorerToolbar } from '@/components/explorer/explorer-toolbar'
import { SessionList } from '@/components/sessions/session-list'

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { activeTab } = useWorkspace()
  const collapseAllRef = useRef<(() => void) | null>(null)
  const newFileRef = useRef<(() => void) | null>(null)
  const newFolderRef = useRef<(() => void) | null>(null)
  const handleCollapseAll = useCallback(() => {
    collapseAllRef.current?.()
  }, [])
  const handleNewFile = useCallback(() => {
    newFileRef.current?.()
  }, [])
  const handleNewFolder = useCallback(() => {
    newFolderRef.current?.()
  }, [])

  return (
    <Tabs defaultValue="files" className="flex flex-col h-full">
      <div className="flex items-center border-b border-[#3e3e3e] bg-[#252526] shrink-0">
        <TabsList className="flex-1 rounded-none bg-transparent h-[36px] p-0">
          <TabsTrigger
            value="files"
            className="flex-1 rounded-none h-full text-[11px] uppercase tracking-wider font-semibold text-[#8b8b8b] data-[state=active]:text-[#cccccc] data-[state=active]:bg-[#1e1e1e] data-[state=active]:shadow-none"
          >
            Files
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="flex-1 rounded-none h-full text-[11px] uppercase tracking-wider font-semibold text-[#8b8b8b] data-[state=active]:text-[#cccccc] data-[state=active]:bg-[#1e1e1e] data-[state=active]:shadow-none"
          >
            Sessions
          </TabsTrigger>
        </TabsList>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-[36px] w-[36px] shrink-0 rounded-none text-[#8b8b8b] hover:text-[#cccccc]"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <TabsContent value="files" className="flex-1 overflow-hidden mt-0">
        <div className="flex flex-col h-full">
          <ExplorerToolbar onCollapseAll={handleCollapseAll} onNewFile={handleNewFile} onNewFolder={handleNewFolder} />
          <div className="flex-1 overflow-hidden">
            <FileTree
              selectedPath={activeTab?.type === 'file' ? activeTab.path ?? null : null}
              collapseAllRef={collapseAllRef}
              newFileRef={newFileRef}
              newFolderRef={newFolderRef}
              onFileSelect={onClose}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="sessions" className="flex-1 overflow-hidden mt-0">
        <SessionList onSessionSelect={onClose} />
      </TabsContent>
    </Tabs>
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setOpen(true)}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="w-full sm:max-w-full p-0 bg-[#252526] border-[#3e3e3e] [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Sidebar</SheetTitle>
            <SidebarContent onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#252526]">
      <SidebarContent />
    </div>
  )
}
