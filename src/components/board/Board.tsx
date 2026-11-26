import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useBoard } from '../../hooks/useBoard'
import { COLUMNS, POSITION_GAP, STATUS_LABEL } from '../../lib/constants'
import { hasActiveFilters, matchesFilters } from '../../lib/filters'
import type { Filters, Status, Task } from '../../lib/types'
import { Column } from './Column'
import { TaskCardView } from './TaskCard'

/** Card ids in each column, in display order. */
type Order = Record<Status, string[]>

const COLUMN_PREFIX = 'column:'
const isColumnId = (id: UniqueIdentifier) => String(id).startsWith(COLUMN_PREFIX)

/** Pick a position number that sorts between the two neighbours. */
function positionBetween(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return POSITION_GAP
  if (prev === undefined) return next! - POSITION_GAP
  if (next === undefined) return prev + POSITION_GAP
  return (prev + next) / 2
}

interface BoardProps {
  filters: Filters
  onOpenTask: (id: string) => void
  onAddTask: (status: Status) => void
}

export function Board({ filters, onOpenTask, onAddTask }: BoardProps) {
  const { tasks, members, labels, moveTask } = useBoard()
  const filtering = hasActiveFilters(filters)

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  // The order the database says, after filters are applied.
  const savedOrder = useMemo<Order>(() => {
    const order: Order = { todo: [], in_progress: [], in_review: [], done: [] }
    for (const t of [...tasks].sort((a, b) => a.position - b.position)) {
      if (matchesFilters(t, filters)) order[t.status].push(t.id)
    }
    return order
  }, [tasks, filters])

  const totals = useMemo(() => {
    const counts: Record<Status, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 }
    for (const t of tasks) counts[t.status]++
    return counts
  }, [tasks])

  // While a drag is happening we keep a temporary order, so cards can shuffle
  // around on screen without saving anything until the drop.
  const [dragOrder, setDragOrder] = useState<Order | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const order = dragOrder ?? savedOrder
  // Drag callbacks read the latest order from this ref. It is updated after
  // each render, which is always before the next drag event arrives.
  const orderRef = useRef(order)
  useLayoutEffect(() => {
    orderRef.current = order
  }, [order])

  // Sensors decide what counts as "starting a drag":
  // - mouse: move 6px first, so a plain click still opens the card;
  // - touch: press and hold briefly, so swiping still scrolls the board;
  // - keyboard: Space picks up, arrow keys move, Space drops, Escape cancels.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const findColumn = (id: UniqueIdentifier, o: Order = orderRef.current): Status | undefined => {
    if (isColumnId(id)) return String(id).slice(COLUMN_PREFIX.length) as Status
    return (Object.keys(o) as Status[]).find((s) => o[s].includes(String(id)))
  }

  // Collision detection = "what is the dragged card currently over?"
  // Prefer a card under the pointer; if the pointer is over empty column
  // space, use the nearest card in that column, or the column itself.
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args).length ? pointerWithin(args) : rectIntersection(args)
    const cardHit = hits.find((h) => !isColumnId(h.id))
    if (cardHit) return [cardHit]
    const columnHit = hits.find((h) => isColumnId(h.id))
    if (!columnHit) return hits
    const ids = orderRef.current[findColumn(columnHit.id)!] ?? []
    const nearest = closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => ids.includes(String(c.id))),
    })
    return nearest.length ? [nearest[0]] : [columnHit]
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
    setDragOrder(savedOrder)
  }

  // Fires continuously while dragging. Only handles moving to a different
  // column; reordering within a column is animated by dnd-kit itself.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    setDragOrder((current) => {
      const o = current ?? savedOrder
      const from = findColumn(active.id, o)
      const to = findColumn(over.id, o)
      if (!from || !to || from === to) return current

      const id = String(active.id)
      const target = o[to].filter((x) => x !== id)
      let index = target.length
      if (!isColumnId(over.id)) {
        // Drop above or below the hovered card depending on pointer position.
        const overIndex = target.indexOf(String(over.id))
        const activeRect = active.rect.current.translated
        const below = activeRect && activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2
        index = overIndex + (below ? 1 : 0)
      }
      target.splice(index, 0, id)
      return { ...o, [from]: o[from].filter((x) => x !== id), [to]: target }
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id)
    const current = orderRef.current
    setActiveId(null)

    const task = taskById.get(id)
    const to = over ? findColumn(over.id, current) : undefined
    if (!task || !to || !over) {
      setDragOrder(null)
      return
    }

    let list = current[to]
    // Reordering inside the same column happens here, at drop time.
    if (!isColumnId(over.id)) {
      const oldIndex = list.indexOf(id)
      const newIndex = list.indexOf(String(over.id))
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) list = arrayMove(list, oldIndex, newIndex)
    }

    const index = list.indexOf(id)
    const prev = taskById.get(list[index - 1])?.position
    const next = taskById.get(list[index + 1])?.position
    const alreadyThere =
      task.status === to && (prev === undefined || prev < task.position) && (next === undefined || task.position < next)

    if (!alreadyThere) void moveTask(id, to, positionBetween(prev, next))
    // moveTask updates the saved order immediately (optimistic update), so
    // the temporary drag order can be dropped in the same render.
    setDragOrder(null)
  }

  // Screen-reader announcements in plain words instead of internal ids.
  const describe = (id: UniqueIdentifier) => taskById.get(String(id))?.title ?? 'task'
  const where = (id: UniqueIdentifier | undefined) => {
    const s = id === undefined ? undefined : findColumn(id)
    return s ? STATUS_LABEL[s] : 'nowhere'
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
    onDragOver: ({ active, over }) => `${describe(active.id)} is over ${where(over?.id)}.`,
    onDragEnd: ({ active, over }) => `Dropped ${describe(active.id)} in ${where(over?.id)}.`,
    onDragCancel: ({ active }) => `Cancelled moving ${describe(active.id)}.`,
  }

  const activeTask: Task | undefined = activeId ? taskById.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setDragOrder(null)
      }}
      accessibility={{ announcements }}
    >
      <div className="scroll-thin flex h-full snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:snap-none sm:px-6">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={order[column.id].map((id) => taskById.get(id)!).filter(Boolean)}
            totalCount={totals[column.id]}
            members={members}
            labels={labels}
            filtering={filtering}
            onOpenTask={onOpenTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {activeTask ? <TaskCardView task={activeTask} members={members} labels={labels} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
