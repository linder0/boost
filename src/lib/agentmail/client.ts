import { AgentMailClient } from 'agentmail'

let client: AgentMailClient | null = null

export function getAgentMailClient(): AgentMailClient {
  if (!client) {
    client = new AgentMailClient({
      apiKey: process.env.AGENTMAIL_API_KEY!,
    })
  }
  return client
}

export const AGENTMAIL_DOMAIN = 'planner.usevroom.com'
