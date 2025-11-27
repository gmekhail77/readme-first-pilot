import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Star, Award, DollarSign, Info } from 'lucide-react';
import { calculateLandscapingPrice, type LandscapingQuoteInput } from '@/lib/pricing/landscaping';
import { getTopProviders, type Provider } from '@/lib/matching/algorithm';
import { formatCurrency } from '@/lib/utils/format';
import { type City } from '@/lib/constants';

export default function Landscaping() {
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get('city') as City | null;

  const [formData, setFormData] = useState<Omit<LandscapingQuoteInput, 'pricingTier'>>({
    lotSize: 5000,
    terrain: 'flat',
    services: {
      mowing: true,
      edging: false,
      trimming: false,
      leaf_removal: false,
      debris: false,
    },
  });

  const [selectedCity, setSelectedCity] = useState<City>(cityParam || 'Gilbert');

  // Fetch providers
  const { data: providers = [] } = useQuery({
    queryKey: ['providers', 'landscaping', selectedCity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .contains('services', ['landscaping'])
        .contains('cities', [selectedCity])
        .eq('status', 'approved');

      if (error) throw error;
      return data as Provider[];
    },
  });

  // Get matched providers for each pricing tier
  const budgetProviders = getTopProviders({
    serviceType: 'landscaping',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'budget'),
  }, 1);

  const standardProviders = getTopProviders({
    serviceType: 'landscaping',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'standard'),
  }, 1);

  const premiumProviders = getTopProviders({
    serviceType: 'landscaping',
    city: selectedCity,
    providers: providers.filter((p) => p.pricing_tier === 'premium'),
  }, 1);

  // Calculate pricing for each tier
  const budgetPrice = budgetProviders.length > 0
    ? calculateLandscapingPrice({ ...formData, pricingTier: 'budget' })
    : null;

  const standardPrice = standardProviders.length > 0
    ? calculateLandscapingPrice({ ...formData, pricingTier: 'standard' })
    : null;

  const premiumPrice = premiumProviders.length > 0
    ? calculateLandscapingPrice({ ...formData, pricingTier: 'premium' })
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
          <h1 className="text-4xl font-bold">Landscaping Quote</h1>
          <p className="text-xl mt-2 opacity-90">Get instant pricing for professional landscaping services</p>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Property Details</CardTitle>
                <CardDescription className="text-lg">Tell us about your yard</CardDescription>
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

                {/* Lot Size */}
                <div>
                  <Label htmlFor="lotSize" className="text-lg">Lot Size (sq ft)</Label>
                  <Input
                    id="lotSize"
                    type="number"
                    value={formData.lotSize}
                    onChange={(e) => setFormData({ ...formData, lotSize: Number(e.target.value) })}
                    className="h-12 text-lg mt-2"
                    min={1000}
                    max={50000}
                  />
                </div>

                {/* Terrain */}
                <div>
                  <Label htmlFor="terrain" className="text-lg">Terrain Type</Label>
                  <Select
                    value={formData.terrain}
                    onValueChange={(value: any) => setFormData({ ...formData, terrain: value })}
                  >
                    <SelectTrigger id="terrain" className="h-12 text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="flat" className="text-lg">Flat</SelectItem>
                      <SelectItem value="sloped" className="text-lg">Sloped</SelectItem>
                      <SelectItem value="very_sloped" className="text-lg">Very Sloped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services */}
                <div>
                  <Label className="text-lg mb-3 block">Services Needed</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="mowing"
                        checked={formData.services.mowing}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, mowing: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="mowing" className="text-lg cursor-pointer">
                        Mowing
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="edging"
                        checked={formData.services.edging}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, edging: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="edging" className="text-lg cursor-pointer">
                        Edging
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="trimming"
                        checked={formData.services.trimming}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, trimming: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="trimming" className="text-lg cursor-pointer">
                        Trimming
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="leaf_removal"
                        checked={formData.services.leaf_removal}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, leaf_removal: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="leaf_removal" className="text-lg cursor-pointer">
                        Leaf Removal
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="debris"
                        checked={formData.services.debris}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, debris: checked as boolean },
                          })
                        }
                      />
                      <Label htmlFor="debris" className="text-lg cursor-pointer">
                        Debris Removal
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">
                        {budgetProviders[0].business_name}
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-sm gap-1">
                              <Info size={14} />
                              {budgetProviders[0].matchScore}% Match
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Match score based on location, rating, experience, and reviews. 
                              {budgetProviders[0].years_experience} years experience with {budgetProviders[0].total_reviews || 0} reviews.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                  <Button 
                    className="w-full h-12 text-lg bg-primary hover:bg-primary-hover"
                    onClick={() => {
                      const params = new URLSearchParams({
                        provider: budgetProviders[0].id,
                        service: 'landscaping',
                        city: selectedCity,
                        total: budgetPrice.total.toString(),
                        tier: 'budget',
                        details: JSON.stringify(formData),
                      });
                      window.location.href = `/booking/review?${params.toString()}`;
                    }}
                  >
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">
                        {standardProviders[0].business_name}
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-sm gap-1">
                              <Info size={14} />
                              {standardProviders[0].matchScore}% Match
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Match score based on location, rating, experience, and reviews. 
                              {standardProviders[0].years_experience} years experience with {standardProviders[0].total_reviews || 0} reviews.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                  <Button 
                    className="w-full h-12 text-lg bg-primary hover:bg-primary-hover"
                    onClick={() => {
                      const params = new URLSearchParams({
                        provider: standardProviders[0].id,
                        service: 'landscaping',
                        city: selectedCity,
                        total: standardPrice.total.toString(),
                        tier: 'standard',
                        details: JSON.stringify(formData),
                      });
                      window.location.href = `/booking/review?${params.toString()}`;
                    }}
                  >
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">
                        {premiumProviders[0].business_name}
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-sm gap-1">
                              <Info size={14} />
                              {premiumProviders[0].matchScore}% Match
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Match score based on location, rating, experience, and reviews. 
                              {premiumProviders[0].years_experience} years experience with {premiumProviders[0].total_reviews || 0} reviews.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                  <Button 
                    className="w-full h-12 text-lg bg-primary hover:bg-primary-hover"
                    onClick={() => {
                      const params = new URLSearchParams({
                        provider: premiumProviders[0].id,
                        service: 'landscaping',
                        city: selectedCity,
                        total: premiumPrice.total.toString(),
                        tier: 'premium',
                        details: JSON.stringify(formData),
                      });
                      window.location.href = `/booking/review?${params.toString()}`;
                    }}
                  >
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
