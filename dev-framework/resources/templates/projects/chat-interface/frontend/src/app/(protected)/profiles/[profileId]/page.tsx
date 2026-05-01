'use client'

import { use, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useProfiles } from '@/services/profiles/hooks'
import { createProfileService, profilesService } from '@/services/profiles/service'
import { profileKeys } from '@/services/profiles/service'
import { ProfileList } from '@/components/explorer/profile-list'
import { FileExplorer } from '@/components/explorer/file-explorer'
import { FileViewer } from '@/components/explorer/file-viewer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useQueryClient } from '@tanstack/react-query'
import { WORKSPACE_COLORS } from '@/lib/colors'

interface Props {
  params: Promise<{ profileId: string }>
}

export default function ProfilePage({ params }: Props) {
  const { profileId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedFile = searchParams.get('file')
  const queryClient = useQueryClient()

  const { data: profiles = [] } = useProfiles()
  const profile = profiles.find(p => p.id === profileId)

  const service = useMemo(() => createProfileService(profileId), [profileId])

  const handleSelectFile = (path: string) => {
    router.push(`/profiles/${profileId}?file=${encodeURIComponent(path)}`)
  }

  const handleColorChange = async (color: string) => {
    await profilesService.updateColor(profileId, color)
    queryClient.invalidateQueries({ queryKey: profileKeys.lists() })
  }

  return (
    <div className="flex flex-col h-dvh">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b">
        <SidebarTrigger />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="size-3 rounded-full shrink-0 cursor-pointer ring-1 ring-border"
              style={{ backgroundColor: profile?.color ?? '#9ca3af' }}
              title="Change color"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-2">
            <div className="grid grid-cols-5 gap-1.5">
              {WORKSPACE_COLORS.map(color => (
                <button
                  key={color}
                  className="size-6 rounded-full ring-1 ring-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color, outline: profile?.color === color ? '2px solid currentColor' : undefined, outlineOffset: '2px' }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-sm font-medium truncate">{profile?.name ?? 'Profile'}</span>
        {selectedFile && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground truncate">{selectedFile}</span>
          </>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        <ProfileList selectedId={profileId} />
        <FileExplorer service={service} selectedFile={selectedFile} onSelectFile={handleSelectFile} />
        <FileViewer service={service} filePath={selectedFile} />
      </div>
    </div>
  )
}
