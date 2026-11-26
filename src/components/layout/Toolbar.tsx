import { useEffect, useRef } from 'react'
import { ListFilter, Menu, Plus, Search, X } from 'lucide-react'
import { useBoard } from '../../hooks/useBoard'
import { PRIORITIES } from '../../lib/constants'
import { EMPTY_FILTERS, hasActiveFilters } from '../../lib/filters'
import type { Filters, Priority } from '../../lib/types'
import { PriorityIcon } from '../ui/Badges'
import { OptionPicker } from '../ui/OptionPicker'
import { Popover } from '../ui/Popover'

interface ToolbarProps {
  filters: Filters
  onFiltersChange: (f: Filters) => void
  onNewTask: () => void
  onOpenMenu: () => void
}

export function Toolbar({ filters, onFiltersChange, onNewTask, onOpenMenu }: ToolbarProps) {
  const { tasks } = useBoard()
  const searchRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch })

  // Keyboard shortcuts: "/" focuses search, "c" creates a task — unless you
  // are already typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [contenteditable], [role=dialog]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'c') {
        e.preventDefault()
        onNewTask()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onNewTask])

  const active = hasActiveFilters(filters)

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-6">
      <div className="flex items-center gap-2">
        <button onClick={onOpenMenu} className="btn-ghost size-8 px-0 lg:hidden" aria-label="Open menu">
          <Menu className="size-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">My board</h1>
          <p className="hidden text-xs text-ink-faint sm:block">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} · drag cards between columns to update their status
          </p>
        </div>
        <button onClick={onNewTask} className="btn-primary ml-auto" title="New task (C)">
          <Plus className="size-4" />
          <span>New task</span>
          <kbd className="ml-1 hidden rounded bg-white/20 px-1 font-sans text-[10px] sm:inline">C</kbd>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search tasks</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            ref={searchRef}
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && (set({ search: '' }), e.currentTarget.blur())}
            placeholder="Search tasks…"
            className="input h-8 pr-8 pl-8 text-[13px]"
          />
          {filters.search ? (
            <button
              onClick={() => set({ search: '' })}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-line px-1 text-[10px] text-ink-faint sm:block">
              /
            </kbd>
          )}
        </label>

        <PriorityFilter value={filters.priorities} onChange={(priorities) => set({ priorities })} />
        <AssigneeFilter value={filters.assigneeIds} onChange={(assigneeIds) => set({ assigneeIds })} />
        <LabelFilter value={filters.labelIds} onChange={(labelIds) => set({ labelIds })} />

        {active && (
          <button onClick={() => onFiltersChange(EMPTY_FILTERS)} className="btn-ghost h-8 px-2 text-xs">
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

function FilterButton({ label, count, toggle }: { label: string; count: number; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className={`btn h-8 border ${
        count ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-surface text-ink-muted hover:bg-hover hover:text-ink'
      }`}
    >
      <ListFilter className="size-3.5" />
      {label}
      {count > 0 && <span className="rounded bg-accent px-1 text-[10px] text-white tabular-nums">{count}</span>}
    </button>
  )
}

function PriorityFilter({ value, onChange }: { value: Priority[]; onChange: (v: Priority[]) => void }) {
  return (
    <Popover className="w-44" trigger={({ toggle }) => <FilterButton label="Priority" count={value.length} toggle={toggle} />}>
      {() =>
        PRIORITIES.map((p) => {
          const on = value.includes(p.id)
          return (
            <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-hover">
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? value.filter((v) => v !== p.id) : [...value, p.id])}
                className="accent-[var(--c-accent)]"
              />
              <PriorityIcon priority={p.id} className="text-ink-faint" />
              {p.label}
            </label>
          )
        })
      }
    </Popover>
  )
}

function AssigneeFilter({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { members } = useBoard()
  return (
    <Popover trigger={({ toggle }) => <FilterButton label="Assignee" count={value.length} toggle={toggle} />}>
      {() => (
        <OptionPicker
          variant="avatar"
          options={members}
          selected={value}
          onChange={onChange}
          placeholder="Filter by person…"
          emptyText="No team members yet."
        />
      )}
    </Popover>
  )
}

function LabelFilter({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { labels } = useBoard()
  return (
    <Popover trigger={({ toggle }) => <FilterButton label="Label" count={value.length} toggle={toggle} />}>
      {() => (
        <OptionPicker options={labels} selected={value} onChange={onChange} placeholder="Filter by label…" emptyText="No labels yet." />
      )}
    </Popover>
  )
}
