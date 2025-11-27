import { PRICING_CONFIG, type PricingTier } from '../constants';

export interface LandscapingQuoteInput {
  lotSize: number; // square feet
  terrain: 'flat' | 'sloped' | 'very_sloped';
  services: {
    mowing: boolean;
    edging: boolean;
    trimming: boolean;
    leaf_removal: boolean;
    debris: boolean;
  };
  pricingTier: PricingTier;
}

export interface LandscapingPricingBreakdown {
  basePrice: number;
  terrainAdjustment: number;
  servicesFee: number;
  tierMultiplier: number;
  subtotal: number;
  total: number;
}

export function calculateLandscapingPrice(input: LandscapingQuoteInput): LandscapingPricingBreakdown {
  const config = PRICING_CONFIG.landscaping;
  
  // Base price (lot size * base rate)
  const basePrice = input.lotSize * config.basePricePerSqft;
  
  // Apply terrain multiplier
  const terrainMultiplier = config.terrainMultipliers[input.terrain];
  const terrainAdjustment = basePrice * terrainMultiplier;
  
  // Calculate services fee
  let servicesMultiplier = 0;
  if (input.services.mowing) servicesMultiplier += config.services.mowing;
  if (input.services.edging) servicesMultiplier += config.services.edging;
  if (input.services.trimming) servicesMultiplier += config.services.trimming;
  if (input.services.leaf_removal) servicesMultiplier += config.services.leaf_removal;
  if (input.services.debris) servicesMultiplier += config.services.debris;
  
  const servicesFee = terrainAdjustment * servicesMultiplier;
  
  // Subtotal before tier adjustment
  const subtotal = terrainAdjustment + servicesFee;
  
  // Apply tier multiplier
  const tierMultiplier = config.tierMultipliers[input.pricingTier];
  const total = subtotal * tierMultiplier;
  
  return {
    basePrice,
    terrainAdjustment,
    servicesFee,
    tierMultiplier,
    subtotal,
    total: Math.round(total * 100) / 100,
  };
}
