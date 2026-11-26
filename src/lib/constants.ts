import type { Priority, Status } from './types'

export interface ColumnDef {
  id: Status
  title: string
  /** Accent color for the column's dot and drop highlight. */
  color: string
  emptyHint: string
}

export const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', color: '#8b8d98', emptyHint: 'Nothing queued up. Add a task to get started.' },
  { id: 'in_progress', title: 'In Progress', color: '#e5a000', emptyHint: 'Drag a task here when you start on it.' },
  { id: 'in_review', title: 'In Review', color: '#8e4ec6', emptyHint: 'Work waiting for a second pair of eyes lands here.' },
  { id: 'done', title: 'Done', color: '#30a46c', emptyHint: 'Finished work shows up here. You got this.' },
]

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

export const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'high', label: 'High', color: '#e5484d' },
  { id: 'normal', label: 'Normal', color: '#e5a000' },
  { id: 'low', label: 'Low', color: '#8b8d98' },
]

export const PRIORITY_META = Object.fromEntries(PRIORITIES.map((p) => [p.id, p])) as Record<
  Priority,
  (typeof PRIORITIES)[number]
>

/** Swatches offered when creating a member or label. */
export const SWATCHES = [
  '#6e56cf', // violet
  '#3e63dd', // indigo
  '#0090ff', // blue
  '#12a594', // teal
  '#30a46c', // green
  '#e5a000', // amber
  '#f76b15', // orange
  '#e5484d', // red
  '#d6409f', // pink
  '#8b8d98', // gray
]

/** Gap used between card positions so cards can be dropped in between. */
export const POSITION_GAP = 1024
