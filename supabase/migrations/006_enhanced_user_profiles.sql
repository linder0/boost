-- Enhance user_profiles table with account type and structured fields

-- Create account type enum
CREATE TYPE account_type AS ENUM ('personal', 'company');

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN account_type account_type DEFAULT 'personal',
ADD COLUMN name TEXT,
ADD COLUMN email TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN title TEXT,
ADD COLUMN company_name TEXT,
ADD COLUMN company_description TEXT,
ADD COLUMN industry TEXT,
ADD COLUMN website TEXT,
ADD COLUMN communication_tone TEXT DEFAULT 'professional', -- professional, friendly, casual, formal
ADD COLUMN email_signature TEXT,
ADD COLUMN always_include TEXT, -- Things to always mention in outreach
ADD COLUMN preferences JSONB DEFAULT '{}'; -- Additional preferences as JSON

-- Add automation settings
ALTER TABLE user_profiles
ADD COLUMN follow_up_days INTEGER DEFAULT 3, -- Days before first follow-up
ADD COLUMN max_follow_ups INTEGER DEFAULT 2, -- Maximum number of follow-ups
ADD COLUMN auto_reject_over_budget BOOLEAN DEFAULT false,
ADD COLUMN auto_respond_viable BOOLEAN DEFAULT false;

-- Comment on columns for clarity
COMMENT ON COLUMN user_profiles.account_type IS 'Whether this is a personal or company account';
COMMENT ON COLUMN user_profiles.name IS 'Personal name or primary contact name for company';
COMMENT ON COLUMN user_profiles.title IS 'Job title (e.g., Event Coordinator, CEO)';
COMMENT ON COLUMN user_profiles.company_name IS 'Company/organization name (for company accounts)';
COMMENT ON COLUMN user_profiles.company_description IS 'Brief description of the company';
COMMENT ON COLUMN user_profiles.communication_tone IS 'Preferred tone: professional, friendly, casual, formal';
COMMENT ON COLUMN user_profiles.email_signature IS 'Custom email signature to use';
COMMENT ON COLUMN user_profiles.always_include IS 'Information to always include in outreach';
COMMENT ON COLUMN user_profiles.context IS 'Additional freeform context for AI';
COMMENT ON COLUMN user_profiles.preferences IS 'JSON object for additional preferences';
COMMENT ON COLUMN user_profiles.follow_up_days IS 'Days to wait before sending follow-up';
COMMENT ON COLUMN user_profiles.max_follow_ups IS 'Maximum number of follow-up emails to send';
