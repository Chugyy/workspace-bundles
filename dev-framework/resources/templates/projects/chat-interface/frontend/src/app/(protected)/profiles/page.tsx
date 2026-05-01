'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfiles } from '@/services/profiles/hooks'
import { SidebarTrigger } from '@/components/ui/sidebar'

export default function ProfilesPage() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()

  useEffect(() => {
    if (!isLoading && profiles.length > 0) {
      const defaultProfile = profiles.find(p => p.name === 'default') ?? profiles[0]
      router.replace(`/profiles/${defaultProfile.id}`)
    }
  }, [isLoading, profiles, router])

  return (
    <div className="flex flex-col h-dvh">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
        <SidebarTrigger />
        <span className="text-sm font-medium">Profiles</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {isLoading ? 'Loading…' : 'No profiles found.'}
      </div>
    </div>
  )
}
