import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Award, DollarSign } from 'lucide-react';
import { calculatePoolPrice, type PoolQuoteInput } from '@/lib/pricing/pool';
import { getTopProviders, type Provider } from '@/lib/matching/algorithm';
import { formatCurrency } from '@/lib/utils/format';
import { type City } from '@/lib/constants';

export default function Pool() {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get('city') as City | null;

  const [formData, setFormData] = useState<Omit<PoolQuoteInput, 'pricingTier'>>({
    poolType: 'in-ground',
    poolSize: 'medium',
    frequency: 'weekly',
    services: {
      chemical_balancing: true,
      equipment_check: false,
    },
  });

  const [selectedCity, setSelectedCity] = useState<City>(cityParam || 'Gilbert');

  // Fetch providers
  const { data: providers = [] } = useQuery({
    queryKey: ['providers', 'pool', selectedCity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .contains('services', ['pool'])
        .contains('cities', [selectedCity])
        .eq('status', 'approved');

      if (error) throw error;
      return data as Provider[];
    },
  });

  // Get matched providers for each pricing tier
  const budgetProviders = getTopProviders({
    serviceType: 'pool',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'budget'),
  }, 1);

  const standardProviders = getTopProviders({
    serviceType: 'pool',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'standard'),
  }, 1);

  const premiumProviders = getTopProviders({
    serviceType: 'pool',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'premium'),
  }, 1);

  // Calculate pricing for each tier
  const budgetPrice = budgetProviders.length > 0
    ? calculatePoolPrice({ ...formData, pricingTier: 'budget' })
    : null;

  const standardPrice = standardProviders.length > 0
    ? calculatePoolPrice({ ...formData, pricingTier: 'standard' })
    : null;

  const premiumPrice = premiumProviders.length > 0
    ? calculatePoolPrice({ ...formData, pricingTier: 'premium' })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4">
        <div className="container mx-auto max-w-6xl">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground hover:underline mb-4">
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold">Pool Service Quote</h1>
          <p className="text-xl mt-2 opacity-90">Get instant pricing for professional pool maintenance</p>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Pool Details</CardTitle>
                <CardDescription className="text-lg">Tell us about your pool</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* City Selector */}
                <div>
                  <Label htmlFor="city" className="text-lg">City</Label>
                  <Select value={selectedCity} onValueChange={(value) => setSelectedCity(value as City)}>
                    <SelectTrigger id="city" className="h-12 text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="Gilbert" className="text-lg">Gilbert</SelectItem>
                      <SelectItem value="Mesa" className="text-lg">Mesa</SelectItem>
                      <SelectItem value="Chandler" className="text-lg">Chandler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pool Type */}
                <div>
                  <Label htmlFor="poolType" className="text-lg">Pool Type</Label>
                  <Select
                    value={formData.poolType}
                    onValueChange={(value: any) => setFormData({ ...formData, poolType: value })}
                  >
                    <SelectTrigger id="poolType" className="h-12 text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="in-ground" className="text-lg">In-Ground</SelectItem>
                      <SelectItem value="above-ground" className="text-lg">Above-Ground</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pool Size */}
                <div>
                  <Label htmlFor="poolSize" className="text-lg">Pool Size</Label>
                  <Select
                    value={formData.poolSize}
                    onValueChange={(value: any) => setFormData({ ...formData, poolSize: value })}
                  >
                    <SelectTrigger id="poolSize" className="h-12 text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="small" className="text-lg">Small</SelectItem>
                      <SelectItem value="medium" className="text-lg">Medium</SelectItem>
                      <SelectItem value="large" className="text-lg">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequency */}
                <div>
                  <Label htmlFor="frequency" className="text-lg">Service Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger id="frequency" className="h-12 text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="weekly" className="text-lg">Weekly</SelectItem>
                      <SelectItem value="bi-weekly" className="text-lg">Bi-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services */}
                <div>
                  <Label className="text-lg mb-3 block">Additional Services</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="chemical_balancing"
                        checked={formData.services.chemical_balancing}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, chemical_balancing: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="chemical_balancing" className="text-lg cursor-pointer">
                        Chemical Balancing (+$15)
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="equipment_check"
                        checked={formData.services.equipment_check}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, equipment_check: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="equipment_check" className="text-lg cursor-pointer">
                        Equipment Check (+$25)
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pricing & Providers */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Select Your Provider</h2>

            {/* Budget Tier */}
            {budgetPrice && budgetProviders.length > 0 && (
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Budget</CardTitle>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      <DollarSign size={16} /> Best Value
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-primary mt-2">
                    {formatCurrency(budgetPrice.total)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2 text-lg">
                      {budgetProviders[0].business_name}
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Star size={18} className="fill-primary text-primary" />
                      <span className="text-lg">
                        {budgetProviders[0].rating?.toFixed(1) || 'New'} ({budgetProviders[0].total_reviews || 0} reviews)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {budgetProviders[0].badges.map((badge) => (
                        <Badge key={badge} variant="outline" className="text-base">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full h-12 text-lg bg-primary hover:bg-primary-hover">
                    Select Provider
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Standard Tier */}
            {standardPrice && standardProviders.length > 0 && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Standard</CardTitle>
                    <Badge className="text-lg px-3 py-1 bg-primary">
                      <Award size={16} /> Most Popular
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-primary mt-2">
                    {formatCurrency(standardPrice.total)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2 text-lg">
                      {standardProviders[0].business_name}
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Star size={18} className="fill-primary text-primary" />
                      <span className="text-lg">
                        {standardProviders[0].rating?.toFixed(1) || 'New'} ({standardProviders[0].total_reviews || 0} reviews)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {standardProviders[0].badges.map((badge) => (
                        <Badge key={badge} variant="outline" className="text-base">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full h-12 text-lg bg-primary hover:bg-primary-hover">
                    Select Provider
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Premium Tier */}
            {premiumPrice && premiumProviders.length > 0 && (
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Premium</CardTitle>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      ⭐ Top Rated
                    </Badge>
                  </div>
                  <div className="text-4xl font-bold text-primary mt-2">
                    {formatCurrency(premiumPrice.total)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2 text-lg">
                      {premiumProviders[0].business_name}
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Star size={18} className="fill-primary text-primary" />
                      <span className="text-lg">
                        {premiumProviders[0].rating?.toFixed(1) || 'New'} ({premiumProviders[0].total_reviews || 0} reviews)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {premiumProviders[0].badges.map((badge) => (
                        <Badge key={badge} variant="outline" className="text-base">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full h-12 text-lg bg-primary hover:bg-primary-hover">
                    Select Provider
                  </Button>
                </CardContent>
              </Card>
            )}

            {providers.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-xl text-muted-foreground">
                    No providers available in {selectedCity} yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
