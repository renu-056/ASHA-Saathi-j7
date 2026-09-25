'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CalendarDays, CheckCircle2, Pencil, Printer, Stethoscope } from 'lucide-react'
import { daysSince, formatDate, isHighRisk, isOverdue, riskLabel, todayISO, type Patient } from '@/lib/patients'
import { usePatientStore, useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Modal } from './modal'

export function PatientDetailModal({ id }: { id: string }) {
  const patient = usePatientStore((s) => s.patients.find((p) => p.id === id))
  const closeDetail = useUIStore((s) => s.closeDetail)
  const openForm = useUIStore((s) => s.openForm)
  const [mounted] = useState(() => typeof document !== 'undefined')

  if (!patient) return null
  const high = isHighRisk(patient)
  const history = [...patient.history].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Modal
        title={patient.name}
        description={`${patient.age ? `${patient.age} yrs` : 'Age —'} · ${patient.gender}`}
        onClose={closeDetail}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                closeDetail()
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
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-blue-700 text-base font-bold text-white shadow-md shadow-blue-700/30 hover:bg-blue-800"
            >
              <Printer className="size-5" aria-hidden="true" />
              Print / Export Summary
            </button>
          </div>
        }
      >
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl p-4',
            high ? 'bg-[#FFEBEE] text-red-700' : 'bg-[#E8F5E9] text-[#2E7D32]',
          )}
        >
          {high ? <AlertTriangle className="size-6 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />}
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide">{riskLabel(patient)}</p>
            <p className="text-sm font-medium">
              Last checkup {formatDate(patient.lastCheckupDate)} · {daysSince(patient.lastCheckupDate)} days ago
            </p>
          </div>
        </div>

        <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">Current symptoms</h3>
        <p className="mt-1 text-base text-slate-900">{patient.symptoms || 'No symptoms recorded'}</p>

        <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">Visit history</h3>
        {history.length ? (
          <ol className="mt-3 flex flex-col gap-0 border-l-2 border-blue-100 pl-5">
            {history.map((v) => (
              <li key={v.id} className="relative pb-4 last:pb-0">
                <span
                  className={cn(
                    'absolute -left-[27px] top-1 flex size-3 rounded-full ring-4 ring-white',
                    v.riskFlag ? 'bg-red-500' : 'bg-emerald-500',
                  )}
                  aria-hidden="true"
                />
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <CalendarDays className="size-3.5 text-slate-500" aria-hidden="true" />
                  {formatDate(v.date)}
                  {v.riskFlag ? <span className="text-xs font-bold text-red-600">· High-Risk</span> : null}
                </p>
                <p className="mt-0.5 text-sm text-slate-700">{v.symptoms || 'Routine visit'}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-sm text-slate-600">No previous visits recorded.</p>
        )}
      </Modal>

      {mounted ? createPortal(<PrintableReport patient={patient} />, document.body) : null}
    </>
  )
}

function PrintableReport({ patient }: { patient: Patient }) {
  const high = isHighRisk(patient)
  const history = [...patient.history].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="hidden bg-white p-0 font-sans text-black print:block">
      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="flex items-center gap-2 text-xl font-extrabold">
            <Stethoscope className="size-5" aria-hidden="true" /> ASHA Saathi — Patient Handover Summary
          </p>
          <p className="text-sm">Community Health Visit Record · For Doctor / PHC Referral</p>
        </div>
        <p className="text-right text-sm">
          Printed: {formatDate(todayISO())}
          <br />
          Ref: {String(patient.remoteId ?? patient.id).slice(0, 8).toUpperCase()}
        </p>
      </header>

      <table className="mt-5 w-full border-collapse text-sm">
        <tbody>
          {[
            ['Patient Name', patient.name],
            ['Age', patient.age ? `${patient.age} years` : '—'],
            ['Gender', patient.gender],
            ['Last Checkup', `${formatDate(patient.lastCheckupDate)} (${daysSince(patient.lastCheckupDate)} days ago)`],
            ['Risk Status', riskLabel(patient)],
            ['Current Symptoms', patient.symptoms || '—'],
          ].map(([k, v]) => (
            <tr key={k}>
              <th className="w-44 border border-black bg-gray-100 px-3 py-2 text-left font-bold">{k}</th>
              <td className={cn('border border-black px-3 py-2', k === 'Risk Status' && high && 'font-extrabold')}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {high ? (
        <p className="mt-4 border-2 border-black p-3 text-sm font-bold">
          ATTENTION: {isOverdue(patient) ? 'Patient has not had a checkup in over 4 weeks. ' : ''}
          Patient flagged as HIGH-RISK. Please prioritise examination.
        </p>
      ) : null}

      <h2 className="mt-6 text-base font-extrabold">Visit History</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black bg-gray-100 px-3 py-2 text-left">Date</th>
            <th className="border border-black bg-gray-100 px-3 py-2 text-left">Symptoms / Notes</th>
            <th className="border border-black bg-gray-100 px-3 py-2 text-left">Risk</th>
          </tr>
        </thead>
        <tbody>
          {history.map((v) => (
            <tr key={v.id}>
              <td className="border border-black px-3 py-2">{formatDate(v.date)}</td>
              <td className="border border-black px-3 py-2">{v.symptoms || 'Routine visit'}</td>
              <td className="border border-black px-3 py-2">{v.riskFlag ? 'High-Risk' : 'Normal'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-16 grid grid-cols-2 gap-10 text-sm">
        <p className="border-t border-black pt-2">ASHA Worker Signature</p>
        <p className="border-t border-black pt-2">Receiving Doctor / ANM Signature</p>
      </div>
    </div>
  )
}
