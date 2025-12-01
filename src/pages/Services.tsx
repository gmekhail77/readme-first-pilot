import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import ServiceCard, { CleaningIcon, LandscapingIcon, PoolIcon } from '@/components/ServiceCard';

export default function Services() {
  const [searchParams] = useSearchParams();
  const city = searchParams.get('city') || '';

  const services = [
    {
      id: 'cleaning',
      title: 'House Cleaning',
      icon: <CleaningIcon />,
      path: `/cleaning${city ? `?city=${city}` : ''}`,
      iconBgColor: 'bg-warm',
    },
    {
      id: 'landscaping',
      title: 'Landscaping',
      icon: <LandscapingIcon />,
      path: `/landscaping${city ? `?city=${city}` : ''}`,
      iconBgColor: 'bg-primary',
    },
    {
      id: 'pool',
      title: 'Pool Service',
      icon: <PoolIcon />,
      path: `/pool${city ? `?city=${city}` : ''}`,
      iconBgColor: 'bg-warm-light',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="container mx-auto max-w-lg">
          <Logo variant="horizontal" size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto max-w-lg px-4 py-6">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Select your service
        </h1>

        {/* Service Cards */}
        <div className="flex flex-col gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              icon={service.icon}
              href={service.path}
              iconBgColor={service.iconBgColor}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-muted-foreground text-sm border-t border-border">
        <p>Home Services. Local People.</p>
      </footer>
    </div>
  );
}
