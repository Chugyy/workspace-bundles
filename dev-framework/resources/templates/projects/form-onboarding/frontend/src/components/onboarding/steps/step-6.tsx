'use client'

import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q18_OPTIONS = ['Le client', 'Les circonstances', 'Moi et mon organisation', 'Moi, toujours']
const Q19_OPTIONS = ['En apprentissage', 'En transition', 'Professionnel en construction', 'Professionnel affirmé']

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

export default function Step6({ answers, errors, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Responsabilité</p>
      <RadioQuestion
        field="q18"
        label="Si un projet est en retard, qui est responsable ?"
        options={Q18_OPTIONS}
        value={answers.q18 ?? ''}
        error={errors.q18}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q19"
        label="Te considères-tu comme :"
        options={Q19_OPTIONS}
        value={answers.q19 ?? ''}
        error={errors.q19}
        onUpdate={onUpdate}
      />
      <div className="space-y-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">Optionnel — reçois ta roadmap par email</p>
        <Input
          placeholder="Ton prénom"
          value={answers.respondentName ?? ''}
          onChange={(e) => onUpdate('respondentName', e.target.value)}
        />
        <Input
          placeholder="Ton email"
          type="email"
          value={answers.respondentEmail ?? ''}
          onChange={(e) => onUpdate('respondentEmail', e.target.value)}
        />
      </div>
    </div>
  )
}
