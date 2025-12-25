-- =============================================================================
-- FASE 2: MODELO DE CONTATOS + THREADS CORRETAS
-- =============================================================================
-- Esta migration cria a base para visão 360 do cliente sem quebrar o que funciona.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: TABELA contacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz
);

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity ON public.contacts(organization_id, last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts(organization_id, full_name);

-- Trigger para updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.contacts IS 'Contatos únicos do CRM - representa uma pessoa/cliente independente do canal de comunicação.';

-- -----------------------------------------------------------------------------
-- PARTE 2: TABELA contact_identities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('phone', 'email', 'instagram', 'linkedin', 'other')),
  value text NOT NULL,
  value_normalized text NOT NULL, -- Valor normalizado para busca (E.164 para phone, lowercase para email)
  is_primary boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Garantir que não haja duplicatas do mesmo valor no mesmo tenant
  CONSTRAINT contact_identities_unique_value UNIQUE (organization_id, type, value_normalized)
);

-- Índices para contact_identities
CREATE INDEX IF NOT EXISTS idx_contact_identities_org ON public.contact_identities(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_identities_contact ON public.contact_identities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_identities_lookup ON public.contact_identities(organization_id, type, value_normalized);
CREATE INDEX IF NOT EXISTS idx_contact_identities_phone ON public.contact_identities(value_normalized) WHERE type = 'phone';

COMMENT ON TABLE public.contact_identities IS 'Identidades de um contato (telefone, email, etc). Um contato pode ter múltiplas identidades.';

-- -----------------------------------------------------------------------------
-- PARTE 3: ALTERAR whatsapp_conversations
-- -----------------------------------------------------------------------------
-- Adicionar contact_id
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);

-- Adicionar customer_phone_e164 (telefone normalizado do cliente)
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS customer_phone_e164 text;

-- Adicionar status da conversa
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_conversations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.whatsapp_conversations 
    ADD COLUMN status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed'));
  END IF;
END $$;

-- Adicionar assigned_user_id (atribuição de atendente)
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS assigned_user_id uuid;

-- Índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_conversations_org_contact ON public.whatsapp_conversations(organization_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_phone ON public.whatsapp_conversations(organization_id, customer_phone_e164);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.whatsapp_conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.whatsapp_conversations(organization_id, assigned_user_id);

-- -----------------------------------------------------------------------------
-- PARTE 4: ALTERAR whatsapp_messages (para consultas rápidas e idempotência)
-- -----------------------------------------------------------------------------
-- Adicionar contact_id
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);

-- Garantir provider_message_id existe (já existe como z_api_message_id, criar alias)
-- Vamos usar o campo existente z_api_message_id que serve como provider_message_id

