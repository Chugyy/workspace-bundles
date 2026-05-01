export interface LoginPayload {
  password: string
}

export interface AuthResponse {
  success: boolean
  message?: string
}
