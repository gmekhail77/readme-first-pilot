import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Database, ArrowLeft, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

interface MappedProvider {
  business_name: string;
  cities: string[];
  services: string[];
  rating: number | null;
  total_reviews: number;
  phone: string | null;
  website: string | null;
  place_id: string;
  source: string;
  auto_created: boolean;
  status: string;
  pricing_tier: string;
  years_experience: number;
  insurance_verified: boolean;
}

interface PreviewResponse {
  message: string;
  count: number;
  providers: MappedProvider[];
}

interface InsertResponse {
  message: string;
  summary: {
    inserted: number;
    updated: number;
    skipped: number;
    total: number;
  };
}

export default function AdminSeeding() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceType, setServiceType] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isInsertLoading, setIsInsertLoading] = useState(false);
  const [previewData, setPreviewData] = useState<MappedProvider[]>([]);
  const [insertSummary, setInsertSummary] = useState<InsertResponse["summary"] | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

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

  const handlePreview = async () => {
    if (!serviceType || !city) {
      toast.error("Please select both service type and city");
      return;
    }

    setIsPreviewLoading(true);
    setPreviewData([]);
    setInsertSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("seed-providers", {
        body: {
          serviceType,
          city,
          state: "AZ",
          insert: false,
        },
      });

      if (error) throw error;

      const response = data as PreviewResponse;
      setPreviewData(response.providers || []);
      toast.success(`Found ${response.count} providers to seed`);
    } catch (error) {
      console.error("Preview error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to preview providers");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleInsert = async () => {
    if (!serviceType || !city) {
      toast.error("Please select both service type and city");
      return;
    }

    if (previewData.length === 0) {
      toast.error("Please preview data first before inserting");
      return;
    }

    setIsInsertLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("seed-providers", {
        body: {
          serviceType,
          city,
          state: "AZ",
          insert: true,
        },
      });

      if (error) throw error;

      const response = data as InsertResponse;
      setInsertSummary(response.summary);
      toast.success(`Seeding complete! ${response.summary.inserted} inserted, ${response.summary.updated} updated`);
      setPreviewData([]);
    } catch (error) {
      console.error("Insert error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to insert providers");
    } finally {
      setIsInsertLoading(false);
    }
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
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-6 h-12 text-base"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Database className="h-10 w-10" />
            Provider Seeding
          </h1>
          <p className="text-xl text-muted-foreground mt-2">
            Seed providers from Google Places API
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seeding Configuration</CardTitle>
            <CardDescription>
              Select service type and city to fetch real business data from Google Places
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-base font-medium">Service Type</label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                    <SelectItem value="pool">Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium">City</label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gilbert">Gilbert</SelectItem>
                    <SelectItem value="Mesa">Mesa</SelectItem>
                    <SelectItem value="Chandler">Chandler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handlePreview}
                disabled={isPreviewLoading || !serviceType || !city}
                className="h-12 text-base"
                variant="outline"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Preview...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-5 w-5" />
                    Preview
                  </>
                )}
              </Button>

              <Button
                onClick={handleInsert}
                disabled={isInsertLoading || previewData.length === 0}
                className="h-12 text-base"
              >
                {isInsertLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Inserting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Insert into DB
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {insertSummary && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle>Seeding Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{insertSummary.inserted}</div>
                  <div className="text-sm text-muted-foreground mt-1">Inserted</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-secondary">{insertSummary.updated}</div>
                  <div className="text-sm text-muted-foreground mt-1">Updated</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-muted-foreground">{insertSummary.skipped}</div>
                  <div className="text-sm text-muted-foreground mt-1">Skipped</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{insertSummary.total}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Results ({previewData.length} providers)</CardTitle>
              <CardDescription>
                Review the data before inserting into the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Reviews</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((provider, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{provider.business_name}</TableCell>
                        <TableCell>
                          {provider.rating ? (
                            <Badge variant="outline">{provider.rating} ⭐</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{provider.total_reviews}</TableCell>
                        <TableCell className="text-sm">
                          {provider.phone || <span className="text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {provider.website ? (
                            <a
                              href={provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {provider.website}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge>{provider.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
