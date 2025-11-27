import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Eagerly loaded pages (customer-facing, accessed frequently)
import Index from "./pages/Index";
import Cleaning from "./pages/Cleaning";
import Landscaping from "./pages/Landscaping";
import Pool from "./pages/Pool";
import BookingReview from "./pages/BookingReview";
import BookingCheckout from "./pages/BookingCheckout";
import BookingConfirmation from "./pages/BookingConfirmation";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (admin & provider portals)
const ProviderLogin = lazy(() => import("./pages/provider/Login"));
const ProviderRegister = lazy(() => import("./pages/provider/Register"));
const ProviderDashboard = lazy(() => import("./pages/provider/Dashboard"));
const ProviderJobs = lazy(() => import("./pages/provider/Jobs"));
const ProviderJobDetail = lazy(() => import("./pages/provider/JobDetail"));
const ProviderEarnings = lazy(() => import("./pages/provider/Earnings"));
const ProviderProfile = lazy(() => import("./pages/provider/Profile"));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProviders = lazy(() => import("./pages/admin/Providers"));
const AdminProviderDetail = lazy(() => import("./pages/admin/ProviderDetail"));
const AdminJobs = lazy(() => import("./pages/admin/Jobs"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cleaning" element={<Cleaning />} />
            <Route path="/landscaping" element={<Landscaping />} />
            <Route path="/pool" element={<Pool />} />
            <Route path="/booking/review" element={<BookingReview />} />
            <Route path="/booking/checkout" element={<BookingCheckout />} />
            <Route path="/booking/confirmation" element={<BookingConfirmation />} />
            <Route path="/provider/login" element={<ProviderLogin />} />
            <Route path="/provider/register" element={<ProviderRegister />} />
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider/jobs" element={<ProviderJobs />} />
            <Route path="/provider/jobs/:id" element={<ProviderJobDetail />} />
            <Route path="/provider/earnings" element={<ProviderEarnings />} />
            <Route path="/provider/profile" element={<ProviderProfile />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/providers" element={<AdminProviders />} />
            <Route path="/admin/providers/:id" element={<AdminProviderDetail />} />
            <Route path="/admin/jobs" element={<AdminJobs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
