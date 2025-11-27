import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const BookingCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createCheckoutSession = async () => {
      try {
        // Get all booking details from URL params
        const bookingData = {
          providerId: searchParams.get("providerId"),
          propertyId: searchParams.get("propertyId"),
          serviceType: searchParams.get("service"),
          city: searchParams.get("city"),
          totalAmount: parseFloat(searchParams.get("total") || "0"),
          depositAmount: parseFloat(searchParams.get("deposit") || "0"),
          tier: searchParams.get("tier"),
          pricingDetails: {
            // Service-specific details
            squareFeet: searchParams.get("squareFeet"),
            frequency: searchParams.get("frequency"),
            deepClean: searchParams.get("deepClean"),
            addOns: searchParams.get("addOns"),
            lotSize: searchParams.get("lotSize"),
            terrain: searchParams.get("terrain"),
            services: searchParams.get("services"),
            poolType: searchParams.get("poolType"),
            poolSize: searchParams.get("poolSize"),
            tier: searchParams.get("tier"),
          },
          customerInfo: {
            fullName: searchParams.get("fullName"),
            email: searchParams.get("email"),
            phone: searchParams.get("phone"),
            address: searchParams.get("address"),
          },
        };

        // Validate required fields
        if (!bookingData.providerId || !bookingData.serviceType || !bookingData.totalAmount) {
          throw new Error("Missing required booking information");
        }

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Please sign in to complete your booking");
          navigate("/booking/review?" + searchParams.toString());
          return;
        }

        console.log("[CHECKOUT] Creating checkout session with:", bookingData);

        // Call edge function to create checkout session
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          body: bookingData,
        });

        if (error) throw error;

        if (!data?.url) {
          throw new Error("No checkout URL returned");
        }

        console.log("[CHECKOUT] Redirecting to Stripe:", data.url);

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } catch (err: unknown) {
        console.error("[CHECKOUT] Error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to create checkout session";
        setError(errorMessage);
        setIsProcessing(false);
        toast.error("Payment processing failed. Please try again.");
      }
    };

    createCheckoutSession();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Payment Error</CardTitle>
            <CardDescription>
              There was a problem processing your payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/booking/review?" + searchParams.toString())}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>
            Please wait while we redirect you to secure payment
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground text-center">
            Redirecting to Stripe Checkout...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingCheckout;
