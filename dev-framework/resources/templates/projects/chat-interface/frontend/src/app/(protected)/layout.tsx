'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationSidebar } from '@/components/sidebar/sidebar'
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
    }
  }, [router])

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <ConversationSidebar />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
