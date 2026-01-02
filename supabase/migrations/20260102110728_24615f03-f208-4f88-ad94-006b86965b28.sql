-- Add delivery notes and google maps link fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS delivery_notes text,
ADD COLUMN IF NOT EXISTS google_maps_link text;