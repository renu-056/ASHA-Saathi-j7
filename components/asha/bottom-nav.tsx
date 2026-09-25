'use client'

import { BarChart3, LayoutDashboard, Settings, Users } from 'lucide-react'
import { useUIStore, type Tab } from '@/lib/store'
import { cn } from '@/lib/utils'

const ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'records', label: 'Patient Records', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const tab = useUIStore((s) => s.tab)
  const setTab = useUIStore((s) => s.setTab)

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(59,130,246,0.25)] backdrop-blur-md print:hidden"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setTab(id)
                  window.scrollTo({ top: 0 })
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 px-1 pb-2.5 pt-2 text-[11px] font-semibold leading-tight transition-colors',
                  active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-emerald-100' : 'bg-transparent',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-center">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
