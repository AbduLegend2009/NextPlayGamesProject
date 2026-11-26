import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// If two parts of the app ask for a guest at the same moment (React runs
// effects twice in development), they share one sign-in instead of creating
// two separate anonymous users.
let pending: Promise<Session> | null = null

function ensureGuest(): Promise<Session> {
  pending ??= (async () => {
    const existing = await supabase.auth.getSession()
    if (existing.error) throw existing.error
    if (existing.data.session) return existing.data.session
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!data.session) throw new Error('Supabase did not return a session.')
    return data.session
  })().finally(() => {
    pending = null
  })
  return pending
}

type GuestState =
  | { status: 'loading' }
  | { status: 'ready'; session: Session }
  | { status: 'error'; message: string }

/**
 * Makes sure there is a logged-in guest. On the first visit it calls
 * Supabase's anonymous sign-in, which creates a real user with no email or
 * password. Supabase stores that session in localStorage, so later visits from
 * the same browser reuse the same guest and see the same board.
 */
export function useGuestSession() {
  const [state, setState] = useState<GuestState>({ status: 'loading' })

  // Signs in (if needed) and reports the result. It only sets state after the
  // network call finishes, which is the safe way to do async work in effects.
  const connect = useCallback(async () => {
    try {
      setState({ status: 'ready', session: await ensureGuest() })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState({
        status: 'error',
        message: /anonymous/i.test(message)
          ? 'Anonymous sign-ins are turned off for this Supabase project. Enable them under Authentication → Sign In / Providers.'
          : message,
      })
    }
  }, [])

  /** Used by the "Try again" button: show the spinner, then reconnect. */
  const start = useCallback(async () => {
    setState({ status: 'loading' })
    await connect()
  }, [connect])

  useEffect(() => {
    // Run once when the app first appears.
    void connect()

    // If the session ends (for example the user starts a fresh guest
    // session), sign in again so the app never sits without a user.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase's docs warn against calling other Supabase auth methods
      // directly inside this callback (it can deadlock), so the new sign-in
      // is scheduled to run just after it with setTimeout.
      if (event === 'SIGNED_OUT') setTimeout(() => void start(), 0)
      else if (session) setState({ status: 'ready', session })
    })
    return () => data.subscription.unsubscribe()
  }, [connect, start])

  /** Throw away this guest and start over as a brand-new one. */
  const startFresh = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { state, retry: start, startFresh }
}
