-- Add sales manager fields to organization_members
ALTER TABLE public.organization_members
ADD COLUMN is_sales_manager boolean NOT NULL DEFAULT false,
ADD COLUMN earns_team_commission boolean NOT NULL DEFAULT false,
ADD COLUMN team_commission_percentage numeric DEFAULT 0;

-- Create junction table for sales manager team members
CREATE TABLE public.sales_manager_team_members (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    manager_user_id uuid NOT NULL,
    team_member_user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (manager_user_id, team_member_user_id)
);

-- Enable RLS
ALTER TABLE public.sales_manager_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_manager_team_members
CREATE POLICY "Users can view team members in their org"
ON public.sales_manager_team_members
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage team members"
ON public.sales_manager_team_members
FOR ALL
USING (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id))
WITH CHECK (organization_id = get_user_organization_id() AND is_org_admin(auth.uid(), organization_id));