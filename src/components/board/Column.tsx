import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, SearchX } from 'lucide-react'
import type { ColumnDef } from '../../lib/constants'
import type { Label, Member, Task } from '../../lib/types'
import { SortableTaskCard } from './TaskCard'

interface ColumnProps {
  column: ColumnDef
  tasks: Task[]
  /** Total tasks in this column before filters, to tell "empty" from "filtered out". */
  totalCount: number
  members: Member[]
  labels: Label[]
  filtering: boolean
  onOpenTask: (id: string) => void
  onAddTask: (status: ColumnDef['id']) => void
}

export function Column({ column, tasks, totalCount, members, labels, filtering, onOpenTask, onAddTask }: ColumnProps) {
  // The whole column is a drop target, so cards can be dropped into an empty
  // column or below the last card.
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}`, data: { type: 'column', status: column.id } })

  return (
    <section
      aria-label={column.title}
      className="flex max-h-full w-[85vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-sunken/70 sm:w-[300px]"
    >
      <header className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
        <h2 className="text-[13px] font-semibold text-ink">{column.title}</h2>
        <span className="rounded-md bg-hover px-1.5 text-[11px] font-medium text-ink-muted tabular-nums">
          {filtering && tasks.length !== totalCount ? `${tasks.length}/${totalCount}` : totalCount}
        </span>
        <button
          onClick={() => onAddTask(column.id)}
          className="ml-auto rounded-md p-1 text-ink-faint transition-colors hover:bg-hover hover:text-ink"
          aria-label={`Add task to ${column.title}`}
        >
          <Plus className="size-4" />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={`scroll-thin mx-1.5 mb-1.5 flex min-h-24 flex-1 flex-col overflow-y-auto rounded-xl p-1.5 transition-colors ${
          isOver ? 'bg-accent-soft/60 ring-2 ring-accent/30 ring-inset' : ''
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} members={members} labels={labels} onOpen={onOpenTask} />
            ))}
          </ul>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center">
            {filtering && totalCount > 0 ? (
              <>
                <SearchX className="size-5 text-ink-faint" />
                <p className="text-xs text-ink-faint">No tasks here match your filters.</p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-ink-faint">{column.emptyHint}</p>
            )}
          </div>
        )}

        <button
          onClick={() => onAddTask(column.id)}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-faint transition-colors hover:bg-hover hover:text-ink-muted"
        >
          <Plus className="size-3.5" />
          Add task
        </button>
      </div>
    </section>
  )
}
