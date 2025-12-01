/**
 * Supabase Admin Client for Seeding
 * JobMatchAZ Provider Seeding Tool
 *
 * This module creates a Supabase client with the service role key
 * for administrative operations like seeding data.
 *
 * IMPORTANT SECURITY NOTES:
 * =========================
 * 1. The SUPABASE_SERVICE_ROLE_KEY has full access to your database.
 * 2. Never expose this key in client-side code or commit it to version control.
 * 3. Only use this for server-side/local scripts like this seeder.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SeedProviderData, PlaceIdCache, ServiceType, City } from './types';
import * as fs from 'fs';
import * as path from 'path';

// Path to the place ID cache file for deduplication
const PLACE_ID_CACHE_FILE = path.join(process.cwd(), 'data', 'place-id-cache.json');

/**
 * Create an admin Supabase client using the service role key
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Load the place ID cache from disk
 */
export function loadPlaceIdCache(): PlaceIdCache {
  try {
    if (fs.existsSync(PLACE_ID_CACHE_FILE)) {
      const data = fs.readFileSync(PLACE_ID_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load place ID cache, starting fresh:', error);
  }
  return {};
}

/**
 * Save the place ID cache to disk
 */
export function savePlaceIdCache(cache: PlaceIdCache): void {
  try {
    const dir = path.dirname(PLACE_ID_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PLACE_ID_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('Could not save place ID cache:', error);
  }
}

/**
 * Check if a place already exists in the database by searching for matching business name and city
 * Note: Current schema doesn't have place_id, so we use business name + city as a heuristic
 */
export async function findExistingProvider(
  supabase: SupabaseClient,
  businessName: string,
  city: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('id, business_name, cities')
    .ilike('business_name', businessName)
    .contains('cities', [city])
    .limit(1);

  if (error) {
    console.warn(`Error checking for existing provider: ${error.message}`);
    return null;
  }

  return data && data.length > 0 ? data[0].id : null;
}

/**
 * Create a "system" user for auto-created providers
 * In production, you might want a dedicated system account
 */
async function getOrCreateSystemUser(supabase: SupabaseClient): Promise<string> {
  // Check for existing system user in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'system@jobmatchaz.local')
    .single();

  if (existingProfile) {
    return existingProfile.id;
  }

  // For seeding, we need a user_id. In a real scenario, you might:
  // 1. Create a system user via Supabase Auth
  // 2. Have providers claim their listings later
  // 3. Use a different table structure for seeded vs registered providers
  //
  // For now, we'll generate a UUID and create a placeholder profile
  const systemUserId = crypto.randomUUID();

  // Create a placeholder profile for system-created providers
  const { error: profileError } = await supabase.from('profiles').insert({
    id: systemUserId,
    email: 'system@jobmatchaz.local',
    full_name: 'System (Auto-Created Providers)',
    phone: null,
  });

  if (profileError) {
    throw new Error(`Failed to create system profile: ${profileError.message}`);
  }

  return systemUserId;
}

/**
 * Insert a provider into the database
 */
export async function insertProvider(
  supabase: SupabaseClient,
  provider: SeedProviderData,
  systemUserId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .insert({
        user_id: systemUserId,
        business_name: provider.business_name,
        cities: provider.cities,
        services: provider.services,
        pricing_tier: provider.pricing_tier,
        years_experience: provider.years_experience,
        insurance_verified: provider.insurance_verified,
        rating: provider.rating,
        total_reviews: provider.total_reviews,
        status: provider.status,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Insert multiple providers, handling deduplication
 */
export async function insertProviders(
  supabase: SupabaseClient,
  providers: SeedProviderData[],
  options: {
    onProgress?: (message: string) => void;
    service: ServiceType;
    city: City;
  }
): Promise<{
  inserted: number;
  skipped: number;
  errors: string[];
}> {
  const { onProgress = console.log, service, city } = options;

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Load place ID cache
  const placeIdCache = loadPlaceIdCache();

  // Get or create system user
  onProgress('Getting system user for auto-created providers...');
  let systemUserId: string;
  try {
    systemUserId = await getOrCreateSystemUser(supabase);
    onProgress(`Using system user ID: ${systemUserId.substring(0, 8)}...`);
  } catch (error) {
    errors.push(`Failed to get system user: ${error}`);
    return { inserted: 0, skipped: providers.length, errors };
  }

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const placeId = provider._google_places.place_id;

    // Check local cache first
    if (placeIdCache[placeId]) {
      onProgress(`[${i + 1}/${providers.length}] Skipping "${provider.business_name}" (already in cache)`);
      skipped++;
      continue;
    }

    // Check database for existing provider with same name and city
    const existingId = await findExistingProvider(
      supabase,
      provider.business_name,
      provider.cities[0]
    );

    if (existingId) {
      onProgress(`[${i + 1}/${providers.length}] Skipping "${provider.business_name}" (exists in DB)`);
      // Update cache
      placeIdCache[placeId] = {
        providerId: existingId,
        insertedAt: new Date().toISOString(),
        service,
        city,
      };
      skipped++;
      continue;
    }

    // Insert the provider
    const result = await insertProvider(supabase, provider, systemUserId);

    if (result.success) {
      onProgress(`[${i + 1}/${providers.length}] Inserted "${provider.business_name}"`);
      inserted++;

      // Update cache
      placeIdCache[placeId] = {
        providerId: result.id,
        insertedAt: new Date().toISOString(),
        service,
        city,
      };
    } else {
      const errorMsg = `Failed to insert "${provider.business_name}": ${result.error}`;
      onProgress(`[${i + 1}/${providers.length}] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // Save updated cache
  savePlaceIdCache(placeIdCache);

  return { inserted, skipped, errors };
}
