import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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

const registrationSchema = z.object({
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string(),
  services: z.array(z.string()).min(1, "Select at least one service"),
  cities: z.array(z.string()).min(1, "Select at least one city"),
  pricingTier: z.enum(["budget", "standard", "premium"]),
  yearsExperience: z.number().min(0, "Years must be 0 or greater").max(99),
  insuranceVerified: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ProviderRegister() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    services: [] as string[],
    cities: [] as string[],
    pricingTier: "standard",
    yearsExperience: 0,
    insuranceVerified: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = registrationSchema.parse(formData);

      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/provider/login`,
          data: {
            full_name: validatedData.businessName,
            phone: validatedData.phone,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Create provider profile
      const { error: providerError } = await supabase.from("providers").insert([{
        user_id: authData.user.id,
        business_name: validatedData.businessName,
        services: validatedData.services as Database["public"]["Enums"]["service_type"][],
        cities: validatedData.cities,
        pricing_tier: validatedData.pricingTier as Database["public"]["Enums"]["pricing_tier"],
        years_experience: validatedData.yearsExperience,
        insurance_verified: validatedData.insuranceVerified,
        status: "pending" as Database["public"]["Enums"]["provider_status"],
      }]);

      if (providerError) {
        throw new Error("Failed to create provider profile");
      }

      // Create provider role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "provider",
      });

      if (roleError) {
        console.error("Role creation error:", roleError);
      }

      toast.success("Application submitted! Admin will review within 24-48 hours.");
      navigate("/provider/login");
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
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">Provider Registration</CardTitle>
          <CardDescription className="text-lg">
            Join JobMatchAZ as a service provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Business Information</h3>
              
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

              <div>
                <Label htmlFor="email" className="text-base">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 text-base mt-2"
                  placeholder="provider@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

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

              <div>
                <Label htmlFor="password" className="text-base">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12 text-base mt-2"
                  placeholder="Min 8 characters"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-base">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="h-12 text-base mt-2"
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

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

            {/* Submit Button */}
            <div className="space-y-4 pt-4">
              <Button
                type="submit"
                className="w-full h-14 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/provider/login" className="text-primary hover:underline font-semibold">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
