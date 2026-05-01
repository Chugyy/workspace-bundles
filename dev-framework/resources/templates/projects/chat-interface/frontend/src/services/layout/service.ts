import { apiClient } from '@/lib/api-client'
import type { LayoutNode, LayoutResponse } from '@/types/layout'

export const layoutService = {
  async get(): Promise<LayoutResponse> {
    const { data } = await apiClient.get('/workspace-layout')
    return data
  },

  async save(tree: LayoutNode[]): Promise<void> {
    await apiClient.put('/workspace-layout', { tree })
  },
}

export const layoutKeys = {
  all: ['workspace-layout'] as const,
}
