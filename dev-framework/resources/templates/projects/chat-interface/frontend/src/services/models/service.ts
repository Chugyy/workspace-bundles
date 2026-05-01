import { apiClient } from '@/lib/api-client'
import type { Model } from '@/types/models'

export const modelsService = {
  async list(): Promise<Model[]> {
    const { data } = await apiClient.get('/models')
    return data
  },
}
