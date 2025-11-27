// JobMatchAZ Configuration Constants

export const CITIES = ['Gilbert', 'Mesa', 'Chandler'] as const;
export type City = typeof CITIES[number];

export const SERVICE_TYPES = ['cleaning', 'landscaping', 'pool'] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

export const PRICING_TIERS = ['budget', 'standard', 'premium'] as const;
export type PricingTier = typeof PRICING_TIERS[number];

// Pricing Configuration
export const PRICING_CONFIG = {
  cleaning: {
    baseRate: 0.15, // per sqft
    frequencyMultipliers: {
      'one-time': 1.5,
      weekly: 0.8,
      'bi-weekly': 1.0,
      monthly: 1.2,
    },
    deepCleanMultiplier: 1.5,
    addOns: {
      windows: 50,
      fridge: 30,
      oven: 40,
    },
    tierMultipliers: {
      budget: 0.85,
      standard: 1.0,
      premium: 1.25,
    },
  },
  landscaping: {
    basePricePerSqft: 0.02,
    terrainMultipliers: {
      flat: 1.0,
      sloped: 1.3,
      very_sloped: 1.6,
    },
    services: {
      mowing: 1.0,
      edging: 0.3,
      trimming: 0.4,
      leaf_removal: 0.5,
      debris: 0.6,
    },
    tierMultipliers: {
      budget: 0.8,
      standard: 1.0,
      premium: 1.3,
    },
  },
  pool: {
    basePrices: {
      'in-ground': {
        small: 80,
        medium: 100,
        large: 130,
      },
      'above-ground': {
        small: 60,
        medium: 75,
        large: 95,
      },
    },
    frequencyMultipliers: {
      weekly: 1.0,
      'bi-weekly': 1.3,
    },
    services: {
      chemical_balancing: 15,
      equipment_check: 25,
    },
    tierMultipliers: {
      budget: 0.85,
      standard: 1.0,
      premium: 1.2,
    },
  },
} as const;

// Provider Matching Configuration
export const MATCHING_CONFIG = {
  weights: {
    distance: 0.3,
    rating: 0.25,
    experience: 0.2,
    reviews: 0.15,
    pricingTier: 0.1,
  },
  maxDistance: 15, // miles
} as const;

// Deposit Configuration
export const DEPOSIT_PERCENTAGE = 0.5; // 50% deposit
