-- =====================================================
-- WHATSAPP 2.0 - TABELAS ISOLADAS (Multi-Tenant + Multi-Instance)
-- =====================================================

-- 1. Tabela de Instâncias v2 (Conexões com WaSender)
CREATE TABLE public.whatsapp_v2_instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'qrcode', 'connecting')),
    is_active BOOLEAN DEFAULT true,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    qr_code TEXT,
    session_data JSONB
);

-- 2. Tabela de Chats v2 (Contatos e Grupos)
CREATE TABLE public.whatsapp_v2_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    instance_id UUID NOT NULL REFERENCES public.whatsapp_v2_instances(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    whatsapp_id TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    is_group BOOLEAN DEFAULT false,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    UNIQUE(instance_id, whatsapp_id)
);

-- 3. Tabela de Mensagens v2
CREATE TABLE public.whatsapp_v2_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    chat_id UUID NOT NULL REFERENCES public.whatsapp_v2_chats(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact')),
    media_mime_type TEXT,
    media_filename TEXT,
    is_from_me BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    wa_message_id TEXT UNIQUE,
    sender_name TEXT,
    sender_phone TEXT,
    quoted_message_id UUID REFERENCES public.whatsapp_v2_messages(id) ON DELETE SET NULL,
    quoted_content TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Tabela de Usuários com acesso às instâncias v2
CREATE TABLE public.whatsapp_v2_instance_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    instance_id UUID NOT NULL REFERENCES public.whatsapp_v2_instances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_send BOOLEAN DEFAULT true,
    can_manage BOOLEAN DEFAULT false,
    UNIQUE(instance_id, user_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_v2_instances_tenant ON public.whatsapp_v2_instances(tenant_id);
CREATE INDEX idx_v2_instances_status ON public.whatsapp_v2_instances(status) WHERE is_active = true;

CREATE INDEX idx_v2_chats_instance ON public.whatsapp_v2_chats(instance_id);
CREATE INDEX idx_v2_chats_tenant ON public.whatsapp_v2_chats(tenant_id);
CREATE INDEX idx_v2_chats_whatsapp_id ON public.whatsapp_v2_chats(whatsapp_id);
CREATE INDEX idx_v2_chats_last_message ON public.whatsapp_v2_chats(last_message_time DESC NULLS LAST);
CREATE INDEX idx_v2_chats_unread ON public.whatsapp_v2_chats(unread_count) WHERE unread_count > 0;

CREATE INDEX idx_v2_messages_chat ON public.whatsapp_v2_messages(chat_id);
CREATE INDEX idx_v2_messages_created ON public.whatsapp_v2_messages(created_at DESC);
CREATE INDEX idx_v2_messages_wa_id ON public.whatsapp_v2_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX idx_v2_messages_tenant ON public.whatsapp_v2_messages(tenant_id);

CREATE INDEX idx_v2_instance_users_user ON public.whatsapp_v2_instance_users(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.whatsapp_v2_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_v2_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_v2_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_v2_instance_users ENABLE ROW LEVEL SECURITY;

-- Políticas para Instâncias v2
CREATE POLICY "Users can view instances of their org"
ON public.whatsapp_v2_instances FOR SELECT
USING (tenant_id = get_user_organization_id());

CREATE POLICY "Org admins can insert instances"
ON public.whatsapp_v2_instances FOR INSERT
WITH CHECK (tenant_id = get_user_organization_id() AND is_org_admin(auth.uid(), tenant_id));

CREATE POLICY "Org admins can update instances"
ON public.whatsapp_v2_instances FOR UPDATE
USING (tenant_id = get_user_organization_id() AND is_org_admin(auth.uid(), tenant_id));

CREATE POLICY "Org admins can delete instances"
ON public.whatsapp_v2_instances FOR DELETE
USING (tenant_id = get_user_organization_id() AND is_org_admin(auth.uid(), tenant_id));

-- Políticas para Chats v2
CREATE POLICY "Users can view chats of their org"
ON public.whatsapp_v2_chats FOR SELECT
USING (tenant_id = get_user_organization_id());

CREATE POLICY "Users can insert chats in their org"
ON public.whatsapp_v2_chats FOR INSERT
WITH CHECK (tenant_id = get_user_organization_id());

CREATE POLICY "Users can update chats in their org"
ON public.whatsapp_v2_chats FOR UPDATE
USING (tenant_id = get_user_organization_id());

CREATE POLICY "Admins can delete chats"
ON public.whatsapp_v2_chats FOR DELETE
USING (tenant_id = get_user_organization_id() AND is_org_admin(auth.uid(), tenant_id));

-- Políticas para Mensagens v2
CREATE POLICY "Users can view messages of their org"
ON public.whatsapp_v2_messages FOR SELECT
USING (tenant_id = get_user_organization_id());

CREATE POLICY "Users can insert messages in their org"
ON public.whatsapp_v2_messages FOR INSERT
WITH CHECK (tenant_id = get_user_organization_id());

CREATE POLICY "Users can update message status"
ON public.whatsapp_v2_messages FOR UPDATE
USING (tenant_id = get_user_organization_id());

-- Políticas para Instance Users v2
CREATE POLICY "Users can view instance users of their org"
ON public.whatsapp_v2_instance_users FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.whatsapp_v2_instances wi
    WHERE wi.id = instance_id AND wi.tenant_id = get_user_organization_id()
));

CREATE POLICY "Admins can manage instance users"
ON public.whatsapp_v2_instance_users FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.whatsapp_v2_instances wi
    WHERE wi.id = instance_id 
    AND wi.tenant_id = get_user_organization_id() 
    AND is_org_admin(auth.uid(), wi.tenant_id)
));

-- =====================================================
-- REALTIME (para sincronização em tempo real)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_v2_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_v2_messages;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_whatsapp_v2_instances_updated_at
    BEFORE UPDATE ON public.whatsapp_v2_instances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_v2_chats_updated_at
    BEFORE UPDATE ON public.whatsapp_v2_chats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();