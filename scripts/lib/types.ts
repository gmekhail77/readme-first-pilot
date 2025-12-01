/**
 * Types for the Google Places Seeding Tool
 * JobMatchAZ Provider Seeding
 */

// Service types matching the database enum
export type ServiceType = 'cleaning' | 'landscaping' | 'pool';

// Cities we support
export type City = 'Gilbert' | 'Mesa' | 'Chandler';

// Provider status matching the database enum
export type ProviderStatus = 'pending' | 'approved' | 'suspended';

// Pricing tier matching the database enum
export type PricingTier = 'budget' | 'standard' | 'premium';

// Google Places API response types
export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
  };
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  url?: string; // Google Maps URL
}

export interface GoogleTextSearchResponse {
  results: GooglePlaceResult[];
  next_page_token?: string;
  status: string;
  error_message?: string;
}

export interface GooglePlaceDetailsResponse {
  result: GooglePlaceDetails;
  status: string;
  error_message?: string;
}

// Mapped provider data (includes Google Places metadata)
export interface SeedProviderData {
  // Core fields for database
  business_name: string;
  cities: string[];
  services: ServiceType[];
  pricing_tier: PricingTier;
  years_experience: number;
  insurance_verified: boolean;
  rating: number | null;
  total_reviews: number | null;
  status: ProviderStatus;

  // Google Places metadata (for tracking/export, not stored in current schema)
  _google_places: {
    place_id: string;
    formatted_address: string;
    phone?: string;
    website?: string;
    location?: {
      lat: number;
      lng: number;
    };
    types?: string[];
    google_maps_url?: string;
  };

  // Derived fields
  _parsed_zip?: string;
  _source: 'GOOGLE_PLACES';
  _auto_created: true;
}

// CLI options
export interface SeedOptions {
  service: ServiceType;
  city: City;
  insert: boolean;
  maxResults?: number;
  fetchDetails: boolean;
}

// Seeding result stats
export interface SeedResult {
  totalFetched: number;
  totalInserted: number;
  totalSkipped: number;
  totalErrors: number;
  providers: SeedProviderData[];
  errors: string[];
}

// Place ID tracking for deduplication
export interface PlaceIdCache {
  [placeId: string]: {
    providerId?: string;
    insertedAt: string;
    service: ServiceType;
    city: City;
  };
}
