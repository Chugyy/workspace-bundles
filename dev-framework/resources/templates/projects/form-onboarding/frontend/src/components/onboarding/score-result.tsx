'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ScoreResult } from '@/types/form'

interface Props {
  result: ScoreResult
}

const ROUTE_CONFIG = {
  constructeur: {
    label: 'Constructeur',
    variant: 'secondary' as const,
    message: 'Tu es en phase de construction. Ta roadmap va poser les bases solides.',
  },
  stabilisateur: {
    label: 'Stabilisateur',
    variant: 'outline' as const,
    message: 'Tu as de bonnes bases. Ta roadmap va accélérer ta progression.',
  },
  performant: {
    label: 'Performant',
    variant: 'default' as const,
    message: "Tu es à un niveau avancé. Ta roadmap va optimiser tes performances.",
  },
}

const BLOCK_LABELS: Record<string, string> = {
  technique: 'Technique',
  discipline: 'Discipline',
  autonomie: 'Autonomie commerciale',
  maturite: 'Maturité',
}

export default function ScoreResultComponent({ result }: Props) {
  const config = ROUTE_CONFIG[result.route]

  const blockEntries = Object.entries(result.blocks) as [keyof typeof result.blocks, number][]
  const sortedBlocks = [...blockEntries].sort(([, a], [, b]) => a - b)
  const priorityAxes = sortedBlocks.slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold">{Math.round(result.total)}<span className="text-2xl font-normal text-muted-foreground">/100</span></p>
        <Badge variant={config.variant}>{config.label}</Badge>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{config.message}</p>
      </div>

      <div className="space-y-4">
        {blockEntries.map(([key, score]) => (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>{BLOCK_LABELS[key]}</span>
              <span className="text-muted-foreground font-medium">{score}/25</span>
            </div>
            <Progress value={(score / 25) * 100} />
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium">Axes prioritaires</p>
        {priorityAxes.map(([key, score]) => (
          <div key={key} className="flex justify-between text-sm text-muted-foreground">
            <span>{BLOCK_LABELS[key]}</span>
            <span>{score}/25</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-center text-muted-foreground">
        L'équipe HTR te contactera prochainement avec ta roadmap personnalisée.
      </p>
    </div>
  )
}
