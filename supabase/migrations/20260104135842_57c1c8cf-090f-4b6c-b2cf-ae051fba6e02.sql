-- 1. Alterar o valor default de stars de 3 para 0 (leads não classificados)
ALTER TABLE public.leads ALTER COLUMN stars SET DEFAULT 0;

-- 2. Adicionar campo de potencial de compra no receptive_attendances
ALTER TABLE public.receptive_attendances 
ADD COLUMN IF NOT EXISTS purchase_potential_cents INTEGER DEFAULT NULL;

-- 3. Criar tabela para follow-ups agendados
CREATE TABLE IF NOT EXISTS public.lead_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'receptive', 'sale_lost'
  source_id UUID, -- receptive_attendance_id or other source
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can view followups in their organization"
ON public.lead_followups FOR SELECT
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create followups in their organization"
ON public.lead_followups FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update followups in their organization"
ON public.lead_followups FOR UPDATE
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete followups in their organization"
ON public.lead_followups FOR DELETE
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
  )
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON public.lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_user_id ON public.lead_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_scheduled_at ON public.lead_followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_organization_id ON public.lead_followups(organization_id);

-- 7. Trigger para updated_at
CREATE TRIGGER update_lead_followups_updated_at
BEFORE UPDATE ON public.lead_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();