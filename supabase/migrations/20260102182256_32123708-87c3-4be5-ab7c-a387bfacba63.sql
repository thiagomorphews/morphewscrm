-- Add columns for return proof (photo and location) when motoboy marks as not delivered
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS return_photo_url text,
ADD COLUMN IF NOT EXISTS return_latitude numeric,
ADD COLUMN IF NOT EXISTS return_longitude numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.sales.return_photo_url IS 'Photo of client house when delivery failed';
COMMENT ON COLUMN public.sales.return_latitude IS 'GPS latitude when delivery was marked as not delivered';
COMMENT ON COLUMN public.sales.return_longitude IS 'GPS longitude when delivery was marked as not delivered';