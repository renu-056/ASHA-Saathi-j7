'use client'

import { useMemo } from 'react'
import { AlertTriangle, CalendarCheck, Mic, UserPlus } from 'lucide-react'
import { DAILY_VISIT_TARGET, emptyDraft, isHighRisk, todayISO } from '@/lib/patients'
import { usePatientStore, useUIStore } from '@/lib/store'
import { PatientList } from './patient-list'

export function DashboardView() {
  const patients = usePatientStore((s) => s.patients)
  const openVoice = useUIStore((s) => s.openVoice)
  const openForm = useUIStore((s) => s.openForm)

  const { todayVisits, pending } = useMemo(() => {
    const today = todayISO()
    return {
      todayVisits: patients.filter((p) => p.lastCheckupDate === today).length,
      pending: patients.filter(isHighRisk).length,
    }
  }, [patients])

  const progress = Math.min(100, Math.round((todayVisits / DAILY_VISIT_TARGET) * 100))

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="Record a visit"
        className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-md shadow-blue-100/50"
      >
        <p className="text-sm font-semibold text-emerald-700">Namaste, Saathi</p>
        <h2 className="mt-0.5 text-xl font-extrabold leading-snug text-slate-900 text-balance">
          Ready for your next home visit?
        </h2>

        <button
          type="button"
          onClick={openVoice}
          className="group mt-4 flex w-full items-center gap-4 rounded-full bg-emerald-600 p-2 pr-6 text-left text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 focus-visible:outline-emerald-800"
        >
          <span className="relative flex size-14 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-white/40 animate-mic-pulse" aria-hidden="true" />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-emerald-700">
              <Mic className="size-7" aria-hidden="true" />
            </span>
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-extrabold leading-tight">Record Visit</span>
            <span className="text-sm font-medium text-emerald-50">Tap to start recording</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => openForm({ mode: 'create', initial: emptyDraft() })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-200 bg-white px-5 py-3 text-base font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          <UserPlus className="size-5" aria-hidden="true" />
          Add Patient Manually
        </button>
      </section>

      <section aria-label="Today's metrics" className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-md shadow-blue-100/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
              <CalendarCheck className="size-4" aria-hidden="true" />
            </span>
            {"Today's Visits"}
          </div>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">
            {todayVisits}
            <span className="text-lg font-bold text-slate-400">/{DAILY_VISIT_TARGET}</span>
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-50"
            role="progressbar"
            aria-valuenow={todayVisits}
            aria-valuemin={0}
            aria-valuemax={DAILY_VISIT_TARGET}
            aria-label="Daily visit target progress"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-md shadow-blue-100/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#FFEBEE] text-red-600">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            Pending Follow-ups
          </div>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-red-600">{pending}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">High-risk or overdue</p>
        </div>
      </section>

      <PatientList heading="Recent Patient Visits" />
    </div>
  )
}
