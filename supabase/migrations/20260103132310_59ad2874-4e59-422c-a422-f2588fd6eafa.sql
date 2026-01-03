-- Add gamification profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_cartoon_url text,
ADD COLUMN IF NOT EXISTS avatar_fighter_url text,
ADD COLUMN IF NOT EXISTS avatar_horse_url text,
ADD COLUMN IF NOT EXISTS favorite_drink text,
ADD COLUMN IF NOT EXISTS favorite_chocolate text,
ADD COLUMN IF NOT EXISTS dream_prize text,
ADD COLUMN IF NOT EXISTS nickname text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.avatar_cartoon_url IS 'Foto estilo cartoon do vendedor';
COMMENT ON COLUMN public.profiles.avatar_fighter_url IS 'Foto estilo lutador Street Fighter';
COMMENT ON COLUMN public.profiles.avatar_horse_url IS 'Foto em cima de um cavalo';
COMMENT ON COLUMN public.profiles.favorite_drink IS 'Bebida favorita';
COMMENT ON COLUMN public.profiles.favorite_chocolate IS 'Chocolate favorito';
COMMENT ON COLUMN public.profiles.dream_prize IS 'Sonho/prêmio que quer ganhar';
COMMENT ON COLUMN public.profiles.nickname IS 'Apelido preferido';