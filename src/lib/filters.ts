import type { Filters, Task } from './types'

export const EMPTY_FILTERS: Filters = { search: '', priorities: [], assigneeIds: [], labelIds: [] }

export function hasActiveFilters(f: Filters): boolean {
  return Boolean(f.search.trim() || f.priorities.length || f.assigneeIds.length || f.labelIds.length)
}

/**
 * Does a task pass the current filters? Within one filter group any selected
 * option matches (OR); across groups every group must match (AND). So
 * "High or Normal" + "Bug" means: high-or-normal tasks that are labelled Bug.
 */
export function matchesFilters(task: Task, f: Filters): boolean {
  const q = f.search.trim().toLowerCase()
  if (q && !task.title.toLowerCase().includes(q)) return false
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false
  if (f.assigneeIds.length && !task.assigneeIds.some((id) => f.assigneeIds.includes(id))) return false
  if (f.labelIds.length && !task.labelIds.some((id) => f.labelIds.includes(id))) return false
  return true
}
