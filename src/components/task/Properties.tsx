import { Check, Tag, UserRound, CalendarDays, X } from 'lucide-react'
import { useBoard } from '../../hooks/useBoard'
import { COLUMNS, PRIORITIES, PRIORITY_META, STATUS_LABEL } from '../../lib/constants'
import type { Priority, Status } from '../../lib/types'
import { AvatarStack } from '../ui/Avatar'
import { LabelPill, PriorityIcon } from '../ui/Badges'
import { OptionPicker } from '../ui/OptionPicker'
import { Popover } from '../ui/Popover'

// Shared look for the pill-shaped buttons that open each menu.
const pill =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink transition-colors hover:bg-hover'

function MenuItem({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
    >
      {children}
      {selected && <Check className="ml-auto size-3.5 text-accent" />}
    </button>
  )
}

export function StatusMenu({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const color = COLUMNS.find((c) => c.id === value)!.color
  return (
    <Popover
      className="w-48"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={pill} aria-label="Status">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          {STATUS_LABEL[value]}
        </button>
      )}
    >
      {(close) =>
        COLUMNS.map((c) => (
          <MenuItem key={c.id} selected={c.id === value} onClick={() => (onChange(c.id), close())}>
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.title}
          </MenuItem>
        ))
      }
    </Popover>
  )
}

export function PriorityMenu({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <Popover
      className="w-44"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={pill} aria-label="Priority">
          <PriorityIcon priority={value} className="text-ink-faint" />
          {PRIORITY_META[value].label}
        </button>
      )}
    >
      {(close) =>
        PRIORITIES.map((p) => (
          <MenuItem key={p.id} selected={p.id === value} onClick={() => (onChange(p.id), close())}>
            <PriorityIcon priority={p.id} className="text-ink-faint" />
            {p.label}
          </MenuItem>
        ))
      }
    </Popover>
  )
}

/** Native date picker styled as a pill, with a clear button when set. */
export function DueDateInput({ value, onChange }: { value: string | null; onChange: (d: string | null) => void }) {
  return (
    <span className={`${pill} relative pr-1.5`}>
      <CalendarDays className="size-3.5 text-ink-faint" />
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Due date"
        className={`w-[118px] bg-transparent text-[13px] outline-none ${value ? 'text-ink' : 'text-ink-faint'} [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="relative z-10 rounded p-0.5 text-ink-faint hover:bg-hover hover:text-ink"
          aria-label="Clear due date"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

export function AssigneeMenu({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { members } = useBoard()
  const selected = members.filter((m) => value.includes(m.id))
  return (
    <Popover
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={pill} aria-label="Assignees">
          {selected.length ? (
            <>
              <AvatarStack members={selected} max={4} />
              <span className="max-w-32 truncate">{selected.length === 1 ? selected[0].name : `${selected.length} people`}</span>
            </>
          ) : (
            <>
              <UserRound className="size-3.5 text-ink-faint" />
              <span className="text-ink-faint">Assign</span>
            </>
          )}
        </button>
      )}
    >
      {() => (
        <OptionPicker
          variant="avatar"
          options={members}
          selected={value}
          onChange={onChange}
          placeholder="Search people…"
          emptyText="No team members yet. Add some from the sidebar."
        />
      )}
    </Popover>
  )
}

export function LabelMenu({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { labels, addLabel } = useBoard()
  const selected = labels.filter((l) => value.includes(l.id))
  return (
    <Popover
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className={`${pill} h-auto min-h-8 flex-wrap py-1`} aria-label="Labels">
          {selected.length ? (
            selected.map((l) => <LabelPill key={l.id} label={l} />)
          ) : (
            <>
              <Tag className="size-3.5 text-ink-faint" />
              <span className="text-ink-faint">Labels</span>
            </>
          )}
        </button>
      )}
    >
      {() => (
        <OptionPicker
          options={labels}
          selected={value}
          onChange={onChange}
          onCreate={addLabel}
          placeholder="Search labels…"
          emptyText="No labels yet. Type a name to create one."
        />
      )}
    </Popover>
  )
}
