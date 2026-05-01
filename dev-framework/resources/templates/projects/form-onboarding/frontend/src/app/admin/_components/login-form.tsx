'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  onLogin: (password: string) => void
  loading: boolean
  error: string | null
}

export function LoginForm({ onLogin, loading, error }: Props) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) onLogin(password)
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <header className="flex-none border-b border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-6 py-5">
          <span className="font-bold tracking-widest text-primary text-sm uppercase">HTR</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
          <div>
            <h1 className="text-xl font-bold">Administration</h1>
            <p className="text-sm text-muted-foreground mt-1">Accès réservé à l'équipe HTR.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </div>
      </main>

      <footer className="flex-none border-t border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-6 py-4 flex justify-end">
          <Button onClick={() => password && onLogin(password)} disabled={loading || !password}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
