import { MATCHING_CONFIG, type PricingTier, type ServiceType } from '../constants';

export interface Provider {
  id: string;
  business_name: string;
  services: ServiceType[];
  cities: string[];
  pricing_tier: PricingTier;
  years_experience: number;
  insurance_verified: boolean;
  rating: number | null;
  total_reviews: number | null;
  status: string;
}

export interface MatchingInput {
  serviceType: ServiceType;
  city: string;
  providers: Provider[];
}

export interface MatchedProvider extends Provider {
  matchScore: number;
  badges: string[];
}

/**
 * Matches providers to customer requirements using a 100-point scoring system
 */
export function matchProviders(input: MatchingInput): MatchedProvider[] {
  const { serviceType, city, providers } = input;
  const weights = MATCHING_CONFIG.weights;

  // Filter providers by service type, city, and approved status
  const eligibleProviders = providers.filter(
    (p) =>
      p.status === 'approved' &&
      p.services.includes(serviceType) &&
      p.cities.includes(city)
  );

  // Calculate match scores
  const scoredProviders = eligibleProviders.map((provider) => {
    let score = 0;

    // 1. City match (30 points) - already filtered, so full points
    score += 30;

    // 2. Rating (25 points)
    const rating = provider.rating || 0;
    score += (rating / 5) * 25;

    // 3. Experience (20 points)
    const expYears = provider.years_experience;
    const expScore = Math.min(expYears / 10, 1) * 20; // Max at 10+ years
    score += expScore;

    // 4. Reviews (15 points)
    const reviews = provider.total_reviews || 0;
    const reviewScore = Math.min(reviews / 50, 1) * 15; // Max at 50+ reviews
    score += reviewScore;

    // 5. Insurance (10 points)
    if (provider.insurance_verified) {
      score += 10;
    }

    // Assign badges based on performance
    const badges: string[] = [];
    if (rating >= 4.8) badges.push('Top Rated');
    if (provider.pricing_tier === 'budget') badges.push('Best Value');
    if (reviews >= 25 && rating >= 4.5) badges.push('Most Reliable');

    return {
      ...provider,
      matchScore: Math.round(score),
      badges,
    };
  });

  // Sort by match score (highest first)
  return scoredProviders.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get top N providers
 */
export function getTopProviders(
  input: MatchingInput,
  limit: number = 3
): MatchedProvider[] {
  const matched = matchProviders(input);
  return matched.slice(0, limit);
}
