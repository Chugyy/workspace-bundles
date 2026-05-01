'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminStatsResponse, FormSubmissionListResponse } from '@/types/admin'

const TOKEN_KEY = 'admin_token'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function useAdmin() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY)
    if (stored && isTokenValid(stored)) setToken(stored)
    else sessionStorage.removeItem(TOKEN_KEY)
  }, [])

  const isAuthenticated = token !== null && isTokenValid(token)

  const login = useCallback(async (password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) throw new Error('Mot de passe incorrect')
      const data = await res.json()
      sessionStorage.setItem(TOKEN_KEY, data.accessToken)
      setToken(data.accessToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  const fetchStats = useCallback(async (): Promise<AdminStatsResponse> => {
    const res = await fetch(`${API_URL}/admin/stats`, { headers: authHeader() })
    if (!res.ok) throw new Error('Erreur lors du chargement des stats')
    return res.json()
  }, [authHeader])

  const fetchSubmissions = useCallback(
    async (limit = 50, offset = 0): Promise<FormSubmissionListResponse> => {
      const res = await fetch(
        `${API_URL}/admin/submissions?limit=${limit}&offset=${offset}`,
        { headers: authHeader() }
      )
      if (!res.ok) throw new Error('Erreur lors du chargement des réponses')
      return res.json()
    },
    [authHeader]
  )

  return { isAuthenticated, loading, error, login, logout, fetchStats, fetchSubmissions }
}
