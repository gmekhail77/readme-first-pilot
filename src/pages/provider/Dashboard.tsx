import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { Loader2, Clock, CheckCircle2, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

interface Provider {
  id: string;
  business_name: string;
  status: string;
  services: string[];
  cities: string[];
  pricing_tier: string;
  years_experience: number;
  rating: number;
  total_reviews: number;
}

interface JobStats {
  pending: number;
  inProgress: number;
  completedThisMonth: number;
}

interface Earnings {
  totalEarned: number;
  pendingCompletion: number;
}

interface RecentJob {
  id: string;
  service_type: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  scheduled_date: string | null;
  created_at: string;
  property: {
    address: string;
    city: string;
  };
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [jobStats, setJobStats] = useState<JobStats>({ pending: 0, inProgress: 0, completedThisMonth: 0 });
  const [earnings, setEarnings] = useState<Earnings>({ totalEarned: 0, pendingCompletion: 0 });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider/login");
        return;
      }

      const { data: providerData, error } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !providerData) {
        toast.error("Provider profile not found");
        await supabase.auth.signOut();
        navigate("/provider/login");
        return;
      }

      setProvider(providerData);

      // If approved, fetch dashboard data
      if (providerData.status === "approved") {
        await fetchDashboardData(providerData.id);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/provider/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async (providerId: string) => {
    try {
      // Fetch all jobs for this provider
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          *,
          property:property_profiles(address, city)
        `)
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate job stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats: JobStats = {
        pending: jobs?.filter(j => j.status === "pending_deposit" || j.status === "confirmed").length || 0,
        inProgress: jobs?.filter(j => j.status === "in_progress").length || 0,
        completedThisMonth: jobs?.filter(j => {
          const completedDate = j.completed_date ? new Date(j.completed_date) : null;
          return j.status === "completed" && completedDate && completedDate >= startOfMonth;
        }).length || 0,
      };
      setJobStats(stats);

      // Calculate earnings
      const totalEarned = jobs
        ?.filter(j => j.status === "paid")
        .reduce((sum, j) => sum + parseFloat(j.total_amount.toString()), 0) || 0;
      
      const pendingCompletion = jobs
        ?.filter(j => j.status === "confirmed" || j.status === "in_progress")
        .reduce((sum, j) => sum + (parseFloat(j.total_amount.toString()) - parseFloat(j.deposit_amount.toString())), 0) || 0;

      setEarnings({ totalEarned, pendingCompletion });

      // Set recent jobs (limit to 5)
      setRecentJobs((jobs || []).slice(0, 5) as RecentJob[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/provider/login");
  };

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      cleaning: "🧹 Cleaning",
      landscaping: "🌿 Landscaping",
      pool: "🏊 Pool",
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

  // Pending approval state
  if (provider?.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-3xl">Application Under Review</CardTitle>
            <CardDescription className="text-lg">
              Your provider application is being reviewed by our admin team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center py-8">
              <Clock className="h-24 w-24 text-primary" />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Application Details</h3>
              <div className="grid grid-cols-2 gap-4 text-base">
                <div>
                  <p className="text-muted-foreground">Business Name</p>
                  <p className="font-medium">{provider.business_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pricing Tier</p>
                  <p className="font-medium capitalize">{provider.pricing_tier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Services</p>
                  <p className="font-medium">{provider.services.map(s => getServiceLabel(s)).join(", ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service Areas</p>
                  <p className="font-medium">{provider.cities.join(", ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Experience</p>
                  <p className="font-medium">{provider.years_experience} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="text-base">Pending Review</Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-base text-muted-foreground">
                You'll receive a notification once your application has been reviewed. 
                This typically takes 24-48 hours. Thank you for your patience!
              </p>
            </div>

            <Button onClick={handleSignOut} variant="outline" className="w-full h-12 text-base">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Suspended state
  if (provider?.status === "suspended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Account Suspended</CardTitle>
            <CardDescription>
              Your provider account has been suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base">
              Please contact support for more information about your account status.
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full h-12">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved provider dashboard
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProviderSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div>
              <h1 className="text-2xl font-bold">{provider?.business_name}</h1>
              <p className="text-sm text-muted-foreground">Provider Dashboard</p>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{jobStats.pending}</div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting confirmation or start
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{jobStats.inProgress}</div>
                    <p className="text-xs text-muted-foreground">
                      Currently active jobs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{jobStats.completedThisMonth}</div>
                    <p className="text-xs text-muted-foreground">
                      Jobs finished in {new Date().toLocaleString('default', { month: 'long' })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(earnings.totalEarned)}</div>
                    <p className="text-xs text-muted-foreground">
                      All-time earnings
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Earnings Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Summary</CardTitle>
                  <CardDescription>Your payment breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earned (Paid Jobs)</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(earnings.totalEarned)}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Completion Charges</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(earnings.pendingCompletion)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Remaining 50% balance for confirmed jobs
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Jobs</CardTitle>
                  <CardDescription>Your latest job assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentJobs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No jobs yet. You'll see your assignments here once customers book your services.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{getServiceLabel(job.service_type)}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {job.property.address}, {job.property.city}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {job.scheduled_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(job.scheduled_date).toLocaleDateString()}
                                </span>
                              )}
                              <span>Job #{job.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-semibold">{formatCurrency(job.total_amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              Deposit: {formatCurrency(job.deposit_amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
