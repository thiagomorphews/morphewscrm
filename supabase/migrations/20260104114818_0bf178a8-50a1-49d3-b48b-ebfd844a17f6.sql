-- Add image columns to lead_products
ALTER TABLE public.lead_products
ADD COLUMN image_url text,
ADD COLUMN label_image_url text;

-- Create product_faqs table
CREATE TABLE public.product_faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.lead_products(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_ingredients table
CREATE TABLE public.product_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.lead_products(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_faqs
CREATE POLICY "Users can view FAQs of their org"
ON public.product_faqs FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert FAQs in their org"
ON public.product_faqs FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update FAQs of their org"
ON public.product_faqs FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete FAQs of their org"
ON public.product_faqs FOR DELETE
USING (organization_id = get_user_organization_id());

-- RLS policies for product_ingredients
CREATE POLICY "Users can view ingredients of their org"
ON public.product_ingredients FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert ingredients in their org"
ON public.product_ingredients FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update ingredients of their org"
ON public.product_ingredients FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete ingredients of their org"
ON public.product_ingredients FOR DELETE
USING (organization_id = get_user_organization_id());

-- Create indexes
CREATE INDEX idx_product_faqs_product ON public.product_faqs(product_id);
CREATE INDEX idx_product_ingredients_product ON public.product_ingredients(product_id);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');