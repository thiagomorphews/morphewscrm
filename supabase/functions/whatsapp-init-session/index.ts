import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionName, tenantId } = await req.json()
    
    // Usa o token master do WaSender configurado nos secrets
    const adminToken = Deno.env.get('WASENDERAPI_TOKEN')
    
    if (!adminToken) {
      throw new Error('CONFIG_ERROR: Secret WASENDERAPI_TOKEN não encontrada no Supabase.')
    }

    if (!sessionName) {
      throw new Error('O Nome da Instância é obrigatório.')
    }

    if (!tenantId) {
      throw new Error('O tenantId é obrigatório.')
    }

    // Prepara URL do Webhook dinamicamente
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1]

    console.log(`Iniciando sessão WaSender: ${sessionName} para tenant: ${tenantId}`)

    // 1. Cria a instância na tabela V2 primeiro (status: QRCODE)
    const { data: newInstance, error: dbError } = await supabase
      .from('whatsapp_v2_instances')
      .insert({
        name: sessionName,
        tenant_id: tenantId,
        api_url: 'https://api.wasenderapi.com',
        api_key: 'pending',
        status: 'QRCODE'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Erro DB:', dbError)
      throw new Error('Falha ao criar registro no banco de dados.')
    }

    console.log('Instância criada no banco:', newInstance.id)

    // URL do Webhook para o WaSender enviar as mensagens de volta
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/whatsapp-webhook?instance_id=${newInstance.id}`
    console.log('Webhook URL:', webhookUrl)

    // 2. Chama o WaSender para pegar o QR Code
    const waResponse = await fetch('https://api.wasenderapi.com/api/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `${sessionName.trim().replace(/\s+/g, '_')}-${newInstance.id.slice(0, 4)}`,
        webhookUrl: webhookUrl,
        waitQrCode: true
      })
    })

    const waData = await waResponse.json()
    console.log('Resposta WaSender:', { status: waResponse.status, data: waData })

    if (!waResponse.ok) {
      console.error('Erro WaSender:', waData)
      // Se falhou, deleta a instância criada para não sujar o banco
      await supabase.from('whatsapp_v2_instances').delete().eq('id', newInstance.id)
      throw new Error(waData.message || waData.error || 'Erro ao comunicar com a API do WaSender.')
    }

    // 3. Salva a API Key retornada
    const sessionKey = waData.key || waData.session?.key || waData.token
    
    if (sessionKey) {
      await supabase
        .from('whatsapp_v2_instances')
        .update({ api_key: sessionKey })
        .eq('id', newInstance.id)
    }

    // 4. Retorna o QR Code para o Front-end
    const qrCode = waData.qrcode || waData.qr || waData.qrCode || waData.base64 || waData.image

    return new Response(JSON.stringify({ 
      qrCode: qrCode,
      instanceId: newInstance.id,
      sessionKey: sessionKey,
      message: 'Sessão criada. Escaneie o QR Code para conectar.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Function Error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
