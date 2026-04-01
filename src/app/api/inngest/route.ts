import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { sendOutreach } from '@/inngest/functions/send-outreach'
import { parseResponse } from '@/inngest/functions/parse-response'
import { makeDecision } from '@/inngest/functions/make-decision'
import { sendFollowUp } from '@/inngest/functions/send-followup'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendOutreach,
    parseResponse,
    makeDecision,
    sendFollowUp,
  ],
})
