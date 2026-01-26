import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

/**
 * Get Gmail client using stored tokens from gmail_tokens table
 * Tokens are stored during OAuth callback and refreshed automatically when expired
 */
export async function getGmailClient(userId: string) {
  // Use service role client to bypass RLS for token operations
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get stored Gmail tokens
  const { data: tokenData, error } = await serviceClient
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData) {
    throw new Error('Gmail not connected. Please sign out and sign back in with Google.')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  // Check if token is expired (with 5 minute buffer)
  const tokenExpiry = new Date(tokenData.token_expiry)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minutes

  if (tokenExpiry.getTime() - bufferMs <= now.getTime()) {
    // Token expired or expiring soon - refresh it
    if (!tokenData.refresh_token) {
      throw new Error('No refresh token available. Please sign out and sign back in with Google.')
    }

    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update database with new token
      await serviceClient
        .from('gmail_tokens')
        .update({
          access_token: credentials.access_token!,
          token_expiry: new Date(credentials.expiry_date!).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: tokenData.refresh_token,
      })
    } catch (refreshError) {
      console.error('Failed to refresh Gmail token:', refreshError)
      throw new Error('Failed to refresh Gmail access. Please sign out and sign back in.')
    }
  } else {
    // Token still valid
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    })
  }

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

/**
 * Check if a user has Gmail connected
 */
export async function hasGmailConnected(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await serviceClient
    .from('gmail_tokens')
    .select('id')
    .eq('user_id', userId)
    .single()

  return !!data
}
