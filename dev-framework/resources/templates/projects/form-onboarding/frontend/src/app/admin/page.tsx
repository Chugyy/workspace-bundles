'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAdmin } from './_hooks/use-admin'
import { LoginForm } from './_components/login-form'
import { StatsPanel } from './_components/stats-panel'
import { SubmissionsTable } from './_components/submissions-table'

export default function AdminPage() {
  const { isAuthenticated, loading, error, login, logout, fetchStats, fetchSubmissions } = useAdmin()

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} loading={loading} error={error} />
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <header className="flex-none border-b border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-6 py-5 flex items-center justify-between">
          <span className="font-bold tracking-widest text-primary text-sm uppercase">HTR</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble des soumissions.</p>
          </div>

          <Tabs defaultValue="stats">
            <TabsList className="w-full">
              <TabsTrigger value="stats" className="flex-1">Statistiques</TabsTrigger>
              <TabsTrigger value="submissions" className="flex-1">Réponses</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-6">
              <StatsPanel fetchStats={fetchStats} />
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <SubmissionsTable fetchSubmissions={fetchSubmissions} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
