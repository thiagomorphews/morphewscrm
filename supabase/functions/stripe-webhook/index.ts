import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    // For now, we'll process without signature verification
    // In production, you should set up STRIPE_WEBHOOK_SECRET
    event = JSON.parse(body) as Stripe.Event;
  } catch (err) {
    console.error("Error parsing webhook:", err);
    return new Response("Invalid payload", { status: 400 });
  }

  console.log("Processing event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId || !planId) {
          console.error("Missing metadata in session");
          break;
        }

        // Get user profile to check if they have an organization
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("organization_id")
          .eq("user_id", userId)
          .single();

        let organizationId = profile?.organization_id;

        // If no organization, create one
        if (!organizationId) {
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert({
              name: `Organização ${userId.slice(0, 8)}`,
              slug: `org-${userId.slice(0, 8)}`,
            })
            .select()
            .single();

          if (orgError) {
            console.error("Error creating organization:", orgError);
            break;
          }

          organizationId = newOrg.id;

          // Add user as owner of the organization
          await supabaseAdmin.from("organization_members").insert({
            organization_id: organizationId,
            user_id: userId,
            role: "owner",
          });

          // Update user profile with organization_id
          await supabaseAdmin
            .from("profiles")
            .update({ organization_id: organizationId })
            .eq("user_id", userId);
        }

        // Create or update subscription
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert({
            organization_id: organizationId,
            plan_id: planId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, {
            onConflict: "organization_id",
          });

        if (subError) {
          console.error("Error creating subscription:", subError);
        }

        console.log("Subscription created/updated successfully");
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find subscription by stripe_customer_id
        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (existingSub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: subscription.status as any,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("id", existingSub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_customer_id", customerId);

        console.log("Subscription canceled");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log("Payment failed, subscription marked as past_due");
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
