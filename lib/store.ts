'use client'

import { create } from 'zustand'
import { getSupabase, type PatientRow } from './supabase'
import {
  createSamplePatients,
  isHighRisk,
  uid,
  type Patient,
  type PatientDraft,
} from './patients'

const STORAGE_KEY = 'asha_saathi_patients'
const SETTINGS_KEY = 'asha_saathi_settings'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'
export type VoiceLang = 'en-IN' | 'hi-IN'

type PatientState = {
  patients: Patient[]
  hydrated: boolean
  syncStatus: SyncStatus
  syncMessage: string
  voiceLang: VoiceLang
  init: () => void
  syncNow: () => Promise<void>
  addPatient: (draft: PatientDraft) => Promise<Patient>
  updatePatient: (id: string, draft: PatientDraft) => Promise<void>
  deletePatient: (id: string) => Promise<void>
  resetToSamples: () => void
  setVoiceLang: (lang: VoiceLang) => void
}

function toRowPayload(p: Pick<Patient, 'name' | 'age' | 'symptoms' | 'lastCheckupDate' | 'riskFlag'>) {
  return {
    name: p.name,
    age: p.age,
    symptoms: p.symptoms,
    last_checkup_date: p.lastCheckupDate,
    risk_flag: isHighRisk(p),
  }
}

function readLocal(): Patient[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Patient[]) : null
  } catch {
    return null
  }
}

function writeLocal(patients: Patient[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients))
  } catch {
    // Storage full or blocked (private mode); in-memory state still works.
  }
}

function mergeRemote(local: Patient[], rows: PatientRow[]): Patient[] {
  const byRemote = new Map(local.filter((p) => p.remoteId != null).map((p) => [String(p.remoteId), p]))
  const merged: Patient[] = local.filter((p) => p.remoteId == null)

  for (const row of rows) {
    const existing = byRemote.get(String(row.id))
    const lastCheckupDate = (row.last_checkup_date ?? '').slice(0, 10)
    const symptoms = row.symptoms ?? ''
    if (existing) {
      merged.push({
        ...existing,
        name: row.name,
        age: Number(row.age) || 0,
        symptoms,
        lastCheckupDate,
        riskFlag: Boolean(row.risk_flag),
        synced: true,
      })
    } else {
      merged.push({
        id: uid(),
        remoteId: row.id,
        name: row.name,
        age: Number(row.age) || 0,
        gender: 'Not specified',
        symptoms,
        lastCheckupDate,
        riskFlag: Boolean(row.risk_flag),
        history: lastCheckupDate
          ? [{ id: uid(), date: lastCheckupDate, symptoms, riskFlag: Boolean(row.risk_flag) }]
          : [],
        createdAt: new Date().toISOString(),
        synced: true,
      })
    }
  }
  return merged
}

let initStarted = false

