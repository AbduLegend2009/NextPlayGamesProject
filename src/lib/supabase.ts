import { createClient } from '@supabase/supabase-js'

// Vite exposes variables that start with VITE_ from the .env file at build
// time. Only the public anon (or "publishable") key belongs here — it is safe
// in the browser because Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both environment variables are present. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The single shared Supabase client. When the app is not configured we still
 * create a client with placeholder values so imports never crash; the UI shows
 * a setup screen instead of calling it.
 */
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-key',
  {
    auth: {
      // Keep the guest session in localStorage so a refresh keeps your board.
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
