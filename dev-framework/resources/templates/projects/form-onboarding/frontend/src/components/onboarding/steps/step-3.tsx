'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q8_OPTIONS = ['Non', 'Plus ou moins', 'Oui', 'Oui, structurée et respectée']
const Q9_OPTIONS = ['Moins de 5h', '5–10h', '10–20h', '20h+']
const Q10_OPTIONS = ['Non', 'Ça dépend', 'Oui', 'Très']
const Q11_OPTIONS = ['Reportes', 'Changes de tâche', "Forces jusqu'à avancer", 'Cherches activement une solution et avances']

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

export default function Step3({ answers, errors, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Discipline &amp; organisation</p>
      <RadioQuestion
        field="q8"
        label="As-tu une organisation de travail fixe (planning / méthode) ?"
        options={Q8_OPTIONS}
        value={answers.q8 ?? ''}
        error={errors.q8}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q9"
        label="Combien d'heures réelles travailles-tu par semaine sur le montage ?"
        options={Q9_OPTIONS}
        value={answers.q9 ?? ''}
        error={errors.q9}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q10"
        label="Te considères-tu discipliné ?"
        options={Q10_OPTIONS}
        value={answers.q10 ?? ''}
        error={errors.q10}
        onUpdate={onUpdate}
      />
      <RadioQuestion
        field="q11"
        label="Quand tu bloques sur un projet, tu :"
        options={Q11_OPTIONS}
        value={answers.q11 ?? ''}
        error={errors.q11}
        onUpdate={onUpdate}
      />
    </div>
  )
}
