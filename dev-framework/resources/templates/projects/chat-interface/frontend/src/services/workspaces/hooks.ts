'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaceKeys, workspacesService } from './service'
import { layoutKeys } from '@/services/layout/service'
import { sessionKeys } from '@/services/sessions/service'

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => workspacesService.list(),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => workspacesService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: layoutKeys.all })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workspacesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: layoutKeys.all })
    },
  })
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) =>
      workspacesService.rename(workspaceId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
  })
}

export function useUpdateWorkspaceColor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, color }: { workspaceId: string; color: string }) =>
      workspacesService.updateColor(workspaceId, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

export function useApplyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, profileId, items }: { workspaceId: string; profileId: string; items: string[] }) =>
      workspacesService.applyProfile(workspaceId, profileId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
  })
}

export function useBrowseWorkspace(workspaceId: string | null, path = '') {
  return useQuery({
    queryKey: workspaceKeys.browse(workspaceId ?? '', path),
    queryFn: () => workspacesService.browse(workspaceId!, path),
    enabled: !!workspaceId,
  })
}
