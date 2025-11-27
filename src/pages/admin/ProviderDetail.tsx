import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, CheckCircle, Ban, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface Provider {
  id: string;
  business_name: string;
  services: string[];
  cities: string[];
  status: "pending" | "approved" | "suspended";
  years_experience: number;
  pricing_tier: string;
  rating: number | null;
  total_reviews: number | null;
  insurance_verified: boolean;
  created_at: string;
  user_id: string;
}

interface Job {
  id: string;
  service_type: string;
  status: string;
  total_amount: number;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  property_profiles: {
    address: string;
    city: string;
  };
}

export default function AdminProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "suspend" | "reactivate" | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (isAdmin && id) {
      fetchProviderDetails();
    }
  }, [isAdmin, id]);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const hasAdminRole = roles?.some((r) => r.role === "admin");

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

  const fetchProviderDetails = async () => {
    try {
      // Fetch provider details
      const { data: providerData, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("id", id)
        .single();

      if (providerError) throw providerError;

      setProvider(providerData);

      // Fetch provider's jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*, property_profiles(address, city)")
        .eq("provider_id", id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      setJobs(jobsData || []);
    } catch (error) {
      console.error("Error fetching provider details:", error);
      toast.error("Failed to load provider details");
      navigate("/admin/providers");
    }
  };

  const handleStatusChange = async () => {
    if (!provider || !actionType) return;

    setActionLoading(true);
    try {
      let newStatus: "approved" | "suspended";
      
      if (actionType === "approve" || actionType === "reactivate") {
        newStatus = "approved";
      } else {
        newStatus = "suspended";
      }

      const { error } = await supabase
        .from("providers")
        .update({ status: newStatus })
        .eq("id", provider.id);

      if (error) throw error;

      toast.success(
        actionType === "approve"
          ? "Provider approved successfully"
          : actionType === "suspend"
          ? "Provider suspended successfully"
          : "Provider reactivated successfully"
      );

      fetchProviderDetails();
    } catch (error) {
      console.error("Error updating provider status:", error);
      toast.error("Failed to update provider status");
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "pending_deposit":
        return <Badge variant="secondary">Pending Deposit</Badge>;
      case "confirmed":
        return <Badge variant="default">Confirmed</Badge>;
      case "in_progress":
        return <Badge>In Progress</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completedJobs = jobs.filter((j) => j.status === "completed").length;
  const completionRate =
    jobs.length > 0 ? ((completedJobs / jobs.length) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin || !provider) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/providers")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Providers
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold">{provider.business_name}</h1>
              <p className="text-xl text-muted-foreground mt-2">
                Provider Details & Management
              </p>
            </div>
            <div className="flex gap-2">
              {provider.status === "pending" && (
                <Button
                  onClick={() => {
                    setActionType("approve");
                    setActionDialogOpen(true);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Provider
                </Button>
              )}
              {provider.status === "approved" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setActionType("suspend");
                    setActionDialogOpen(true);
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend Provider
                </Button>
              )}
              {provider.status === "suspended" && (
                <Button
                  onClick={() => {
                    setActionType("reactivate");
                    setActionDialogOpen(true);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate Provider
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>{getStatusBadge(provider.status)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {completedJobs} of {jobs.length} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              {provider.rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <div>
                    <div className="text-3xl font-bold">
                      {provider.rating.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.total_reviews} reviews
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Provider Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Services Offered</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {provider.services.map((service) => (
                    <Badge key={service} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Service Areas</p>
                <p className="text-base font-medium mt-1">
                  {provider.cities.join(", ")}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Pricing Tier</p>
                <p className="text-base font-medium mt-1 capitalize">
                  {provider.pricing_tier}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Years of Experience</p>
                <p className="text-base font-medium mt-1">
                  {provider.years_experience} years
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Insurance Verified</p>
                <p className="text-base font-medium mt-1">
                  {provider.insurance_verified ? "✓ Yes" : "✗ No"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-base font-medium mt-1">
                  {formatDate(provider.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Stats</CardTitle>
              <CardDescription>Job completion and performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Pending Deposit</span>
                  <span className="font-medium">
                    {jobs.filter((j) => j.status === "pending_deposit").length}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span className="font-medium">
                    {jobs.filter((j) => j.status === "confirmed").length}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">In Progress</span>
                  <span className="font-medium">
                    {jobs.filter((j) => j.status === "in_progress").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{completedJobs}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job History</CardTitle>
            <CardDescription>All jobs assigned to this provider</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No jobs assigned yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium capitalize">
                        {job.service_type}
                      </TableCell>
                      <TableCell>
                        {job.property_profiles?.address}, {job.property_profiles?.city}
                      </TableCell>
                      <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                      <TableCell>{formatCurrency(Number(job.total_amount))}</TableCell>
                      <TableCell>
                        {job.scheduled_date
                          ? formatDate(job.scheduled_date)
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        {job.completed_date
                          ? formatDate(job.completed_date)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === "approve" && "Approve Provider"}
                {actionType === "suspend" && "Suspend Provider"}
                {actionType === "reactivate" && "Reactivate Provider"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === "approve" &&
                  `Are you sure you want to approve ${provider.business_name}? They will be able to accept jobs immediately.`}
                {actionType === "suspend" &&
                  `Are you sure you want to suspend ${provider.business_name}? They will not be able to accept new jobs.`}
                {actionType === "reactivate" &&
                  `Are you sure you want to reactivate ${provider.business_name}? They will be able to accept jobs again.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStatusChange} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
