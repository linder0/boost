import { createServerClient, SupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { User, PostgrestError } from '@supabase/supabase-js'
import { Event } from '@/types/database'

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

/**
 * Creates a Supabase client and verifies the user is authenticated.
 * Throws if not authenticated - use this in server actions that require auth.
 */
export async function getAuthenticatedClient(): Promise<{
  supabase: SupabaseClient
  user: User
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  return { supabase, user }
}

/**
 * Verifies the user owns the specified event.
 * Returns the full event data if authorized, throws otherwise.
 */
export async function verifyEventOwnership(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<Event> {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single()

  if (error || !event) {
    throw new Error('Event not found or unauthorized')
  }

  return event as Event
}

/**
 * Creates vendor threads for the given vendor IDs.
 * Used after creating vendors to initialize their communication threads.
 */
export async function createVendorThreads(
  supabase: SupabaseClient,
  vendorIds: string[]
): Promise<void> {
  const threadsToInsert = vendorIds.map((vendorId) => ({
    vendor_id: vendorId,
    status: 'NOT_CONTACTED' as const,
    next_action: 'AUTO' as const,
  }))

  await supabase.from('vendor_threads').insert(threadsToInsert)
}
