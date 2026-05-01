'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { layoutKeys, layoutService } from './service'
import type { LayoutNode } from '@/types/layout'

export function useLayout() {
  return useQuery({
    queryKey: layoutKeys.all,
    queryFn: () => layoutService.get(),
  })
}

export function useSaveLayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tree: LayoutNode[]) => layoutService.save(tree),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: layoutKeys.all }),
  })
}
