import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, MessageSquare, History, Trash2, X } from 'lucide-react'
import * as api from '../../lib/api'
import { useBoard } from '../../hooks/useBoard'
import { useToasts } from '../../hooks/useToasts'
import { fullTimestamp, timeAgo } from '../../lib/dates'
import type { Activity, Comment, Task } from '../../lib/types'
import { Dialog } from '../ui/Dialog'
import { ActivityFeed } from './ActivityFeed'
import { AssigneeMenu, DueDateInput, LabelMenu, PriorityMenu, StatusMenu } from './Properties'

/**
 * The side panel that opens when you click a card. Every field saves on its
 * own as soon as you change it, like in Linear or Notion.
 */
export function TaskPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks } = useBoard()
  const task = tasks.find((t) => t.id === taskId)

  // If the task disappears (for example, it was deleted), close the panel.
  useEffect(() => {
    if (!task) onClose()
  }, [task, onClose])

  if (!task) return null
  return (
    <Dialog onClose={onClose} placement="right" label={`Task: ${task.title}`}>
      {/* key resets all local state if a different task is opened. */}
      <PanelBody key={task.id} task={task} onClose={onClose} />
    </Dialog>
  )
}

function PanelBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const board = useBoard()
  const toast = useToasts()
  const [tab, setTab] = useState<'comments' | 'activity'>('comments')
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [activity, setActivity] = useState<Activity[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadActivity = useCallback(async () => {
    try {
      setActivity(await api.fetchActivity(task.id))
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : String(err))
    }
  }, [task.id])

  // Load comments and activity when the panel opens. `cancelled` ignores
  // late answers if the panel closes before they arrive.
  useEffect(() => {
    let cancelled = false
    Promise.all([api.fetchComments(task.id), api.fetchActivity(task.id)])
      .then(([c, a]) => {
        if (cancelled) return
        setComments(c)
        setActivity(a)
      })
      .catch((err) => !cancelled && setHistoryError(err.message))
    return () => {
      cancelled = true
    }
  }, [task.id])

  /** Run a save, then refresh the activity log so it shows the change. */
  const save = async (work: Promise<void>) => {
    try {
      await work
      void loadActivity()
    } catch {
      // The board already showed an error toast and rolled the change back.
    }
  }

  const remove = async () => {
    try {
      await board.deleteTask(task.id)
      toast.success('Task deleted')
      onClose()
    } catch {
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="text-xs text-ink-faint" title={fullTimestamp(task.created_at)}>
          Created {timeAgo(task.created_at)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {confirmDelete ? (
            <span className="animate-fade-in flex items-center gap-1">
              <span className="mr-1 text-xs text-ink-muted">Delete this task?</span>
              <button onClick={remove} className="btn h-7 bg-danger px-2.5 text-white hover:opacity-90">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost h-7 px-2.5">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost size-8 px-0 hover:text-danger" aria-label="Delete task">
              <Trash2 className="size-4" />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost size-8 px-0" aria-label="Close panel">
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="space-y-5 px-5 py-5">
          <TitleField task={task} onSave={(title) => save(board.updateTask(task.id, { title }))} />

          <dl className="grid grid-cols-[96px_1fr] items-center gap-x-3 gap-y-2.5 text-[13px]">
            <dt className="text-ink-faint">Status</dt>
            <dd>
              <StatusMenu value={task.status} onChange={(status) => save(board.updateTask(task.id, { status }))} />
            </dd>
            <dt className="text-ink-faint">Priority</dt>
            <dd>
              <PriorityMenu value={task.priority} onChange={(priority) => save(board.updateTask(task.id, { priority }))} />
            </dd>
            <dt className="text-ink-faint">Due date</dt>
            <dd>
              <DueDateInput value={task.due_date} onChange={(due_date) => save(board.updateTask(task.id, { due_date }))} />
            </dd>
            <dt className="text-ink-faint">Assignees</dt>
            <dd>
              <AssigneeMenu value={task.assigneeIds} onChange={(ids) => save(board.setTaskAssignees(task.id, ids))} />
            </dd>
            <dt className="text-ink-faint">Labels</dt>
            <dd>
              <LabelMenu value={task.labelIds} onChange={(ids) => save(board.setTaskLabels(task.id, ids))} />
            </dd>
          </dl>

          <DescriptionField
            task={task}
            onSave={(description) => save(board.updateTask(task.id, { description }))}
          />
        </div>

        <div className="border-t border-line px-5 pt-3 pb-5">
          <div role="tablist" className="mb-4 flex gap-1">
            {(
              [
                ['comments', MessageSquare, `Comments${comments?.length ? ` · ${comments.length}` : ''}`],
                ['activity', History, 'Activity'],
              ] as const
            ).map(([id, Icon, text]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`btn h-7 px-2.5 ${tab === id ? 'bg-hover text-ink' : 'text-ink-faint hover:text-ink'}`}
              >
                <Icon className="size-3.5" />
                {text}
              </button>
            ))}
          </div>

          {historyError ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
              Couldn't load history: {historyError}
            </p>
          ) : tab === 'comments' ? (
            <CommentList
              comments={comments}
              onDelete={async (id) => {
                try {
                  await api.deleteComment(id)
                  setComments((c) => c?.filter((x) => x.id !== id) ?? null)
                  board.changeCommentCount(task.id, -1)
                } catch (err) {
                  toast.error(`Couldn't delete comment: ${err instanceof Error ? err.message : err}`)
                }
              }}
            />
          ) : activity ? (
            <ActivityFeed items={activity} />
          ) : (
            <LoadingLines />
          )}
        </div>
      </div>

      {tab === 'comments' && (
        <CommentBox
          onSubmit={async (body) => {
            const c = await api.addComment(task.id, body)
            setComments((all) => [...(all ?? []), c])
            board.changeCommentCount(task.id, 1)
          }}
        />
      )}
    </>
  )
}

/** Title that looks like text but is editable; saves when you leave it. */
function TitleField({ task, onSave }: { task: Task; onSave: (title: string) => void }) {
  const [value, setValue] = useState(task.title)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea to fit its text instead of showing a scrollbar.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const commit = () => {
    const trimmed = value.trim()
    if (!trimmed) setValue(task.title) // empty titles are not allowed
    else if (trimmed !== task.title) onSave(trimmed)
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      maxLength={200}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      aria-label="Task title"
      className="-mx-1.5 w-[calc(100%+12px)] resize-none overflow-hidden rounded-lg bg-transparent px-1.5 py-1 text-xl leading-snug font-semibold text-ink outline-none hover:bg-hover/60 focus:bg-hover/60"
    />
  )
}

function DescriptionField({ task, onSave }: { task: Task; onSave: (d: string | null) => void }) {
  const [value, setValue] = useState(task.description ?? '')
  return (
    <div>
      <label htmlFor="task-description" className="field-label">
        Description
      </label>
      <textarea
        id="task-description"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value.trim() || null
          if (next !== (task.description ?? null)) onSave(next)
        }}
        rows={4}
        maxLength={5000}
        placeholder="Add more detail…"
        className="w-full resize-y rounded-lg border border-transparent bg-sunken px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-line focus:bg-surface"
      />
    </div>
  )
}

