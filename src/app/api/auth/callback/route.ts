import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUserInbox } from '@/lib/agentmail/inbox'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/events'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const { user } = data.session

      // Create AgentMail inbox for new users (non-blocking)
      if (user) {
        try {
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Planner'
          await ensureUserInbox(user.id, displayName)
        } catch (inboxError) {
          console.error('Failed to create AgentMail inbox:', inboxError)
          // Continue anyway - inbox will be created on first outreach
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
