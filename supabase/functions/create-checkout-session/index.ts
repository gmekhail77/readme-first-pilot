import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    
    // Create Supabase client with user's auth context for RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[CREATE-CHECKOUT] User authenticated:", user.id);

    const body = await req.json();
    const {
      providerId,
      propertyId,
      serviceType,
      pricingDetails,
      totalAmount,
      depositAmount,
      customerInfo,
    } = body;

    console.log("[CREATE-CHECKOUT] Booking details:", {
      providerId,
      propertyId,
      serviceType,
      totalAmount,
      depositAmount,
    });

    // Create job record in database
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .insert({
        property_id: propertyId,
        provider_id: providerId,
        service_type: serviceType,
        pricing_details: pricingDetails,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        status: "pending_deposit",
      })
      .select()
      .single();

    if (jobError) {
      console.error("[CREATE-CHECKOUT] Job creation error:", jobError);
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    console.log("[CREATE-CHECKOUT] Job created:", job.id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer:", customerId);
    } else {
      console.log("[CREATE-CHECKOUT] No existing customer, will create at checkout");
    }

    // Create checkout session for deposit payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Service - Deposit`,
              description: `50% deposit for job #${job.id.slice(0, 8)}`,
            },
            unit_amount: Math.round(depositAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: "off_session", // Save payment method for completion payment
      },
      success_url: `${req.headers.get("origin")}/booking/confirmation?job_id=${job.id}`,
      cancel_url: `${req.headers.get("origin")}/booking/review?${new URLSearchParams(body).toString()}`,
      metadata: {
        job_id: job.id,
        user_id: user.id,
        type: "deposit",
      },
    });

    // Update job with checkout session ID
    await supabaseClient
      .from("jobs")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", job.id);

    console.log("[CREATE-CHECKOUT] Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, jobId: job.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
