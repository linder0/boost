-- AgentMail integration: replace Gmail with AgentMail for vendor communication
-- Adds agentmail identifiers alongside existing gmail columns (backward compat)

-- User inbox: one AgentMail inbox per user on planner.usevroom.com
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS agentmail_inbox_id TEXT;

-- Thread tracking: AgentMail thread ID for each vendor conversation
ALTER TABLE vendor_threads
  ADD COLUMN IF NOT EXISTS agentmail_thread_id TEXT;

-- Message tracking: AgentMail message ID for each stored message
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS agentmail_message_id TEXT;

-- Indexes for webhook lookups
CREATE INDEX IF NOT EXISTS idx_vendor_threads_agentmail_thread_id
  ON vendor_threads(agentmail_thread_id)
  WHERE agentmail_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_agentmail_message_id
  ON messages(agentmail_message_id)
  WHERE agentmail_message_id IS NOT NULL;
