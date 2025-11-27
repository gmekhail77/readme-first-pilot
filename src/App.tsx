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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
