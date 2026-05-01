export type Route = 'constructeur' | 'stabilisateur' | 'performant'

export interface FormAnswers {
  q1: string; q2: string; q3: string;
  q4: number;
  q5: string;
  q6: string[];
  q7: string; q8: string; q9: string; q10: string; q11: string;
  q12: string; q13: string; q14: string;
  q15: string; q16: string; q17: string; q18: string; q19: string;
  respondentName?: string;
  respondentEmail?: string;
}

export interface BlockScores {
  technique: number;
  discipline: number;
  autonomie: number;
  maturite: number;
}

export interface ScoreResult {
  blocks: BlockScores;
  total: number;
  route: Route;
  submissionId?: number;
}
