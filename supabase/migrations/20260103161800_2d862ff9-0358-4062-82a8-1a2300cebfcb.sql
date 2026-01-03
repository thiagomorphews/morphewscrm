-- Create enum for SAC ticket status
CREATE TYPE public.sac_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create enum for SAC ticket priority
CREATE TYPE public.sac_ticket_priority AS ENUM ('low', 'normal', 'high');

-- Create enum for SAC category
CREATE TYPE public.sac_category AS ENUM ('complaint', 'question', 'request', 'financial');

-- Create SAC tickets table
CREATE TABLE public.sac_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  status sac_ticket_status NOT NULL DEFAULT 'open',
  priority sac_ticket_priority NOT NULL DEFAULT 'normal',
  category sac_category NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for users involved in ticket
CREATE TABLE public.sac_ticket_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.sac_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

-- Create table for ticket comments/history
CREATE TABLE public.sac_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.sac_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sac_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sac_ticket_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sac_ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for sac_tickets
CREATE POLICY "Users can view tickets of their org"
ON public.sac_tickets FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert tickets in their org"
ON public.sac_tickets FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update tickets of their org"
ON public.sac_tickets FOR UPDATE
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete tickets of their org"
ON public.sac_tickets FOR DELETE
USING (organization_id = get_user_organization_id());

-- RLS policies for sac_ticket_users
CREATE POLICY "Users can view ticket users of their org"
ON public.sac_ticket_users FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert ticket users in their org"
ON public.sac_ticket_users FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete ticket users of their org"
ON public.sac_ticket_users FOR DELETE
USING (organization_id = get_user_organization_id());

-- RLS policies for sac_ticket_comments
CREATE POLICY "Users can view comments of their org"
ON public.sac_ticket_comments FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert comments in their org"
ON public.sac_ticket_comments FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- Add SAC permissions to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN sac_view BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN sac_manage BOOLEAN NOT NULL DEFAULT false;

-- Update the get_default_permissions_for_role function to include SAC permissions
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE _role
    WHEN 'owner' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', true,
        'sales_view', true, 'sales_view_all', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', true,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', true,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', true, 'products_view_cost', true,
        'settings_view', true, 'settings_manage', true,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true,
        'post_sale_view', true, 'post_sale_manage', true,
        'sac_view', true, 'sac_manage', true
      );
    WHEN 'admin' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', true,
        'sales_view', true, 'sales_view_all', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', true,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', true,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', true, 'products_view_cost', true,
        'settings_view', true, 'settings_manage', true,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true,
        'post_sale_view', true, 'post_sale_manage', true,
        'sac_view', true, 'sac_manage', true
      );
    WHEN 'manager' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_view_all', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', false,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', false, 'products_view_cost', true,
        'settings_view', true, 'settings_manage', false,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true,
        'post_sale_view', true, 'post_sale_manage', true,
        'sac_view', true, 'sac_manage', true
      );
    WHEN 'seller' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_view_all', false, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', false, 'products_view_cost', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', true,
        'team_view', false, 'instagram_view', false,
        'post_sale_view', false, 'post_sale_manage', false,
        'sac_view', true, 'sac_manage', false
      );
    WHEN 'shipping' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', true, 'sales_view_all', true, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', true, 'products_manage', false, 'products_view_cost', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', true,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false,
        'post_sale_view', false, 'post_sale_manage', false,
        'sac_view', false, 'sac_manage', false
      );
    WHEN 'finance' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', true, 'sales_view_all', true, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', true,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', false, 'products_manage', false, 'products_view_cost', true,
        'settings_view', false, 'settings_manage', false,
        'reports_view', true,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false,
        'post_sale_view', true, 'post_sale_manage', false,
        'sac_view', true, 'sac_manage', false
      );
    WHEN 'entregador' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', false, 'sales_view_all', false, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', true, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', false, 'products_manage', false, 'products_view_cost', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', true, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false,
        'post_sale_view', false, 'post_sale_manage', false,
        'sac_view', false, 'sac_manage', false
      );
    ELSE -- member
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_view_all', false, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', false,
        'products_view', true, 'products_manage', false, 'products_view_cost', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false,
        'post_sale_view', false, 'post_sale_manage', false,
        'sac_view', false, 'sac_manage', false
      );
  END CASE;
END;
$function$;

-- Update the create_default_user_permissions trigger function
CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_perms jsonb;
BEGIN
  default_perms := get_default_permissions_for_role(NEW.role::text);
  
  INSERT INTO public.user_permissions (
    organization_id, user_id,
    leads_view, leads_create, leads_edit, leads_delete,
    sales_view, sales_view_all, sales_create, sales_edit_draft, sales_confirm_payment, 
    sales_validate_expedition, sales_dispatch, sales_mark_delivered, sales_cancel,
    whatsapp_view, whatsapp_send,
    products_view, products_manage, products_view_cost,
    settings_view, settings_manage,
    reports_view,
    deliveries_view_own, deliveries_view_all,
    post_sale_view, post_sale_manage,
    sac_view, sac_manage
  ) VALUES (
    NEW.organization_id, NEW.user_id,
    (default_perms->>'leads_view')::boolean, (default_perms->>'leads_create')::boolean, 
    (default_perms->>'leads_edit')::boolean, (default_perms->>'leads_delete')::boolean,
    (default_perms->>'sales_view')::boolean, (default_perms->>'sales_view_all')::boolean,
    (default_perms->>'sales_create')::boolean, (default_perms->>'sales_edit_draft')::boolean, 
    (default_perms->>'sales_confirm_payment')::boolean, 
    (default_perms->>'sales_validate_expedition')::boolean, (default_perms->>'sales_dispatch')::boolean, 
    (default_perms->>'sales_mark_delivered')::boolean, (default_perms->>'sales_cancel')::boolean,
    (default_perms->>'whatsapp_view')::boolean, (default_perms->>'whatsapp_send')::boolean,
    (default_perms->>'products_view')::boolean, (default_perms->>'products_manage')::boolean,
    (default_perms->>'products_view_cost')::boolean,
    (default_perms->>'settings_view')::boolean, (default_perms->>'settings_manage')::boolean,
    (default_perms->>'reports_view')::boolean,
    (default_perms->>'deliveries_view_own')::boolean, (default_perms->>'deliveries_view_all')::boolean,
    COALESCE((default_perms->>'post_sale_view')::boolean, false),
    COALESCE((default_perms->>'post_sale_manage')::boolean, false),
    COALESCE((default_perms->>'sac_view')::boolean, false),
    COALESCE((default_perms->>'sac_manage')::boolean, false)
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create indexes for performance
CREATE INDEX idx_sac_tickets_org_id ON public.sac_tickets(organization_id);
CREATE INDEX idx_sac_tickets_lead_id ON public.sac_tickets(lead_id);
CREATE INDEX idx_sac_tickets_sale_id ON public.sac_tickets(sale_id);
CREATE INDEX idx_sac_tickets_status ON public.sac_tickets(status);
CREATE INDEX idx_sac_tickets_created_by ON public.sac_tickets(created_by);
CREATE INDEX idx_sac_ticket_users_ticket_id ON public.sac_ticket_users(ticket_id);
CREATE INDEX idx_sac_ticket_comments_ticket_id ON public.sac_ticket_comments(ticket_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sac_tickets_updated_at
BEFORE UPDATE ON public.sac_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();