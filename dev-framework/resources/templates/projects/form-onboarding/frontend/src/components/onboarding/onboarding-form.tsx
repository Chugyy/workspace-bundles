'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Stepper, StepperIndicator, StepperItem, StepperSeparator, StepperTrigger } from '@/components/ui/stepper'
import { useOnboardingForm } from '@/hooks/use-onboarding-form'
import ScoreResult from './score-result'
import Step1 from './steps/step-1'
import Step2 from './steps/step-2'
import Step3 from './steps/step-3'
import Step4 from './steps/step-4'
import Step5 from './steps/step-5'
import Step6 from './steps/step-6'

const SECTION_LABELS = [
  'Situation actuelle',
  'Niveau technique',
  'Discipline & organisation',
  'Autonomie commerciale',
  'Projection & ambition',
  'Responsabilité',
]

const STEPS = [1, 2, 3, 4, 5, 6]

export default function OnboardingForm() {
  const {
    currentStep,
    answers,
    scoreResult,
    isComplete,
    isSubmitting,
    stepErrors,
    updateAnswer,
    next,
    prev,
    submit,
  } = useOnboardingForm()

  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">

      {/* ── HEADER (statique) ── */}
      <header className="flex-none border-b border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-6 py-5 space-y-5">
          {/* Branding */}
          <div className="flex items-center justify-between">
            <span className="font-bold tracking-widest text-primary text-sm uppercase">HTR</span>
            {!isComplete && (
              <span className="text-xs text-muted-foreground">
                Section {currentStep} / {STEPS.length}
              </span>
            )}
          </div>

          {/* Stepper */}
          {!isComplete && (
            <Stepper value={currentStep} className="w-full">
              {STEPS.map((step) => (
                <StepperItem
                  key={step}
                  step={step}
                  completed={currentStep > step}
                  className="not-last:flex-1"
                >
                  <StepperTrigger asChild>
                    <StepperIndicator>{step}</StepperIndicator>
                  </StepperTrigger>
                  {step < STEPS.length && <StepperSeparator />}
                </StepperItem>
              ))}
            </Stepper>
          )}
        </div>
      </header>

      {/* ── CONTENT (scrollable) ── */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-6 py-8">
          {isComplete && scoreResult ? (
            <ScoreResult result={scoreResult} />
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-xl font-bold">{SECTION_LABELS[currentStep - 1]}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStep < 6 ? 'Réponds honnêtement pour obtenir une roadmap précise.' : 'Dernière section — tu y es presque.'}
                </p>
              </div>
              <div className="space-y-6">
                {currentStep === 1 && <Step1 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
                {currentStep === 2 && <Step2 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
                {currentStep === 3 && <Step3 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
                {currentStep === 4 && <Step4 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
                {currentStep === 5 && <Step5 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
                {currentStep === 6 && <Step6 answers={answers} errors={stepErrors} onUpdate={updateAnswer} />}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── FOOTER (statique) ── */}
      {!isComplete && (
        <footer className="flex-none border-t border-border bg-background">
          <div className="max-w-2xl mx-auto w-full px-6 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prev}
              disabled={currentStep === 1}
            >
              Précédent
            </Button>
            {currentStep < STEPS.length ? (
              <Button onClick={next}>Suivant</Button>
            ) : (
              <Button onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? 'Calcul en cours…' : 'Voir mes résultats'}
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
