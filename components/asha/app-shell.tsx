'use client'

import { useEffect } from 'react'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { usePatientStore, useUIStore } from '@/lib/store'
import { AppHeader } from './app-header'
import { BottomNav } from './bottom-nav'
import { DashboardView } from './dashboard-view'
import { Modal } from './modal'
import { PatientDetailModal } from './patient-detail-modal'
import { PatientFormModal } from './patient-form-modal'
import { RecordsView } from './records-view'
import { ReportsView } from './reports-view'
import { SettingsView } from './settings-view'
import { VoiceIntakeModal } from './voice-intake-modal'

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading patients">
      <div className="h-52 animate-pulse rounded-3xl bg-white/70" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/70" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-white/70" />
    </div>
  )
}

function DeleteConfirm({ id }: { id: string }) {
  const patient = usePatientStore((s) => s.patients.find((p) => p.id === id))
  const deletePatient = usePatientStore((s) => s.deletePatient)
  const cancelDelete = useUIStore((s) => s.cancelDelete)
  const showToast = useUIStore((s) => s.showToast)
  if (!patient) return null
  return (
    <Modal
      title="Delete patient record?"
      description={`${patient.name}'s record and visit history will be removed.`}
      onClose={cancelDelete}
    >
      <div className="flex gap-3">
        <button
          type="button"
          data-autofocus
          onClick={cancelDelete}
          className="h-12 flex-1 rounded-full border border-slate-200 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50"
        >
          Keep
        </button>
        <button
          type="button"
          onClick={() => {
            cancelDelete()
            void deletePatient(id)
            showToast(`${patient.name} deleted`)
          }}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 text-base font-bold text-white hover:bg-red-700"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </button>
      </div>
    </Modal>
  )
}

export function AppShell() {
  const hydrated = usePatientStore((s) => s.hydrated)
  const init = usePatientStore((s) => s.init)
  const tab = useUIStore((s) => s.tab)
  const voiceOpen = useUIStore((s) => s.voiceOpen)
  const form = useUIStore((s) => s.form)
  const detailId = useUIStore((s) => s.detailId)
  const confirmDeleteId = useUIStore((s) => s.confirmDeleteId)
  const toast = useUIStore((s) => s.toast)

  useEffect(() => {
    init()
  }, [init])

  return (
    <>
      <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 print:hidden">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 pb-32 pt-5">
          {!hydrated ? (
            <LoadingSkeleton />
          ) : tab === 'dashboard' ? (
            <DashboardView />
          ) : tab === 'records' ? (
            <RecordsView />
          ) : tab === 'reports' ? (
            <ReportsView />
          ) : (
            <SettingsView />
          )}
        </main>
        <BottomNav />
      </div>

      {voiceOpen ? <VoiceIntakeModal /> : null}
      {form.open ? <PatientFormModal key={`${form.mode}-${form.patientId ?? 'new'}`} form={form} /> : null}
      {detailId ? <PatientDetailModal id={detailId} /> : null}
      {confirmDeleteId ? <DeleteConfirm id={confirmDeleteId} /> : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 print:hidden">
        {toast ? (
          <p className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in-0 slide-in-from-bottom-2">
            <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
            {toast}
          </p>
        ) : null}
      </div>
    </>
  )
}
