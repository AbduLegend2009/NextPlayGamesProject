import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { SWATCHES } from '../../lib/constants'

export interface PickerOption {
  id: string
  name: string
  color: string
}

interface OptionPickerProps {
  options: PickerOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** How each option's color is shown: a round avatar-like dot or a small label dot. */
  variant?: 'avatar' | 'dot'
  placeholder?: string
  emptyText: string
  /** When given, typing a new name offers "Create …". */
  onCreate?: (name: string, color: string) => Promise<PickerOption>
}

/** A searchable checklist used for picking assignees and labels. */
export function OptionPicker({
  options,
  selected,
  onChange,
  variant = 'dot',
  placeholder = 'Search…',
  emptyText,
  onCreate,
}: OptionPickerProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const q = query.trim().toLowerCase()
  const visible = options.filter((o) => o.name.toLowerCase().includes(q))
  const exact = options.some((o) => o.name.toLowerCase() === q)

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  const create = async () => {
    if (!onCreate || !q || exact) return
    setCreating(true)
    try {
      // Pick the next swatch so new labels get varied colors.
      const color = SWATCHES[options.length % SWATCHES.length]
      const created = await onCreate(query.trim(), color)
      onChange([...selected, created.id])
      setQuery('')
    } catch {
      // The error toast is shown by the board.
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (visible.length === 1 && !onCreate) toggle(visible[0].id)
            else if (visible.length === 1 && exact) toggle(visible[0].id)
            else void create()
          }
        }}
        placeholder={onCreate ? `${placeholder} or create` : placeholder}
        className="mb-1 h-8 w-full rounded-lg bg-sunken px-2.5 text-[13px] outline-none placeholder:text-ink-faint"
      />
      <div className="scroll-thin max-h-56 overflow-y-auto">
        {visible.map((o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
            >
              {variant === 'avatar' ? (
                <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
              ) : (
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
              )}
              <span className="flex-1 truncate">{o.name}</span>
              {on && <Check className="size-3.5 text-accent" />}
            </button>
          )
        })}
        {!visible.length && !(onCreate && q) && <p className="px-2 py-3 text-center text-xs text-ink-faint">{emptyText}</p>}
        {onCreate && q && !exact && (
          <button
            type="button"
            disabled={creating}
            onClick={create}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-muted hover:bg-hover disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Create “{query.trim()}”
          </button>
        )}
      </div>
    </div>
  )
}
