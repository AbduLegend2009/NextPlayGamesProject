import { useMemo, useState, type FormEvent } from 'react'
import { Plus, X, LayoutGrid, RotateCcw } from 'lucide-react'
import { useBoard } from '../../hooks/useBoard'
import { SWATCHES } from '../../lib/constants'
import { dueUrgency } from '../../lib/dates'
import { Avatar } from '../ui/Avatar'

/** Logo mark: three bars of decreasing height, like columns of a board. */
export function Logo() {
  return (
    <span className="flex size-7 items-center justify-center rounded-lg bg-accent">
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
        <rect x="2" y="3" width="3" height="10" rx="1" fill="white" />
        <rect x="6.5" y="3" width="3" height="7" rx="1" fill="white" fillOpacity=".75" />
        <rect x="11" y="3" width="3" height="4.5" rx="1" fill="white" fillOpacity=".5" />
      </svg>
    </span>
  )
}

export function Sidebar({ guestId, onStartFresh }: { guestId: string; onStartFresh: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-4 scroll-thin">
      <div className="flex items-center gap-2.5 px-1">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Flowboard</span>
      </div>

      <nav>
        <span className="flex items-center gap-2 rounded-lg bg-hover px-2.5 py-1.5 text-[13px] font-medium text-ink">
          <LayoutGrid className="size-4 text-ink-muted" />
          My board
        </span>
      </nav>

      <Stats />
      <TeamSection />
      <LabelSection />

      <div className="mt-auto rounded-xl border border-line px-3 py-2.5">
        <p className="text-xs font-medium text-ink">Guest session</p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint" title={guestId}>
          {guestId.slice(0, 8)}…
        </p>
        <button onClick={onStartFresh} className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink">
          <RotateCcw className="size-3" />
          Start a new guest board
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h3 className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{children}</h3>
      {action}
    </div>
  )
}

/** Board summary: totals, completion and overdue counts. */
function Stats() {
  const { tasks } = useBoard()
  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done').length
    const overdue = tasks.filter((t) => dueUrgency(t) === 'overdue').length
    const dueSoon = tasks.filter((t) => ['today', 'soon'].includes(dueUrgency(t) ?? '')).length
    return { total: tasks.length, done, overdue, dueSoon, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
  }, [tasks])

  return (
    <section>
      <SectionTitle>Overview</SectionTitle>
      <div className="rounded-xl border border-line bg-surface p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs text-ink-muted">Completed</span>
          <span className="text-xs font-semibold tabular-nums">{stats.pct}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-valuenow={stats.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tasks completed"
        >
          <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${stats.pct}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Total', stats.total, 'text-ink'],
            ['Done', stats.done, 'text-success'],
            ['Overdue', stats.overdue, stats.overdue ? 'text-danger' : 'text-ink'],
          ].map(([label, value, color]) => (
            // flex-col-reverse shows the number above its label while keeping
            // the HTML order a definition list requires (term, then value).
            <div key={label} className="flex flex-col-reverse rounded-lg bg-sunken py-1.5">
              <dt className="text-[10px] text-ink-faint">{label}</dt>
              <dd className={`text-base font-semibold tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
        {stats.dueSoon > 0 && (
          <p className="mt-2.5 text-[11px] text-warning">
            {stats.dueSoon} task{stats.dueSoon === 1 ? '' : 's'} due in the next 2 days
          </p>
        )}
      </div>
    </section>
  )
}

/** Inline form: a name field plus color swatches. Used for members and labels. */
function AddForm({
  placeholder,
  onAdd,
  onCancel,
}: {
  placeholder: string
  onAdd: (name: string, color: string) => Promise<unknown>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  // Passing a function means the random pick happens only once, on first render.
  const [color, setColor] = useState(() => SWATCHES[Math.floor(Math.random() * SWATCHES.length)])
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onAdd(name, color)
      setName('')
      onCancel()
    } catch {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="animate-pop-in mt-2 rounded-xl border border-line bg-surface p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        maxLength={60}
        placeholder={placeholder}
        className="input h-8 text-[13px]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`size-5 rounded-full transition-transform ${c === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-surface' : 'hover:scale-110'}`}
            style={{ backgroundColor: c, ['--tw-ring-color' as string]: c }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <button type="button" onClick={onCancel} className="btn-ghost h-7 px-2">
          Cancel
        </button>
        <button type="submit" disabled={!name.trim() || busy} className="btn-primary h-7 px-2.5">
          Add
        </button>
      </div>
    </form>
  )
}

function TeamSection() {
  const { members, tasks, addMember, removeMember } = useBoard()
  const [adding, setAdding] = useState(false)
  return (
    <section>
      <SectionTitle
        action={
          <button onClick={() => setAdding(true)} className="rounded p-0.5 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Add team member">
            <Plus className="size-3.5" />
          </button>
        }
      >
        Team
      </SectionTitle>
      {members.length === 0 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-line-strong px-3 py-3 text-left text-xs text-ink-faint hover:border-accent/50 hover:text-ink-muted"
        >
          Add teammates so you can assign tasks to them.
        </button>
      )}
      <ul className="space-y-0.5">
        {members.map((m) => {
          const open = tasks.filter((t) => t.assigneeIds.includes(m.id) && t.status !== 'done').length
          return (
            <li key={m.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-hover">
              <Avatar member={m} size="sm" />
              <span className="flex-1 truncate text-[13px]">{m.name}</span>
              <span className="text-[11px] text-ink-faint tabular-nums group-hover:hidden" title="Open tasks">
                {open}
              </span>
              <button
                onClick={() => removeMember(m.id)}
                className="hidden rounded p-0.5 text-ink-faint group-hover:block hover:text-danger focus:block"
                aria-label={`Remove ${m.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
      {adding && <AddForm placeholder="Name" onAdd={addMember} onCancel={() => setAdding(false)} />}
    </section>
  )
}

function LabelSection() {
  const { labels, tasks, addLabel, removeLabel } = useBoard()
  const [adding, setAdding] = useState(false)
  return (
    <section>
      <SectionTitle
        action={
          <button onClick={() => setAdding(true)} className="rounded p-0.5 text-ink-faint hover:bg-hover hover:text-ink" aria-label="Add label">
            <Plus className="size-3.5" />
          </button>
        }
      >
        Labels
      </SectionTitle>
      {labels.length === 0 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-line-strong px-3 py-3 text-left text-xs text-ink-faint hover:border-accent/50 hover:text-ink-muted"
        >
          Create labels like “Bug” or “Feature” to group work.
        </button>
      )}
      <ul className="space-y-0.5">
        {labels.map((l) => (
          <li key={l.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-hover">
            <span className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="flex-1 truncate text-[13px]">{l.name}</span>
            <span className="text-[11px] text-ink-faint tabular-nums group-hover:hidden">
              {tasks.filter((t) => t.labelIds.includes(l.id)).length}
            </span>
            <button
              onClick={() => removeLabel(l.id)}
              className="hidden rounded p-0.5 text-ink-faint group-hover:block hover:text-danger focus:block"
              aria-label={`Delete label ${l.name}`}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {adding && <AddForm placeholder="Label name" onAdd={addLabel} onCancel={() => setAdding(false)} />}
    </section>
  )
}
