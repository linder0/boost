-- Create chat role type
CREATE TYPE chat_role AS ENUM ('user', 'assistant');

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_event_id ON chat_messages(event_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages (inherit from events)
CREATE POLICY "Users can view chat messages of their events"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = chat_messages.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chat messages for their events"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = chat_messages.event_id
            AND events.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete chat messages of their events"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events
            WHERE events.id = chat_messages.event_id
            AND events.user_id = auth.uid()
        )
    );
