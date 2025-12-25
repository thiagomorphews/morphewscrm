-- =============================================================================
-- CORREÇÃO: Views com SECURITY INVOKER
-- =============================================================================
-- As views devem usar SECURITY INVOKER para respeitar as RLS policies
-- do usuário que está executando a query.
-- =============================================================================

-- Dropar as views existentes e recriar com SECURITY INVOKER

DROP VIEW IF EXISTS public.threads;
DROP VIEW IF EXISTS public.channel_users;
DROP VIEW IF EXISTS public.channels;

-- -----------------------------------------------------------------------------
-- VIEW channels - Com SECURITY INVOKER
-- -----------------------------------------------------------------------------
CREATE VIEW public.channels 
WITH (security_invoker = true)
AS
SELECT 
  wi.id,
  wi.organization_id AS tenant_id,
  wi.provider,
  wi.phone_number AS phone_e164,
  COALESCE(wi.wasender_session_id, wi.z_api_instance_id) AS external_account_id,
  wi.wasender_api_key,
  wi.z_api_token,
  wi.z_api_client_token,
  wi.status,
  wi.name,
  wi.is_connected,
  wi.monthly_price_cents,
  wi.payment_source,
  wi.qr_code_base64,
  wi.created_at,
  wi.updated_at
FROM public.whatsapp_instances wi;

COMMENT ON VIEW public.channels IS 
'View padronizada que expõe whatsapp_instances como channels. Usa SECURITY INVOKER para respeitar RLS.';

-- -----------------------------------------------------------------------------
-- VIEW channel_users - Com SECURITY INVOKER
-- -----------------------------------------------------------------------------
CREATE VIEW public.channel_users 
WITH (security_invoker = true)
AS
SELECT 
  wiu.id,
  wiu.instance_id AS channel_id,
  wiu.user_id,
  wiu.can_view,
  wiu.can_send,
  wiu.created_at,
  wi.organization_id AS tenant_id
FROM public.whatsapp_instance_users wiu
JOIN public.whatsapp_instances wi ON wi.id = wiu.instance_id;

COMMENT ON VIEW public.channel_users IS 
'View padronizada que expõe whatsapp_instance_users como channel_users. Usa SECURITY INVOKER para respeitar RLS.';

-- -----------------------------------------------------------------------------
-- VIEW threads - Com SECURITY INVOKER
-- -----------------------------------------------------------------------------
CREATE VIEW public.threads 
WITH (security_invoker = true)
AS
SELECT 
  wc.id,
  wc.organization_id AS tenant_id,
  wc.instance_id AS channel_id,
  wc.phone_number,
  wc.sendable_phone,
  wc.contact_name,
  wc.contact_profile_pic,
  wc.lead_id,
  wc.unread_count,
  wc.last_message_at,
  wc.created_at,
  wc.updated_at,
  -- Campos que serão adicionados na Fase 2 (placeholder)
  NULL::uuid AS contact_id,
  'open'::text AS status,
  NULL::uuid AS assigned_user_id
FROM public.whatsapp_conversations wc;

COMMENT ON VIEW public.threads IS 
'View padronizada que expõe whatsapp_conversations como threads. Usa SECURITY INVOKER para respeitar RLS.';