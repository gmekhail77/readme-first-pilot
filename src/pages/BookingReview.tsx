import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, MapPin, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { toast } from 'sonner';
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
    zipCode: '',
  });

  // Property creation mutation
  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: {
      userId: string;
      address: string;
      city: string;
      zipCode: string;
      squareFeet?: number;
      bedrooms?: number;
      bathrooms?: number;
      lotSize?: number;
      poolType?: string;
      poolSize?: string;
    }) => {
      const { data, error } = await supabase
        .from('property_profiles')
        .insert({
          user_id: propertyData.userId,
          address: propertyData.address,
          city: propertyData.city,
          zip_code: propertyData.zipCode,
          square_feet: propertyData.squareFeet,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          lot_size: propertyData.lotSize,
          pool_type: propertyData.poolType,
          pool_size: propertyData.poolSize,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
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
            setCustomerInfo((prev) => ({
              ...prev,
              fullName: data.full_name || '',
              email: data.email || '',
              phone: data.phone || '',
            }));
          }
        });
    }
  }, [session]);

  const depositAmount = totalAmount * 0.5;
  const remainingAmount = totalAmount * 0.5;

  const validateForm = () => {
    if (!customerInfo.fullName.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (!customerInfo.email.trim()) {
      toast.error('Please enter your email');
      return false;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    if (!customerInfo.address.trim()) {
      toast.error('Please enter your service address');
      return false;
    }
    if (!customerInfo.zipCode.trim()) {
      toast.error('Please enter your zip code');
      return false;
    }
    return true;
  };

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;
    if (!session?.user?.id) {
      toast.error('Please sign in to continue');
      return;
    }

    try {
      // Create property profile first
      const propertyData = {
        userId: session.user.id,
        address: customerInfo.address,
        city: city || '',
        zipCode: customerInfo.zipCode,
        // Include service-specific details
        squareFeet: serviceDetails.squareFeet ? parseInt(serviceDetails.squareFeet) : undefined,
        bedrooms: serviceDetails.bedrooms ? parseInt(serviceDetails.bedrooms) : undefined,
        bathrooms: serviceDetails.bathrooms ? parseInt(serviceDetails.bathrooms) : undefined,
        lotSize: serviceDetails.lotSize ? parseInt(serviceDetails.lotSize) : undefined,
        poolType: serviceDetails.poolType || undefined,
        poolSize: serviceDetails.poolSize || undefined,
      };

      const property = await createPropertyMutation.mutateAsync(propertyData);

      // Prepare booking data for checkout with real property ID
      const checkoutParams = new URLSearchParams({
        providerId: providerId || "",
        propertyId: property.id,
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
    } catch (error) {
      console.error('Failed to create property:', error);
      toast.error('Failed to save property details. Please try again.');
    }
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
                    <Link to={`/auth?mode=login&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                      <Button variant="outline" className="h-12 text-lg">
                        Sign In
                      </Button>
                    </Link>
                    <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
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
                      placeholder="123 Main St, Gilbert, AZ"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode" className="text-lg">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={customerInfo.zipCode}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, zipCode: e.target.value })}
                      className="h-12 text-lg mt-2"
                      placeholder="85234"
                      maxLength={10}
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
                    disabled={createPropertyMutation.isPending}
                  >
                    {createPropertyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
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
