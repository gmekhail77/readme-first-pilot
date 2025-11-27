import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { ServiceType } from '@/lib/constants';

export default function BookingReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get booking details from URL params
  const providerId = searchParams.get('provider');
  const serviceType = searchParams.get('service') as ServiceType;
  const city = searchParams.get('city');
  const totalAmount = parseFloat(searchParams.get('total') || '0');
  const tier = searchParams.get('tier');

  // Get service-specific details from URL
  const serviceDetails = JSON.parse(searchParams.get('details') || '{}');

  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });

  // Check if user is logged in
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Fetch provider details
  const { data: provider } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });

  // Load user profile if logged in
  useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCustomerInfo({
              fullName: data.full_name || '',
              email: data.email || '',
              phone: data.phone || '',
              address: '',
            });
          }
        });
    }
  }, [session]);

  const depositAmount = totalAmount * 0.5;
  const remainingAmount = totalAmount * 0.5;

  const handleProceedToPayment = () => {
    // Prepare booking data for checkout
    const checkoutParams = new URLSearchParams({
      providerId: providerId || "",
      propertyId: "temp-property-id", // TODO: Get from property creation
      service: serviceType || "",
      city: city || "",
      total: totalAmount.toString(),
      deposit: depositAmount.toString(),
      tier: tier || "",
      fullName: customerInfo.fullName,
      email: customerInfo.email,
      phone: customerInfo.phone,
      address: customerInfo.address,
    });

    // Add service-specific details from searchParams
    for (const [key, value] of searchParams.entries()) {
      if (!['provider', 'service', 'city', 'total', 'tier'].includes(key)) {
        checkoutParams.set(key, value);
      }
    }

    navigate(`/booking/checkout?${checkoutParams.toString()}`);
  };

  const getServiceLabel = () => {
    switch (serviceType) {
      case 'cleaning':
        return '🧹 House Cleaning';
      case 'landscaping':
        return '🌿 Landscaping';
      case 'pool':
        return '🏊 Pool Service';
      default:
        return 'Service';
    }
  };

  if (!providerId || !serviceType || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-xl text-muted-foreground mb-4">Invalid booking information</p>
            <Link to="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-primary-foreground hover:underline mb-4"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-4xl font-bold">Review Your Booking</h1>
          <p className="text-xl mt-2 opacity-90">Confirm your details before payment</p>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          {/* Service Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Service Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">Service</span>
                  <span className="text-xl">{getServiceLabel()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">Location</span>
                  <span className="text-xl">{city}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">Pricing Tier</span>
                  <Badge variant="secondary" className="text-base capitalize">
                    {tier}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Service-specific details */}
              {serviceType === 'cleaning' && serviceDetails.squareFeet && (
                <div className="text-muted-foreground space-y-1">
                  <p>• {serviceDetails.squareFeet} sq ft</p>
                  <p>• {serviceDetails.bedrooms} bedrooms, {serviceDetails.bathrooms} bathrooms</p>
                  <p>• {serviceDetails.frequency} service</p>
                  {serviceDetails.deepClean && <p>• Deep clean included</p>}
                </div>
              )}

              {serviceType === 'landscaping' && serviceDetails.lotSize && (
                <div className="text-muted-foreground space-y-1">
                  <p>• {serviceDetails.lotSize} sq ft lot</p>
                  <p>• {serviceDetails.terrain} terrain</p>
                </div>
              )}

              {serviceType === 'pool' && serviceDetails.poolType && (
                <div className="text-muted-foreground space-y-1">
                  <p>• {serviceDetails.poolType} pool</p>
                  <p>• {serviceDetails.poolSize} size</p>
                  <p>• {serviceDetails.frequency} service</p>
                </div>
              )}

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-lg">
                  <span>Total Amount</span>
                  <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-lg text-primary">
                  <span>Deposit (50%)</span>
                  <span className="font-bold">{formatCurrency(depositAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-base text-muted-foreground">
                  <span>Due on completion (50%)</span>
                  <span>{formatCurrency(remainingAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">{provider.business_name}</h3>
                <div className="flex items-center gap-2">
                  <Star size={20} className="fill-primary text-primary" />
                  <span className="text-lg">
                    {provider.rating?.toFixed(1) || 'New'} ({provider.total_reviews || 0} reviews)
                  </span>
                </div>
                <div className="text-lg text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span>Services: {provider.cities.join(', ')}</span>
                  </div>
                  <div className="mt-2">
                    {provider.years_experience} years of experience
                  </div>
                  {provider.insurance_verified && (
                    <Badge variant="outline" className="mt-2">
                      ✓ Insurance Verified
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              {!session ? (
                <div className="text-center py-6">
                  <p className="text-lg text-muted-foreground mb-4">
                    Please sign in or create an account to continue
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link to="/auth/login">
                      <Button variant="outline" className="h-12 text-lg">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth/signup">
                      <Button className="h-12 text-lg bg-primary hover:bg-primary-hover">
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-lg">Full Name</Label>
                    <Input
                      id="fullName"
                      value={customerInfo.fullName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
                      className="h-12 text-lg mt-2"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-lg">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="h-12 text-lg mt-2"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-lg">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="h-12 text-lg mt-2"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-lg">Service Address</Label>
                    <Input
                      id="address"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                      className="h-12 text-lg mt-2"
                      placeholder="123 Main St, Gilbert, AZ 85234"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proceed to Payment */}
          {session && (
            <Card className="bg-primary-light border-primary">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold mb-1">Ready to book?</p>
                    <p className="text-base text-muted-foreground">
                      Pay {formatCurrency(depositAmount)} deposit now
                    </p>
                  </div>
                  <Button
                    onClick={handleProceedToPayment}
                    size="lg"
                    className="h-14 text-xl px-8 bg-primary hover:bg-primary-hover"
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
