'use client'

import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/services/auth/auth.hooks'
import { toast } from 'sonner'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const { mutate: login, isPending } = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    login(
      { password },
      {
        onError: () => {
          toast.error('Invalid password')
        },
      }
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="border border-[#3e3e3e] bg-[#252526] rounded-lg p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-[#0078d4] rounded-md flex items-center justify-center">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">SSH Web IDE</h1>
            <p className="text-xs text-[#8b8b8b] mt-1">Enter your password to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs text-[#cccccc]">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !password}
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
