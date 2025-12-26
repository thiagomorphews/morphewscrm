import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Proxy edge function to serve media files from Supabase Storage.
 * This ensures WasenderAPI can always fetch media even if direct bucket access fails.
 * 
 * Usage: GET /whatsapp-media-proxy?token=<token>
 * 
 * The token is a short-lived access token stored in whatsapp_media_tokens table.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("whatsapp_media_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Token lookup error:", tokenError);
      return new Response("Internal error", { status: 500, headers: corsHeaders });
    }

    if (!tokenData) {
      return new Response("Invalid or expired token", { status: 404, headers: corsHeaders });
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from("whatsapp_media_tokens")
        .delete()
        .eq("id", tokenData.id);
      return new Response("Token expired", { status: 410, headers: corsHeaders });
    }

    // Download file from storage
    const { data: fileData, error: fileError } = await supabaseAdmin
      .storage
      .from(tokenData.bucket_id)
      .download(tokenData.object_path);

    if (fileError || !fileData) {
      console.error("File download error:", fileError);
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    // Return the file with appropriate content type
    const contentType = tokenData.content_type || "application/octet-stream";
    
    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      },
    });

  } catch (error: any) {
    console.error("whatsapp-media-proxy error:", error);
    return new Response(error.message || "Internal error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
