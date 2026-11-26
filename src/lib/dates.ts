import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { Task } from './types'

export type Urgency = 'overdue' | 'today' | 'soon' | 'later' | 'done'

/**
 * How urgent a task's due date is. parseISO reads "2026-11-25" as midnight in
 * the user's own time zone, so "today" means the user's today.
 */
export function dueUrgency(task: Pick<Task, 'due_date' | 'status'>, now = new Date()): Urgency | null {
  if (!task.due_date) return null
  if (task.status === 'done') return 'done'
  const days = differenceInCalendarDays(parseISO(task.due_date), now)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 2) return 'soon'
  return 'later'
}

/** Short, human label for a due date: "Today", "Tomorrow", "2d overdue", "Dec 3". */
export function dueLabel(task: Pick<Task, 'due_date' | 'status'>, now = new Date()): string {
  if (!task.due_date) return ''
  const date = parseISO(task.due_date)
  const days = differenceInCalendarDays(date, now)
  if (task.status !== 'done') {
    if (days < 0) return `${-days}d overdue`
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
  }
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy')
}

/** "3 minutes ago", for comments and activity. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 45_000) return 'just now'
  return `${formatDistanceToNowStrict(new Date(iso))} ago`
}

export function fullTimestamp(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy 'at' h:mm a")
}
