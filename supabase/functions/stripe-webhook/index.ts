import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[STRIPE-WEBHOOK] No signature provided");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[STRIPE-WEBHOOK] Event received: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const jobId = session.metadata?.job_id;
      const userId = session.metadata?.user_id;

      console.log("[STRIPE-WEBHOOK] Processing checkout.session.completed:", {
        sessionId: session.id,
        jobId,
        userId,
      });

      if (!jobId) {
        console.error("[STRIPE-WEBHOOK] No job_id in session metadata");
        return new Response("No job_id in metadata", { status: 400 });
      }

      // Create Supabase client with service role key for admin operations
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get payment intent to extract payment method
      const paymentIntentId = session.payment_intent as string;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log("[STRIPE-WEBHOOK] Payment intent retrieved:", {
        paymentIntentId,
        paymentMethod: paymentIntent.payment_method,
      });

      // Update job status to confirmed and store payment intent ID
      const { data: job, error: updateError } = await supabaseAdmin
        .from("jobs")
        .update({
          status: "confirmed",
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", jobId)
        .select()
        .single();

      if (updateError) {
        console.error("[STRIPE-WEBHOOK] Failed to update job:", updateError);
        return new Response(`Failed to update job: ${updateError.message}`, { status: 500 });
      }

      console.log("[STRIPE-WEBHOOK] Job updated to confirmed:", jobId);

      // Fetch job details including provider and property info
      const { data: jobDetails } = await supabaseAdmin
        .from("jobs")
        .select(`
          *,
          providers (
            business_name,
            user_id
          ),
          property_profiles (
            address,
            city,
            user_id
          )
        `)
        .eq("id", jobId)
        .single();

      if (jobDetails) {
        console.log("[STRIPE-WEBHOOK] Job confirmed for:", {
          provider: jobDetails.providers?.business_name,
          customer: jobDetails.property_profiles?.address,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(`Webhook error: ${errorMessage}`, { status: 400 });
  }
});
