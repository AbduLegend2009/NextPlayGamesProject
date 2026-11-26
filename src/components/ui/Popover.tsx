import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PopoverProps {
  /** Renders the button that opens the popover. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  /** Popover contents; receives `close` so a choice can dismiss it. */
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

/**
 * A small floating menu attached to a button. It closes when you click
 * anywhere outside it or press Escape.
 */
export function Popover({ trigger, children, align = 'left', className = 'w-60' }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`animate-pop-in absolute top-full z-40 mt-1.5 rounded-xl border border-line bg-surface p-1 shadow-lift ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
