-- =========================================
-- 1) CONVERSAS ÚNICAS POR ORG + PHONE (não mais por instance)
-- Isso garante que histórico NUNCA se perca ao trocar usuário/instância
-- =========================================

-- Remove constraint antiga (se existir)
ALTER TABLE public.whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_instance_id_phone_number_key;

-- Adiciona coluna current_instance_id (instância preferida para responder)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS current_instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Atualiza current_instance_id para conversations existentes
UPDATE public.whatsapp_conversations
SET current_instance_id = instance_id
WHERE current_instance_id IS NULL;

-- Cria unique constraint por org + phone (único thread por contato na org)
-- Usar phone_number normalizado para isso
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conv_org_phone 
ON public.whatsapp_conversations(organization_id, phone_number);

-- =========================================
-- 2) MESSAGES: provider genérico + provider_message_id
-- Permite suportar Wasender e outros providers com ticks corretos
-- =========================================

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'wasenderapi';

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider_message_id text;

-- Index para buscar status updates por provider_message_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_msg
  ON public.whatsapp_messages(provider, provider_message_id);

-- =========================================
-- 3) STORAGE BUCKET para mídia do WhatsApp
-- Permite upload de base64 → URL pública
-- =========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: qualquer um pode ver (bucket público)
CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Apenas service role pode fazer upload (via edge function)
CREATE POLICY "Service role upload for whatsapp-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

-- =========================================
-- 4) NORMALIZAR phones existentes (só dígitos)
-- =========================================

UPDATE public.whatsapp_conversations
SET phone_number = regexp_replace(phone_number, '\D', '', 'g')
WHERE phone_number ~ '\D';

UPDATE public.whatsapp_conversations
SET sendable_phone = regexp_replace(sendable_phone, '\D', '', 'g')
WHERE sendable_phone IS NOT NULL AND sendable_phone ~ '\D';

UPDATE public.whatsapp_instances
SET phone_number = regexp_replace(phone_number, '\D', '', 'g')
WHERE phone_number IS NOT NULL AND phone_number ~ '\D';