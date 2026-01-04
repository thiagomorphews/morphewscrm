-- Adicionar campos de comissão na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS seller_commission_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_commission_cents integer DEFAULT 0;

-- Adicionar campos de comissão nos itens de venda (para detalhar por produto)
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_cents integer DEFAULT 0;

COMMENT ON COLUMN public.sales.seller_commission_percentage IS 'Percentual total de comissão aplicado à venda';
COMMENT ON COLUMN public.sales.seller_commission_cents IS 'Valor total da comissão em centavos';
COMMENT ON COLUMN public.sale_items.commission_percentage IS 'Percentual de comissão aplicado ao item';
COMMENT ON COLUMN public.sale_items.commission_cents IS 'Valor da comissão do item em centavos';