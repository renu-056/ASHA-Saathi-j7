'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Activity, AlertTriangle, CalendarClock, Printer, Users } from 'lucide-react'
import { daysSince, formatDate, isHighRisk, isOverdue, riskLabel, todayISO } from '@/lib/patients'
import { usePatientStore, useUIStore } from '@/lib/store'

export function ReportsView() {
  const patients = usePatientStore((s) => s.patients)
  const openDetail = useUIStore((s) => s.openDetail)
  const detailOpen = useUIStore((s) => s.detailId !== null)

  const stats = useMemo(() => {
    const high = patients.filter(isHighRisk)
    const overdue = patients.filter(isOverdue)
    const week = patients.filter((p) => daysSince(p.lastCheckupDate) <= 7).length
    const freq = new Map<string, number>()
    for (const p of patients) {
      for (const s of p.symptoms.split(',').map((x) => x.trim()).filter(Boolean)) {
        const key = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
        freq.set(key, (freq.get(key) ?? 0) + 1)
      }
    }
    const topSymptoms = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    return { high, overdue: overdue.length, week, topSymptoms }
  }, [patients])

  const maxCount = stats.topSymptoms[0]?.[1] ?? 1

  const tiles = [
    { label: 'Total patients', value: patients.length, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Visits this week', value: stats.week, icon: Activity, tone: 'bg-[#E8F5E9] text-[#2E7D32]' },
    { label: 'High-risk', value: stats.high.length, icon: AlertTriangle, tone: 'bg-[#FFEBEE] text-red-600' },
    { label: 'Overdue > 4 wks', value: stats.overdue, icon: CalendarClock, tone: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-600">Summary as of {formatDate(todayISO())}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-11 items-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white shadow-md shadow-blue-700/30 hover:bg-blue-800"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print
        </button>
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-md shadow-blue-100/50">
            <span className={`flex size-9 items-center justify-center rounded-full ${tone}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-600">{label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="symptoms-heading" className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md shadow-blue-100/50">
        <h3 id="symptoms-heading" className="text-base font-bold text-slate-900">
          Common symptoms
        </h3>
        {stats.topSymptoms.length ? (
          <ul className="mt-4 flex flex-col gap-3">
            {stats.topSymptoms.map(([name, count]) => (
              <li key={name}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">{name}</span>
                  <span className="tabular-nums text-slate-600">
                    {count} {count === 1 ? 'patient' : 'patients'}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sky-50" aria-hidden="true">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No symptoms recorded yet.</p>
        )}
      </section>

      <section aria-labelledby="followup-heading" className="rounded-2xl border border-red-100 bg-white p-5 shadow-md shadow-blue-100/50">
        <h3 id="followup-heading" className="text-base font-bold text-slate-900">
          Follow-up priority list
        </h3>
        {stats.high.length ? (
          <ul className="mt-3 divide-y divide-red-50">
            {stats.high.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openDetail(p.id)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">{p.name}</span>
                    <span className="block text-xs font-bold uppercase text-red-600">{riskLabel(p)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-600">{formatDate(p.lastCheckupDate)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No high-risk patients. Great work!</p>
        )}
      </section>

      {!detailOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="hidden text-black print:block">
              <h1 className="border-b-2 border-black pb-2 text-xl font-extrabold">ASHA Saathi — Area Summary Report</h1>
              <p className="mt-1 text-sm">Date: {formatDate(todayISO())}</p>
              <p className="mt-3 text-sm">
                Total patients: <b>{patients.length}</b> · Visits this week: <b>{stats.week}</b> · High-risk:{' '}
                <b>{stats.high.length}</b> · Overdue: <b>{stats.overdue}</b>
              </p>
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {['Name', 'Age', 'Gender', 'Symptoms', 'Last Checkup', 'Status'].map((h) => (
                      <th key={h} className="border border-black bg-gray-100 px-2 py-1.5 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td className="border border-black px-2 py-1.5">{p.name}</td>
                      <td className="border border-black px-2 py-1.5">{p.age || '—'}</td>
                      <td className="border border-black px-2 py-1.5">{p.gender}</td>
                      <td className="border border-black px-2 py-1.5">{p.symptoms || '—'}</td>
                      <td className="border border-black px-2 py-1.5">{formatDate(p.lastCheckupDate)}</td>
                      <td className="border border-black px-2 py-1.5 font-semibold">{riskLabel(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
