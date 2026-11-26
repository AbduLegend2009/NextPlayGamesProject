import { useState } from 'react'
import { AlertTriangle, KeyRound, Loader2, RefreshCw, Sparkles, Plus } from 'lucide-react'
import { COLUMNS } from '../../lib/constants'
import { Logo } from './Sidebar'

/** Full-page centered message used for setup, sign-in and fatal errors. */
function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="animate-pop-in w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-card">{children}</div>
    </main>
  )
}

export function SetupScreen() {
  return (
    <CenteredCard>
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent-soft">
        <KeyRound className="size-5 text-accent" />
      </div>
      <h1 className="text-lg font-semibold">Connect Supabase</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Flowboard needs a Supabase project. Copy <code className="rounded bg-sunken px-1 text-[13px]">.env.example</code> to{' '}
        <code className="rounded bg-sunken px-1 text-[13px]">.env</code>, fill in your project URL and anon key, then restart the dev
        server.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-sunken p-3 text-xs text-ink-muted">
        VITE_SUPABASE_URL=https://xxxx.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=eyJ…
      </pre>
    </CenteredCard>
  )
}

export function SigningInScreen() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4">
      <Logo />
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="size-4 animate-spin" />
        Setting up your guest workspace…
      </p>
    </main>
  )
}

export function ErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false)
  return (
    <CenteredCard>
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-danger-soft">
        <AlertTriangle className="size-5 text-danger" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed break-words text-ink-muted">{message}</p>
      <button
        onClick={async () => {
          setRetrying(true)
          await onRetry()
          setRetrying(false)
        }}
        disabled={retrying}
        className="btn-outline mt-5"
      >
        <RefreshCw className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} />
        Try again
      </button>
    </CenteredCard>
  )
}

/** Grey placeholder columns and cards shown while the board loads. */
export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-3 overflow-hidden px-4 pb-4 sm:px-6" aria-busy="true" aria-label="Loading board">
      {COLUMNS.map((c, i) => (
        <div key={c.id} className="w-[85vw] max-w-[320px] shrink-0 rounded-2xl bg-sunken/70 p-3 sm:w-[300px]">
          <div className="mb-4 flex items-center gap-2 px-0.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-[13px] font-semibold text-ink-muted">{c.title}</span>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="rounded-xl bg-surface p-3 shadow-card">
                <div className="h-3 w-4/5 animate-pulse rounded bg-hover" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-hover" />
                <div className="mt-4 flex justify-between">
                  <div className="h-4 w-14 animate-pulse rounded bg-hover" />
                  <div className="size-5 animate-pulse rounded-full bg-hover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Shown above an empty board on the very first visit. */
export function WelcomeBanner({ onSeed, onCreate }: { onSeed: () => Promise<void>; onCreate: () => void }) {
  const [seeding, setSeeding] = useState(false)
  return (
    <div className="animate-pop-in mx-4 mb-3 flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent-soft/60 p-4 sm:mx-6 sm:flex-row sm:items-center">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
        <Sparkles className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Welcome to your board</p>
        <p className="text-xs leading-relaxed text-ink-muted">
          This board is private to your guest session. Create your first task, or load a sample project to explore.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSeeding(true)
            await onSeed()
            setSeeding(false)
          }}
          disabled={seeding}
          className="btn-outline"
        >
          {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Load sample tasks
        </button>
        <button onClick={onCreate} className="btn-primary">
          <Plus className="size-3.5" />
          New task
        </button>
      </div>
    </div>
  )
}
