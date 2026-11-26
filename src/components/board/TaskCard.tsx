import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlignLeft, MessageSquare } from 'lucide-react'
import type { Label, Member, Task } from '../../lib/types'
import { AvatarStack } from '../ui/Avatar'
import { DueBadge, LabelPill, PriorityIcon } from '../ui/Badges'

interface CardViewProps {
  task: Task
  members: Member[]
  labels: Label[]
  /** True for the floating copy that follows the pointer while dragging. */
  overlay?: boolean
}

/** What a card looks like. Used both on the board and as the drag preview. */
export const TaskCardView = memo(function TaskCardView({ task, members, labels, overlay }: CardViewProps) {
  const assignees = members.filter((m) => task.assigneeIds.includes(m.id))
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id))
  const done = task.status === 'done'
  const hasFooter = task.due_date || assignees.length || task.commentCount || task.description

  return (
    <div
      className={`group rounded-xl bg-surface p-3 text-left shadow-card transition-shadow ${
        overlay ? 'rotate-[1.5deg] cursor-grabbing shadow-lift' : 'hover:shadow-[0_0_0_1px_var(--c-line-strong),0_2px_6px_rgb(0_0_0/0.06)]'
      }`}
    >
      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <PriorityIcon priority={task.priority} className="mt-[3px] text-ink-faint" />
        <p className={`flex-1 text-[13.5px] leading-snug font-medium break-words ${done ? 'text-ink-muted line-through decoration-ink-faint/60' : 'text-ink'}`}>
          {task.title}
        </p>
      </div>

      {hasFooter ? (
        <div className="mt-2.5 flex items-center gap-2 pl-5">
          <DueBadge task={task} />
          {task.description && <AlignLeft className="size-3.5 text-ink-faint" aria-label="Has description" />}
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint" aria-label={`${task.commentCount} comments`}>
              <MessageSquare className="size-3" />
              {task.commentCount}
            </span>
          )}
          <span className="ml-auto">
            <AvatarStack members={assignees} />
          </span>
        </div>
      ) : null}
    </div>
  )
})

interface SortableCardProps extends CardViewProps {
  onOpen: (id: string) => void
}

/**
 * A card that dnd-kit can drag. useSortable gives us event listeners to
 * attach and a transform (an x/y offset) to move the card while sorting.
 */
export function SortableTaskCard({ task, members, labels, onOpen }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="list-none"
    >
      {/* While dragging, this original card stays in place (so keyboard focus
          is kept) but turns into a dashed placeholder. The card you see
          moving is the DragOverlay copy rendered by the Board. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onOpen(task.id)}
        aria-roledescription="Draggable task"
        aria-label={`${task.title}. Press space to pick up and move, or enter to open.`}
        className={`block w-full touch-manipulation rounded-xl text-left ${
          isDragging
            ? 'cursor-grabbing bg-accent-soft/60 outline-2 outline-dashed outline-accent/40'
            : 'cursor-grab'
        }`}
        onKeyDown={(e) => {
          // Enter opens the task; Space is left to dnd-kit for keyboard dragging.
          if (e.key === 'Enter' && !isDragging) {
            e.preventDefault()
            onOpen(task.id)
          } else {
            listeners?.onKeyDown?.(e)
          }
        }}
      >
        <div className={isDragging ? 'invisible' : undefined}>
          <TaskCardView task={task} members={members} labels={labels} />
        </div>
      </button>
    </li>
  )
}
