'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q1_OPTIONS = ['Moins de 3 mois', '3–6 mois', '6–12 mois', '1–2 ans', '2 ans et +']
const Q2_OPTIONS = ['0', '1–3', '4–10', '10–20', '20+']
const Q3_OPTIONS = ['Non', 'Oui, 1', 'Oui, plusieurs', "Oui, c'est devenu régulier"]

function RadioQuestion({
  field,
  label,
  options,
  value,
  error,
  onUpdate,
}: {
  field: keyof FormAnswers
  label: string
  options: string[]
  value: string
  error?: string
  onUpdate: StepProps['onUpdate']
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onUpdate(field, v)}
        className="space-y-2"
      >
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem value={opt} id={`${String(field)}-${opt}`} />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </RadioGroup>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function Step1({ answers, errors, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Situation actuelle</p>
      <RadioQuestion
        field="q1"
        label="Depuis combien de temps pratiques-tu le montage sérieusement ?"
        options={Q1_OPTIONS}
        value={answers.q1 ?? ''}
        error={errors.q1}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q2"
        label="Combien de missions clients as-tu déjà réalisées (HTR inclus) ?"
        options={Q2_OPTIONS}
        value={answers.q2 ?? ''}
        error={errors.q2}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q3"
        label="As-tu déjà trouvé un client par toi-même (hors HTR) ?"
        options={Q3_OPTIONS}
        value={answers.q3 ?? ''}
        error={errors.q3}
        onUpdate={onUpdate}
      />
    </div>
  )
}
