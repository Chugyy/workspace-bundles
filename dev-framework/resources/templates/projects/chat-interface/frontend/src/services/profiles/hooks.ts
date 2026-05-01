'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileKeys, profilesService } from './service'

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.lists(),
    queryFn: () => profilesService.list(),
  })
}

export function useProfileItems(profileId: string | null, workspaceId?: string) {
  return useQuery({
    queryKey: [...profileKeys.items(profileId ?? ''), workspaceId ?? ''],
    queryFn: () => profilesService.getItems(profileId!, workspaceId),
    enabled: !!profileId,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => profilesService.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.lists() }),
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => profilesService.delete(profileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.lists() }),
  })
}
