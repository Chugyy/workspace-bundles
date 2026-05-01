'use client'

import { useEffect, useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { FormSubmission, FormSubmissionListResponse } from '@/types/admin'

const ROUTE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  constructeur: 'secondary',
  stabilisateur: 'outline',
  performant: 'default',
}

interface Props {
  fetchSubmissions: (limit?: number, offset?: number) => Promise<FormSubmissionListResponse>
}

export function SubmissionsTable({ fetchSubmissions }: Props) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchSubmissions()
      .then((data) => { setSubmissions(data.items); setLoaded(true) })
      .catch((e) => setError(e.message))
  }, [fetchSubmissions])

  if (error) return <p className="text-sm text-destructive">{error}</p>

  if (!loaded)
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )

  if (submissions.length === 0)
    return <p className="text-sm text-muted-foreground">Aucune soumission.</p>

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">#</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Nom</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Email</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Route</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground text-right">Tech.</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground text-right">Disc.</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground text-right">Auto.</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground text-right">Mat.</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground text-right">Total</TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((s) => (
            <TableRow key={s.submissionId}>
              <TableCell className="text-muted-foreground text-sm">{s.submissionId}</TableCell>
              <TableCell className="text-sm">{s.respondentName ?? '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{s.respondentEmail ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={ROUTE_VARIANT[s.route] ?? 'outline'} className="capitalize text-xs">
                  {s.route}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">{s.scoreTechnique}</TableCell>
              <TableCell className="text-right text-sm">{s.scoreDiscipline}</TableCell>
              <TableCell className="text-right text-sm">{s.scoreAutonomie}</TableCell>
              <TableCell className="text-right text-sm">{s.scoreMaturite}</TableCell>
              <TableCell className="text-right text-sm font-medium">{s.scoreTotal}</TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(s.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
