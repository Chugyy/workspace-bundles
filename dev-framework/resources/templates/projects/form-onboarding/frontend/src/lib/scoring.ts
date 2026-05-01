import type { BlockScores, FormAnswers, Route, ScoreResult } from '@/types/form'

const Q1_OPTIONS = ['Moins de 3 mois', '3–6 mois', '6–12 mois', '1–2 ans', '2 ans et +']
const Q2_OPTIONS = ['0', '1–3', '4–10', '10–20', '20+']
const Q3_OPTIONS = ['Non', 'Oui, 1', 'Oui, plusieurs', "Oui, c'est devenu régulier"]
const Q5_OPTIONS = ['Non', 'Oui, mais avec beaucoup de temps', 'Oui, correctement', 'Oui, efficacement']
const Q7_OPTIONS = ["J'exécute comme je peux", 'Je pose quelques questions', "Je clarifie jusqu'à comprendre la vision", 'Je reformule le brief au client pour validation']
const Q8_OPTIONS = ['Non', 'Plus ou moins', 'Oui', 'Oui, structurée et respectée']
const Q9_OPTIONS = ['Moins de 5h', '5–10h', '10–20h', '20h+']
const Q10_OPTIONS = ['Non', 'Ça dépend', 'Oui', 'Très']
const Q11_OPTIONS = ['Reportes', 'Changes de tâche', "Forces jusqu'à avancer", 'Cherches activement une solution et avances']
const Q12_OPTIONS = ['Non', 'Pas vraiment', 'Oui', 'Oui et je sais négocier']
const Q13_OPTIONS = ['Non', "Ça me met mal à l'aise", 'Oui', 'Oui, avec calme et cadre']
const Q14_OPTIONS = ['Je serais perdu(e)', "J'aurais du mal mais je m'adapterais", 'Je pourrais continuer', 'Je continuerais sans problème']
const Q15_OPTIONS = ['Apprendre', 'Gagner mes premiers revenus', 'Remplacer un salaire', 'Scaler et devenir premium']
const Q16_OPTIONS = ['500€', '1 000€', '2 000€', '3 000€+']
const Q17_OPTIONS = ['Non', 'Oui mais ça me fait peur', 'Oui', 'Oui et je le ferai']
const Q18_OPTIONS = ['Le client', 'Les circonstances', 'Moi et mon organisation', 'Moi, toujours']
const Q19_OPTIONS = ['En apprentissage', 'En transition', 'Professionnel en construction', 'Professionnel affirmé']

export function getOptionPoints(options: string[], answer: string): number {
  const index = options.indexOf(answer)
  return index === -1 ? 0 : index
}

function normalize(raw: number, rawMax: number): number {
  return Math.round((raw / rawMax) * 25 * 100) / 100
}

export function computeBlocks(answers: Partial<FormAnswers>): BlockScores {
  const technique =
    (answers.q4 ?? 0) +
    getOptionPoints(Q5_OPTIONS, answers.q5 ?? '') +
    (answers.q6?.length ?? 0) +
    getOptionPoints(Q7_OPTIONS, answers.q7 ?? '')

  const discipline =
    getOptionPoints(Q1_OPTIONS, answers.q1 ?? '') +
    getOptionPoints(Q8_OPTIONS, answers.q8 ?? '') +
    getOptionPoints(Q9_OPTIONS, answers.q9 ?? '') +
    getOptionPoints(Q10_OPTIONS, answers.q10 ?? '') +
    getOptionPoints(Q11_OPTIONS, answers.q11 ?? '')

  const autonomie =
    getOptionPoints(Q2_OPTIONS, answers.q2 ?? '') +
    getOptionPoints(Q3_OPTIONS, answers.q3 ?? '') +
    getOptionPoints(Q12_OPTIONS, answers.q12 ?? '') +
    getOptionPoints(Q13_OPTIONS, answers.q13 ?? '') +
    getOptionPoints(Q14_OPTIONS, answers.q14 ?? '')

  const maturite =
    getOptionPoints(Q15_OPTIONS, answers.q15 ?? '') +
    getOptionPoints(Q16_OPTIONS, answers.q16 ?? '') +
    getOptionPoints(Q17_OPTIONS, answers.q17 ?? '') +
    getOptionPoints(Q18_OPTIONS, answers.q18 ?? '') +
    getOptionPoints(Q19_OPTIONS, answers.q19 ?? '')

  return {
    technique: normalize(technique, 23),
    discipline: normalize(discipline, 16),
    autonomie: normalize(autonomie, 16),
    maturite: normalize(maturite, 15),
  }
}

export function computeTotal(blocks: BlockScores): number {
  return blocks.technique + blocks.discipline + blocks.autonomie + blocks.maturite
}

export function getRoute(total: number): Route {
  if (total < 40) return 'constructeur'
  if (total < 70) return 'stabilisateur'
  return 'performant'
}

export function computeScoreResult(answers: Partial<FormAnswers>): ScoreResult {
  const blocks = computeBlocks(answers)
  const total = computeTotal(blocks)
  return { blocks, total, route: getRoute(total) }
}
