import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/events'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Store Gmail tokens if we got them from the OAuth flow
      const { provider_token, provider_refresh_token, user } = data.session
      
      if (provider_token && user) {
        try {
          // Use service role client to upsert tokens (bypasses RLS)
          const serviceClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Calculate token expiry (Google tokens typically expire in 1 hour)
          const tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString()
          
          await serviceClient
            .from('gmail_tokens')
            .upsert({
              user_id: user.id,
              access_token: provider_token,
              refresh_token: provider_refresh_token || '',
              token_expiry: tokenExpiry,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
        } catch (tokenError) {
          console.error('Failed to store Gmail tokens:', tokenError)
          // Continue anyway - user can still use the app
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
