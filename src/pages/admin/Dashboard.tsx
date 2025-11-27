import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Briefcase, DollarSign, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

interface PlatformStats {
  providers: {
    total: number;
    pending: number;
    approved: number;
    suspended: number;
  };
  jobs: {
    total: number;
    pending_deposit: number;
    confirmed: number;
    in_progress: number;
    completed: number;
  };
  revenue: number;
  jobsByCity: { city: string; count: number }[];
}

interface RecentActivity {
  type: "provider" | "job" | "payment";
  title: string;
  description: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPlatformStats();
      fetchRecentActivity();
    }
  }, [isAdmin]);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin/login");
        return;
      }

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const hasAdminRole = roles?.some(r => r.role === "admin");

      if (!hasAdminRole) {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      // Fetch provider stats
      const { data: providers, error: providersError } = await supabase
        .from("providers")
        .select("status");

      if (providersError) throw providersError;

      const providerStats = {
        total: providers?.length || 0,
        pending: providers?.filter((p) => p.status === "pending").length || 0,
        approved: providers?.filter((p) => p.status === "approved").length || 0,
        suspended: providers?.filter((p) => p.status === "suspended").length || 0,
      };

      // Fetch job stats
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("status, total_amount, property_id, property_profiles(city)");

      if (jobsError) throw jobsError;

      const jobStats = {
        total: jobs?.length || 0,
        pending_deposit: jobs?.filter((j) => j.status === "pending_deposit").length || 0,
        confirmed: jobs?.filter((j) => j.status === "confirmed").length || 0,
        in_progress: jobs?.filter((j) => j.status === "in_progress").length || 0,
        completed: jobs?.filter((j) => j.status === "completed").length || 0,
      };

      // Calculate total revenue from completed jobs
      const revenue = jobs
        ?.filter((j) => j.status === "completed")
        .reduce((sum, j) => sum + Number(j.total_amount), 0) || 0;

      // Jobs by city
      const cityMap = new Map<string, number>();
      jobs?.forEach((job: any) => {
        const city = job.property_profiles?.city;
        if (city) {
          cityMap.set(city, (cityMap.get(city) || 0) + 1);
        }
      });

      const jobsByCity = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        providers: providerStats,
        jobs: jobStats,
        revenue,
        jobsByCity,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      toast.error("Failed to load platform statistics");
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Recent provider applications
      const { data: recentProviders } = await supabase
        .from("providers")
        .select("business_name, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5);

      recentProviders?.forEach((provider) => {
        activities.push({
          type: "provider",
          title: "New Provider Application",
          description: `${provider.business_name} applied`,
          timestamp: provider.created_at,
        });
      });

      // Recently completed jobs
      const { data: recentJobs } = await supabase
        .from("jobs")
        .select("service_type, completed_date, providers(business_name)")
        .eq("status", "completed")
        .not("completed_date", "is", null)
        .order("completed_date", { ascending: false })
        .limit(5);

      recentJobs?.forEach((job: any) => {
        activities.push({
          type: "job",
          title: "Job Completed",
          description: `${job.providers?.business_name} completed ${job.service_type} service`,
          timestamp: job.completed_date,
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-xl text-muted-foreground mt-2">
              JobMatchAZ Platform Management
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="h-12 text-base">
            Sign Out
          </Button>
        </div>

        {!stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Platform Overview Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Providers Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Providers</CardTitle>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.providers.total}</div>
                  <div className="flex gap-3 mt-4 text-sm">
                    <div>
                      <Badge variant="secondary">{stats.providers.pending}</Badge>
                      <p className="text-muted-foreground mt-1">Pending</p>
                    </div>
                    <div>
                      <Badge variant="default">{stats.providers.approved}</Badge>
                      <p className="text-muted-foreground mt-1">Approved</p>
                    </div>
                    <div>
                      <Badge variant="destructive">{stats.providers.suspended}</Badge>
                      <p className="text-muted-foreground mt-1">Suspended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Jobs Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Jobs</CardTitle>
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.jobs.total}</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Deposit</span>
                      <span className="font-medium">{stats.jobs.pending_deposit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confirmed</span>
                      <span className="font-medium">{stats.jobs.confirmed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="font-medium">{stats.jobs.in_progress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{stats.jobs.completed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(stats.revenue)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    From {stats.jobs.completed} completed jobs
                  </p>
                </CardContent>
              </Card>

              {/* Jobs by City Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Jobs by City</CardTitle>
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-2">
                    {stats.jobsByCity.length > 0 ? (
                      stats.jobsByCity.map((item) => (
                        <div key={item.city} className="flex justify-between items-center">
                          <span className="text-base font-medium">{item.city}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No jobs yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest platform events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {activity.type === "provider" && (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          {activity.type === "job" && (
                            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                              <Briefcase className="h-5 w-5 text-secondary" />
                            </div>
                          )}
                          {activity.type === "payment" && (
                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-accent" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDateTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
