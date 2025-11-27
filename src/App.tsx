import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Cleaning from "./pages/Cleaning";
import Landscaping from "./pages/Landscaping";
import Pool from "./pages/Pool";
import BookingReview from "./pages/BookingReview";
import BookingCheckout from "./pages/BookingCheckout";
import BookingConfirmation from "./pages/BookingConfirmation";
import ProviderLogin from "./pages/provider/Login";
import ProviderRegister from "./pages/provider/Register";
import ProviderDashboard from "./pages/provider/Dashboard";
import ProviderJobs from "./pages/provider/Jobs";
import ProviderJobDetail from "./pages/provider/JobDetail";
import ProviderEarnings from "./pages/provider/Earnings";
import ProviderProfile from "./pages/provider/Profile";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProviders from "./pages/admin/Providers";
import AdminProviderDetail from "./pages/admin/ProviderDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
