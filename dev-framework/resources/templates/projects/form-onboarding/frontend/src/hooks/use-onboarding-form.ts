'use client'

import { useState } from 'react'
import { computeScoreResult } from '@/lib/scoring'
import type { FormAnswers, ScoreResult } from '@/types/form'

type UpdateValue = string | number | string[]

const STEP_REQUIRED_FIELDS: Record<number, (keyof FormAnswers)[]> = {
  1: ['q1', 'q2', 'q3'],
  2: ['q5', 'q7'],
  3: ['q8', 'q9', 'q10', 'q11'],
  4: ['q12', 'q13', 'q14'],
  5: ['q15', 'q16', 'q17'],
  6: ['q18', 'q19'],
}

function validateStep(step: number, answers: Partial<FormAnswers>): Record<string, string> {
  const errors: Record<string, string> = {}
  const required = STEP_REQUIRED_FIELDS[step] ?? []

  for (const field of required) {
    const value = answers[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[field] = 'Ce champ est requis'
    }
  }

  return errors
}

export function useOnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Partial<FormAnswers>>({ q4: 5 })
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})

  const updateAnswer = (field: keyof FormAnswers, value: UpdateValue) => {
    setAnswers(prev => ({ ...prev, [field]: value }))
    if (stepErrors[field]) {
      setStepErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const next = () => {
    const errors = validateStep(currentStep, answers)
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors)
      return
    }
    setStepErrors({})
    setCurrentStep(s => Math.min(s + 1, 6))
  }

  const prev = () => {
    setStepErrors({})
    setCurrentStep(s => Math.max(s - 1, 1))
  }

  const submit = async () => {
    const errors = validateStep(6, answers)
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors)
      return
    }

    setIsSubmitting(true)

    const result = computeScoreResult(answers)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          scoreTechnique: result.blocks.technique,
          scoreDiscipline: result.blocks.discipline,
          scoreAutonomie: result.blocks.autonomie,
          scoreMaturite: result.blocks.maturite,
          scoreTotal: result.total,
          route: result.route,
          respondentName: answers.respondentName,
          respondentEmail: answers.respondentEmail,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setScoreResult({ ...result, submissionId: data.submissionId })
      } else {
        setScoreResult(result)
      }
    } catch (error) {
      console.error('API submission failed:', error)
      setScoreResult(result)
    } finally {
      setIsSubmitting(false)
      setIsComplete(true)
    }
  }

  return {
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
  }
}
