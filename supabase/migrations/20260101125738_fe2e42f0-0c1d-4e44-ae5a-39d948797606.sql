-- Add is_featured column to lead_products table
ALTER TABLE public.lead_products 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create index for faster queries on featured products
CREATE INDEX idx_lead_products_featured ON public.lead_products(organization_id, is_featured) WHERE is_active = true;