import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ServiceCardProps {
  title: string;
  icon: ReactNode;
  href: string;
  iconBgColor: string;
}

export default function ServiceCard({
  title,
  icon,
  href,
  iconBgColor
}: ServiceCardProps) {
  return (
    <Link
      to={href}
      className="
        flex items-center gap-4 p-4 rounded-2xl
        bg-card border border-border
        transition-all duration-200
        hover:shadow-md hover:border-primary/30 active:scale-[0.98]
      "
    >
      {/* Icon container */}
      <div
        className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center ${iconBgColor}`}
      >
        {icon}
      </div>

      {/* Title */}
      <div className="flex-grow">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </div>

      {/* Arrow */}
      <ChevronRight className="flex-shrink-0 w-6 h-6 text-muted-foreground" />
    </Link>
  );
}

// Service Icons

export function CleaningIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Broom handle */}
      <rect x="14" y="2" width="4" height="16" rx="1" fill="white" />
      {/* Broom head */}
      <path
        d="M8 18H24L22 30H10L8 18Z"
        fill="white"
      />
      {/* Bristle lines */}
      <line x1="11" y1="20" x2="11" y2="28" stroke="hsl(25, 60%, 45%)" strokeWidth="1.5" />
      <line x1="14" y1="20" x2="14" y2="28" stroke="hsl(25, 60%, 45%)" strokeWidth="1.5" />
      <line x1="17" y1="20" x2="17" y2="28" stroke="hsl(25, 60%, 45%)" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="20" y2="28" stroke="hsl(25, 60%, 45%)" strokeWidth="1.5" />
    </svg>
  );
}

export function LandscapingIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Leaf shape */}
      <path
        d="M16 4C16 4 8 10 8 18C8 24 12 28 16 28C20 28 24 24 24 18C24 10 16 4 16 4Z"
        fill="white"
        stroke="hsl(180, 51%, 35%)"
        strokeWidth="1"
      />
      {/* Leaf vein */}
      <path
        d="M16 8V24"
        stroke="hsl(180, 51%, 35%)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 12L12 16"
        stroke="hsl(180, 51%, 35%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 16L20 20"
        stroke="hsl(180, 51%, 35%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PoolIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Swimmer/person */}
      <circle cx="10" cy="10" r="4" fill="white" />
      {/* Body swimming */}
      <ellipse cx="18" cy="12" rx="8" ry="4" fill="white" />
      {/* Arms */}
      <path
        d="M12 10L8 6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Water waves */}
      <path
        d="M4 20C6 18 8 20 10 18C12 20 14 18 16 20C18 18 20 20 22 18C24 20 26 18 28 20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M4 26C6 24 8 26 10 24C12 26 14 24 16 26C18 24 20 26 22 24C24 26 26 24 28 26"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
