
-- Add receptive module control to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS receptive_module_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add receptive module control to user_permissions
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS receptive_module_access BOOLEAN NOT NULL DEFAULT false;

-- Create table to log receptive attendances
CREATE TABLE public.receptive_attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_searched TEXT NOT NULL,
  lead_existed BOOLEAN NOT NULL DEFAULT false,
  conversation_mode TEXT NOT NULL,
  product_id UUID REFERENCES public.lead_products(id) ON DELETE SET NULL,
  product_answers JSONB,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  non_purchase_reason_id UUID REFERENCES public.non_purchase_reasons(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_receptive_attendances_org ON public.receptive_attendances(organization_id);
CREATE INDEX idx_receptive_attendances_user ON public.receptive_attendances(user_id);
CREATE INDEX idx_receptive_attendances_lead ON public.receptive_attendances(lead_id);

-- Enable RLS
ALTER TABLE public.receptive_attendances ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attendances of their org
CREATE POLICY "Users can view receptive_attendances of their org"
ON public.receptive_attendances
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Policy: Users can insert their own attendances
CREATE POLICY "Users can insert their own receptive_attendances"
ON public.receptive_attendances
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND user_id = auth.uid()
);

-- Policy: Users can update their own attendances
CREATE POLICY "Users can update their own receptive_attendances"
ON public.receptive_attendances
FOR UPDATE
USING (
  organization_id = get_user_organization_id() 
  AND user_id = auth.uid()
);

-- Create trigger for updated_at
CREATE TRIGGER update_receptive_attendances_updated_at
BEFORE UPDATE ON public.receptive_attendances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
