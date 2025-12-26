
-- Enum for delivery types
CREATE TYPE delivery_type AS ENUM ('pickup', 'motoboy', 'carrier');

-- Enum for delivery shifts
CREATE TYPE delivery_shift AS ENUM ('morning', 'afternoon', 'full_day');

-- Table for delivery regions (for motoboy)
CREATE TABLE public.delivery_regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for region schedule (days and shifts)
CREATE TABLE public.delivery_region_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id uuid NOT NULL REFERENCES public.delivery_regions(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  shift delivery_shift NOT NULL DEFAULT 'full_day',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(region_id, day_of_week, shift)
);

-- Table for shipping carriers (transportadoras)
CREATE TABLE public.shipping_carriers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  cost_cents integer NOT NULL DEFAULT 0,
  estimated_days integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add delivery fields to leads table
ALTER TABLE public.leads 
ADD COLUMN delivery_region_id uuid REFERENCES public.delivery_regions(id) ON DELETE SET NULL;

-- Add delivery fields to sales table
ALTER TABLE public.sales 
ADD COLUMN delivery_type delivery_type NOT NULL DEFAULT 'pickup',
ADD COLUMN delivery_region_id uuid REFERENCES public.delivery_regions(id) ON DELETE SET NULL,
ADD COLUMN scheduled_delivery_date date,
ADD COLUMN scheduled_delivery_shift delivery_shift,
ADD COLUMN shipping_carrier_id uuid REFERENCES public.shipping_carriers(id) ON DELETE SET NULL,
ADD COLUMN shipping_cost_cents integer DEFAULT 0;

-- Enable RLS
ALTER TABLE public.delivery_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_region_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_carriers ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_regions
CREATE POLICY "Users can view regions of their org" ON public.delivery_regions
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage regions" ON public.delivery_regions
  FOR ALL USING (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id))
  WITH CHECK (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id));

-- RLS policies for delivery_region_schedules
CREATE POLICY "Users can view schedules of their org regions" ON public.delivery_region_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.delivery_regions dr
      WHERE dr.id = delivery_region_schedules.region_id
      AND dr.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Admins can manage schedules" ON public.delivery_region_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.delivery_regions dr
      WHERE dr.id = delivery_region_schedules.region_id
      AND dr.organization_id = get_user_organization_id()
      AND is_org_admin(auth.uid(), dr.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_regions dr
      WHERE dr.id = delivery_region_schedules.region_id
      AND dr.organization_id = get_user_organization_id()
      AND is_org_admin(auth.uid(), dr.organization_id)
    )
  );

-- RLS policies for shipping_carriers
CREATE POLICY "Users can view carriers of their org" ON public.shipping_carriers
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage carriers" ON public.shipping_carriers
  FOR ALL USING (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id))
  WITH CHECK (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id));

-- Create indexes
CREATE INDEX idx_delivery_regions_org ON public.delivery_regions(organization_id);
CREATE INDEX idx_delivery_regions_user ON public.delivery_regions(assigned_user_id);
CREATE INDEX idx_delivery_region_schedules_region ON public.delivery_region_schedules(region_id);
CREATE INDEX idx_shipping_carriers_org ON public.shipping_carriers(organization_id);
CREATE INDEX idx_leads_delivery_region ON public.leads(delivery_region_id);
CREATE INDEX idx_sales_delivery_type ON public.sales(delivery_type);
CREATE INDEX idx_sales_delivery_region ON public.sales(delivery_region_id);
CREATE INDEX idx_sales_scheduled_date ON public.sales(scheduled_delivery_date);
