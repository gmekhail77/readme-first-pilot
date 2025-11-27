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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Search, CheckCircle, XCircle, Ban, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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
  created_at: string;
}

export default function AdminProviders() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [providers, statusFilter, cityFilter, searchQuery]);

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

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProviders(data || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load providers");
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // City filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((p) => p.cities.includes(cityFilter));
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.business_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProviders(filtered);
  };

  const handleApprove = async (providerId: string) => {
    setActionLoading(providerId);
    try {
      const { error } = await supabase
        .from("providers")
        .update({ status: "approved" })
        .eq("id", providerId);

      if (error) throw error;

      toast.success("Provider approved successfully");
      fetchProviders();
    } catch (error) {
      console.error("Error approving provider:", error);
      toast.error("Failed to approve provider");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedProvider) return;

    setActionLoading(selectedProvider.id);
    try {
      const { error } = await supabase
        .from("providers")
        .delete()
        .eq("id", selectedProvider.id);

      if (error) throw error;

      toast.success("Provider application rejected and removed");
      fetchProviders();
    } catch (error) {
      console.error("Error rejecting provider:", error);
      toast.error("Failed to reject provider");
    } finally {
      setActionLoading(null);
      setRejectDialogOpen(false);
      setSelectedProvider(null);
    }
  };

  const handleSuspend = async (providerId: string) => {
    setActionLoading(providerId);
    try {
      const { error } = await supabase
        .from("providers")
        .update({ status: "suspended" })
        .eq("id", providerId);

      if (error) throw error;

      toast.success("Provider suspended successfully");
      fetchProviders();
    } catch (error) {
      console.error("Error suspending provider:", error);
      toast.error("Failed to suspend provider");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (providerId: string) => {
    setActionLoading(providerId);
    try {
      const { error } = await supabase
        .from("providers")
        .update({ status: "approved" })
        .eq("id", providerId);

      if (error) throw error;

      toast.success("Provider reactivated successfully");
      fetchProviders();
    } catch (error) {
      console.error("Error reactivating provider:", error);
      toast.error("Failed to reactivate provider");
    } finally {
      setActionLoading(null);
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

  const uniqueCities = Array.from(
    new Set(providers.flatMap((p) => p.cities))
  ).sort();

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
          <h1 className="text-4xl font-bold">Provider Management</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Review, approve, and manage service providers
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
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
                      <SelectItem key={city} value={city}>
                        {city}
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
                    placeholder="Search by business name"
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
            <CardTitle>
              Providers ({filteredProviders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProviders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No providers found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Cities</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => navigate(`/admin/providers/${provider.id}`)}
                          className="text-primary hover:underline"
                        >
                          {provider.business_name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {provider.services.map((service) => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider.cities.join(", ")}
                      </TableCell>
                      <TableCell>{getStatusBadge(provider.status)}</TableCell>
                      <TableCell>{provider.years_experience} years</TableCell>
                      <TableCell>
                        {provider.rating ? (
                          <span>
                            {provider.rating.toFixed(1)} ({provider.total_reviews})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No reviews</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {provider.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(provider.id)}
                                disabled={actionLoading === provider.id}
                              >
                                {actionLoading === provider.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedProvider(provider);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={actionLoading === provider.id}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          {provider.status === "approved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(provider.id)}
                              disabled={actionLoading === provider.id}
                            >
                              {actionLoading === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Ban className="mr-1 h-4 w-4" />
                                  Suspend
                                </>
                              )}
                            </Button>
                          )}
                          {provider.status === "suspended" && (
                            <Button
                              size="sm"
                              onClick={() => handleReactivate(provider.id)}
                              disabled={actionLoading === provider.id}
                            >
                              {actionLoading === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="mr-1 h-4 w-4" />
                                  Reactivate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Provider Application</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject and delete the application for{" "}
                <strong>{selectedProvider?.business_name}</strong>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reject & Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
