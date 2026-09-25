'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Search, UserX } from 'lucide-react'
import { daysSince, isHighRisk } from '@/lib/patients'
import { usePatientStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PatientCard } from './patient-card'

type Filter = 'all' | 'high' | 'normal'

export function PatientList({ heading = 'Patient Visits', limit }: { heading?: string; limit?: number }) {
  const patients = usePatientStore((s) => s.patients)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const deferredQuery = useDeferredValue(query)

  const counts = useMemo(() => {
    const high = patients.filter(isHighRisk).length
    return { all: patients.length, high, normal: patients.length - high }
  }, [patients])

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const list = patients
      .filter((p) => {
        if (filter === 'high' && !isHighRisk(p)) return false
        if (filter === 'normal' && isHighRisk(p)) return false
        if (!q) return true
        return p.name.toLowerCase().includes(q) || p.symptoms.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const ra = isHighRisk(a) ? 1 : 0
        const rb = isHighRisk(b) ? 1 : 0
        if (ra !== rb) return rb - ra
        return daysSince(a.lastCheckupDate) - daysSince(b.lastCheckupDate)
      })
    return limit ? list.slice(0, limit) : list
  }, [patients, filter, deferredQuery, limit])

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'high', label: 'High-Risk', count: counts.high },
    { id: 'normal', label: 'Normal', count: counts.normal },
  ]

  return (
    <section aria-labelledby="patient-list-heading" className="flex flex-col gap-3">
      <h2 id="patient-list-heading" className="text-base font-bold text-slate-900">
        {heading}
      </h2>

      <div className="relative">
        <label htmlFor="patient-search" className="sr-only">
          Search patients or symptoms
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="patient-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') e.preventDefault()
          }}
          placeholder="Search patients or symptoms..."
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-blue-100 bg-white pl-12 pr-4 text-base text-slate-900 shadow-sm shadow-blue-100/50 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div role="tablist" aria-label="Filter patients by risk" className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = filter === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(t.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active
                  ? t.id === 'high'
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-blue-100 bg-white text-slate-700 hover:bg-blue-50',
              )}
            >
              {t.label} ({t.count})
            </button>
          )
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length} patients shown
      </p>

      {visible.length ? (
        <ul className="flex flex-col gap-3">
          {visible.map((p) => (
            <li key={p.id}>
              <PatientCard patient={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-white/70 px-6 py-10 text-center">
          <UserX className="size-8 text-slate-400" aria-hidden="true" />
          <p className="font-semibold text-slate-800">No patients found</p>
          <p className="text-sm text-slate-600">Try a different search or filter, or add a new visit.</p>
        </div>
      )}
    </section>
  )
}
