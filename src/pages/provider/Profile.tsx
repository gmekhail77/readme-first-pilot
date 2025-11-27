import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Save, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const SERVICES = [
  { id: "cleaning", label: "🧹 House Cleaning" },
  { id: "landscaping", label: "🌿 Landscaping" },
  { id: "pool", label: "🏊 Pool Service" },
];

const CITIES = [
  { id: "Gilbert", label: "Gilbert" },
  { id: "Mesa", label: "Mesa" },
  { id: "Chandler", label: "Chandler" },
];

const PRICING_TIERS = [
  { 
    id: "budget", 
    label: "Budget", 
    description: "Affordable rates for cost-conscious customers" 
  },
  { 
    id: "standard", 
    label: "Standard", 
    description: "Balanced pricing with good quality service" 
  },
  { 
    id: "premium", 
    label: "Premium", 
    description: "Premium service at higher rates" 
  },
];

const profileSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(20),
  services: z.array(z.string()).min(1, "Select at least one service"),
  cities: z.array(z.string()).min(1, "Select at least one city"),
  pricingTier: z.enum(["budget", "standard", "premium"]),
  yearsExperience: z.number().min(0, "Years must be 0 or greater").max(99),
  insuranceVerified: z.boolean(),
});

interface Provider {
  id: string;
  business_name: string;
  services: string[];
  cities: string[];
  pricing_tier: string;
  years_experience: number;
  insurance_verified: boolean;
  rating: number | null;
  total_reviews: number | null;
  user: {
    email: string;
    phone: string | null;
  };
}

