-- Tabela de parcelas/recebíveis para controle financeiro
CREATE TABLE public.sale_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  installment_number INTEGER NOT NULL DEFAULT 1,
  total_installments INTEGER NOT NULL DEFAULT 1,
  amount_cents INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'overdue', 'cancelled')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de alterações de recebimentos
CREATE TABLE public.installment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID NOT NULL REFERENCES public.sale_installments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_sale_installments_sale_id ON public.sale_installments(sale_id);
CREATE INDEX idx_sale_installments_org_id ON public.sale_installments(organization_id);
CREATE INDEX idx_sale_installments_status ON public.sale_installments(status);
CREATE INDEX idx_sale_installments_due_date ON public.sale_installments(due_date);
CREATE INDEX idx_installment_history_installment_id ON public.installment_history(installment_id);

-- RLS para sale_installments
ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installments of their org"
  ON public.sale_installments
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert installments in their org"
  ON public.sale_installments
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update installments of their org"
  ON public.sale_installments
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete installments of their org"
  ON public.sale_installments
  FOR DELETE
  USING (organization_id = get_user_organization_id());

-- RLS para installment_history
ALTER TABLE public.installment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their org"
  ON public.installment_history
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert history in their org"
  ON public.installment_history
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sale_installments_updated_at
  BEFORE UPDATE ON public.sale_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();