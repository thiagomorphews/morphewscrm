-- Add provider column to whatsapp_instances
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'zapi';

-- Add wasenderapi specific columns
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS wasender_session_id TEXT,
ADD COLUMN IF NOT EXISTS wasender_api_key TEXT;

-- Create organization_whatsapp_providers table to control which providers each org can use
CREATE TABLE IF NOT EXISTS public.organization_whatsapp_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zapi', 'wasenderapi')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  price_cents INTEGER NOT NULL DEFAULT 19700,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- Enable RLS
ALTER TABLE public.organization_whatsapp_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Master admin can manage all org providers"
ON public.organization_whatsapp_providers
FOR ALL
USING (is_master_admin(auth.uid()));

CREATE POLICY "Users can view their org providers"
ON public.organization_whatsapp_providers
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Update trigger for updated_at
CREATE TRIGGER update_org_whatsapp_providers_updated_at
BEFORE UPDATE ON public.organization_whatsapp_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for provider values
COMMENT ON COLUMN public.whatsapp_instances.provider IS 'zapi = API Brasileira (R$ 197), wasenderapi = API Internacional (R$ 185)';

-- Set default prices: zapi = R$ 197 (19700 cents), wasenderapi = R$ 185 (18500 cents)