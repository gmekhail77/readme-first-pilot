import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function ProviderLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for existing session and set up auth listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        
        // Redirect authenticated providers
        if (session?.user) {
          setTimeout(() => {
            checkProviderStatusAndRedirect(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkProviderStatusAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProviderStatusAndRedirect = async (userId: string) => {
    try {
      const { data: provider } = await supabase
        .from("providers")
        .select("status")
        .eq("user_id", userId)
        .single();

      if (provider) {
        if (provider.status === "approved") {
          navigate("/provider/dashboard");
        } else if (provider.status === "pending") {
          toast.info("Your application is pending admin approval");
        } else if (provider.status === "suspended") {
          toast.error("Your account has been suspended. Please contact support.");
        }
      }
    } catch (error) {
      console.error("Error checking provider status:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = loginSchema.parse(formData);

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error("Login failed. Please try again.");
        }
        return;
      }

      if (!data.user) {
        throw new Error("Login failed - no user returned");
      }

      // Check if user is a provider
      const { data: provider, error: providerError } = await supabase
        .from("providers")
        .select("status")
        .eq("user_id", data.user.id)
        .single();

      if (providerError || !provider) {
        toast.error("This account is not registered as a provider");
        await supabase.auth.signOut();
        return;
      }

      // Check provider status
      if (provider.status === "pending") {
        toast.info("Your application is pending admin approval. You'll be notified once approved.");
        await supabase.auth.signOut();
        return;
      }

      if (provider.status === "suspended") {
        toast.error("Your account has been suspended. Please contact support.");
        await supabase.auth.signOut();
        return;
      }

      // Success - redirect will happen via auth state listener
      toast.success("Welcome back!");
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
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If already logged in and approved, don't show form
  if (session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Checking your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl">Provider Login</CardTitle>
          <CardDescription className="text-lg">
            Sign in to your provider account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 text-base mt-2"
                placeholder="provider@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-base">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-12 text-base mt-2"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="space-y-4 pt-2">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/provider/register" className="text-primary hover:underline font-semibold">
                  Register here
                </Link>
              </p>
              
              <p className="text-center text-sm text-muted-foreground">
                Are you a customer?{" "}
                <Link to="/" className="text-primary hover:underline font-semibold">
                  Go to customer portal
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
