'use client'

import { UserPlus } from 'lucide-react'
import { emptyDraft } from '@/lib/patients'
import { usePatientStore, useUIStore } from '@/lib/store'
import { PatientList } from './patient-list'

export function RecordsView() {
  const total = usePatientStore((s) => s.patients.length)
  const openForm = useUIStore((s) => s.openForm)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Patient Records</h2>
          <p className="text-sm text-slate-600">{total} patients in your area</p>
        </div>
        <button
          type="button"
          onClick={() => openForm({ mode: 'create', initial: emptyDraft() })}
          className="flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Add
        </button>
      </div>
      <PatientList heading="All patients" />
    </div>
  )
}
