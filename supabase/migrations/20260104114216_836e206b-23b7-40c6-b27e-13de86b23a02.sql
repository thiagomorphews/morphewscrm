-- Create enum for post-sale contact status
CREATE TYPE post_sale_contact_status AS ENUM (
  'pending',              -- Vendas entregues, aguardando início do pós-venda
  'attempted_1',          -- Tentei 1 contato mas não me atendeu
  'attempted_2',          -- Tentei segundo contato mas não me atendeu
  'attempted_3',          -- Tentei 3 contatos e não me atendeu
  'sent_whatsapp',        -- Enviei WhatsApp para tentar fazer pesquisa
  'callback_later',       -- Consegui contato mas não podia falar, retornar mais tarde
  'completed_call',       -- Pós venda por ligação realizado com sucesso
  'completed_whatsapp',   -- Pós venda por WhatsApp realizado com sucesso
  'refused',              -- Cliente não aceitou fazer pós venda
  'not_needed'            -- Cliente SEM NECESSIDADE DE FAZER PÓS VENDA
);

-- Add post_sale_contact_status to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS post_sale_contact_status post_sale_contact_status DEFAULT NULL;

-- Create index for faster queries on post-sale status
CREATE INDEX IF NOT EXISTS idx_sales_post_sale_contact_status 
ON public.sales (organization_id, post_sale_contact_status) 
WHERE status = 'delivered';

-- Update existing delivered sales to have 'pending' status
UPDATE public.sales 
SET post_sale_contact_status = 'pending'
WHERE status = 'delivered' 
AND post_sale_contact_status IS NULL;