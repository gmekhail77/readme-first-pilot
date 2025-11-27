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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    console.log("[COMPLETE-PAYMENT] User authenticated:", user.id);

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    console.log("[COMPLETE-PAYMENT] Processing job:", jobId);

    // Fetch job details
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select(`
        *,
        providers (
          user_id,
          business_name
        )
      `)
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("[COMPLETE-PAYMENT] Job not found:", jobError);
      throw new Error("Job not found");
    }

    // Verify user is the provider for this job
    if (job.providers?.user_id !== user.id) {
      throw new Error("Unauthorized: Only the assigned provider can complete payment");
    }

    console.log("[COMPLETE-PAYMENT] Job details:", {
      status: job.status,
      totalAmount: job.total_amount,
      depositAmount: job.deposit_amount,
      paymentIntentId: job.stripe_payment_intent_id,
    });

    // Verify job is in correct status
    if (job.status !== "in_progress") {
      throw new Error(`Job must be in_progress status. Current status: ${job.status}`);
    }

    // Verify we have a payment intent from the deposit
    if (!job.stripe_payment_intent_id) {
      throw new Error("No payment method found. Customer must complete deposit first.");
    }

    // Calculate remaining amount (50% completion payment)
    const remainingAmount = job.total_amount - job.deposit_amount;
    const remainingAmountCents = Math.round(remainingAmount * 100);

    console.log("[COMPLETE-PAYMENT] Charging remaining amount:", {
      remainingAmount,
      remainingAmountCents,
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve original payment intent to get customer and payment method
    const originalPaymentIntent = await stripe.paymentIntents.retrieve(
      job.stripe_payment_intent_id
    );

    console.log("[COMPLETE-PAYMENT] Original payment intent:", {
      customer: originalPaymentIntent.customer,
      paymentMethod: originalPaymentIntent.payment_method,
    });

    if (!originalPaymentIntent.customer || !originalPaymentIntent.payment_method) {
      throw new Error("Payment method not available for completion charge");
    }

    // Create payment intent for remaining amount
    const completionPaymentIntent = await stripe.paymentIntents.create({
      amount: remainingAmountCents,
      currency: "usd",
      customer: originalPaymentIntent.customer as string,
      payment_method: originalPaymentIntent.payment_method as string,
      off_session: true,
      confirm: true,
      description: `Job completion payment for job #${job.id.slice(0, 8)}`,
      metadata: {
        job_id: job.id,
        type: "completion",
      },
    });

    console.log("[COMPLETE-PAYMENT] Completion payment created:", {
      paymentIntentId: completionPaymentIntent.id,
      status: completionPaymentIntent.status,
    });

    // Update job status based on payment result
    let newStatus: string;
    if (completionPaymentIntent.status === "succeeded") {
      newStatus = "paid";
      console.log("[COMPLETE-PAYMENT] Payment succeeded, marking job as paid");
    } else if (completionPaymentIntent.status === "processing") {
      newStatus = "completed";
      console.log("[COMPLETE-PAYMENT] Payment processing, keeping job as completed");
    } else {
      throw new Error(`Payment failed with status: ${completionPaymentIntent.status}`);
    }

    // Update job with new status and completion date
    const { error: updateError } = await supabaseClient
      .from("jobs")
      .update({
        status: newStatus,
        completed_date: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("[COMPLETE-PAYMENT] Failed to update job status:", updateError);
      throw new Error(`Failed to update job: ${updateError.message}`);
    }

    console.log("[COMPLETE-PAYMENT] Job updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        paymentIntentId: completionPaymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("[COMPLETE-PAYMENT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Handle specific Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as Stripe.StripeCardError;
      if (stripeError.type === 'StripeCardError') {
        console.error("[COMPLETE-PAYMENT] Card error:", stripeError.message);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Payment failed: ${stripeError.message}`,
            requiresNewPayment: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 402,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
