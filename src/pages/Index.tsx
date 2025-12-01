import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import UserTypeCard, { CustomerIcon, ProviderIcon } from '@/components/UserTypeCard';

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo variant="full" size="lg" linkTo={undefined} />
          </div>

          {/* Tagline */}
          <p className="text-center text-muted-foreground mb-2">
            Home Services. Local People.
          </p>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-foreground mb-8">
            Let's get started.
          </h1>

          {/* User Type Cards */}
          <div className="flex flex-col gap-4 mb-12">
            <UserTypeCard
              title="Find a Pro"
              subtitle="Hire local help"
              icon={<CustomerIcon />}
              href="/services"
              variant="customer"
            />

            <UserTypeCard
              title="Join as a Pro"
              subtitle="Find new customers"
              icon={<ProviderIcon />}
              href="/provider/register"
              variant="provider"
            />
          </div>

          {/* Login Link */}
          <p className="text-center text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="text-primary hover:text-primary-hover font-medium underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-muted-foreground text-sm">
        <p>© 2024 JobMatch AZ. Gilbert, Mesa & Chandler.</p>
      </footer>
    </div>
  );
}
