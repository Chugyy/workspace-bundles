'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import type { FormAnswers } from '@/types/form'

interface StepProps {
  answers: Partial<FormAnswers>
  errors: Record<string, string>
  onUpdate: (field: keyof FormAnswers, value: string | number | string[]) => void
}

const Q5_OPTIONS = ['Non', 'Oui, mais avec beaucoup de temps', 'Oui, correctement', 'Oui, efficacement']
const Q6_OPTIONS = ['Structuration narrative', 'Rythme', 'Sound design', 'Colorimétrie', 'Motion design basique', 'Motion design avancé', 'Organisation projet']
const Q7_OPTIONS = ["J'exécute comme je peux", 'Je pose quelques questions', "Je clarifie jusqu'à comprendre la vision", 'Je reformule le brief au client pour validation']

export default function Step2({ answers, errors, onUpdate }: StepProps) {
  const q6Values = answers.q6 ?? []

  const handleQ6Change = (opt: string, checked: boolean) => {
    onUpdate('q6', checked ? [...q6Values, opt] : q6Values.filter((x) => x !== opt))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground">Niveau technique réel</p>

      <div className="space-y-3">
        <p className="font-medium text-sm">Sur 10, comment évalues-tu ton niveau technique global ?</p>
        <div className="space-y-3">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[answers.q4 ?? 5]}
            onValueChange={([v]) => onUpdate('q4', v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span className="font-medium text-foreground">{answers.q4 ?? 5}/10</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium text-sm">Peux-tu monter une vidéo complète sans aide extérieure ?</p>
        <RadioGroup
          value={answers.q5 ?? ''}
          onValueChange={(v) => onUpdate('q5', v)}
          className="space-y-2"
        >
          {Q5_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value={opt} id={`q5-${opt}`} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.q5 && <p className="text-xs text-destructive">{errors.q5}</p>}
      </div>

      <div className="space-y-3">
        <p className="font-medium text-sm">Es-tu à l'aise avec : (plusieurs réponses possibles)</p>
        <div className="grid grid-cols-2 gap-2">
          {Q6_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent"
            >
              <Checkbox
                checked={q6Values.includes(opt)}
                onCheckedChange={(checked) => handleQ6Change(opt, !!checked)}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium text-sm">Si on te donne un brief flou, que fais-tu ?</p>
        <RadioGroup
          value={answers.q7 ?? ''}
          onValueChange={(v) => onUpdate('q7', v)}
          className="space-y-2"
        >
          {Q7_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value={opt} id={`q7-${opt}`} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.q7 && <p className="text-xs text-destructive">{errors.q7}</p>}
      </div>
    </div>
  )
}
