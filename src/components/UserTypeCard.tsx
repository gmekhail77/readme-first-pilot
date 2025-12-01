import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface UserTypeCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  href: string;
  variant: 'customer' | 'provider';
}

export default function UserTypeCard({
  title,
  subtitle,
  icon,
  href,
  variant
}: UserTypeCardProps) {
  const isCustomer = variant === 'customer';

  return (
    <Link
      to={href}
      className={`
        block w-full rounded-2xl p-6 transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
        ${isCustomer
          ? 'bg-gradient-to-br from-secondary to-secondary-light text-secondary-foreground'
          : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* Icon container */}
        <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
          {icon}
        </div>

        {/* Text content */}
        <div className="flex-grow">
          <h2 className="text-2xl font-bold mb-1">{title}</h2>
          <p className={`text-lg ${isCustomer ? 'text-secondary-foreground/80' : 'text-primary-foreground/80'}`}>
            {subtitle}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="flex-shrink-0 w-8 h-8 opacity-60" />
      </div>
    </Link>
  );
}

// Customer illustration - Person in house
export function CustomerIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* House outline */}
      <path
        d="M40 8L8 32V72H72V32L40 8Z"
        stroke="hsl(35, 70%, 45%)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Person body (sitting in chair) */}
      <ellipse cx="40" cy="58" rx="12" ry="8" fill="hsl(25, 60%, 55%)" />
      {/* Person head */}
      <circle cx="40" cy="42" r="8" fill="hsl(25, 60%, 70%)" />
      {/* Chair back */}
      <path
        d="M28 48C28 48 32 40 40 40C48 40 52 48 52 48"
        stroke="hsl(35, 70%, 45%)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Provider illustration - Truck with tools
export function ProviderIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Truck body */}
      <rect x="8" y="35" width="45" height="25" rx="3" fill="hsl(180, 51%, 75%)" />
      {/* Truck cab */}
      <path
        d="M53 35H65C68 35 70 37 70 40V55C70 58 68 60 65 60H53V35Z"
        fill="hsl(180, 51%, 65%)"
      />
      {/* Window */}
      <rect x="56" y="40" width="10" height="8" rx="1" fill="hsl(180, 51%, 85%)" />
      {/* Wheels */}
      <circle cx="22" cy="62" r="7" fill="hsl(210, 20%, 30%)" />
      <circle cx="22" cy="62" r="3" fill="hsl(210, 20%, 50%)" />
      <circle cx="58" cy="62" r="7" fill="hsl(210, 20%, 30%)" />
      <circle cx="58" cy="62" r="3" fill="hsl(210, 20%, 50%)" />
      {/* Toolbox on truck */}
      <rect x="15" y="25" width="20" height="10" rx="2" fill="hsl(25, 60%, 55%)" />
      {/* Tools sticking out */}
      <rect x="20" y="18" width="3" height="10" rx="1" fill="hsl(210, 20%, 40%)" />
      <rect x="27" y="15" width="3" height="13" rx="1" fill="hsl(210, 20%, 40%)" />
      {/* Wrench */}
      <circle cx="28.5" cy="15" r="3" stroke="hsl(210, 20%, 40%)" strokeWidth="2" fill="none" />
    </svg>
  );
}
