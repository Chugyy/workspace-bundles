'use client'

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels'
import { useWorkspace } from '@/contexts/workspace-context'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sidebar } from '@/components/layouts/sidebar'
import { TabBar } from '@/components/editor/tab-bar'
import { FileEditor } from '@/components/editor/file-editor'
import { EmptyState } from '@/components/editor/empty-state'
import { TerminalInstance } from '@/components/terminal/terminal-instance'
import { TerminalToolbar } from '@/components/terminal/terminal-toolbar'
import { useLogout } from '@/services/auth/auth.hooks'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function TitleBar() {
  const { mutate: logout } = useLogout()
  const isMobile = useIsMobile()

  return (
    <div className="flex items-center justify-between h-[36px] bg-[#323233] border-b border-[#3e3e3e] px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        {isMobile && <Sidebar />}
        <span className="text-xs text-[#cccccc] select-none">SSH Web IDE</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => logout()}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sign out</TooltipContent>
      </Tooltip>
    </div>
  )
}

function ContentArea() {
  const { activeSession, activeTab } = useWorkspace()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeSession?.tabs
          .filter((t) => t.type === 'terminal')
          .map((t) => (
            <TerminalInstance
              key={t.id}
              terminalId={t.id}
              tmuxSessionName={t.tmuxSessionName!}
              isActive={t.id === activeSession.activeTabId}
            />
          ))}

        {activeTab?.type === 'file' && activeSession ? (
          <div className="absolute inset-0 z-10">
            <FileEditor key={activeTab.id} tab={activeTab} sessionId={activeSession.id} />
          </div>
        ) : !activeTab || activeTab.type !== 'terminal' ? (
          <div className="absolute inset-0 z-10">
            <EmptyState />
          </div>
        ) : null}
      </div>
      {activeTab?.type === 'terminal' && (
        <TerminalToolbar terminalId={activeTab.id} />
      )}
    </div>
  )
}

export function AppShell() {
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc]">
      <TitleBar />

      {isMobile ? (
        // Mobile: full-width content, sidebar via sheet
        <ContentArea />
      ) : (
        // Desktop: sidebar docked left + content
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          <Panel defaultSize={22} minSize={15} maxSize={40} className="bg-[#252526]">
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="w-[3px] bg-[#3e3e3e] hover:bg-[#0078d4] transition-colors cursor-col-resize" />
          <Panel defaultSize={78} minSize={40}>
            <ContentArea />
          </Panel>
        </PanelGroup>
      )}
    </div>
  )
}
