import { emptyDraft, hasSevereSymptoms, type Gender, type PatientDraft } from './patients'

const SYMPTOM_DICTIONARY: { label: string; patterns: string[] }[] = [
  { label: 'High Fever', patterns: ['high fever', 'tez bukhar', 'तेज बुखार'] },
  { label: 'Fever', patterns: ['fever', 'bukhar', 'बुखार', 'ज्वर'] },
  { label: 'Cough', patterns: ['cough', 'khansi', 'khaansi', 'खांसी', 'खाँसी'] },
  { label: 'Cold', patterns: ['cold', 'runny nose', 'jukam', 'zukam', 'जुकाम'] },
  { label: 'High BP', patterns: ['high bp', 'high blood pressure', 'hypertension', 'हाई बीपी'] },
  { label: 'Chest Pain', patterns: ['chest pain', 'seene mein dard', 'सीने में दर्द'] },
  { label: 'Headache', patterns: ['headache', 'head ache', 'sir dard', 'sar dard', 'सिर दर्द', 'सिरदर्द'] },
  { label: 'Body Pain', patterns: ['body pain', 'body ache', 'badan dard', 'बदन दर्द'] },
  { label: 'Vomiting', patterns: ['vomiting', 'vomit', 'ulti', 'उल्टी'] },
  { label: 'Diarrhoea', patterns: ['diarrhea', 'diarrhoea', 'loose motion', 'dast', 'दस्त'] },
  { label: 'Weakness', patterns: ['weakness', 'fatigue', 'tired', 'kamzori', 'कमजोरी'] },
  { label: 'Breathlessness', patterns: ['breathless', 'shortness of breath', 'saans', 'सांस'] },
  { label: 'Dizziness', patterns: ['dizzy', 'dizziness', 'chakkar', 'चक्कर'] },
  { label: 'Stomach Pain', patterns: ['stomach pain', 'abdominal pain', 'pet dard', 'पेट दर्द'] },
  { label: 'Swelling', patterns: ['swelling', 'sujan', 'सूजन'] },
  { label: 'Pregnancy Check', patterns: ['pregnant', 'pregnancy', 'garbhvati', 'गर्भवती'] },
  { label: 'Bleeding', patterns: ['bleeding', 'khoon', 'खून'] },
  { label: 'Severe', patterns: ['severe', 'gambhir', 'गंभीर'] },
]

const NAME_PATTERNS = [
  /(?:patient(?:'s)? name is|name is|patient is|patient|naam hai|naam|नाम है|नाम)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i,
]

const NAME_STOP_WORDS = new Set([
  'is', 'and', 'age', 'aged', 'has', 'with', 'who', 'years', 'year', 'hai', 'he', 'she', 'the', 'a',
])

const AGE_PATTERNS = [
  /(\d{1,3})\s*(?:years?|yrs?|year-old|saal|sal|साल|वर्ष)/i,
  /(?:age|aged|umar|उम्र)\s*(?:is|hai|है)?\s*(\d{1,3})/i,
]

export type Extraction = {
  draft: PatientDraft
  highlights: string[]
}

function toTitle(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (/[a-z]/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function detectGender(t: string): Gender {
  if (/\b(female|woman|lady|girl|mahila|aurat)\b|महिला|औरत|लड़की/i.test(t)) return 'Female'
  if (/\b(male|man|boy|purush|aadmi)\b|पुरुष|आदमी|लड़का/i.test(t)) return 'Male'
  return 'Not specified'
}

export function extractFromTranscript(transcript: string): Extraction {
  const draft = emptyDraft()
  const highlights: string[] = []
  const text = transcript.trim()
  if (!text) return { draft, highlights }
  const lower = text.toLowerCase()

  for (const re of NAME_PATTERNS) {
    const m = text.match(re)
    if (m?.[1]) {
      const words = m[1].split(/\s+/).filter((w) => !NAME_STOP_WORDS.has(w.toLowerCase()))
      if (words.length) {
        draft.name = toTitle(words.join(' '))
        highlights.push(...words)
      }
      break
    }
  }

  for (const re of AGE_PATTERNS) {
    const m = text.match(re)
    if (m?.[1]) {
      const n = Number(m[1])
      if (n > 0 && n < 120) {
        draft.age = n
        highlights.push(m[0])
      }
      break
    }
  }

  draft.gender = detectGender(text)
  const genderMatch = text.match(/\b(female|woman|lady|male|man|mahila|purush)\b|महिला|पुरुष/i)
  if (genderMatch) highlights.push(genderMatch[0])

  const found: string[] = []
  for (const { label, patterns } of SYMPTOM_DICTIONARY) {
    const hit = patterns.find((p) => lower.includes(p.toLowerCase()))
    if (!hit) continue
    if (label === 'Fever' && found.includes('High Fever')) continue
    if (label === 'Severe') {
      highlights.push(hit)
      continue
    }
    found.push(label)
    highlights.push(hit)
  }
  draft.symptoms = found.join(', ')
  draft.riskFlag = hasSevereSymptoms(lower) || hasSevereSymptoms(draft.symptoms)

  return { draft, highlights }
}

export function highlightSegments(text: string, highlights: string[]) {
  const terms = [...new Set(highlights.filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!terms.length) return [{ text, hit: false }]
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, hit: terms.some((t) => t.toLowerCase() === part.toLowerCase()) }))
}