export const usePatientStore = create<PatientState>((set, get) => {
  const patch = (id: string, changes: Partial<Patient>) =>
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...changes } : p)) }))

  async function pushUnsynced() {
    const supabase = getSupabase()
    if (!supabase) return
    for (const p of get().patients.filter((x) => !x.synced)) {
      if (p.remoteId == null) {
        const { data, error } = await supabase
          .from('patients')
          .insert(toRowPayload(p))
          .select('id')
          .single()
        if (error) throw error
        patch(p.id, { remoteId: data.id, synced: true })
      } else {
        const { error } = await supabase.from('patients').update(toRowPayload(p)).eq('id', p.remoteId)
        if (error) throw error
        patch(p.id, { synced: true })
      }
    }
  }

  return {
    patients: [],
    hydrated: false,
    syncStatus: 'local',
    syncMessage: 'Saved on this device',
    voiceLang: 'en-IN',

    init: () => {
      if (initStarted) return
      initStarted = true

      const local = readLocal()
      let voiceLang: VoiceLang = 'en-IN'
      try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
        if (settings.voiceLang === 'hi-IN') voiceLang = 'hi-IN'
      } catch {}

      set({
        patients: local && local.length ? local : createSamplePatients(),
        hydrated: true,
        voiceLang,
      })

      usePatientStore.subscribe((state, prev) => {
        if (state.patients !== prev.patients) writeLocal(state.patients)
      })
      writeLocal(get().patients)

      void get().syncNow()
    },

    syncNow: async () => {
      const supabase = getSupabase()
      if (!supabase) {
        set({ syncStatus: 'local', syncMessage: 'Offline mode — saved on this device' })
        return
      }
      set({ syncStatus: 'syncing', syncMessage: 'Syncing with cloud…' })
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name, age, symptoms, last_checkup_date, risk_flag')
        if (error) throw error
        set((s) => ({ patients: mergeRemote(s.patients, (data ?? []) as PatientRow[]) }))
        await pushUnsynced()
        set({ syncStatus: 'synced', syncMessage: 'All records synced to cloud' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not reach cloud'
        set({ syncStatus: 'error', syncMessage: `Saved locally — ${message}` })
      }
    },

    addPatient: async (draft) => {
      const patient: Patient = {
        ...draft,
        id: uid(),
        remoteId: null,
        history: [
          { id: uid(), date: draft.lastCheckupDate, symptoms: draft.symptoms, riskFlag: draft.riskFlag },
        ],
        createdAt: new Date().toISOString(),
        synced: false,
      }
      set((s) => ({ patients: [patient, ...s.patients] }))

      const supabase = getSupabase()
      if (supabase) {
        supabase
          .from('patients')
          .insert(toRowPayload(patient))
          .select('id')
          .single()
          .then(({ data, error }) => {
            if (error) {
              set({ syncStatus: 'error', syncMessage: `Saved locally — ${error.message}` })
              return
            }
            patch(patient.id, { remoteId: data.id, synced: true })
            set({ syncStatus: 'synced', syncMessage: 'All records synced to cloud' })
          })
      }
      return patient
    },

    updatePatient: async (id, draft) => {
      const current = get().patients.find((p) => p.id === id)
      if (!current) return
      const isNewVisit =
        draft.lastCheckupDate !== current.lastCheckupDate || draft.symptoms !== current.symptoms
      const history = isNewVisit
        ? [
            { id: uid(), date: draft.lastCheckupDate, symptoms: draft.symptoms, riskFlag: draft.riskFlag },
            ...current.history,
          ]
        : current.history
      const next: Patient = { ...current, ...draft, history, synced: false }
      patch(id, next)

      const supabase = getSupabase()
      if (supabase && next.remoteId != null) {
        const { error } = await supabase
          .from('patients')
          .update(toRowPayload(next))
          .eq('id', next.remoteId)
        if (error) {
          set({ syncStatus: 'error', syncMessage: `Saved locally — ${error.message}` })
          return
        }
        patch(id, { synced: true })
      }
    },

    deletePatient: async (id) => {
      const target = get().patients.find((p) => p.id === id)
      set((s) => ({ patients: s.patients.filter((p) => p.id !== id) }))
      const supabase = getSupabase()
      if (supabase && target?.remoteId != null) {
        const { error } = await supabase.from('patients').delete().eq('id', target.remoteId)
        if (error) set({ syncStatus: 'error', syncMessage: `Deleted locally — ${error.message}` })
      }
    },

    resetToSamples: () => set({ patients: createSamplePatients() }),

    setVoiceLang: (voiceLang) => {
      set({ voiceLang })
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ voiceLang }))
      } catch {}
    },
  }
})

export type Tab = 'dashboard' | 'records' | 'reports' | 'settings'
export type FormState =
  | { open: false }
  | { open: true; mode: 'create' | 'edit' | 'verify'; patientId?: string; initial: PatientDraft; transcript?: string }

type UIState = {
  tab: Tab
  voiceOpen: boolean
  form: FormState
  detailId: string | null
  confirmDeleteId: string | null
  toast: string | null
  setTab: (tab: Tab) => void
  openVoice: () => void
  closeVoice: () => void
  openForm: (form: Omit<Exclude<FormState, { open: false }>, 'open'>) => void
  closeForm: () => void
  openDetail: (id: string) => void
  closeDetail: () => void
  askDelete: (id: string) => void
  cancelDelete: () => void
  showToast: (msg: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUIStore = create<UIState>((set) => ({
  tab: 'dashboard',
  voiceOpen: false,
  form: { open: false },
  detailId: null,
  confirmDeleteId: null,
  toast: null,
  setTab: (tab) => set({ tab }),
  openVoice: () => set({ voiceOpen: true }),
  closeVoice: () => set({ voiceOpen: false }),
  openForm: (form) => set({ form: { ...form, open: true }, voiceOpen: false }),
  closeForm: () => set({ form: { open: false } }),
  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),
  askDelete: (id) => set({ confirmDeleteId: id }),
  cancelDelete: () => set({ confirmDeleteId: null }),
  showToast: (toast) => {
    clearTimeout(toastTimer)
    set({ toast })
    toastTimer = setTimeout(() => set({ toast: null }), 2800)
  },
}))
