'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
}

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function Modal({ title, description, onClose, children, footer, className, bodyClassName }: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const firstField = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button')
    firstField?.focus()
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (e.key === 'Escape' && !FIELD_TAGS.has(target.tagName)) {
      e.stopPropagation()
      onCloseRef.current()
      return
    }
    if (e.key === 'Tab' && panelRef.current) {
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 print:hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCloseRef.current()
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-200/60 animate-in slide-in-from-bottom-8 fade-in-0 sm:max-w-lg sm:rounded-3xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-50 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 text-balance">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className={cn('flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
        {footer ? <div className="border-t border-blue-50 bg-slate-50/60 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}
