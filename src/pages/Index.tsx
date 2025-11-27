import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, CheckCircle2, Users } from 'lucide-react';
import { CITIES, type City } from '@/lib/constants';

export default function Index() {
  const [selectedCity, setSelectedCity] = useState<City | ''>('');

  const services = [
    {
      id: 'cleaning',
      title: 'House Cleaning',
      description: 'Professional cleaning services for your home',
      icon: '🧹',
      path: '/cleaning',
    },
    {
      id: 'landscaping',
      title: 'Landscaping',
      description: 'Keep your yard beautiful and well-maintained',
      icon: '🌿',
      path: '/landscaping',
    },
    {
      id: 'pool',
      title: 'Pool Service',
      description: 'Expert pool maintenance and cleaning',
      icon: '🏊',
      path: '/pool',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Select Your Service',
      description: 'Choose from cleaning, landscaping, or pool services',
      icon: Sparkles,
    },
    {
      step: 2,
      title: 'Get Instant Pricing',
      description: 'See live pricing as you enter your property details',
      icon: CheckCircle2,
    },
    {
      step: 3,
      title: 'Book Your Provider',
      description: 'Choose from top-rated, verified providers in your area',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-light to-secondary-light py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to JobMatchAZ
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Connect with trusted local service providers in Gilbert, Mesa, and Chandler
          </p>

          {/* City Selector */}
          <div className="max-w-md mx-auto">
            <label htmlFor="city-select" className="block text-lg font-semibold mb-3 text-foreground">
              Select Your City
            </label>
            <Select value={selectedCity} onValueChange={(value) => setSelectedCity(value as City)}>
              <SelectTrigger id="city-select" className="h-14 text-lg bg-background">
                <SelectValue placeholder="Choose your city..." />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city} className="text-lg h-12">
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Service Cards - Only show after city selection */}
      {selectedCity && (
        <section className="py-12 px-4 bg-background">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
              Choose Your Service
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow border-border">
                  <CardHeader>
                    <div className="text-6xl mb-4 text-center">{service.icon}</div>
                    <CardTitle className="text-2xl text-center">{service.title}</CardTitle>
                    <CardDescription className="text-center text-lg">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={`${service.path}?city=${selectedCity}`}>
                      <Button className="w-full h-12 text-lg bg-primary hover:bg-primary-hover text-primary-foreground">
                        Get Quote
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground mb-4">
                    <Icon size={36} />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">Step {item.step}</div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-lg">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-8 px-4 mt-auto">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-secondary-foreground">
              <h3 className="text-xl font-bold mb-2">JobMatchAZ</h3>
              <p className="text-base">Trusted home services in the East Valley</p>
            </div>
            <div className="flex gap-4">
              <Link to="/provider/login">
                <Button variant="outline" className="h-12 text-lg border-secondary-foreground text-secondary-foreground hover:bg-secondary-hover">
                  Provider Login
                </Button>
              </Link>
              <Link to="/provider/register">
                <Button className="h-12 text-lg bg-primary hover:bg-primary-hover text-primary-foreground">
                  Become a Provider
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-secondary-foreground/20 text-center text-secondary-foreground text-sm">
            © 2024 JobMatchAZ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
