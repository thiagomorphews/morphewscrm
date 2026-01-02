-- Add cross-sell columns to lead_products table
ALTER TABLE public.lead_products
ADD COLUMN crosssell_product_1_id uuid REFERENCES public.lead_products(id) ON DELETE SET NULL,
ADD COLUMN crosssell_product_2_id uuid REFERENCES public.lead_products(id) ON DELETE SET NULL;