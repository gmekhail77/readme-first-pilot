import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface JobDetails {
  id: string;
  service_type: string;
  total_amount: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  provider: {
    business_name: string;
  };
}

const BookingConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const jobId = searchParams.get("job_id");
        if (!jobId) {
          throw new Error("No job ID provided");
        }

        // Fetch job details
        const { data, error } = await supabase
          .from("jobs")
          .select(`
            *,
            provider:providers(business_name)
          `)
          .eq("id", jobId)
          .single();

        if (error) throw error;

        setJob(data);
        
        // Show success toast
        toast.success("Booking confirmed! Provider will contact you soon.");
      } catch (err: unknown) {
        console.error("[CONFIRMATION] Error:", err);
        toast.error("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [searchParams]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getServiceLabel = (service: string) => {
    return service.charAt(0).toUpperCase() + service.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading booking details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Booking Not Found</CardTitle>
            <CardDescription>
              We couldn't find your booking details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingAmount = job.total_amount - job.deposit_amount;

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
            <CardDescription className="text-base">
              Your deposit has been processed successfully
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Job ID: {job.id.slice(0, 8).toUpperCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Service Type</p>
                <p className="font-medium">{getServiceLabel(job.service_type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Provider</p>
                <p className="font-medium">{job.provider.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Booking Date</p>
                <p className="font-medium">{formatDate(job.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="font-medium capitalize">{job.status.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Receipt</CardTitle>
            <CardDescription>Payment breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Service Cost</span>
              <span className="font-medium">{formatCurrency(job.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit Paid (50%)</span>
              <span className="font-medium text-green-600">
                {formatCurrency(job.deposit_amount)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Remaining Balance</span>
              <span className="text-orange-600">{formatCurrency(remainingAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Remaining balance due upon service completion
            </p>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Provider Will Contact You</p>
                <p className="text-sm text-muted-foreground">
                  Your selected provider will reach out within 24 hours to schedule the service
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Service Completion</p>
                <p className="text-sm text-muted-foreground">
                  After the service is completed, you'll pay the remaining balance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Leave a Review</p>
                <p className="text-sm text-muted-foreground">
                  Help others by sharing your experience with the provider
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
            Return Home
          </Button>
          <Button 
            onClick={() => toast.info("My Jobs page coming soon!")} 
            className="flex-1"
          >
            View My Jobs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
