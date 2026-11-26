import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  FileText,
  Pencil,
  Signal,
  Tag,
  UserRoundMinus,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { PRIORITY_META, STATUS_LABEL } from '../../lib/constants'
import { fullTimestamp, timeAgo } from '../../lib/dates'
import type { Activity, Priority, Status } from '../../lib/types'

const statusName = (s: string | null | undefined) => (s ? (STATUS_LABEL[s as Status] ?? s) : '—')
const priorityName = (p: string | null | undefined) => (p ? (PRIORITY_META[p as Priority]?.label ?? p) : '—')
const dateName = (d: string | null | undefined) => (d ? format(parseISO(d), 'MMM d') : 'none')

/** Turn one activity row into an icon and a sentence. */
function describe(a: Activity): { Icon: LucideIcon; text: React.ReactNode } {
  const m = a.meta
  const b = (s: React.ReactNode) => <span className="font-medium text-ink">{s}</span>
  switch (a.kind) {
    case 'created':
      return { Icon: CirclePlus, text: <>Created in {b(statusName(m.status))}</> }
    case 'status':
      return {
        Icon: ArrowRight,
        text: (
          <>
            Moved from {b(statusName(m.from))} → {b(statusName(m.to))}
          </>
        ),
      }
    case 'title':
      return { Icon: Pencil, text: <>Renamed to {b(`“${m.to}”`)}</> }
    case 'priority':
      return {
        Icon: Signal,
        text: (
          <>
            Priority {b(priorityName(m.from))} → {b(priorityName(m.to))}
          </>
        ),
      }
    case 'due_date':
      return {
        Icon: CalendarDays,
        text: m.to ? <>Due date set to {b(dateName(m.to))}</> : <>Due date removed</>,
      }
    case 'description':
      return { Icon: FileText, text: <>Edited the description</> }
    case 'assignee_added':
      return { Icon: UserRoundPlus, text: <>Assigned {b(m.name ?? 'a removed member')}</> }
    case 'assignee_removed':
      return { Icon: UserRoundMinus, text: <>Unassigned {b(m.name ?? 'a removed member')}</> }
    case 'label_added':
      return { Icon: Tag, text: <>Added label {b(m.name ?? 'a deleted label')}</> }
    case 'label_removed':
      return { Icon: Tag, text: <>Removed label {b(m.name ?? 'a deleted label')}</> }
    default:
      return { Icon: Pencil, text: <>Updated the task</> }
  }
}

/** A vertical timeline: newest at the bottom, like a chat log. */
export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <ol className="relative space-y-3.5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line">
      {items.map((a) => {
        const { Icon, text } = describe(a)
        return (
          <li key={a.id} className="relative flex items-start gap-3">
            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
              <Icon className="size-3 text-ink-muted" />
            </span>
            <p className="pt-0.5 text-[13px] leading-snug text-ink-muted">
              {text}
              <time dateTime={a.created_at} title={fullTimestamp(a.created_at)} className="text-ink-faint">
                {' · '}
                {timeAgo(a.created_at)}
              </time>
            </p>
          </li>
        )
      })}
    </ol>
  )
}
