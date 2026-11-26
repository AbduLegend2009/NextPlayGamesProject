// Every call to the database lives in this file, so the rest of the app never
// talks to Supabase directly. Each function throws an Error on failure; the
// caller decides how to show it.

import { supabase } from './supabase'
import type { Activity, Comment, Label, Member, Task, TaskDraft, TaskPatch } from './types'

/** Turn a Supabase error object into a normal JavaScript Error. */
function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

// The shape a task row comes back in when we also ask for its links.
interface TaskRow extends Omit<Task, 'assigneeIds' | 'labelIds' | 'commentCount'> {
  task_assignees: { member_id: string }[]
  task_labels: { label_id: string }[]
  comments: { count: number }[]
}

// One request fetches tasks plus their assignee ids, label ids and comment
// count, using Supabase's embedded-relationship syntax.
const TASK_SELECT = '*, task_assignees(member_id), task_labels(label_id), comments(count)'

function toTask(row: TaskRow): Task {
  const { task_assignees, task_labels, comments, ...rest } = row
  return {
    ...rest,
    assigneeIds: task_assignees.map((a) => a.member_id),
    labelIds: task_labels.map((l) => l.label_id),
    commentCount: comments[0]?.count ?? 0,
  }
}

// ---------------------------------------------------------------- loading

export async function fetchBoard(): Promise<{ tasks: Task[]; members: Member[]; labels: Label[] }> {
  // Run the three queries at the same time instead of one after another.
  // RLS makes sure each query only returns the current user's rows.
  const [tasks, members, labels] = await Promise.all([
    supabase.from('tasks').select(TASK_SELECT).order('position'),
    supabase.from('members').select('id, name, color, created_at').order('created_at'),
    supabase.from('labels').select('id, name, color, created_at').order('created_at'),
  ])
  fail(tasks.error)
  fail(members.error)
  fail(labels.error)
  return {
    tasks: (tasks.data as unknown as TaskRow[]).map(toTask),
    members: members.data,
    labels: labels.data,
  }
}

export async function fetchTask(id: string): Promise<Task> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).single()
  fail(error)
  return toTask(data as unknown as TaskRow)
}

// ---------------------------------------------------------------- tasks

export async function createTask(draft: TaskDraft, position: number): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      due_date: draft.due_date,
      position,
    })
    .select('id')
    .single()
  fail(error)

  // Links go in after the task exists, because they reference its id.
  await addLinks(data.id, draft.assigneeIds, draft.labelIds)
  return fetchTask(data.id)
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const { error } = await supabase.from('tasks').update(patch).eq('id', id)
  fail(error)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  fail(error)
}

async function addLinks(taskId: string, memberIds: string[], labelIds: string[]) {
  const writes = []
  if (memberIds.length) {
    writes.push(
      supabase.from('task_assignees').insert(memberIds.map((member_id) => ({ task_id: taskId, member_id }))),
    )
  }
  if (labelIds.length) {
    writes.push(
      supabase.from('task_labels').insert(labelIds.map((label_id) => ({ task_id: taskId, label_id }))),
    )
  }
  for (const { error } of await Promise.all(writes)) fail(error)
}

/** Make a task's assignees exactly `next`, adding and removing as needed. */
export async function setAssignees(taskId: string, current: string[], next: string[]) {
  const added = next.filter((id) => !current.includes(id))
  const removed = current.filter((id) => !next.includes(id))
  if (removed.length) {
    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .in('member_id', removed)
    fail(error)
  }
  await addLinks(taskId, added, [])
}

/** Make a task's labels exactly `next`. */
export async function setLabels(taskId: string, current: string[], next: string[]) {
  const added = next.filter((id) => !current.includes(id))
  const removed = current.filter((id) => !next.includes(id))
  if (removed.length) {
    const { error } = await supabase.from('task_labels').delete().eq('task_id', taskId).in('label_id', removed)
    fail(error)
  }
  await addLinks(taskId, [], added)
}

// ---------------------------------------------------------------- members & labels

export async function createMember(name: string, color: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ name: name.trim(), color })
    .select('id, name, color, created_at')
    .single()
  fail(error)
  return data
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id)
  fail(error)
}

