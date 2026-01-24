-- Add custom_message column to vendors table for AI-generated outreach messages
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS custom_message TEXT;
