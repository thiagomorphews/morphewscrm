-- Create payment methods table for each organization
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Payment timing: 'cash' (à vista), 'term' (a prazo), 'installments' (parcelado)
  payment_timing TEXT NOT NULL DEFAULT 'cash' CHECK (payment_timing IN ('cash', 'term', 'installments')),
  -- For installments: max number of installments (1-24)
  max_installments INTEGER DEFAULT 1,
  -- Minimum value per installment (in cents)
  min_installment_value_cents INTEGER DEFAULT 0,
  -- Where the money goes
  destination_bank TEXT,
  destination_cnpj TEXT,
  -- Fee percentage (e.g., 2.5 for 2.5%)
  fee_percentage NUMERIC(5,2) DEFAULT 0,
  -- Days until settlement (for cash flow)
  settlement_days INTEGER DEFAULT 0,
  -- Requires payment proof upload
  requires_proof BOOLEAN DEFAULT false,
  -- Display order in the list
  display_order INTEGER DEFAULT 0,
  -- Active status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment methods of their org"
ON public.payment_methods FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage payment methods"
ON public.payment_methods FOR ALL
USING (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id))
WITH CHECK (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_payment_methods_org_active ON public.payment_methods(organization_id, is_active);