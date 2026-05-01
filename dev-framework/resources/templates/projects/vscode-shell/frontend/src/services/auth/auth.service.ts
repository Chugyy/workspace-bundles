import { apiClient } from '@/lib/api-client'
import type { AuthResponse, LoginPayload } from './auth.types'

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
    return data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  check: async (): Promise<boolean> => {
    const { data } = await apiClient.get<{ authenticated: boolean }>('/auth/check')
    return data.authenticated
  },
}
