'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q12_OPTIONS = ['Non', 'Pas vraiment', 'Oui', 'Oui et je sais négocier']
const Q13_OPTIONS = ['Non', "Ça me met mal à l'aise", 'Oui', 'Oui, avec calme et cadre']
const Q14_OPTIONS = ['Je serais perdu(e)', "J'aurais du mal mais je m'adapterais", 'Je pourrais continuer', 'Je continuerais sans problème']

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

export default function Step4({ answers, errors, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Autonomie commerciale</p>
      <RadioQuestion
        field="q12"
        label="Sais-tu fixer tes prix sans hésitation ?"
        options={Q12_OPTIONS}
        value={answers.q12 ?? ''}
        error={errors.q12}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q13"
        label="Sais-tu gérer un conflit client ?"
        options={Q13_OPTIONS}
        value={answers.q13 ?? ''}
        error={errors.q13}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q14"
        label="Si HTR arrêtait demain, que se passerait-il pour toi ?"
        options={Q14_OPTIONS}
        value={answers.q14 ?? ''}
        error={errors.q14}
        onUpdate={onUpdate}
      />
    </div>
  )
}
