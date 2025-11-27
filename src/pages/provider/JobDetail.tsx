import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, MapPin, User, Mail, Phone, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

interface JobDetail {
  id: string;
  service_type: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  pricing_details: Record<string, unknown>;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  property: {
    address: string;
    city: string;
    zip_code: string;
    square_feet: number | null;
    lot_size: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    pool_type: string | null;
    pool_size: string | null;
    user: {
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);

  useEffect(() => {
    checkAuthAndFetchJob();
  }, [id]);

  const checkAuthAndFetchJob = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider/login");
        return;
      }

      const { data: provider } = await supabase
        .from("providers")
        .select("id, status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!provider || provider.status !== "approved") {
        navigate("/provider/dashboard");
        return;
      }

      await fetchJobDetail(provider.id);
    } catch (error) {
      console.error("Error:", error);
      navigate("/provider/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetail = async (providerId: string) => {
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        property:property_profiles(
          address,
          city,
          zip_code,
          square_feet,
          lot_size,
          bedrooms,
          bathrooms,
          pool_type,
          pool_size,
          user:profiles(full_name, email, phone)
        )
      `)
      .eq("id", id)
      .eq("provider_id", providerId)
      .maybeSingle();

    if (error || !data) {
      toast.error("Job not found");
      navigate("/provider/jobs");
      return;
    }

    setJob(data as JobDetail);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!job) return;

    try {
      const updates: { status: string; completed_date?: string } = { status: newStatus };
      
      if (newStatus === "completed") {
        updates.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", job.id);

      if (error) throw error;

      // Refresh job details
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: provider } = await supabase
          .from("providers")
          .select("id")
          .eq("user_id", session.user.id)
          .single();
        
        if (provider) {
          await fetchJobDetail(provider.id);
        }
      }

      const statusMessages: Record<string, string> = {
        confirmed: "Job accepted successfully",
        in_progress: "Job marked as in progress",
        completed: "Job marked as complete. Customer will be charged remaining balance.",
        cancelled: "Job declined",
      };

      toast.success(statusMessages[newStatus] || "Job status updated");
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("Failed to update job status");
    }
  };

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      cleaning: "🧹 House Cleaning",
      landscaping: "🌿 Landscaping",
      pool: "🏊 Pool Service",
    };
    return labels[service] || service;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending_deposit: { variant: "secondary", label: "Pending Deposit" },
      confirmed: { variant: "default", label: "Confirmed" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      paid: { variant: "outline", label: "Paid" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const remainingAmount = job.total_amount - job.deposit_amount;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProviderSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/provider/jobs")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Job Details</h1>
              <p className="text-sm text-muted-foreground">#{job.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Job Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{getServiceLabel(job.service_type)}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Booked on {new Date(job.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Property Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-semibold">{job.property.address}</p>
                      <p className="text-muted-foreground">{job.property.city}, AZ {job.property.zip_code}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Property Details */}
                  <div>
                    <h3 className="font-semibold mb-3">Property Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {job.property.square_feet && (
                        <div>
                          <p className="text-muted-foreground">Square Feet</p>
                          <p className="font-medium">{job.property.square_feet.toLocaleString()} sq ft</p>
                        </div>
                      )}
                      {job.property.lot_size && (
                        <div>
                          <p className="text-muted-foreground">Lot Size</p>
                          <p className="font-medium">{job.property.lot_size.toLocaleString()} sq ft</p>
                        </div>
                      )}
                      {job.property.bedrooms && (
                        <div>
                          <p className="text-muted-foreground">Bedrooms</p>
                          <p className="font-medium">{job.property.bedrooms}</p>
                        </div>
                      )}
                      {job.property.bathrooms && (
                        <div>
                          <p className="text-muted-foreground">Bathrooms</p>
                          <p className="font-medium">{job.property.bathrooms}</p>
                        </div>
                      )}
                      {job.property.pool_type && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Pool Type</p>
                            <p className="font-medium capitalize">{job.property.pool_type.replace("_", " ")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pool Size</p>
                            <p className="font-medium capitalize">{job.property.pool_size}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{job.property.user.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{job.property.user.email}</p>
                    </div>
                  </div>
                  {job.property.user.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{job.property.user.phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-base">
                      <span>Total Service Cost</span>
                      <span className="font-semibold">{formatCurrency(job.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base text-green-600">
                      <span>Deposit Received (50%)</span>
                      <span className="font-semibold">{formatCurrency(job.deposit_amount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Remaining Balance</span>
                      <span className="text-orange-600">{formatCurrency(remainingAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Due upon service completion
                    </p>
                  </div>

                  {job.pricing_details && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Service Details</h4>
                        <div className="text-sm space-y-1 text-muted-foreground">
                          {Object.entries(job.pricing_details).map(([key, value]) => (
                            value && (
                              <p key={key}>
                                • {key.replace(/_/g, " ")}: {String(value)}
                              </p>
                            )
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Job Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Booking Created</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {job.status !== "pending_deposit" && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Status Updated</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(job.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {job.completed_date && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Service Completed</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(job.completed_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              {job.status === "pending_deposit" && (
                <Card className="border-primary">
                  <CardContent className="flex gap-3 p-6">
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={() => handleStatusUpdate("confirmed")}
                    >
                      Accept Job
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => handleStatusUpdate("cancelled")}
                    >
                      Decline Job
                    </Button>
                  </CardContent>
                </Card>
              )}

              {job.status === "confirmed" && (
                <Card className="border-primary">
                  <CardContent className="p-6">
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleStatusUpdate("in_progress")}
                    >
                      Mark as In Progress
                    </Button>
                  </CardContent>
                </Card>
              )}

              {job.status === "in_progress" && (
                <Card className="border-primary">
                  <CardContent className="p-6 space-y-3">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <p className="text-sm font-medium">
                        ⚠️ Marking as complete will charge the customer the remaining balance of {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleStatusUpdate("completed")}
                    >
                      Mark as Complete
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
