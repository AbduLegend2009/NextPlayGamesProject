import { CalendarClock, CalendarX2, Calendar, CalendarCheck } from 'lucide-react'
import { PRIORITY_META } from '../../lib/constants'
import { dueLabel, dueUrgency } from '../../lib/dates'
import type { Label, Priority, Task } from '../../lib/types'

/** Three little bars, filled according to priority — like a signal meter. */
export function PriorityIcon({ priority, className = '' }: { priority: Priority; className?: string }) {
  const level = priority === 'high' ? 3 : priority === 'normal' ? 2 : 1
  const color = PRIORITY_META[priority].color
  return (
    <svg viewBox="0 0 12 12" className={`size-3 shrink-0 ${className}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 3.75}
          y={8 - i * 3}
          width={2.5}
          height={3 + i * 3}
          rx={0.75}
          fill={i < level ? color : 'currentColor'}
          opacity={i < level ? 1 : 0.25}
        />
      ))}
    </svg>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted" title={`${PRIORITY_META[priority].label} priority`}>
      <PriorityIcon priority={priority} />
      {PRIORITY_META[priority].label}
    </span>
  )
}

const URGENCY_STYLE = {
  overdue: { cls: 'bg-danger-soft text-danger', Icon: CalendarX2, title: 'Overdue' },
  today: { cls: 'bg-warning-soft text-warning', Icon: CalendarClock, title: 'Due today' },
  soon: { cls: 'bg-warning-soft text-warning', Icon: CalendarClock, title: 'Due soon' },
  later: { cls: 'bg-sunken text-ink-muted', Icon: Calendar, title: 'Due date' },
  done: { cls: 'bg-sunken text-ink-faint', Icon: CalendarCheck, title: 'Completed' },
} as const

/** Due date pill whose color shows how urgent the task is. */
export function DueBadge({ task }: { task: Pick<Task, 'due_date' | 'status'> }) {
  const urgency = dueUrgency(task)
  if (!urgency) return null
  const { cls, Icon, title } = URGENCY_STYLE[urgency]
  return (
    <span className={`inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium ${cls}`} title={title}>
      <Icon className="size-3" />
      {dueLabel(task)}
    </span>
  )
}

export function LabelPill({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex h-5 max-w-full items-center gap-1 rounded-md border border-line bg-surface px-1.5 text-[11px] font-medium text-ink-muted"
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="-mr-0.5 text-ink-faint hover:text-ink" aria-label={`Remove ${label.name}`}>
          ×
        </button>
      )}
    </span>
  )
}
