-- Add meeting fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS meeting_date DATE,
ADD COLUMN IF NOT EXISTS meeting_time TIME,
ADD COLUMN IF NOT EXISTS meeting_link TEXT;