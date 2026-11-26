import { useState, type FormEvent } from 'react'
import { Loader2, X } from 'lucide-react'
import { useBoard } from '../../hooks/useBoard'
import { useToasts } from '../../hooks/useToasts'
import type { Status, TaskDraft } from '../../lib/types'
import { Dialog } from '../ui/Dialog'
import { AssigneeMenu, DueDateInput, LabelMenu, PriorityMenu, StatusMenu } from './Properties'

/** The "New task" form, shown as a centered modal. */
export function TaskComposer({ initialStatus, onClose }: { initialStatus: Status; onClose: () => void }) {
  const { createTask } = useBoard()
  const toast = useToasts()
  const [draft, setDraft] = useState<TaskDraft>({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'normal',
    due_date: null,
    assigneeIds: [],
    labelIds: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A helper that updates one field and keeps the rest.
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault() // stop the browser from reloading the page on submit
    if (!draft.title.trim()) {
      setError('Give the task a title.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createTask(draft)
      toast.success('Task created')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <Dialog onClose={onClose} label="New task">
      <form onSubmit={submit}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">New task</h2>
          <button type="button" onClick={onClose} className="btn-ghost size-7 px-0" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 pt-4 pb-2">
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (error) setError(null)
            }}
            maxLength={200}
            placeholder="Task title"
            aria-label="Task title"
            aria-invalid={Boolean(error)}
            className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink-faint"
          />
          <textarea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Add a description…"
            aria-label="Description"
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
          />
          <div className="flex flex-wrap gap-2 pb-2">
            <StatusMenu value={draft.status} onChange={(v) => set('status', v)} />
            <PriorityMenu value={draft.priority} onChange={(v) => set('priority', v)} />
            <DueDateInput value={draft.due_date} onChange={(v) => set('due_date', v)} />
            <AssigneeMenu value={draft.assigneeIds} onChange={(v) => set('assigneeIds', v)} />
            <LabelMenu value={draft.labelIds} onChange={(v) => set('labelIds', v)} />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          {error ? (
            <p role="alert" className="flex-1 text-xs text-danger">
              {error}
            </p>
          ) : (
            <p className="hidden flex-1 text-xs text-ink-faint sm:block">
              Press <kbd className="rounded border border-line px-1 font-sans">Enter</kbd> to create
            </p>
          )}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
