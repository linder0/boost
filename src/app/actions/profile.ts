'use server'

import { getAuthenticatedClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UserProfile {
  id: string
  user_id: string
  context: string | null
  created_at: string
  updated_at: string
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const { supabase, user } = await getAuthenticatedClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is expected for new users
    console.error('Error fetching user profile:', error)
    throw new Error('Failed to fetch profile')
  }

  return data
}

export async function saveUserProfile(context: string): Promise<UserProfile> {
  const { supabase, user } = await getAuthenticatedClient()

  // Try to update first, if no rows affected then insert
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ context })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      throw new Error('Failed to save profile')
    }

    revalidatePath('/profile')
    return data
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        context,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      throw new Error('Failed to save profile')
    }

    revalidatePath('/profile')
    return data
  }
}
