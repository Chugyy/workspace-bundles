'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q15_OPTIONS = ['Apprendre', 'Gagner mes premiers revenus', 'Remplacer un salaire', 'Scaler et devenir premium']
const Q16_OPTIONS = ['500€', '1 000€', '2 000€', '3 000€+']
const Q17_OPTIONS = ['Non', 'Oui mais ça me fait peur', 'Oui', 'Oui et je le ferai']

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

export default function Step5({ answers, errors, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Projection &amp; ambition</p>
      <RadioQuestion
        field="q15"
        label="Quel est ton objectif principal ?"
        options={Q15_OPTIONS}
        value={answers.q15 ?? ''}
        error={errors.q15}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q16"
        label="Combien aimerais-tu gagner par mois d'ici 6–12 mois ?"
        options={Q16_OPTIONS}
        value={answers.q16 ?? ''}
        error={errors.q16}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q17"
        label="Es-tu prêt(e) à trouver un client par toi-même même si HTR te fournit des missions ?"
        options={Q17_OPTIONS}
        value={answers.q17 ?? ''}
        error={errors.q17}
        onUpdate={onUpdate}
      />
    </div>
  )
}