export async function createLabel(name: string, color: string): Promise<Label> {
  const { data, error } = await supabase
    .from('labels')
    .insert({ name: name.trim(), color })
    .select('id, name, color, created_at')
    .single()
  // 23505 is Postgres's "unique violation" code: the label name already exists.
  if (error?.code === '23505') throw new Error(`A label called "${name.trim()}" already exists.`)
  fail(error)
  return data
}

export async function deleteLabel(id: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', id)
  fail(error)
}

// ---------------------------------------------------------------- comments & activity

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, task_id, body, created_at')
    .eq('task_id', taskId)
    .order('created_at')
  fail(error)
  return data
}

export async function addComment(taskId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, body: body.trim() })
    .select('id, task_id, body, created_at')
    .single()
  fail(error)
  return data
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  fail(error)
}

export async function fetchActivity(taskId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('id, task_id, kind, meta, created_at')
    .eq('task_id', taskId)
    .order('created_at')
  fail(error)
  return data as Activity[]
}

// ---------------------------------------------------------------- sample data

/** Fill an empty board with example members, labels and tasks. */
export async function seedSampleBoard(): Promise<void> {
  const memberRes = await supabase
    .from('members')
    .insert([
      { name: 'Maya Chen', color: '#6e56cf' },
      { name: 'Omar Haddad', color: '#12a594' },
      { name: 'Sofia Rossi', color: '#f76b15' },
    ])
    .select('id')
  fail(memberRes.error)
  const labelRes = await supabase
    .from('labels')
    .insert([
      { name: 'Bug', color: '#e5484d' },
      { name: 'Feature', color: '#3e63dd' },
      { name: 'Design', color: '#d6409f' },
    ])
    .select('id')
  fail(labelRes.error)

  const [maya, omar, sofia] = memberRes.data.map((m) => m.id)
  const [bug, feature, design] = labelRes.data.map((l) => l.id)
  const day = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  const samples: (Omit<TaskDraft, 'description'> & { description?: string })[] = [
    { title: 'Design the level-select screen', status: 'todo', priority: 'normal', due_date: day(6), assigneeIds: [sofia], labelIds: [design], description: 'Card layout for each world, with locked and unlocked states.' },
    { title: 'Add controller support for menus', status: 'todo', priority: 'low', due_date: null, assigneeIds: [], labelIds: [feature] },
    { title: 'Crash when pausing during a cutscene', status: 'todo', priority: 'high', due_date: day(-1), assigneeIds: [omar], labelIds: [bug], description: 'Repro: start world 2, open pause menu in the first 3 seconds of the intro.' },
    { title: 'Daily rewards backend', status: 'in_progress', priority: 'high', due_date: day(1), assigneeIds: [omar, maya], labelIds: [feature] },
    { title: 'New onboarding illustrations', status: 'in_progress', priority: 'normal', due_date: day(9), assigneeIds: [sofia], labelIds: [design] },
    { title: 'Leaderboard pagination', status: 'in_review', priority: 'normal', due_date: day(2), assigneeIds: [maya], labelIds: [feature] },
    { title: 'Fix audio desync on low-end devices', status: 'done', priority: 'high', due_date: null, assigneeIds: [omar], labelIds: [bug] },
    { title: 'Set up analytics events', status: 'done', priority: 'low', due_date: null, assigneeIds: [maya], labelIds: [] },
  ]

  // Insert all tasks in one request, then all their links in two more.
  const taskRes = await supabase
    .from('tasks')
    .insert(
      samples.map((s, i) => ({
        title: s.title,
        description: s.description ?? null,
        status: s.status,
        priority: s.priority,
        due_date: s.due_date,
        position: (i + 1) * 1024,
      })),
    )
    .select('id, title')
  fail(taskRes.error)

  // Match returned ids back to samples by title rather than trusting order.
  const idByTitle = new Map(taskRes.data.map((t) => [t.title, t.id]))
  const assignees = samples.flatMap((s) =>
    s.assigneeIds.map((member_id) => ({ task_id: idByTitle.get(s.title)!, member_id })),
  )
  const labels = samples.flatMap((s) =>
    s.labelIds.map((label_id) => ({ task_id: idByTitle.get(s.title)!, label_id })),
  )
  const [a, l] = await Promise.all([
    supabase.from('task_assignees').insert(assignees),
    supabase.from('task_labels').insert(labels),
  ])
  fail(a.error)
  fail(l.error)
}