export default function ProviderProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  
  const [formData, setFormData] = useState({
    businessName: "",
    phone: "",
    services: [] as string[],
    cities: [] as string[],
    pricingTier: "standard",
    yearsExperience: 0,
    insuranceVerified: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuthAndFetchProfile();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider/login");
        return;
      }

      const { data: providerData, error } = await supabase
        .from("providers")
        .select(`
          *,
          user:profiles(email, phone)
        `)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !providerData) {
        toast.error("Provider profile not found");
        navigate("/provider/login");
        return;
      }

      if (providerData.status !== "approved") {
        navigate("/provider/dashboard");
        return;
      }

      setProvider(providerData as Provider);
      
      // Initialize form with current data
      setFormData({
        businessName: providerData.business_name,
        phone: providerData.user.phone || "",
        services: providerData.services,
        cities: providerData.cities,
        pricingTier: providerData.pricing_tier,
        yearsExperience: providerData.years_experience,
        insuranceVerified: providerData.insurance_verified,
      });
    } catch (error) {
      console.error("Error:", error);
      navigate("/provider/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((s) => s !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  const handleCityToggle = (cityId: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.includes(cityId)
        ? prev.cities.filter((c) => c !== cityId)
        : [...prev.cities, cityId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      if (!provider) return;

      // Validate form data
      const validatedData = profileSchema.parse(formData);

      // Update provider profile
      const { error: providerError } = await supabase
        .from("providers")
        .update({
          business_name: validatedData.businessName,
          services: validatedData.services as Database["public"]["Enums"]["service_type"][],
          cities: validatedData.cities,
          pricing_tier: validatedData.pricingTier as Database["public"]["Enums"]["pricing_tier"],
          years_experience: validatedData.yearsExperience,
          insurance_verified: validatedData.insuranceVerified,
        })
        .eq("id", provider.id);

      if (providerError) throw providerError;

      // Update user profile (phone)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ phone: validatedData.phone })
          .eq("id", session.user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }
      }

      toast.success("Profile updated successfully");
      
      // Refresh data
      await checkAuthAndFetchProfile();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Please fix the form errors");
      } else {
        console.error("Update error:", error);
        toast.error("Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProviderSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div>
              <h1 className="text-2xl font-bold">Business Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your business information</p>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Profile Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{provider.business_name}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {provider.user.email}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-base capitalize">
                      {provider.pricing_tier} Tier
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 fill-primary text-primary" />
                      <span className="ml-1 font-semibold">
                        {provider.rating?.toFixed(1) || "New"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      ({provider.total_reviews || 0} reviews)
                    </span>
                    <Separator orientation="vertical" className="h-4 mx-2" />
                    <span className="text-muted-foreground">
                      {provider.years_experience} years experience
                    </span>
                    {provider.insurance_verified && (
                      <>
                        <Separator orientation="vertical" className="h-4 mx-2" />
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                          ✓ Insured
                        </Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Edit Profile Form */}
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Update your business details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Business Name */}
                    <div>
                      <Label htmlFor="businessName" className="text-base">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="h-12 text-base mt-2"
                        placeholder="ABC Home Services"
                      />
                      {errors.businessName && (
                        <p className="text-sm text-destructive mt-1">{errors.businessName}</p>
                      )}
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <Label htmlFor="email" className="text-base">Email (Read-only)</Label>
                      <Input
                        id="email"
                        value={provider.user.email}
                        disabled
                        className="h-12 text-base mt-2 bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Contact support to change your email address
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-base">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12 text-base mt-2"
                        placeholder="(480) 555-0100"
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Services Offered */}
                    <div className="space-y-3">
                      <Label className="text-base">Services Offered *</Label>
                      <div className="space-y-3">
                        {SERVICES.map((service) => (
                          <div key={service.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={service.id}
                              checked={formData.services.includes(service.id)}
                              onCheckedChange={() => handleServiceToggle(service.id)}
                              className="h-5 w-5"
                            />
                            <Label
                              htmlFor={service.id}
                              className="text-base cursor-pointer"
                            >
                              {service.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {errors.services && (
                        <p className="text-sm text-destructive mt-1">{errors.services}</p>
                      )}
                    </div>

                    {/* Service Areas */}
                    <div className="space-y-3">
                      <Label className="text-base">Service Areas *</Label>
                      <div className="space-y-3">
                        {CITIES.map((city) => (
                          <div key={city.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={city.id}
                              checked={formData.cities.includes(city.id)}
                              onCheckedChange={() => handleCityToggle(city.id)}
                              className="h-5 w-5"
                            />
                            <Label
                              htmlFor={city.id}
                              className="text-base cursor-pointer"
                            >
                              {city.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {errors.cities && (
                        <p className="text-sm text-destructive mt-1">{errors.cities}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Pricing Tier */}
                    <div className="space-y-3">
                      <Label className="text-base">Pricing Tier *</Label>
                      <RadioGroup
                        value={formData.pricingTier}
                        onValueChange={(value) => setFormData({ ...formData, pricingTier: value })}
                      >
                        {PRICING_TIERS.map((tier) => (
                          <div key={tier.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                            <RadioGroupItem value={tier.id} id={tier.id} className="mt-1" />
                            <div className="flex-1">
                              <Label
                                htmlFor={tier.id}
                                className="text-base font-semibold cursor-pointer"
                              >
                                {tier.label}
                              </Label>
                              <p className="text-sm text-muted-foreground">{tier.description}</p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Experience & Insurance */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="yearsExperience" className="text-base">Years of Experience *</Label>
                        <Input
                          id="yearsExperience"
                          type="number"
                          min="0"
                          max="99"
                          value={formData.yearsExperience}
                          onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || 0 })}
                          className="h-12 text-base mt-2"
                        />
                        {errors.yearsExperience && (
                          <p className="text-sm text-destructive mt-1">{errors.yearsExperience}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="insuranceVerified"
                          checked={formData.insuranceVerified}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, insuranceVerified: checked as boolean })
                          }
                          className="h-5 w-5"
                        />
                        <Label
                          htmlFor="insuranceVerified"
                          className="text-base cursor-pointer"
                        >
                          I have valid business insurance
                        </Label>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>

              {/* Customer Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                  <CardDescription>
                    What customers are saying about your services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {provider.total_reviews && provider.total_reviews > 0 ? (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Star className="h-8 w-8 fill-primary text-primary" />
                        <span className="text-4xl font-bold">{provider.rating?.toFixed(1)}</span>
                      </div>
                      <p className="text-lg text-muted-foreground">
                        Based on {provider.total_reviews} reviews
                      </p>
                      <Separator className="my-6" />
                      <p className="text-muted-foreground">
                        Review details coming soon...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No reviews yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete jobs to start receiving customer reviews
                      </p>
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
