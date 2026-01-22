import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

/**
 * Get Gmail client using Supabase OAuth tokens
 * This replaces the custom OAuth implementation with Supabase's built-in provider system
 */
export async function getGmailClient(userId: string) {
  const supabase = await createClient()
  
  // Get user with provider token from Supabase auth
  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
  
  if (error || !user) {
    throw new Error('User not found')
  }

  // Extract Google provider tokens from user identities
  const googleIdentity = user.identities?.find(
    identity => identity.provider === 'google'
  )

  if (!googleIdentity) {
    throw new Error('Gmail not connected. Please sign in with Google.')
  }

  // Get tokens from identity
  const accessToken = (googleIdentity.identity_data as any)?.access_token
  const refreshToken = (googleIdentity.identity_data as any)?.refresh_token

  if (!accessToken) {
    throw new Error('No Gmail access token found. Please re-authenticate.')
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  // Return Gmail client - Supabase handles token refresh automatically
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

/**
 * Alternative: Get Gmail client using stored tokens in custom table
 * Use this if you want to keep the custom gmail_tokens table approach
 * but want compatibility with Supabase OAuth
 */
export async function getGmailClientLegacy(userId: string) {
  const supabase = await createClient()

  // Check if user has gmail_tokens (legacy approach)
  const { data: tokenData, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData) {
    // Fallback to Supabase OAuth tokens
    return getGmailClient(userId)
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  // Check if token is expired
  const tokenExpiry = new Date(tokenData.token_expiry)
  const now = new Date()

  if (tokenExpiry <= now) {
    // Refresh token
    oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update database with new token
    await supabase
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
  } else {
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    })
  }

  return google.gmail({ version: 'v1', auth: oauth2Client })
}
