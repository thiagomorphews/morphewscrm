-- Add policy for org admins to update profiles of members in their organization
CREATE POLICY "Org admins can update profiles of their org members"
ON public.profiles
FOR UPDATE
USING (
  organization_id = get_user_organization_id() 
  AND is_org_admin(get_user_organization_id(), auth.uid())
);