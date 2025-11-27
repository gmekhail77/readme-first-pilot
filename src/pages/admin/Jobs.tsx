import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils/format";

interface Job {
  id: string;
  service_type: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  property_profiles: {
    address: string;
    city: string;
    zip_code: string;
    profiles: {
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
  providers: {
    business_name: string;
  };
}

export default function AdminJobs() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchJobs();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [jobs, statusFilter, cityFilter, serviceTypeFilter, searchQuery]);

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

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          property_profiles (
            address,
            city,
            zip_code,
            profiles (
              full_name,
              email,
              phone
            )
          ),
          providers (
            business_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((j) => j.status === statusFilter);
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((j) => j.property_profiles?.city === cityFilter);
    }

    // Service type filter
    if (serviceTypeFilter !== "all") {
      filtered = filtered.filter((j) => j.service_type === serviceTypeFilter);
    }

    // Search filter (job ID or customer name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          j.id.toLowerCase().includes(query) ||
          j.property_profiles?.profiles?.full_name.toLowerCase().includes(query) ||
          j.property_profiles?.profiles?.email.toLowerCase().includes(query)
      );
    }

    setFilteredJobs(filtered);
  };

  const handleUpdateStatus = async () => {
    if (!selectedJob || !newStatus) return;

    setActionLoading(true);
    try {
      const updateData: { status: "cancelled" | "completed" | "confirmed" | "in_progress" | "paid" | "pending_deposit"; completed_date?: string } = { 
        status: newStatus as "cancelled" | "completed" | "confirmed" | "in_progress" | "paid" | "pending_deposit"
      };

      // Set completed_date if marking as completed
      if (newStatus === "completed") {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", selectedJob.id);

      if (error) throw error;

      toast.success("Job status updated successfully");
      fetchJobs();
      setUpdateStatusDialogOpen(false);
      setDetailDialogOpen(false);
      setSelectedJob(null);
      setNewStatus("");
    } catch (error) {
      console.error("Error updating job status:", error);
      toast.error("Failed to update job status");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  const uniqueCities = Array.from(
    new Set(jobs.map((j) => j.property_profiles?.city).filter(Boolean))
  ).sort();

  const serviceTypes = ["cleaning", "landscaping", "pool"];

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
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold">Job Management</h1>
          <p className="text-xl text-muted-foreground mt-2">
            View and manage all jobs across the platform
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_deposit">Pending Deposit</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city!}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Service Type</label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Job ID or customer name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Jobs ({filteredJobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredJobs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No jobs found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {job.property_profiles?.profiles?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {job.property_profiles?.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{job.providers?.business_name}</TableCell>
                      <TableCell className="capitalize">{job.service_type}</TableCell>
                      <TableCell>
                        {job.property_profiles?.city}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{formatCurrency(Number(job.total_amount))}</TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Job Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Job Details</DialogTitle>
              <DialogDescription>
                Complete information about this job
              </DialogDescription>
            </DialogHeader>

            {selectedJob && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-3">Job Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Job ID:</span>
                        <p className="font-mono">{selectedJob.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Service Type:</span>
                        <p className="capitalize">{selectedJob.service_type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="mt-1">{getStatusBadge(selectedJob.status)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p>{formatDateTime(selectedJob.created_at)}</p>
                      </div>
                      {selectedJob.scheduled_date && (
                        <div>
                          <span className="text-muted-foreground">Scheduled:</span>
                          <p>{formatDateTime(selectedJob.scheduled_date)}</p>
                        </div>
                      )}
                      {selectedJob.completed_date && (
                        <div>
                          <span className="text-muted-foreground">Completed:</span>
                          <p>{formatDateTime(selectedJob.completed_date)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Payment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <p className="text-lg font-bold">
                          {formatCurrency(Number(selectedJob.total_amount))}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deposit Amount:</span>
                        <p>{formatCurrency(Number(selectedJob.deposit_amount))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining Balance:</span>
                        <p>
                          {formatCurrency(
                            Number(selectedJob.total_amount) -
                              Number(selectedJob.deposit_amount)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-3">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p>{selectedJob.property_profiles?.profiles?.full_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p>{selectedJob.property_profiles?.profiles?.email}</p>
                      </div>
                      {selectedJob.property_profiles?.profiles?.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p>{selectedJob.property_profiles.profiles.phone}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Property Address:</span>
                        <p>
                          {selectedJob.property_profiles?.address}
                          <br />
                          {selectedJob.property_profiles?.city},{" "}
                          {selectedJob.property_profiles?.zip_code}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Provider Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Business Name:</span>
                        <p>{selectedJob.providers?.business_name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setDetailDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setNewStatus(selectedJob.status);
                      setUpdateStatusDialogOpen(true);
                    }}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Job Status</DialogTitle>
              <DialogDescription>
                Change the status of this job
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_deposit">Pending Deposit</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUpdateStatusDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
