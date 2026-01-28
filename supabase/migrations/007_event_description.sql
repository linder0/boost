-- Add description field to events for semantic/unstructured context
ALTER TABLE events
ADD COLUMN description TEXT;

COMMENT ON COLUMN events.description IS 'Freeform description of the event for AI context and personalization';
