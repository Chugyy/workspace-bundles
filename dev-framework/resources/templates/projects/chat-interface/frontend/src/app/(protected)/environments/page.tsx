'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaces } from '@/services/workspaces/hooks'
import { SidebarTrigger } from '@/components/ui/sidebar'

export default function EnvironmentsPage() {
  const router = useRouter()
  const { data: workspaces = [], isLoading } = useWorkspaces()

  useEffect(() => {
    if (!isLoading && workspaces.length > 0) {
      router.replace(`/environments/${workspaces[0].id}`)
    }
  }, [isLoading, workspaces, router])

  return (
    <div className="flex flex-col h-dvh">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
        <SidebarTrigger />
        <span className="text-sm font-medium">Environments</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {isLoading ? 'Loading…' : 'No workspaces found.'}
      </div>
    </div>
  )
}
