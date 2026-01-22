'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is already signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/events')
      }
    })
  }, [router, supabase.auth])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.modify',
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Event Ops Automation</CardTitle>
          <CardDescription>
            Sign in with Google to access Gmail for vendor outreach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoogleSignIn} 
            className="w-full" 
            disabled={loading}
            size="lg"
          >
            {loading ? 'Connecting to Google...' : 'Sign in with Google'}
          </Button>
          
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2 rounded-md bg-muted p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Gmail permissions required:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Send emails on your behalf to vendors</li>
              <li>Read vendor replies from your inbox</li>
              <li>Auto-manage vendor communication threads</li>
            </ul>
            <p className="mt-2">
              Secure OAuth via Supabase with automatic token refresh
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
