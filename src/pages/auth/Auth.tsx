import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = authSchema.extend({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  
  // Get mode and redirect from URL params
  const mode = searchParams.get('mode') || 'login';
  const redirectPath = searchParams.get('redirect') || '/';
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for existing session and set up auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            navigate(redirectPath);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        navigate(redirectPath);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectPath]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validatedData = signupSchema.parse(formData);
      const redirectUrl = `${window.location.origin}${redirectPath}`;

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setIsSignup(false);
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }
        return;
      }

      if (!data.user) {
        toast.error("Signup failed - no user returned");
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          email: validatedData.email,
          full_name: validatedData.fullName,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      toast.success("Account created successfully! Welcome!");
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
        toast.error("Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validatedData = authSchema.parse(formData);

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
        toast.error("Login failed - no user returned");
        return;
      }

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

  if (session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl">
            {isSignup ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-lg">
            {isSignup 
              ? "Sign up to book home services" 
              : "Sign in to continue your booking"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-6">
            {isSignup && (
              <div>
                <Label htmlFor="fullName" className="text-base">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="h-12 text-base mt-2"
                  placeholder="John Doe"
                  autoComplete="name"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 text-base mt-2"
                placeholder="you@example.com"
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
                placeholder={isSignup ? "At least 6 characters" : "Enter your password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
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
                  {isSignup ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                isSignup ? "Create Account" : "Sign In"
              )}
            </Button>

            <div className="space-y-4 pt-2">
              <p className="text-center text-sm text-muted-foreground">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setErrors({});
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  {isSignup ? "Sign in" : "Sign up"}
                </button>
              </p>
              
              <p className="text-center text-sm text-muted-foreground">
                Are you a provider?{" "}
                <Link to="/provider/login" className="text-primary hover:underline font-semibold">
                  Provider Login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
