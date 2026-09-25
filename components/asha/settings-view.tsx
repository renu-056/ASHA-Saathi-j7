'use client'

import { useState } from 'react'
import { Cloud, CloudOff, Languages, Loader2, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { usePatientStore, useUIStore, type VoiceLang } from '@/lib/store'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const syncStatus = usePatientStore((s) => s.syncStatus)
  const syncMessage = usePatientStore((s) => s.syncMessage)
  const syncNow = usePatientStore((s) => s.syncNow)
  const voiceLang = usePatientStore((s) => s.voiceLang)
  const setVoiceLang = usePatientStore((s) => s.setVoiceLang)
  const resetToSamples = usePatientStore((s) => s.resetToSamples)
  const showToast = useUIStore((s) => s.showToast)
  const [confirmReset, setConfirmReset] = useState(false)

  const langs: { id: VoiceLang; label: string; hint: string }[] = [
    { id: 'en-IN', label: 'English (India)', hint: 'Best for English visit notes' },
    { id: 'hi-IN', label: 'हिंदी (Hindi)', hint: 'हिंदी में बोलें' },
  ]

  const card = 'rounded-2xl border border-blue-100 bg-white p-5 shadow-md shadow-blue-100/50'

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold text-slate-900">Settings</h2>

      <section aria-labelledby="sync-heading" className={card}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              syncStatus === 'synced' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-amber-50 text-amber-700',
            )}
          >
            {syncStatus === 'synced' ? <Cloud className="size-5" aria-hidden="true" /> : <CloudOff className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="sync-heading" className="font-bold text-slate-900">
              Cloud sync
            </h3>
            <p className="text-sm text-slate-600 break-words" aria-live="polite">
              {syncMessage}
            </p>
            {!isSupabaseConfigured ? (
              <p className="mt-1 text-xs text-slate-500">
                Add your Supabase publishable key in project settings to enable cloud backup.
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await syncNow()
            showToast('Sync finished')
          }}
          disabled={syncStatus === 'syncing' || !isSupabaseConfigured}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-200 text-base font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {syncStatus === 'syncing' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-5" aria-hidden="true" />}
          Sync now
        </button>
      </section>

      <section aria-labelledby="lang-heading" className={card}>
        <h3 id="lang-heading" className="flex items-center gap-2 font-bold text-slate-900">
          <Languages className="size-5 text-blue-700" aria-hidden="true" />
          Voice recording language
        </h3>
        <div role="radiogroup" aria-labelledby="lang-heading" className="mt-3 flex flex-col gap-2">
          {langs.map((l) => (
            <label
              key={l.id}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-emerald-100',
                voiceLang === l.id ? 'border-emerald-500 bg-emerald-50' : 'border-blue-100 hover:bg-blue-50',
              )}
            >
              <span>
                <span className="block font-semibold text-slate-900">{l.label}</span>
                <span className="block text-sm text-slate-600">{l.hint}</span>
              </span>
              <input
                type="radio"
                name="voice-lang"
                checked={voiceLang === l.id}
                onChange={() => setVoiceLang(l.id)}
                className="size-5 accent-emerald-600"
              />
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="data-heading" className={card}>
        <h3 id="data-heading" className="flex items-center gap-2 font-bold text-slate-900">
          <ShieldCheck className="size-5 text-blue-700" aria-hidden="true" />
          Data on this device
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Records are kept on this phone so the app works even with a slow network, and backed up to the cloud when online.
        </p>
        {confirmReset ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="h-12 flex-1 rounded-full border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                resetToSamples()
                setConfirmReset(false)
                showToast('Local data reset to sample patients')
              }}
              className="h-12 flex-1 rounded-full bg-red-600 font-bold text-white hover:bg-red-700"
            >
              Yes, reset
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-red-200 text-base font-bold text-red-700 hover:bg-red-50"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            Reset local data to samples
          </button>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-slate-500">ASHA Saathi · Built for India’s frontline health heroes</p>
    </div>
  )
}
