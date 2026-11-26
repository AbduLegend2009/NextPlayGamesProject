import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { Board } from './components/board/Board'
import { Sidebar } from './components/layout/Sidebar'
import { BoardSkeleton, ErrorCard, SetupScreen, SigningInScreen, WelcomeBanner } from './components/layout/StateScreens'
import { Toolbar } from './components/layout/Toolbar'
import { TaskComposer } from './components/task/TaskComposer'
import { TaskPanel } from './components/task/TaskPanel'
import { BoardProvider, useBoard } from './hooks/useBoard'
import { useGuestSession } from './hooks/useGuestSession'
import { ToastProvider } from './hooks/useToasts'
import { EMPTY_FILTERS } from './lib/filters'
import { isSupabaseConfigured } from './lib/supabase'
import type { Filters, Status } from './lib/types'

export default function App() {
  return (
    <ToastProvider>
      {isSupabaseConfigured ? <Authenticated /> : <SetupScreen />}
    </ToastProvider>
  )
}

/** Signs in a guest first; only then loads the board. */
function Authenticated() {
  const { state, retry, startFresh } = useGuestSession()
  if (state.status === 'loading') return <SigningInScreen />
  if (state.status === 'error') return <ErrorCard title="Couldn't start a guest session" message={state.message} onRetry={retry} />
  const userId = state.session.user.id
  return (
    // key: a new guest gets a completely fresh board state.
    <BoardProvider key={userId} userId={userId}>
      <Workspace guestId={userId} onStartFresh={startFresh} />
    </BoardProvider>
  )
}

function Workspace({ guestId, onStartFresh }: { guestId: string; onStartFresh: () => void }) {
  const { load, tasks, reload, seedSampleBoard } = useBoard()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [composerStatus, setComposerStatus] = useState<Status | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // useCallback keeps these functions the same between renders, so children
  // that receive them don't redo work unnecessarily.
  const newTask = useCallback(() => setComposerStatus('todo'), [])
  const closePanel = useCallback(() => setOpenTaskId(null), [])
  const closeComposer = useCallback(() => setComposerStatus(null), [])

  const confirmStartFresh = () => {
    if (window.confirm('Start over as a new guest? Your current board stays tied to the old guest session and will no longer be reachable from this browser.')) {
      onStartFresh()
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: always visible on large screens, a slide-in drawer on small ones. */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-canvas lg:block">
        <Sidebar guestId={guestId} onStartFresh={confirmStartFresh} />
      </aside>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <aside className="animate-panel-in absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-canvas shadow-lift">
            <button onClick={() => setMenuOpen(false)} className="btn-ghost absolute top-3.5 right-3 size-8 px-0" aria-label="Close menu">
              <X className="size-4" />
            </button>
            <Sidebar guestId={guestId} onStartFresh={confirmStartFresh} />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <Toolbar filters={filters} onFiltersChange={setFilters} onNewTask={newTask} onOpenMenu={() => setMenuOpen(true)} />

        {load.status === 'ready' && tasks.length === 0 && <WelcomeBanner onSeed={seedSampleBoard} onCreate={newTask} />}

        <div className="min-h-0 flex-1">
          {load.status === 'loading' && <BoardSkeleton />}
          {load.status === 'error' && <ErrorCard title="Couldn't load your board" message={load.message} onRetry={reload} />}
          {load.status === 'ready' && <Board filters={filters} onOpenTask={setOpenTaskId} onAddTask={setComposerStatus} />}
        </div>
      </main>

      {composerStatus && <TaskComposer initialStatus={composerStatus} onClose={closeComposer} />}
      {openTaskId && <TaskPanel taskId={openTaskId} onClose={closePanel} />}
    </div>
  )
}
