-- Create table to track temporary passwords
CREATE TABLE public.temp_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.temp_password_resets ENABLE ROW LEVEL SECURITY;

-- Only the system (service role) can manage this table
CREATE POLICY "Service role only" ON public.temp_password_resets
FOR ALL USING (false);

-- Create index for faster lookups
CREATE INDEX idx_temp_password_user_id ON public.temp_password_resets(user_id);
CREATE INDEX idx_temp_password_email ON public.temp_password_resets(email);