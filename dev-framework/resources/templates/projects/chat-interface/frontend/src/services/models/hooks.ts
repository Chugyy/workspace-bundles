'use client'

import { useQuery } from '@tanstack/react-query'
import { modelsService } from './service'

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => modelsService.list(),
    staleTime: Infinity,
  })
}
