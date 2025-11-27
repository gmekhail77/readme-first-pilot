import { PRICING_CONFIG, type PricingTier } from '../constants';

export interface CleaningQuoteInput {
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly';
  deepClean: boolean;
  addOns: {
    windows: boolean;
    fridge: boolean;
    oven: boolean;
  };
  pricingTier: PricingTier;
}

export interface CleaningPricingBreakdown {
  basePrice: number;
  frequencyAdjustment: number;
  deepCleanFee: number;
  addOnsFee: number;
  tierMultiplier: number;
  subtotal: number;
  total: number;
}

export function calculateCleaningPrice(input: CleaningQuoteInput): CleaningPricingBreakdown {
  const config = PRICING_CONFIG.cleaning;
  
  // Base price (sqft * base rate)
  const basePrice = input.squareFeet * config.baseRate;
  
  // Apply frequency multiplier
  const frequencyMultiplier = config.frequencyMultipliers[input.frequency];
  const frequencyAdjustment = basePrice * frequencyMultiplier;
  
  // Deep clean fee
  const deepCleanFee = input.deepClean ? basePrice * config.deepCleanMultiplier : 0;
  
  // Add-ons
  let addOnsFee = 0;
  if (input.addOns.windows) addOnsFee += config.addOns.windows;
  if (input.addOns.fridge) addOnsFee += config.addOns.fridge;
  if (input.addOns.oven) addOnsFee += config.addOns.oven;
  
  // Subtotal before tier adjustment
  const subtotal = frequencyAdjustment + deepCleanFee + addOnsFee;
  
  // Apply tier multiplier
  const tierMultiplier = config.tierMultipliers[input.pricingTier];
  const total = subtotal * tierMultiplier;
  
  return {
    basePrice,
    frequencyAdjustment,
    deepCleanFee,
    addOnsFee,
    tierMultiplier,
    subtotal,
    total: Math.round(total * 100) / 100,
  };
}
