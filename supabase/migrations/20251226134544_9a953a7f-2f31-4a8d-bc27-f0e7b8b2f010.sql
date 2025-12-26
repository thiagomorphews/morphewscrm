-- Add RLS policy for whatsapp_media_tokens (service role only for insert/select/delete)
-- This table should only be accessed via service role in edge functions

-- Deny policy for any authenticated user (only service role can bypass)
CREATE POLICY "Deny all for authenticated users"
ON public.whatsapp_media_tokens
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);