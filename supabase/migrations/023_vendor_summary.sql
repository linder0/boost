-- Add summary column for LLM-generated vendor one-liner displayed in the table
ALTER TABLE vendors ADD COLUMN summary text;
