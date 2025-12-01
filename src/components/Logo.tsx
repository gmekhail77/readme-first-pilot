import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'full' | 'icon' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  linkTo?: string;
}

const sizeMap = {
  sm: { icon: 32, text: 'text-lg' },
  md: { icon: 48, text: 'text-xl' },
  lg: { icon: 64, text: 'text-2xl' },
  xl: { icon: 96, text: 'text-4xl' },
};

// SVG Logo Icon - House with Cactus and Sun
function LogoIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* House outline */}
      <path
        d="M50 8L8 42V92H92V42L50 8Z"
        stroke="hsl(180, 51%, 45%)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* House roof peak */}
      <path
        d="M8 42L50 8L92 42"
        stroke="hsl(180, 51%, 45%)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Sun (behind cactus) */}
      <circle
        cx="62"
        cy="58"
        r="16"
        fill="hsl(35, 70%, 65%)"
      />
      {/* Sun rays */}
      <g stroke="hsl(25, 75%, 55%)" strokeWidth="2" strokeLinecap="round">
        <line x1="62" y1="38" x2="62" y2="32" />
        <line x1="78" y1="58" x2="84" y2="58" />
        <line x1="62" y1="78" x2="62" y2="84" />
        <line x1="73" y1="47" x2="77" y2="43" />
        <line x1="73" y1="69" x2="77" y2="73" />
        <line x1="51" y1="47" x2="47" y2="43" />
      </g>

      {/* Cactus body */}
      <path
        d="M38 85V50C38 46 41 43 45 43C49 43 52 46 52 50V85"
        fill="hsl(180, 51%, 45%)"
      />
      {/* Cactus left arm */}
      <path
        d="M38 65H30C26 65 23 62 23 58C23 54 26 51 30 51V58H38"
        fill="hsl(180, 51%, 45%)"
      />
      {/* Cactus right arm */}
      <path
        d="M52 60H58C62 60 65 57 65 53C65 49 62 46 58 46V53H52"
        fill="hsl(180, 51%, 45%)"
      />

      {/* Cactus face - smile */}
      <path
        d="M41 58C41 58 43 62 47 62C51 62 53 58 53 58"
        stroke="hsl(180, 51%, 30%)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cactus eyes */}
      <circle cx="42" cy="54" r="2" fill="hsl(180, 51%, 30%)" />
      <circle cx="50" cy="54" r="2" fill="hsl(180, 51%, 30%)" />
    </svg>
  );
}

function LogoText({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const textSize = sizeMap[size].text;
  return (
    <div className={`font-bold ${textSize} ${className}`}>
      <span className="text-[hsl(35,70%,65%)]">Job</span>
      <span className="text-[hsl(180,51%,45%)]">Match</span>
      <span className="text-[hsl(35,70%,65%)]"> AZ</span>
    </div>
  );
}

export default function Logo({
  variant = 'full',
  size = 'md',
  className = '',
  linkTo = '/'
}: LogoProps) {
  const iconSize = sizeMap[size].icon;

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {(variant === 'full' || variant === 'icon' || variant === 'horizontal') && (
        <LogoIcon size={iconSize} />
      )}
      {(variant === 'full' || variant === 'horizontal') && (
        <LogoText size={size} />
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export { LogoIcon, LogoText };
