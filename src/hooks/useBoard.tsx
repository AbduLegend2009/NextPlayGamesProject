import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../lib/api'
import { POSITION_GAP } from '../lib/constants'
import type { Label, Member, Status, Task, TaskDraft, TaskPatch } from '../lib/types'
import { useToasts } from './useToasts'

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string }

interface BoardApi {
  load: LoadState
  tasks: Task[]
  members: Member[]
  labels: Label[]
  reload: () => Promise<void>
  createTask: (draft: TaskDraft) => Promise<Task>
  updateTask: (id: string, patch: TaskPatch) => Promise<void>
  moveTask: (id: string, status: Status, position: number) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setTaskAssignees: (id: string, memberIds: string[]) => Promise<void>
  setTaskLabels: (id: string, labelIds: string[]) => Promise<void>
  addMember: (name: string, color: string) => Promise<void>
  removeMember: (id: string) => Promise<void>
  addLabel: (name: string, color: string) => Promise<Label>
  removeLabel: (id: string) => Promise<void>
  changeCommentCount: (taskId: string, delta: number) => void
  seedSampleBoard: () => Promise<void>
}

const BoardContext = createContext<BoardApi | null>(null)

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

/**
 * Holds all board data and every action that changes it.
 *
 * Most actions are "optimistic": they change the screen immediately, then
 * save to the database in the background. If saving fails, the change is
 * rolled back and an error toast explains what happened. This is what makes
 * dragging a card feel instant.
 */
export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const toast = useToasts()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labels, setLabels] = useState<Label[]>([])

  // A ref always holds the latest tasks, so async callbacks can read current
  // data without being re-created on every change.
  const tasksRef = useRef(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  // Fetch everything; state is only set after the data arrives.
  const fetchAll = useCallback(async () => {
    try {
      const data = await api.fetchBoard()
      setTasks(data.tasks)
      setMembers(data.members)
      setLabels(data.labels)
      setLoad({ status: 'ready' })
    } catch (err) {
      setLoad({ status: 'error', message: message(err) })
    }
  }, [])

  /** Show the loading skeleton again and refetch (used by "Try again"). */
  const reload = useCallback(async () => {
    setLoad({ status: 'loading' })
    await fetchAll()
  }, [fetchAll])

  // Load the board whenever the signed-in guest changes.
  useEffect(() => {
    void fetchAll()
  }, [fetchAll, userId])

  /** Apply a change to one task locally. */
  const patchLocal = useCallback((id: string, change: Partial<Task>) => {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t)))
  }, [])

  /**
   * Run an optimistic change: apply `change` now, run `save`, and restore the
   * previous task if saving fails.
   */
  const optimistic = useCallback(
    async (id: string, change: Partial<Task>, save: () => Promise<void>, errorText: string) => {
      const before = tasksRef.current.find((t) => t.id === id)
      if (!before) return
      patchLocal(id, change)
      try {
        await save()
      } catch (err) {
        setTasks((all) => all.map((t) => (t.id === id ? before : t)))
        toast.error(`${errorText}: ${message(err)}`)
        throw err
      }
    },
    [patchLocal, toast],
  )

  const createTask = useCallback(
    async (draft: TaskDraft) => {
      // New tasks go to the top of their column.
      const inColumn = tasksRef.current.filter((t) => t.status === draft.status)
      const top = inColumn.length ? Math.min(...inColumn.map((t) => t.position)) : POSITION_GAP * 2
      const task = await api.createTask(draft, top - POSITION_GAP)
      setTasks((all) => [...all, task])
      return task
    },
    [],
  )

  const updateTask = useCallback(
    (id: string, patch: TaskPatch) =>
      optimistic(id, patch, () => api.updateTask(id, patch), "Couldn't save changes"),
    [optimistic],
  )

  const moveTask = useCallback(
    (id: string, status: Status, position: number) =>
      optimistic(
        id,
        { status, position },
        () => api.updateTask(id, { status, position }),
        "Couldn't move task",
      ).catch(() => {}), // already reported with a toast
    [optimistic],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const before = tasksRef.current
      setTasks((all) => all.filter((t) => t.id !== id))
      try {
        await api.deleteTask(id)
      } catch (err) {
        setTasks(before)
        toast.error(`Couldn't delete task: ${message(err)}`)
        throw err
      }
    },
    [toast],
  )

  const setTaskAssignees = useCallback(
    (id: string, memberIds: string[]) => {
      const current = tasksRef.current.find((t) => t.id === id)?.assigneeIds ?? []
      return optimistic(
        id,
        { assigneeIds: memberIds },
        () => api.setAssignees(id, current, memberIds),
        "Couldn't update assignees",
      )
    },
    [optimistic],
  )

  const setTaskLabels = useCallback(
    (id: string, labelIds: string[]) => {
      const current = tasksRef.current.find((t) => t.id === id)?.labelIds ?? []
      return optimistic(id, { labelIds }, () => api.setLabels(id, current, labelIds), "Couldn't update labels")
    },
    [optimistic],
  )

  const addMember = useCallback(
    async (name: string, color: string) => {
      try {
        const m = await api.createMember(name, color)
        setMembers((all) => [...all, m])
      } catch (err) {
        toast.error(`Couldn't add member: ${message(err)}`)
        throw err
      }
    },
    [toast],
  )

  const removeMember = useCallback(
    async (id: string) => {
      try {
        await api.deleteMember(id)
        setMembers((all) => all.filter((m) => m.id !== id))
        // The database removed their assignments too; mirror that locally.
        setTasks((all) => all.map((t) => ({ ...t, assigneeIds: t.assigneeIds.filter((a) => a !== id) })))
      } catch (err) {
        toast.error(`Couldn't remove member: ${message(err)}`)
      }
    },
    [toast],
  )

  const addLabel = useCallback(
    async (name: string, color: string) => {
      try {
        const l = await api.createLabel(name, color)
        setLabels((all) => [...all, l])
        return l
      } catch (err) {
        toast.error(message(err))
        throw err
      }
    },
    [toast],
  )

  const removeLabel = useCallback(
    async (id: string) => {
      try {
        await api.deleteLabel(id)
        setLabels((all) => all.filter((l) => l.id !== id))
        setTasks((all) => all.map((t) => ({ ...t, labelIds: t.labelIds.filter((l) => l !== id) })))
      } catch (err) {
        toast.error(`Couldn't delete label: ${message(err)}`)
      }
    },
    [toast],
  )

  const changeCommentCount = useCallback((taskId: string, delta: number) => {
    setTasks((all) =>
      all.map((t) => (t.id === taskId ? { ...t, commentCount: Math.max(0, t.commentCount + delta) } : t)),
    )
  }, [])

  const seedSampleBoard = useCallback(async () => {
    try {
      await api.seedSampleBoard()
      await fetchAll()
    } catch (err) {
      toast.error(`Couldn't create sample tasks: ${message(err)}`)
    }
  }, [fetchAll, toast])

  const value = useMemo<BoardApi>(
    () => ({
      load,
      tasks,
      members,
      labels,
      reload,
      createTask,
      updateTask,
      moveTask,
      deleteTask,
      setTaskAssignees,
      setTaskLabels,
      addMember,
      removeMember,
      addLabel,
      removeLabel,
      changeCommentCount,
      seedSampleBoard,
    }),
    [
      load, tasks, members, labels, reload, createTask, updateTask, moveTask, deleteTask,
      setTaskAssignees, setTaskLabels, addMember, removeMember, addLabel, removeLabel,
      changeCommentCount, seedSampleBoard,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used inside <BoardProvider>')
  return ctx
}
