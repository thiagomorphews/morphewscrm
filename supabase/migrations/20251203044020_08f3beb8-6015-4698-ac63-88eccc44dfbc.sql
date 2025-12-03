-- Add recorded_call_link column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recorded_call_link text;