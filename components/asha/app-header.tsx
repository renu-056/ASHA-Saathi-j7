'use client'

import Image from 'next/image'
import { Cloud, CloudOff, Loader2, Settings } from 'lucide-react'
import { usePatientStore, useUIStore } from '@/lib/store'

export function AppHeader() {
  const setTab = useUIStore((s) => s.setTab)
  const syncStatus = usePatientStore((s) => s.syncStatus)
  const syncMessage = usePatientStore((s) => s.syncMessage)

  const SyncIcon = syncStatus === 'syncing' ? Loader2 : syncStatus === 'synced' ? Cloud : CloudOff

  return (
    <header className="sticky top-0 z-30 border-b border-blue-100/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Image
          src="/images/asha-avatar.png"
          alt="ASHA worker profile"
          width={44}
          height={44}
          className="size-11 rounded-full border-2 border-emerald-200 object-cover"
          priority
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight text-slate-900">
            ASHA <span className="text-emerald-600">Saathi</span>
          </h1>
          <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-600">
            <span>Community Health Dashboard</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1" title={syncMessage}>
              <SyncIcon
                className={`size-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''} ${
                  syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'error' ? 'text-amber-600' : 'text-slate-500'
                }`}
                aria-hidden="true"
              />
              <span className="sr-only">{syncMessage}</span>
              <span aria-hidden="true">{syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing' : 'Local'}</span>
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className="flex size-11 items-center justify-center rounded-full border border-blue-100 bg-white text-slate-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          <Settings className="size-5" aria-hidden="true" />
          <span className="sr-only">Open settings</span>
        </button>
      </div>
    </header>
  )
}
