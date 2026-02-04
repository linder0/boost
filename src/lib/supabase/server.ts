import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PostgrestError } from '@supabase/supabase-js'

/**
 * Handles Supabase errors consistently across all server actions.
 * Logs the error and throws a user-friendly message.
 */
export function handleSupabaseError(
  error: PostgrestError | null,
  userMessage: string
): void {
  if (error && Object.keys(error).length > 0) {
    console.error(userMessage, error)
    throw new Error(userMessage)
  }
}

/**
 * Checks if a Supabase query result is empty and throws if so.
 */
export function ensureFound<T>(
  data: T | null,
  error: PostgrestError | null,
  userMessage: string
): T {
  handleSupabaseError(error, userMessage)
  if (!data) {
    throw new Error(userMessage)
  }
  return data
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
