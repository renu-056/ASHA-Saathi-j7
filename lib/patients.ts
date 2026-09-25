export type Gender = 'Male' | 'Female' | 'Other' | 'Not specified'

export type Visit = {
  id: string
  date: string
  symptoms: string
  riskFlag: boolean
  note?: string
}

export type Patient = {
  id: string
  remoteId: string | number | null
  name: string
  age: number
  gender: Gender
  symptoms: string
  lastCheckupDate: string
  riskFlag: boolean
  history: Visit[]
  createdAt: string
  synced: boolean
}

export type PatientDraft = {
  name: string
  age: number
  gender: Gender
  symptoms: string
  lastCheckupDate: string
  riskFlag: boolean
}

export const OVERDUE_DAYS = 28
export const DAILY_VISIT_TARGET = 12

export const SEVERE_KEYWORDS = [
  'high fever',
  'high bp',
  'high blood pressure',
  'chest pain',
  'severe',
  'bleeding',
  'unconscious',
  'breathless',
  'seizure',
  'तेज बुखार',
  'सीने में दर्द',
  'गंभीर',
]

export function todayISO(): string {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function daysSince(dateISO: string): number {
  if (!dateISO) return 0
  const [y, m, d] = dateISO.slice(0, 10).split('-').map(Number)
  const then = new Date(y, m - 1, d).getTime()
  const [ty, tm, td] = todayISO().split('-').map(Number)
  const now = new Date(ty, tm - 1, td).getTime()
  return Math.max(0, Math.round((now - then) / 86_400_000))
}

export function isOverdue(p: Pick<Patient, 'lastCheckupDate'>): boolean {
  return daysSince(p.lastCheckupDate) > OVERDUE_DAYS
}

export function hasSevereSymptoms(symptoms: string): boolean {
  const s = symptoms.toLowerCase()
  return SEVERE_KEYWORDS.some((k) => s.includes(k))
}

export function isHighRisk(p: Pick<Patient, 'riskFlag' | 'lastCheckupDate'>): boolean {
  return p.riskFlag || isOverdue(p)
}

export function riskLabel(p: Pick<Patient, 'riskFlag' | 'lastCheckupDate'>): string {
  if (isOverdue(p)) return 'NEEDS CHECKUP - Over 4 weeks'
  if (p.riskFlag) return 'HIGH RISK - Follow up'
  return 'Normal Visit'
}

export function formatDate(dateISO: string): string {
  if (!dateISO) return '—'
  const [y, m, d] = dateISO.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function relativeVisit(dateISO: string): string {
  const days = daysSince(dateISO)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createSamplePatients(): Patient[] {
  const today = todayISO()
  const now = new Date().toISOString()
  return [
    {
      id: uid(),
      remoteId: null,
      name: 'Rajesh Kumar',
      age: 45,
      gender: 'Male',
      symptoms: 'Fever, Cough',
      lastCheckupDate: today,
      riskFlag: false,
      history: [{ id: uid(), date: today, symptoms: 'Fever, Cough', riskFlag: false }],
      createdAt: now,
      synced: false,
    },
    {
      id: uid(),
      remoteId: null,
      name: 'Sunita Devi',
      age: 38,
      gender: 'Female',
      symptoms: 'High BP, Severe Headaches',
      lastCheckupDate: '2024-05-14',
      riskFlag: true,
      history: [
        { id: uid(), date: '2024-05-14', symptoms: 'High BP, Severe Headaches', riskFlag: true },
      ],
      createdAt: now,
      synced: false,
    },
  ]
}

export function emptyDraft(): PatientDraft {
  return {
    name: '',
    age: 0,
    gender: 'Not specified',
    symptoms: '',
    lastCheckupDate: todayISO(),
    riskFlag: false,
  }
}
