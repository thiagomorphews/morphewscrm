-- Enum para roles de organização
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

-- Enum para status de subscription
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'unpaid');

-- Tabela de organizações (tenants)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  max_leads INTEGER, -- NULL = ilimitado
  max_users INTEGER NOT NULL,
  extra_user_price_cents INTEGER NOT NULL DEFAULT 3700,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status subscription_status NOT NULL DEFAULT 'trialing',
  extra_users INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Tabela de membros da organização
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Adicionar organization_id nas tabelas existentes
ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.lead_events ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.lead_products ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.lead_sources ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Inserir planos iniciais
INSERT INTO public.subscription_plans (name, price_cents, max_leads, max_users, extra_user_price_cents) VALUES
  ('Start', 4990, 100, 3, 3700),
  ('Pro', 17700, 500, 5, 3700),
  ('Ultra', 49700, NULL, 10, 3700);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Função para obter organization_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Função para verificar se usuário é owner/admin da org
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
    AND organization_id = _org_id
    AND role IN ('owner', 'admin')
  )
$$;

-- Função para verificar se usuário pertence à org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
    AND organization_id = _org_id
  )
$$;

-- RLS Policies para organizations
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Org admins can update their organization"
ON public.organizations FOR UPDATE
USING (is_org_admin(auth.uid(), id));

-- RLS Policies para subscription_plans (todos podem ver planos ativos)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- RLS Policies para subscriptions
CREATE POLICY "Users can view their org subscription"
ON public.subscriptions FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can update subscription"
ON public.subscriptions FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- RLS Policies para organization_members
CREATE POLICY "Users can view members of their org"
ON public.organization_members FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert members"
ON public.organization_members FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Atualizar RLS das tabelas de leads para multi-tenancy
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Users can view leads of their org"
ON public.leads FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert leads in their org"
ON public.leads FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update leads of their org"
ON public.leads FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete leads of their org"
ON public.leads FOR DELETE
USING (organization_id = get_user_organization_id());

-- Atualizar RLS para lead_events
DROP POLICY IF EXISTS "Authenticated users can view lead events" ON public.lead_events;
DROP POLICY IF EXISTS "Authenticated users can insert lead events" ON public.lead_events;
DROP POLICY IF EXISTS "Authenticated users can update lead events" ON public.lead_events;
DROP POLICY IF EXISTS "Authenticated users can delete lead events" ON public.lead_events;

CREATE POLICY "Users can view lead_events of their org"
ON public.lead_events FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert lead_events in their org"
ON public.lead_events FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update lead_events of their org"
ON public.lead_events FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete lead_events of their org"
ON public.lead_events FOR DELETE
USING (organization_id = get_user_organization_id());

-- Triggers para updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();