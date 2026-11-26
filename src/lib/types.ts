// Shapes of the data the app works with. They mirror supabase/schema.sql.

export type Status = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'low' | 'normal' | 'high'

/** A task as the app uses it, with its link-table ids flattened in. */
export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  /** ISO date string "YYYY-MM-DD", or null when there is no due date. */
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  assigneeIds: string[]
  labelIds: string[]
  commentCount: number
}

export interface Member {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Comment {
  id: string
  task_id: string
  body: string
  created_at: string
}

export type ActivityKind =
  | 'created'
  | 'status'
  | 'title'
  | 'priority'
  | 'due_date'
  | 'description'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'

export interface Activity {
  id: string
  task_id: string
  kind: ActivityKind
  meta: Record<string, string | null>
  created_at: string
}

/** Fields the user can fill in when creating or editing a task. */
export interface TaskDraft {
  title: string
  description: string
  status: Status
  priority: Priority
  due_date: string | null
  assigneeIds: string[]
  labelIds: string[]
}

/** The editable columns of the tasks table. */
export type TaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position'>
>

export interface Filters {
  search: string
  priorities: Priority[]
  assigneeIds: string[]
  labelIds: string[]
}
