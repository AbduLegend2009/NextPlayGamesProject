import { useEffect, type ReactNode } from 'react'

interface DialogProps {
  onClose: () => void
  children: ReactNode
  /** 'center' for a modal box, 'right' for a side panel. */
  placement?: 'center' | 'right'
  label: string
}

/**
 * A layer on top of the page with a dimmed backdrop. Clicking the backdrop or
 * pressing Escape closes it, and the page behind stops scrolling meanwhile.
 */
export function Dialog({ onClose, children, placement = 'center', label }: DialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex">
      <div className="animate-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      {placement === 'center' ? (
        <div className="relative m-auto w-full max-w-lg p-3 sm:p-4">
          <div className="animate-pop-in rounded-2xl border border-line bg-surface shadow-lift">{children}</div>
        </div>
      ) : (
        <div className="animate-panel-in relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-lift">
          {children}
        </div>
      )}
    </div>
  )
}
