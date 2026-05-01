export interface AdminTokenResponse {
  accessToken: string
  tokenType: string
}

export interface QuestionStatItem {
  answer: string
  count: number
  percentage: number
}

export interface QuestionStats {
  question: string
  items: QuestionStatItem[]
}

export interface AvgScores {
  technique: number
  discipline: number
  autonomie: number
  maturite: number
  total: number
}

export interface AdminStatsResponse {
  totalSubmissions: number
  routeDistribution: QuestionStatItem[]
  avgScores: AvgScores
  questions: QuestionStats[]
}

export interface FormSubmission {
  submissionId: number
  respondentName: string | null
  respondentEmail: string | null
  answers: Record<string, unknown>
  scoreTechnique: number
  scoreDiscipline: number
  scoreAutonomie: number
  scoreMaturite: number
  scoreTotal: number
  route: string
  createdAt: string
}

export interface FormSubmissionListResponse {
  items: FormSubmission[]
  total: number
}
