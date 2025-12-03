-- Create onboarding_data table to store first-access quiz data
CREATE TABLE public.onboarding_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cnpj TEXT,
  company_site TEXT,
  crm_usage_intent TEXT,
  business_description TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their org onboarding data"
ON public.onboarding_data
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert their org onboarding data"
ON public.onboarding_data
FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update their org onboarding data"
ON public.onboarding_data
FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Master admin can view all onboarding data"
ON public.onboarding_data
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Add phone field to organizations table for contact info
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Update trigger for updated_at
CREATE TRIGGER update_onboarding_data_updated_at
BEFORE UPDATE ON public.onboarding_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();