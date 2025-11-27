import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, DollarSign, Phone, Mail, User, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

interface Job {
  id: string;
  service_type: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  pricing_details: Record<string, unknown>;
  scheduled_date: string | null;
  created_at: string;
  property: {
    address: string;
    city: string;
    zip_code: string;
    square_feet: number | null;
    lot_size: number | null;
    pool_type: string | null;
    pool_size: string | null;
    user: {
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
}

export default function ProviderJobs() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    checkAuthAndFetchJobs();
  }, []);

  const checkAuthAndFetchJobs = async () => {
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

      setProviderId(provider.id);
      await fetchJobs(provider.id);
    } catch (error) {
      console.error("Error:", error);
      navigate("/provider/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobs = async (providerId: string) => {
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
          pool_type,
          pool_size,
          user:profiles(full_name, email, phone)
        )
      `)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
      return;
    }

    setJobs(data as Job[]);
  };

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      const updates: { status: string; completed_date?: string } = { status: newStatus };
      
      if (newStatus === "completed") {
        updates.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", jobId);

      if (error) throw error;

      // Refresh jobs
      if (providerId) {
        await fetchJobs(providerId);
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
      cleaning: "🧹 Cleaning",
      landscaping: "🌿 Landscaping",
      pool: "🏊 Pool",
    };
    return labels[service] || service;
  };

  const filterJobsByStatus = (status: string) => {
    const statusMap: Record<string, string[]> = {
      pending: ["pending_deposit"],
      confirmed: ["confirmed"],
      in_progress: ["in_progress"],
      completed: ["completed", "paid"],
    };
    return jobs.filter(job => statusMap[status]?.includes(job.status));
  };

  const renderJobCard = (job: Job) => {
    const remainingAmount = job.total_amount - job.deposit_amount;
    
    return (
      <Card key={job.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">{getServiceLabel(job.service_type)}</h3>
                <p className="text-sm text-muted-foreground">
                  Job #{job.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <Badge variant={job.status === "paid" ? "outline" : "default"}>
                {job.status.replace("_", " ")}
              </Badge>
            </div>

            {/* Property Details */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{job.property.address}</p>
                <p className="text-muted-foreground">{job.property.city}, AZ {job.property.zip_code}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{job.property.user.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{job.property.user.email}</span>
              </div>
              {job.property.user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{job.property.user.phone}</span>
                </div>
              )}
            </div>

            {/* Dates & Payment */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Booking Date</p>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payment</p>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">{formatCurrency(job.total_amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deposit: {formatCurrency(job.deposit_amount)} paid
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/provider/jobs/${job.id}`)}
              >
                View Details
              </Button>

              {job.status === "pending_deposit" && (
                <>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(job.id, "confirmed")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Accept Job
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleStatusUpdate(job.id, "cancelled")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}

              {job.status === "confirmed" && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusUpdate(job.id, "in_progress")}
                >
                  Mark as In Progress
                </Button>
              )}

              {job.status === "in_progress" && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusUpdate(job.id, "completed")}
                >
                  Mark as Complete
                </Button>
              )}
            </div>

            {job.status === "in_progress" && (
              <p className="text-xs text-muted-foreground border-t pt-2">
                ⚠️ Marking as complete will charge the customer the remaining {formatCurrency(remainingAmount)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProviderSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div>
              <h1 className="text-2xl font-bold">My Jobs</h1>
              <p className="text-sm text-muted-foreground">Manage your service bookings</p>
            </div>
          </header>

          <main className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending">
                  Pending ({filterJobsByStatus("pending").length})
                </TabsTrigger>
                <TabsTrigger value="confirmed">
                  Confirmed ({filterJobsByStatus("confirmed").length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({filterJobsByStatus("in_progress").length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({filterJobsByStatus("completed").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {filterJobsByStatus("pending").length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground">No pending jobs</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        New bookings will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filterJobsByStatus("pending").map(renderJobCard)
                )}
              </TabsContent>

              <TabsContent value="confirmed" className="space-y-4">
                {filterJobsByStatus("confirmed").length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground">No confirmed jobs</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Accepted jobs will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filterJobsByStatus("confirmed").map(renderJobCard)
                )}
              </TabsContent>

              <TabsContent value="in_progress" className="space-y-4">
                {filterJobsByStatus("in_progress").length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground">No jobs in progress</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Active jobs will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filterJobsByStatus("in_progress").map(renderJobCard)
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {filterJobsByStatus("completed").length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground">No completed jobs</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Finished jobs will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filterJobsByStatus("completed").map(renderJobCard)
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
