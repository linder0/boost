import { getAgentMailClient, AGENTMAIL_DOMAIN } from './client'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Ensure a user has an AgentMail inbox.
 * If one already exists (stored in user_profiles), returns it.
 * Otherwise creates a new inbox on planner.usevroom.com and stores the ID.
 */
export async function ensureUserInbox(
  userId: string,
  displayName: string
): Promise<string> {
  const serviceClient = createServiceRoleClient()

  // Check if user already has an inbox
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('agentmail_inbox_id')
    .eq('user_id', userId)
    .single()

  if (profile?.agentmail_inbox_id) {
    return profile.agentmail_inbox_id
  }

  // Create a new AgentMail inbox
  const client = getAgentMailClient()

  // Generate a username from the display name (e.g. "Linda Xue" -> "linda")
  const username = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'planner'

  const inbox = await client.inboxes.create({
    username,
    domain: AGENTMAIL_DOMAIN,
    displayName,
  })

  const inboxId = inbox.inboxId

  // Store the inbox ID on the user profile (upsert to handle missing profile)
  await serviceClient
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        agentmail_inbox_id: inboxId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  return inboxId
}

/**
 * Get the AgentMail inbox ID for a user, or null if not set up yet.
 */
export async function getUserInboxId(userId: string): Promise<string | null> {
  const serviceClient = createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('agentmail_inbox_id')
    .eq('user_id', userId)
    .single()

  return profile?.agentmail_inbox_id ?? null
}
