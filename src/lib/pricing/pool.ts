import { PRICING_CONFIG, type PricingTier } from '../constants';

export interface PoolQuoteInput {
  poolType: 'in-ground' | 'above-ground';
  poolSize: 'small' | 'medium' | 'large';
  frequency: 'weekly' | 'bi-weekly';
  services: {
    chemical_balancing: boolean;
    equipment_check: boolean;
  };
  pricingTier: PricingTier;
}

export interface PoolPricingBreakdown {
  basePrice: number;
  frequencyAdjustment: number;
  servicesFee: number;
  tierMultiplier: number;
  subtotal: number;
  total: number;
}

export function calculatePoolPrice(input: PoolQuoteInput): PoolPricingBreakdown {
  const config = PRICING_CONFIG.pool;
  
  // Base price from pool type and size
  const basePrice = config.basePrices[input.poolType][input.poolSize];
  
  // Apply frequency multiplier
  const frequencyMultiplier = config.frequencyMultipliers[input.frequency];
  const frequencyAdjustment = basePrice * frequencyMultiplier;
  
  // Calculate services fee
  let servicesFee = 0;
  if (input.services.chemical_balancing) {
    servicesFee += config.services.chemical_balancing;
  }
  if (input.services.equipment_check) {
    servicesFee += config.services.equipment_check;
  }
  
  // Subtotal before tier adjustment
  const subtotal = frequencyAdjustment + servicesFee;
  
  // Apply tier multiplier
  const tierMultiplier = config.tierMultipliers[input.pricingTier];
  const total = subtotal * tierMultiplier;
  
  return {
    basePrice,
    frequencyAdjustment,
    servicesFee,
    tierMultiplier,
    subtotal,
    total: Math.round(total * 100) / 100,
  };
}
