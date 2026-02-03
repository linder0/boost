'use server'

import { getAuthenticatedClient, ensureFound } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AccountType = 'personal' | 'company'
export type CommunicationTone = 'professional' | 'friendly' | 'casual' | 'formal'

export interface UserProfile {
  id: string
  user_id: string
  context: string | null
  // Enhanced profile fields
  account_type: AccountType | null
  name: string | null
  email: string | null
  phone: string | null
  title: string | null
  company_name: string | null
  company_description: string | null
  industry: string | null
  website: string | null
  communication_tone: CommunicationTone | null
  email_signature: string | null
  always_include: string | null
  preferences: Record<string, unknown> | null
  // Automation settings
  follow_up_days: number | null
  max_follow_ups: number | null
  auto_reject_over_budget: boolean | null
  auto_respond_viable: boolean | null
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

    const updated = ensureFound(data, error, 'Failed to save profile')
    revalidatePath('/profile')
    return updated
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

    const created = ensureFound(data, error, 'Failed to save profile')
    revalidatePath('/profile')
    return created
  }
}
