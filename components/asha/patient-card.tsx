'use client'

import { memo } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, CloudOff, Pencil, Trash2 } from 'lucide-react'
import { formatDate, isHighRisk, relativeVisit, riskLabel, type Patient } from '@/lib/patients'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

function PatientCardImpl({ patient }: { patient: Patient }) {
  const openDetail = useUIStore((s) => s.openDetail)
  const openForm = useUIStore((s) => s.openForm)
  const askDelete = useUIStore((s) => s.askDelete)
  const high = isHighRisk(patient)
  const symptoms = patient.symptoms.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <article
      className={cn(
        'relative rounded-2xl border p-4 shadow-md transition-shadow hover:shadow-lg',
        high
          ? 'border-red-200 bg-[#FFEBEE] shadow-red-100/60'
          : 'border-blue-100 bg-white shadow-blue-100/50',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            high ? 'bg-red-100 text-red-600' : 'bg-[#E8F5E9] text-[#2E7D32]',
          )}
          aria-hidden="true"
        >
          {high ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-900">
            <button
              type="button"
              onClick={() => openDetail(patient.id)}
              className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']"
            >
              {patient.name}
            </button>
          </h3>
          <p className="text-sm text-slate-600">
            {patient.age ? `${patient.age} yrs` : 'Age —'} · {patient.gender}
          </p>
          <span
            className={cn(
              'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
              high ? 'bg-red-600 text-white' : 'bg-[#E8F5E9] text-[#2E7D32]',
            )}
          >
            {high ? <AlertTriangle className="size-3" aria-hidden="true" /> : <CheckCircle2 className="size-3" aria-hidden="true" />}
            {riskLabel(patient)}
          </span>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              openForm({
                mode: 'edit',
                patientId: patient.id,
                initial: {
                  name: patient.name,
                  age: patient.age,
                  gender: patient.gender,
                  symptoms: patient.symptoms,
                  lastCheckupDate: patient.lastCheckupDate,
                  riskFlag: patient.riskFlag,
                },
              })
            }
            className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">Edit {patient.name}</span>
          </button>
          <button
            type="button"
            onClick={() => askDelete(patient.id)}
            className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="sr-only">Delete {patient.name}</span>
          </button>
        </div>
      </div>

      {symptoms.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Symptoms">
          {symptoms.map((s) => (
            <li
              key={s}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                high ? 'bg-white/80 text-red-800' : 'bg-sky-50 text-sky-800',
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={cn(
          'mt-3 flex items-center justify-between border-t pt-3 text-xs',
          high ? 'border-red-200/70 text-red-800' : 'border-blue-50 text-slate-600',
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Last visit: {formatDate(patient.lastCheckupDate)}
          <span className={high ? 'font-bold' : 'text-slate-500'}>({relativeVisit(patient.lastCheckupDate)})</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">
          {!patient.synced ? (
            <>
              <CloudOff className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Not yet synced.</span>
            </>
          ) : null}
          <span aria-hidden="true">Details</span>
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  )
}

export const PatientCard = memo(PatientCardImpl)
