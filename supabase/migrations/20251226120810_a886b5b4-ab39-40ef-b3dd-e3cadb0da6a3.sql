-- RPC helpers to make onboarding flow robust (avoid client-side RLS traps)

CREATE OR REPLACE FUNCTION public.has_onboarding_completed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.onboarding_data od
    WHERE od.organization_id = public.get_user_organization_id()
      AND od.completed_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.save_onboarding_data(
  _cnpj text DEFAULT NULL,
  _company_site text DEFAULT NULL,
  _crm_usage_intent text DEFAULT NULL,
  _business_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  org_id := public.get_user_organization_id();

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND';
  END IF;

  INSERT INTO public.onboarding_data (
    organization_id,
    user_id,
    cnpj,
    company_site,
    crm_usage_intent,
    business_description,
    completed_at
  )
  VALUES (
    org_id,
    auth.uid(),
    _cnpj,
    _company_site,
    _crm_usage_intent,
    _business_description,
    now()
  )
  ON CONFLICT (organization_id)
  DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    cnpj = EXCLUDED.cnpj,
    company_site = EXCLUDED.company_site,
    crm_usage_intent = EXCLUDED.crm_usage_intent,
    business_description = EXCLUDED.business_description,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();
END;
$$;