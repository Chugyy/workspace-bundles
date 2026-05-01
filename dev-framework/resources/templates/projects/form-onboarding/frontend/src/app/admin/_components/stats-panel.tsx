'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminStatsResponse } from '@/types/admin'

const QUESTION_LABELS: Record<string, string> = {
  q1:  'Depuis combien de temps pratiques-tu le montage sérieusement ?',
  q2:  'Combien de missions clients as-tu déjà réalisées (HTR inclus) ?',
  q3:  'As-tu déjà trouvé un client par toi-même (hors HTR) ?',
  q4:  'Sur 10, comment évalues-tu ton niveau technique global ?',
  q5:  'Peux-tu monter une vidéo complète sans aide extérieure ?',
  q6:  'Es-tu à l\'aise avec : (plusieurs réponses possibles)',
  q7:  'Si on te donne un brief flou, que fais-tu ?',
  q8:  'As-tu une organisation de travail fixe (planning / méthode) ?',
  q9:  'Combien d\'heures réelles travailles-tu par semaine sur le montage ?',
  q10: 'Te considères-tu discipliné ?',
  q11: 'Quand tu bloques sur un projet, tu :',
  q12: 'Sais-tu fixer tes prix sans hésitation ?',
  q13: 'Sais-tu gérer un conflit client ?',
  q14: 'Si HTR arrêtait demain, que se passerait-il pour toi ?',
  q15: 'Quel est ton objectif principal ?',
  q16: 'Combien aimerais-tu gagner par mois d\'ici 6–12 mois ?',
  q17: 'Es-tu prêt(e) à trouver un client par toi-même même si HTR te fournit des missions ?',
  q18: 'Si un projet est en retard, qui est responsable ?',
  q19: 'Te considères-tu comme :',
}

const ROUTE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  constructeur: 'secondary',
  stabilisateur: 'outline',
  performant: 'default',
}

interface Props {
  fetchStats: () => Promise<AdminStatsResponse>
}

export function StatsPanel({ fetchStats }: Props) {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats().then(setStats).catch((e) => setError(e.message))
  }, [fetchStats])

  if (error) return <p className="text-sm text-destructive">{error}</p>

  if (!stats)
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )

  return (
    <div className="space-y-8">

      {/* Score total moyen */}
      <div className="text-center space-y-1">
        <p className="text-5xl font-bold">
          {stats.avgScores.total.toFixed(1)}
          <span className="text-2xl font-normal text-muted-foreground">/100</span>
        </p>
        <p className="text-sm text-muted-foreground">Score moyen · {stats.totalSubmissions} soumission{stats.totalSubmissions > 1 ? 's' : ''}</p>
      </div>

      {/* Scores par bloc */}
      <div className="space-y-4">
        {(
          [
            ['Technique', stats.avgScores.technique],
            ['Discipline', stats.avgScores.discipline],
            ['Autonomie', stats.avgScores.autonomie],
            ['Maturité', stats.avgScores.maturite],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div key={label} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="text-muted-foreground font-medium">{value.toFixed(1)}/25</span>
            </div>
            <Progress value={(value / 25) * 100} />
          </div>
        ))}
      </div>

      {/* Distribution des routes */}
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Distribution des routes</p>
        {stats.routeDistribution.map((item) => (
          <div key={item.answer} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <Badge variant={ROUTE_VARIANT[item.answer] ?? 'outline'} className="capitalize">
                {item.answer}
              </Badge>
              <span className="text-muted-foreground">{item.count} · {item.percentage}%</span>
            </div>
            <Progress value={item.percentage} />
          </div>
        ))}
      </div>

      {/* Stats par question */}
      <div className="space-y-4">
        <p className="text-sm font-medium">Réponses par question</p>
        {stats.questions.map((q) => (
          <div key={q.question} className="rounded-lg border p-4 space-y-3">
            <div className="space-y-0.5">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{q.question}</p>
                <p className="text-sm font-medium">{QUESTION_LABELS[q.question] ?? q.question}</p>
              </div>
            {q.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              q.items.map((item) => (
                <div key={item.answer} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="truncate max-w-[70%]">{item.answer}</span>
                    <span className="text-muted-foreground shrink-0">{item.count} · {item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
