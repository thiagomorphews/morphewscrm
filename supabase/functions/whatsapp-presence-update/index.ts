import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== WhatsApp Presence Update ===");

    // Get all connected WasenderAPI instances
    const { data: instances, error: instancesError } = await supabase
      .from("whatsapp_instances")
      .select("id, name, wasender_api_key, phone_number")
      .eq("provider", "wasenderapi")
      .eq("is_connected", true)
      .not("wasender_api_key", "is", null);

    if (instancesError) {
      throw new Error("Failed to fetch instances: " + instancesError.message);
    }

    console.log(`Found ${instances?.length || 0} connected WasenderAPI instances`);

    const results = [];

    for (const instance of instances || []) {
      try {
        // Get the user's JID (phone number in WhatsApp format)
        const jid = instance.phone_number 
          ? `${instance.phone_number.replace(/\D/g, '')}@s.whatsapp.net`
          : null;

        if (!jid) {
          console.log(`Instance ${instance.name}: No phone number, skipping`);
          continue;
        }

        // Send presence update to "unavailable" to keep notifications flowing
        const response = await fetch("https://www.wasenderapi.com/api/send-presence-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${instance.wasender_api_key}`,
          },
          body: JSON.stringify({
            jid: jid,
            presence: "unavailable",
          }),
        });

        const responseText = await response.text();
        console.log(`Instance ${instance.name}: Presence update response:`, response.status, responseText);

        results.push({
          instance: instance.name,
          success: response.ok,
          status: response.status,
        });
      } catch (error: any) {
        console.error(`Instance ${instance.name}: Error:`, error.message);
        results.push({
          instance: instance.name,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        instances_processed: results.length,
        results 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Presence update error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
