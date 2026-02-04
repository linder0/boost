// Barrel exports for Supabase utilities
export { createClient } from './client'
export {
  createClient as createServerClient,
  handleSupabaseError,
  ensureFound,
} from './server'