function CommentList({ comments, onDelete }: { comments: Comment[] | null; onDelete: (id: string) => void }) {
  if (!comments) return <LoadingLines />
  if (!comments.length) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center">
        <MessageSquare className="mx-auto mb-2 size-5 text-ink-faint" />
        <p className="text-xs text-ink-faint">No comments yet. Start the conversation below.</p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="group rounded-xl bg-sunken px-3.5 py-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-ink">You</span>
            <time dateTime={c.created_at} title={fullTimestamp(c.created_at)} className="text-xs text-ink-faint">
              {timeAgo(c.created_at)}
            </time>
            <button
              onClick={() => onDelete(c.id)}
              className="ml-auto text-xs text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100"
            >
              Delete
            </button>
          </div>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink">{c.body}</p>
        </li>
      ))}
    </ul>
  )
}

function CommentBox({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!body.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      await onSubmit(body)
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-line p-3">
      {error && <p role="alert" className="mb-2 text-xs text-danger">Couldn't post comment: {error}</p>}
      <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-ink-faint"
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          className="btn-primary size-8 shrink-0 px-0"
          aria-label="Send comment"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function LoadingLines() {
  return (
    <div className="space-y-3" aria-label="Loading">
      {[70, 50, 60].map((w) => (
        <div key={w} className="h-3 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}
