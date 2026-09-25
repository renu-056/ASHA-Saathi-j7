'use client'

import { useId, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Save, Sparkles, X } from 'lucide-react'
import { hasSevereSymptoms, isOverdue, todayISO, type Gender, type PatientDraft } from '@/lib/patients'
import { usePatientStore, useUIStore, type FormState } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Modal } from './modal'

type OpenForm = Exclude<FormState, { open: false }>

const GENDERS: Gender[] = ['Female', 'Male', 'Other', 'Not specified']

const inputClass =
  'h-12 w-full rounded-xl border border-blue-100 bg-white px-4 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 aria-[invalid=true]:border-red-400'

function stopKeys(e: React.KeyboardEvent<HTMLElement>) {
  e.stopPropagation()
  const tag = (e.target as HTMLElement).tagName
  if (e.key === 'Enter' && tag === 'INPUT') e.preventDefault()
}

export function PatientFormModal({ form }: { form: OpenForm }) {
  const closeForm = useUIStore((s) => s.closeForm)
  const showToast = useUIStore((s) => s.showToast)
  const addPatient = usePatientStore((s) => s.addPatient)
  const updatePatient = usePatientStore((s) => s.updatePatient)

  const [draft, setDraft] = useState<PatientDraft>(() => ({
    ...form.initial,
    riskFlag: form.initial.riskFlag || hasSevereSymptoms(form.initial.symptoms),
  }))
  const [symptomInput, setSymptomInput] = useState('')
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({})
  const [saving, setSaving] = useState(false)
  const ids = { name: useId(), age: useId(), gender: useId(), sym: useId(), date: useId(), risk: useId() }

  const symptomTags = draft.symptoms.split(',').map((s) => s.trim()).filter(Boolean)
  const overdue = isOverdue(draft)
  const severe = hasSevereSymptoms(draft.symptoms)

  function update<K extends keyof PatientDraft>(key: K, value: PatientDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value }
      if ((key === 'symptoms' && hasSevereSymptoms(String(value))) || (key === 'lastCheckupDate' && isOverdue(next))) {
        next.riskFlag = true
      }
      return next
    })
  }

  function addSymptom(raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const merged = [...new Set([...symptomTags, ...parts])]
    update('symptoms', merged.join(', '))
    setSymptomInput('')
  }

  function removeSymptom(tag: string) {
    update('symptoms', symptomTags.filter((t) => t !== tag).join(', '))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    const pending = symptomInput.trim()
    const finalDraft: PatientDraft = {
      ...draft,
      name: draft.name.trim(),
      symptoms: pending ? [...new Set([...symptomTags, ...pending.split(',').map((s) => s.trim()).filter(Boolean)])].join(', ') : draft.symptoms,
    }
    const nextErrors: typeof errors = {}
    if (!finalDraft.name) nextErrors.name = 'Please enter the patient name'
    if (!finalDraft.age || finalDraft.age < 0 || finalDraft.age > 120) nextErrors.age = 'Enter an age between 1 and 120'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    try {
      if (form.mode === 'edit' && form.patientId) {
        await updatePatient(form.patientId, finalDraft)
        showToast(`${finalDraft.name}'s record updated`)
      } else {
        await addPatient(finalDraft)
        showToast(`${finalDraft.name} saved successfully`)
      }
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  const title =
    form.mode === 'verify' ? 'Verify Visit Details' : form.mode === 'edit' ? 'Edit Patient Record' : 'Add Patient Manually'
  const description =
    form.mode === 'verify'
      ? 'We filled these from your recording. Please check and correct.'
      : 'Fields marked * are required.'

  return (
    <Modal
      title={title}
      description={description}
      onClose={closeForm}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="h-12 flex-1 rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="patient-form"
            disabled={saving}
            className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-emerald-600 text-base font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-70"
          >
            {saving ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
            Save Patient Record
          </button>
        </div>
      }
    >
      <form id="patient-form" noValidate onSubmit={handleSubmit} onKeyDown={stopKeys} className="flex flex-col gap-4">
        {form.mode === 'verify' && form.transcript ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-slate-700">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <Sparkles className="size-3.5" aria-hidden="true" /> Your recording
            </p>
            <p className="line-clamp-3 italic">{`"${form.transcript}"`}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.name} className="text-sm font-semibold text-slate-800">
            1. Patient Name *
          </label>
          <input
            id={ids.name}
            data-autofocus
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Sunita Devi"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${ids.name}-err` : undefined}
            className={inputClass}
          />
          {errors.name ? (
            <p id={`${ids.name}-err`} className="text-sm font-medium text-red-600">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.age} className="text-sm font-semibold text-slate-800">
              2. Age *
            </label>
            <input
              id={ids.age}
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={draft.age || ''}
              onChange={(e) => update('age', Number(e.target.value))}
              placeholder="Years"
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? `${ids.age}-err` : undefined}
              className={inputClass}
            />
            {errors.age ? (
              <p id={`${ids.age}-err`} className="text-sm font-medium text-red-600">
                {errors.age}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.gender} className="text-sm font-semibold text-slate-800">
              3. Gender
            </label>
            <select
              id={ids.gender}
              value={draft.gender}
              onChange={(e) => update('gender', e.target.value as Gender)}
              className={inputClass}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.sym} className="text-sm font-semibold text-slate-800">
            4. Symptoms
          </label>
          {symptomTags.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Added symptoms">
              {symptomTags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => removeSymptom(tag)}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-100 py-1 pl-3 pr-2 text-sm font-medium text-sky-900 hover:bg-sky-200"
                  >
                    {tag}
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Remove {tag}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            id={ids.sym}
            value={symptomInput}
            onChange={(e) => {
              const v = e.target.value
              if (v.endsWith(',')) addSymptom(v)
              else setSymptomInput(v)
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                addSymptom(symptomInput)
              } else if (e.key === 'Backspace' && !symptomInput && symptomTags.length) {
                removeSymptom(symptomTags[symptomTags.length - 1])
              }
            }}
            onBlur={() => addSymptom(symptomInput)}
            placeholder="Type a symptom, press Enter or comma"
            autoComplete="off"
            aria-describedby={`${ids.sym}-hint`}
            className={inputClass}
          />
          <p id={`${ids.sym}-hint`} className="text-xs text-slate-500">
            Severe words like “high fever”, “chest pain” or “high BP” mark the patient High-Risk.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.date} className="text-sm font-semibold text-slate-800">
            5. Last Checkup Date
          </label>
          <input
            id={ids.date}
            type="date"
            max={todayISO()}
            value={draft.lastCheckupDate}
            onChange={(e) => update('lastCheckupDate', e.target.value || todayISO())}
            className={inputClass}
          />
          {overdue ? (
            <p className="text-xs font-semibold text-red-600">Over 4 weeks ago — flagged as needing checkup.</p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-slate-800">6. Risk Level</legend>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {[
              { value: false, label: 'Normal', icon: CheckCircle2 },
              { value: true, label: 'High-Risk', icon: AlertTriangle },
            ].map(({ value, label, icon: Icon }) => {
              const active = draft.riskFlag === value
              return (
                <label
                  key={label}
                  className={cn(
                    'flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-emerald-200',
                    active
                      ? value
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-white text-[#2E7D32] shadow'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <input
                    type="radio"
                    name={ids.risk}
                    className="sr-only"
                    checked={active}
                    onChange={() => setDraft((d) => ({ ...d, riskFlag: value }))}
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </label>
              )
            })}
          </div>
          {(severe || overdue) && !draft.riskFlag ? (
            <p className="text-xs font-semibold text-amber-700">
              Suggested High-Risk based on {severe ? 'symptoms' : 'checkup date'}.
            </p>
          ) : null}
        </fieldset>
      </form>
    </Modal>
  )
}