-- Criar índice único para idempotência (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_unique 
ON public.whatsapp_messages(instance_id, z_api_message_id) 
WHERE z_api_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.whatsapp_messages(contact_id);

-- -----------------------------------------------------------------------------
-- PARTE 5: RLS para contacts
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: membros do tenant podem ver contatos
CREATE POLICY "Users can view contacts of their org"
ON public.contacts FOR SELECT
USING (organization_id = current_tenant_id());

-- INSERT: membros do tenant podem criar contatos
CREATE POLICY "Users can insert contacts in their org"
ON public.contacts FOR INSERT
WITH CHECK (organization_id = current_tenant_id());

-- UPDATE: membros do tenant podem atualizar contatos
CREATE POLICY "Users can update contacts in their org"
ON public.contacts FOR UPDATE
USING (organization_id = current_tenant_id());

-- DELETE: apenas admins podem deletar contatos
CREATE POLICY "Admins can delete contacts in their org"
ON public.contacts FOR DELETE
USING (organization_id = current_tenant_id() AND is_tenant_admin(auth.uid(), organization_id));

-- -----------------------------------------------------------------------------
-- PARTE 6: RLS para contact_identities
-- -----------------------------------------------------------------------------
ALTER TABLE public.contact_identities ENABLE ROW LEVEL SECURITY;

-- SELECT: via join com contacts (que já tem RLS)
CREATE POLICY "Users can view identities of their contacts"
ON public.contact_identities FOR SELECT
USING (organization_id = current_tenant_id());

-- INSERT: membros do tenant podem criar identidades
CREATE POLICY "Users can insert identities in their org"
ON public.contact_identities FOR INSERT
WITH CHECK (organization_id = current_tenant_id());

-- UPDATE: membros do tenant podem atualizar identidades
CREATE POLICY "Users can update identities in their org"
ON public.contact_identities FOR UPDATE
USING (organization_id = current_tenant_id());

-- DELETE: apenas admins podem deletar identidades
CREATE POLICY "Admins can delete identities in their org"
ON public.contact_identities FOR DELETE
USING (organization_id = current_tenant_id() AND is_tenant_admin(auth.uid(), organization_id));

-- -----------------------------------------------------------------------------
-- PARTE 7: FUNÇÃO normalize_phone_e164
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean text;
BEGIN
  -- Remove tudo que não é dígito
  clean := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Se vazio, retorna null
  IF clean = '' OR clean IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Adiciona código do Brasil se parecer número brasileiro (até 11 dígitos sem código)
  IF length(clean) <= 11 AND NOT clean LIKE '55%' THEN
    clean := '55' || clean;
  END IF;
  
  RETURN clean;
END;
$$;

COMMENT ON FUNCTION public.normalize_phone_e164(text) IS 
'Normaliza número de telefone para formato E.164 (apenas dígitos com código do país).';

-- -----------------------------------------------------------------------------
-- PARTE 8: FUNÇÃO get_or_create_contact_by_phone
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_contact_by_phone(
  _organization_id uuid,
  _phone text,
  _name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text;
  existing_contact_id uuid;
  new_contact_id uuid;
BEGIN
  -- Normalizar telefone
  normalized_phone := normalize_phone_e164(_phone);
  
  IF normalized_phone IS NULL THEN
    RAISE EXCEPTION 'Telefone inválido: %', _phone;
  END IF;
  
  -- Procurar identidade existente
  SELECT ci.contact_id INTO existing_contact_id
  FROM contact_identities ci
  WHERE ci.organization_id = _organization_id
    AND ci.type = 'phone'
    AND ci.value_normalized = normalized_phone
  LIMIT 1;
  
  -- Se encontrou, atualizar last_activity e retornar
  IF existing_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_activity_at = now(), updated_at = now()
    WHERE id = existing_contact_id;
    
    -- Atualizar nome se não tinha e agora tem
    IF _name IS NOT NULL THEN
      UPDATE contacts 
      SET full_name = COALESCE(full_name, _name)
      WHERE id = existing_contact_id AND full_name IS NULL;
    END IF;
    
    RETURN existing_contact_id;
  END IF;
  
  -- Criar novo contato
  INSERT INTO contacts (organization_id, full_name, last_activity_at)
  VALUES (_organization_id, _name, now())
  RETURNING id INTO new_contact_id;
  
  -- Criar identidade de telefone
  INSERT INTO contact_identities (organization_id, contact_id, type, value, value_normalized, is_primary)
  VALUES (_organization_id, new_contact_id, 'phone', _phone, normalized_phone, true);
  
  RETURN new_contact_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_contact_by_phone(uuid, text, text) IS 
'Busca ou cria um contato pelo telefone. Retorna o contact_id.';

-- -----------------------------------------------------------------------------
-- PARTE 9: FUNÇÃO link_conversation_to_contact
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_conversation_to_contact(
  _conversation_id uuid,
  _contact_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_org_id uuid;
  contact_org_id uuid;
BEGIN
  -- Buscar organization_id da conversa
  SELECT organization_id INTO conv_org_id
  FROM whatsapp_conversations
  WHERE id = _conversation_id;
  
  IF conv_org_id IS NULL THEN
    RAISE EXCEPTION 'Conversa não encontrada: %', _conversation_id;
  END IF;
  
  -- Buscar organization_id do contato
  SELECT organization_id INTO contact_org_id
  FROM contacts
  WHERE id = _contact_id;
  
  IF contact_org_id IS NULL THEN
    RAISE EXCEPTION 'Contato não encontrado: %', _contact_id;
  END IF;
  
  -- Validar que pertencem ao mesmo tenant
  IF conv_org_id != contact_org_id THEN
    RAISE EXCEPTION 'Conversa e contato pertencem a organizações diferentes';
  END IF;
  
  -- Atualizar conversa
  UPDATE whatsapp_conversations
  SET contact_id = _contact_id, updated_at = now()
  WHERE id = _conversation_id;
  
  -- Atualizar mensagens da conversa
  UPDATE whatsapp_messages
  SET contact_id = _contact_id
  WHERE conversation_id = _conversation_id;
  
  -- Atualizar last_activity do contato
  UPDATE contacts
  SET last_activity_at = now(), updated_at = now()
  WHERE id = _contact_id;
END;
$$;

COMMENT ON FUNCTION public.link_conversation_to_contact(uuid, uuid) IS 
'Vincula uma conversa a um contato. Valida que pertencem ao mesmo tenant.';

-- -----------------------------------------------------------------------------
-- PARTE 10: FUNÇÃO backfill_contacts_from_existing_conversations
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_contacts_from_existing_conversations(
  _organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  conv record;
  phone_to_use text;
  contact_id_result uuid;
  name_to_use text;
BEGIN
  -- Iterar em conversas sem contact_id
  FOR conv IN
    SELECT 
      c.id,
      c.phone_number,
      c.sendable_phone,
      c.contact_name,
      l.whatsapp AS lead_whatsapp,
      l.name AS lead_name
    FROM whatsapp_conversations c
    LEFT JOIN leads l ON l.id = c.lead_id
    WHERE c.organization_id = _organization_id
      AND c.contact_id IS NULL
  LOOP
    -- Determinar melhor telefone para usar
    phone_to_use := COALESCE(
      conv.sendable_phone,
      conv.phone_number,
      conv.lead_whatsapp
    );
    
    -- Determinar nome
    name_to_use := COALESCE(conv.contact_name, conv.lead_name);
    
    -- Se temos telefone, criar/resolver contato
    IF phone_to_use IS NOT NULL AND phone_to_use != '' THEN
      BEGIN
        contact_id_result := get_or_create_contact_by_phone(
          _organization_id,
          phone_to_use,
          name_to_use
        );
        
        -- Atualizar conversa
        UPDATE whatsapp_conversations
        SET 
          contact_id = contact_id_result,
          customer_phone_e164 = normalize_phone_e164(phone_to_use),
          updated_at = now()
        WHERE id = conv.id;
        
        -- Atualizar mensagens
        UPDATE whatsapp_messages
        SET contact_id = contact_id_result
        WHERE conversation_id = conv.id;
        
        updated_count := updated_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Log erro mas continua
        RAISE NOTICE 'Erro ao processar conversa %: %', conv.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.backfill_contacts_from_existing_conversations(uuid) IS 
'Migra conversas existentes para o modelo de contatos. Retorna quantas foram atualizadas.';

-- -----------------------------------------------------------------------------
-- PARTE 11: FUNÇÃO auxiliar para buscar contato por telefone
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_contact_by_phone(
  _organization_id uuid,
  _phone text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text;
  contact_id_result uuid;
BEGIN
  normalized_phone := normalize_phone_e164(_phone);
  
  IF normalized_phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT ci.contact_id INTO contact_id_result
  FROM contact_identities ci
  WHERE ci.organization_id = _organization_id
    AND ci.type = 'phone'
    AND ci.value_normalized = normalized_phone
  LIMIT 1;
  
  RETURN contact_id_result;
END;
$$;

COMMENT ON FUNCTION public.find_contact_by_phone(uuid, text) IS 
'Busca um contato pelo telefone. Retorna NULL se não encontrar.';

-- -----------------------------------------------------------------------------
-- PARTE 12: VIEW atualizada threads (com campos reais agora)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.threads;

CREATE VIEW public.threads 
WITH (security_invoker = true)
AS
SELECT 
  wc.id,
  wc.organization_id AS tenant_id,
  wc.instance_id AS channel_id,
  wc.phone_number,
  wc.sendable_phone,
  wc.customer_phone_e164,
  wc.contact_name,
  wc.contact_profile_pic,
  wc.contact_id,
  wc.lead_id,
  wc.status,
  wc.assigned_user_id,
  wc.unread_count,
  wc.last_message_at,
  wc.created_at,
  wc.updated_at
FROM public.whatsapp_conversations wc;

COMMENT ON VIEW public.threads IS 
'View padronizada de conversas com campos de contato. Usa SECURITY INVOKER para respeitar RLS.';

-- -----------------------------------------------------------------------------
-- PARTE 13: Habilitar Realtime para contacts (futuro)
-- -----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;