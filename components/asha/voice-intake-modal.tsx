'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Keyboard, Mic, MicOff, Square, X } from 'lucide-react'
import { extractFromTranscript, highlightSegments } from '@/lib/extract'
import { usePatientStore, useUIStore, type VoiceLang } from '@/lib/store'
import { cn } from '@/lib/utils'

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. You can type the visit notes below instead.',
  'service-not-allowed': 'Voice service is not available here. Please type the visit notes below.',
  'no-speech': 'We could not hear anything. Tap the mic and try again.',
  network: 'Voice needs internet. Please type the visit notes below.',
  'audio-capture': 'No microphone found. Please type the visit notes below.',
}

const LANGS: { id: VoiceLang; label: string }[] = [
  { id: 'en-IN', label: 'English' },
  { id: 'hi-IN', label: 'हिंदी' },
]

export function VoiceIntakeModal() {
  const closeVoice = useUIStore((s) => s.closeVoice)
  const openForm = useUIStore((s) => s.openForm)
  const voiceLang = usePatientStore((s) => s.voiceLang)
  const setVoiceLang = usePatientStore((s) => s.setVoiceLang)

  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [supported] = useState(() => Boolean(getRecognitionCtor()))
  const recRef = useRef<RecognitionLike | null>(null)
  const wantListeningRef = useRef(false)

  const transcript = `${finalText}${interim ? ` ${interim}` : ''}`.trim()
  const extraction = useMemo(() => extractFromTranscript(transcript), [transcript])
  const segments = useMemo(() => highlightSegments(transcript, extraction.highlights), [transcript, extraction.highlights])

  function start(lang: VoiceLang = voiceLang) {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setTyping(true)
      return
    }
    recRef.current?.abort()
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalChunk += r[0].transcript
        else interimChunk += r[0].transcript
      }
      if (finalChunk) setFinalText((t) => `${t} ${finalChunk}`.trim())
      setInterim(interimChunk)
    }
    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      setError(ERROR_TEXT[e.error] ?? 'Voice recording stopped. You can type the notes below.')
      if (e.error !== 'no-speech') {
        wantListeningRef.current = false
        setTyping(true)
      }
    }
    rec.onend = () => {
      if (wantListeningRef.current) {
        try {
          rec.start()
          return
        } catch {}
      }
      setListening(false)
      setInterim('')
    }
    try {
      setError(null)
      wantListeningRef.current = true
      rec.start()
      recRef.current = rec
      setListening(true)
    } catch {
      setError('Could not start the microphone. Please type the notes below.')
      setTyping(true)
    }
  }

  function stop() {
    wantListeningRef.current = false
    recRef.current?.stop()
    setListening(false)
  }

  useEffect(() => {
    if (supported) start()
    else setTyping(true)
    return () => {
      wantListeningRef.current = false
      recRef.current?.abort()
    }
    // Start once on mount; later restarts are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  function confirm() {
    stop()
    const { draft } = extractFromTranscript(transcript)
    openForm({ mode: 'verify', initial: draft, transcript })
  }

  function switchLang(lang: VoiceLang) {
    setVoiceLang(lang)
    if (listening) start(lang)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-title"
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement).tagName
        if (e.key === 'Escape' && tag !== 'TEXTAREA') {
          stop()
          closeVoice()
        }
      }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-100 animate-in fade-in-0 print:hidden"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-6 pt-4">
        <div className="flex items-center justify-between">
          <div role="group" aria-label="Recognition language" className="flex rounded-full border border-blue-100 bg-white p-1 shadow-sm">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={voiceLang === l.id}
                onClick={() => switchLang(l.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                  voiceLang === l.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              stop()
              closeVoice()
            }}
            className="flex size-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Cancel recording</span>
          </button>
        </div>

        <div className="flex flex-col items-center pt-8 text-center">
          <button
            type="button"
            onClick={() => (listening ? stop() : start())}
            aria-label={listening ? 'Pause listening' : 'Start listening'}
            className="relative flex size-44 items-center justify-center rounded-full"
          >
            {listening ? (
              <>
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-mic-pulse" aria-hidden="true" />
                <span
                  className="absolute inset-0 rounded-full bg-emerald-400/25 animate-mic-pulse [animation-delay:0.7s]"
                  aria-hidden="true"
                />
                <span
                  className="absolute inset-0 rounded-full bg-emerald-400/20 animate-mic-pulse [animation-delay:1.4s]"
                  aria-hidden="true"
                />
              </>
            ) : null}
            <span
              className={cn(
                'relative flex size-32 items-center justify-center rounded-full text-white shadow-2xl transition-colors',
                listening ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-400 shadow-slate-400/40',
              )}
            >
              {listening ? <Mic className="size-14" aria-hidden="true" /> : <MicOff className="size-14" aria-hidden="true" />}
            </span>
          </button>

          <div className="mt-6 flex h-8 items-center gap-1" aria-hidden="true">
            {Array.from({ length: 13 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'w-1.5 rounded-full bg-emerald-500',
                  listening ? 'h-8 animate-wave-bar' : 'h-1.5 opacity-40',
                )}
                style={listening ? { animationDelay: `${(i % 5) * 0.12}s` } : undefined}
              />
            ))}
          </div>

          <h2 id="voice-title" className="mt-4 text-2xl font-extrabold text-slate-900">
            {listening ? 'Listening... Speak now.' : 'Paused'}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-slate-600 text-pretty">
            {'Say the patient name, age, gender and symptoms. e.g. "Patient name is Meena Kumari, 32 years, female, fever and cough"'}
          </p>
        </div>

        <section aria-label="Live transcript" className="mt-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-lg shadow-blue-100/60">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Live transcript</h3>
            <button
              type="button"
              onClick={() => setTyping((t) => !t)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Keyboard className="size-3.5" aria-hidden="true" />
              {typing ? 'Hide typing' : 'Type instead'}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {error}
            </p>
          ) : null}
          {!supported ? (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              Voice input is not supported in this browser. Please type the visit notes.
            </p>
          ) : null}

          {typing ? (
            <>
              <label htmlFor="voice-typed" className="sr-only">
                Visit notes
              </label>
              <textarea
                id="voice-typed"
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                rows={3}
                placeholder="Type: Name is Meena Kumari, 32 years, female, high fever"
                className="w-full resize-none rounded-xl border border-blue-100 p-3 text-base text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </>
          ) : null}

          <p className="min-h-16 text-lg leading-relaxed text-slate-800" aria-live="polite">
            {transcript ? (
              segments.map((seg, i) =>
                seg.hit ? (
                  <mark key={i} className="rounded-md bg-emerald-100 px-1 font-semibold text-emerald-900">
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )
            ) : (
              <span className="text-slate-400">Your words will appear here…</span>
            )}
          </p>

          {extraction.draft.name || extraction.draft.age || extraction.draft.symptoms ? (
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-blue-50 pt-3 text-xs">
              <div>
                <dt className="font-semibold text-slate-500">Name</dt>
                <dd className="truncate font-bold text-slate-900">{extraction.draft.name || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Age</dt>
                <dd className="font-bold text-slate-900">{extraction.draft.age || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Risk</dt>
                <dd className={cn('font-bold', extraction.draft.riskFlag ? 'text-red-600' : 'text-emerald-700')}>
                  {extraction.draft.riskFlag ? 'High-Risk' : 'Normal'}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
          <button
            type="button"
            onClick={stop}
            disabled={!listening}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 disabled:opacity-50"
          >
            <Square className="size-5 fill-current" aria-hidden="true" />
            Stop
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-emerald-600 text-lg font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
          >
            <Check className="size-5" aria-hidden="true" />
            Confirm & Edit
          </button>
        </div>
      </div>
    </div>
  )
}
