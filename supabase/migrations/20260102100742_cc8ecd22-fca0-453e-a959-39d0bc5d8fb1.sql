-- Add new permission columns for Team and Instagram DMs
ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS team_view boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_view boolean NOT NULL DEFAULT false;

-- Update existing admin/owner users to have these permissions enabled
UPDATE public.user_permissions up
SET team_view = true, instagram_view = true
FROM public.organization_members om
WHERE up.user_id = om.user_id 
  AND up.organization_id = om.organization_id
  AND om.role IN ('owner', 'admin');

-- Update the get_default_permissions_for_role function to include new permissions
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE _role
    WHEN 'owner' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', true,
        'sales_view', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', true,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', true,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', true,
        'settings_view', true, 'settings_manage', true,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true
      );
    WHEN 'admin' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', true,
        'sales_view', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', true,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', true,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', true,
        'settings_view', true, 'settings_manage', true,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true
      );
    WHEN 'manager' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', false,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', true, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', false,
        'settings_view', true, 'settings_manage', false,
        'reports_view', true,
        'deliveries_view_own', true, 'deliveries_view_all', true,
        'receptive_module_access', true,
        'team_view', true, 'instagram_view', true
      );
    WHEN 'seller' THEN
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_create', true, 'sales_edit_draft', true, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', true,
        'products_view', true, 'products_manage', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', true,
        'team_view', false, 'instagram_view', false
      );
    WHEN 'shipping' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', true, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', true, 'sales_dispatch', true, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', true, 'products_manage', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', true,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false
      );
    WHEN 'finance' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', true, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', true,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', false, 'products_manage', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', true,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false
      );
    WHEN 'entregador' THEN
      RETURN jsonb_build_object(
        'leads_view', false, 'leads_create', false, 'leads_edit', false, 'leads_delete', false,
        'sales_view', false, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', true, 'sales_cancel', false,
        'whatsapp_view', false, 'whatsapp_send', false,
        'products_view', false, 'products_manage', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', true, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false
      );
    ELSE -- member
      RETURN jsonb_build_object(
        'leads_view', true, 'leads_create', true, 'leads_edit', true, 'leads_delete', false,
        'sales_view', true, 'sales_create', false, 'sales_edit_draft', false, 'sales_confirm_payment', false,
        'sales_validate_expedition', false, 'sales_dispatch', false, 'sales_mark_delivered', false, 'sales_cancel', false,
        'whatsapp_view', true, 'whatsapp_send', false,
        'products_view', true, 'products_manage', false,
        'settings_view', false, 'settings_manage', false,
        'reports_view', false,
        'deliveries_view_own', false, 'deliveries_view_all', false,
        'receptive_module_access', false,
        'team_view', false, 'instagram_view', false
      );
  END CASE;
END;
$$;