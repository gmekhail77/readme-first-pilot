#!/usr/bin/env npx ts-node

/**
 * ============================================================================
 * JobMatchAZ Provider Seeding Tool
 * ============================================================================
 *
 * This script fetches real local service providers from the Google Places API
 * and seeds them into the JobMatchAZ Supabase database.
 *
 * LEGAL NOTICE & COMPLIANCE:
 * ==========================
 * This tool uses the official Google Places API. Before using:
 *
 * 1. READ and COMPLY with Google Places API Terms of Service:
 *    https://developers.google.com/maps/terms
 *
 * 2. Ensure you have a valid Google Cloud project with:
 *    - Places API enabled
 *    - Valid API key with appropriate restrictions
 *    - Understanding of quota limits and billing
 *
 * 3. DO NOT attempt to bypass rate limits or access restrictions.
 *
 * 4. Respect business data - this is for legitimate marketplace seeding only.
 *
 * SETUP:
 * ======
 * 1. Get a Google Places API key:
 *    - Go to https://console.cloud.google.com/
 *    - Create or select a project
 *    - Enable the "Places API"
 *    - Create an API key under "APIs & Services > Credentials"
 *    - Restrict the key to Places API for security
 *
 * 2. Set environment variables:
 *    export GOOGLE_PLACES_API_KEY="your-api-key-here"
 *    export SUPABASE_URL="https://your-project.supabase.co"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *
 * 3. Run the script:
 *    # Dry run (outputs to file only)
 *    npx ts-node scripts/seed-providers.ts --service cleaning --city Gilbert
 *
 *    # Insert into database
 *    npx ts-node scripts/seed-providers.ts --service cleaning --city Gilbert --insert
 *
 * EXAMPLES:
 * =========
 *   npx ts-node scripts/seed-providers.ts --service CLEANING --city Gilbert
 *   npx ts-node scripts/seed-providers.ts --service POOL --city Chandler --insert
 *   npx ts-node scripts/seed-providers.ts --service landscaping --city Mesa --max 20
 *   npx ts-node scripts/seed-providers.ts --service pool --city Gilbert --insert --no-details
 *
 * OPTIONS:
 *   --service, -s    Service type: cleaning, landscaping, or pool (required)
 *   --city, -c       City: Gilbert, Mesa, or Chandler (required)
 *   --insert, -i     Actually insert into database (default: dry run)
 *   --max, -m        Maximum results to fetch (default: 60)
 *   --no-details     Skip fetching place details (faster, less data)
 *   --help, -h       Show this help message
 *
 * OUTPUT:
 * =======
 * - JSON file: ./data/providers-{service}-{city}.json
 * - CSV file:  ./data/providers-{service}-{city}.csv
 * - Console summary with counts
 *
 * SCHEMA NOTES:
 * =============
 * The current providers table doesn't have fields for:
 * - place_id (we track this in a local cache file for deduplication)
 * - phone, website, email (Google Places data is stored in output files)
 * - source, auto_created flags
 *
 * Consider adding these fields to the schema for production use.
 * See: TODO comments throughout the codebase.
 *
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fetchAllPlaces, validateApiKey } from './lib/googlePlaces';
import { createAdminClient, insertProviders } from './lib/supabaseAdmin';
import type {
  ServiceType,
  City,
  SeedProviderData,
  SeedOptions,
  SeedResult,
  GooglePlaceResult,
  GooglePlaceDetails,
  PricingTier,
} from './lib/types';

// Valid values for CLI validation
const VALID_SERVICES: ServiceType[] = ['cleaning', 'landscaping', 'pool'];
const VALID_CITIES: City[] = ['Gilbert', 'Mesa', 'Chandler'];

/**
 * Parse command line arguments
 */
function parseArgs(): SeedOptions | null {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return null;
  }

  let service: ServiceType | undefined;
  let city: City | undefined;
  let insert = false;
  let maxResults = 60;
  let fetchDetails = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--service':
      case '-s':
        service = nextArg?.toLowerCase() as ServiceType;
        i++;
        break;
      case '--city':
      case '-c':
        // Normalize city name to title case
        city = nextArg ? (nextArg.charAt(0).toUpperCase() + nextArg.slice(1).toLowerCase()) as City : undefined;
        i++;
        break;
      case '--insert':
      case '-i':
        insert = true;
        break;
      case '--max':
      case '-m':
        maxResults = parseInt(nextArg, 10) || 60;
        i++;
        break;
      case '--no-details':
        fetchDetails = false;
        break;
    }
  }

  // Validate required arguments
  if (!service || !VALID_SERVICES.includes(service)) {
    console.error(`\n❌ Error: Invalid or missing --service`);
    console.error(`   Valid values: ${VALID_SERVICES.join(', ')}\n`);
    printUsage();
    return null;
  }

  if (!city || !VALID_CITIES.includes(city)) {
    console.error(`\n❌ Error: Invalid or missing --city`);
    console.error(`   Valid values: ${VALID_CITIES.join(', ')}\n`);
    printUsage();
    return null;
  }

  return { service, city, insert, maxResults, fetchDetails };
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log('Usage: npx ts-node scripts/seed-providers.ts --service <type> --city <city> [options]');
  console.log('\nRun with --help for more information.');
}

/**
 * Print full help message
 */
function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    JobMatchAZ Provider Seeding Tool                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  npx ts-node scripts/seed-providers.ts --service <type> --city <city> [options]

REQUIRED ARGUMENTS:
  --service, -s <type>   Service type to search for
                         Values: cleaning, landscaping, pool

  --city, -c <city>      City to search in
                         Values: Gilbert, Mesa, Chandler

OPTIONS:
  --insert, -i           Insert providers into database (default: dry run only)
  --max, -m <number>     Maximum number of providers to fetch (default: 60)
  --no-details           Skip fetching detailed place info (faster, less data)
  --help, -h             Show this help message

ENVIRONMENT VARIABLES:
  GOOGLE_PLACES_API_KEY      Your Google Places API key (required)
  SUPABASE_URL               Your Supabase project URL (required for --insert)
  SUPABASE_SERVICE_ROLE_KEY  Your Supabase service role key (required for --insert)

EXAMPLES:
  # Dry run - fetch cleaning providers in Gilbert, save to file
  npx ts-node scripts/seed-providers.ts --service cleaning --city Gilbert

  # Insert pool service providers in Chandler into database
  npx ts-node scripts/seed-providers.ts --service pool --city Chandler --insert

  # Fetch up to 20 landscaping providers in Mesa
  npx ts-node scripts/seed-providers.ts -s landscaping -c Mesa -m 20

OUTPUT FILES:
  ./data/providers-<service>-<city>.json
  ./data/providers-<service>-<city>.csv
`);
}

/**
 * Extract ZIP code from address string
 * Naive implementation - looks for 5-digit number pattern typical of US ZIP codes
 */
function extractZipCode(address: string): string | undefined {
  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : undefined;
}

/**
 * Estimate a pricing tier based on rating
 * This is a simple heuristic - in production you might use more signals
 */
function estimatePricingTier(rating?: number, reviewCount?: number): PricingTier {
  if (!rating) return 'standard';

  // Higher rated with many reviews tend to be premium
  if (rating >= 4.7 && reviewCount && reviewCount >= 100) {
    return 'premium';
  }

  // Lower rated or few reviews might be budget
  if (rating < 4.0 || (reviewCount && reviewCount < 10)) {
    return 'budget';
  }

  return 'standard';
}

/**
 * Map Google Places data to our SeedProviderData format
 */
function mapPlaceToProvider(
  place: GooglePlaceResult,
  details: GooglePlaceDetails | undefined,
  service: ServiceType,
  city: City
): SeedProviderData {
  const address = details?.formatted_address || place.formatted_address;
  const rating = details?.rating ?? place.rating ?? null;
  const reviewCount = details?.user_ratings_total ?? place.user_ratings_total ?? null;

  return {
    // Core fields for database
    business_name: place.name,
    cities: [city],
    services: [service],
    pricing_tier: estimatePricingTier(rating ?? undefined, reviewCount ?? undefined),
    years_experience: 0, // Unknown from Google Places
    insurance_verified: false, // Cannot determine from Google Places
    rating: rating,
    total_reviews: reviewCount,
    status: 'pending', // Default to pending for review

    // Google Places metadata
    _google_places: {
      place_id: place.place_id,
      formatted_address: address,
      phone: details?.formatted_phone_number,
      website: details?.website,
      location: place.geometry?.location || details?.geometry?.location,
      types: details?.types || place.types,
      google_maps_url: details?.url,
    },

    // Derived fields
    _parsed_zip: extractZipCode(address),
    _source: 'GOOGLE_PLACES',
    _auto_created: true,
  };
}

/**
 * Write providers to JSON file
 */
function writeJsonFile(providers: SeedProviderData[], service: ServiceType, city: City): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filename = `providers-${service}-${city.toLowerCase()}.json`;
  const filepath = path.join(dataDir, filename);

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      service,
      city,
      totalCount: providers.length,
      source: 'GOOGLE_PLACES',
    },
    providers,
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  return filepath;
}

/**
 * Write providers to CSV file
 */
function writeCsvFile(providers: SeedProviderData[], service: ServiceType, city: City): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filename = `providers-${service}-${city.toLowerCase()}.csv`;
  const filepath = path.join(dataDir, filename);

  // CSV header
  const headers = [
    'business_name',
    'city',
    'service',
    'rating',
    'total_reviews',
    'pricing_tier',
    'status',
    'phone',
    'website',
    'address',
    'zip_code',
    'place_id',
    'latitude',
    'longitude',
  ];

  const rows = providers.map((p) => [
    `"${p.business_name.replace(/"/g, '""')}"`,
    p.cities[0],
    p.services[0],
    p.rating ?? '',
    p.total_reviews ?? '',
    p.pricing_tier,
    p.status,
    p._google_places.phone ?? '',
    p._google_places.website ?? '',
    `"${p._google_places.formatted_address.replace(/"/g, '""')}"`,
    p._parsed_zip ?? '',
    p._google_places.place_id,
    p._google_places.location?.lat ?? '',
    p._google_places.location?.lng ?? '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  fs.writeFileSync(filepath, csv);
  return filepath;
}

/**
 * Print a summary of the seeding operation
 */
function printSummary(result: SeedResult, options: SeedOptions, jsonPath: string, csvPath: string): void {
  console.log('\n' + '═'.repeat(60));
  console.log('SEEDING SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Service:        ${options.service.toUpperCase()}`);
  console.log(`City:           ${options.city}, AZ`);
  console.log(`Mode:           ${options.insert ? 'INSERT (live)' : 'DRY RUN (file only)'}`);
  console.log('─'.repeat(60));
  console.log(`Total fetched:  ${result.totalFetched}`);

  if (options.insert) {
    console.log(`Inserted:       ${result.totalInserted}`);
    console.log(`Skipped:        ${result.totalSkipped}`);
    console.log(`Errors:         ${result.totalErrors}`);
  }

  console.log('─'.repeat(60));
  console.log('OUTPUT FILES:');
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  CSV:  ${csvPath}`);

  if (result.errors.length > 0) {
    console.log('─'.repeat(60));
    console.log('ERRORS:');
    result.errors.slice(0, 5).forEach((err) => console.log(`  • ${err}`));
    if (result.errors.length > 5) {
      console.log(`  ... and ${result.errors.length - 5} more`);
    }
  }

  console.log('═'.repeat(60));

  if (!options.insert) {
    console.log('\n💡 Tip: Run with --insert flag to insert providers into the database.');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('\n🏠 JobMatchAZ Provider Seeding Tool\n');

  // Parse CLI arguments
  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }

  // Check for Google API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY environment variable is not set.');
    console.error('\nTo get an API key:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Enable the Places API');
    console.error('3. Create an API key under Credentials');
    console.error('4. Set: export GOOGLE_PLACES_API_KEY="your-key"');
    process.exit(1);
  }

  // Validate API key
  console.log('🔑 Validating Google Places API key...');
  const isValidKey = await validateApiKey(apiKey);
  if (!isValidKey) {
    console.error('❌ Error: Invalid or unauthorized Google Places API key.');
    console.error('   Make sure the Places API is enabled for your project.');
    process.exit(1);
  }
  console.log('✅ API key is valid\n');

  // Initialize result
  const result: SeedResult = {
    totalFetched: 0,
    totalInserted: 0,
    totalSkipped: 0,
    totalErrors: 0,
    providers: [],
    errors: [],
  };

  try {
    // Fetch places from Google
    console.log(`📍 Fetching ${options.service} providers in ${options.city}, AZ...\n`);

    const { places, details } = await fetchAllPlaces(apiKey, options.service, options.city, {
      maxResults: options.maxResults,
      fetchDetails: options.fetchDetails,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    // Map to provider format
    console.log('\n🔄 Mapping places to provider format...');
    result.providers = places.map((place) =>
      mapPlaceToProvider(place, details.get(place.place_id), options.service, options.city)
    );
    result.totalFetched = result.providers.length;
    console.log(`✅ Mapped ${result.totalFetched} providers\n`);

    // Write output files
    console.log('📝 Writing output files...');
    const jsonPath = writeJsonFile(result.providers, options.service, options.city);
    const csvPath = writeCsvFile(result.providers, options.service, options.city);
    console.log(`✅ Files written\n`);

    // Insert into database if requested
    if (options.insert) {
      // Check for Supabase credentials
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ Error: Supabase credentials not set.');
        console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
        process.exit(1);
      }

      console.log('🗄️  Inserting providers into database...\n');
      const supabase = createAdminClient();

      const insertResult = await insertProviders(supabase, result.providers, {
        service: options.service,
        city: options.city,
        onProgress: (msg) => console.log(`   ${msg}`),
      });

      result.totalInserted = insertResult.inserted;
      result.totalSkipped = insertResult.skipped;
      result.totalErrors = insertResult.errors.length;
      result.errors = insertResult.errors;

      console.log('');
    }

    // Print summary
    printSummary(result, options, jsonPath, csvPath);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);

    // Check for quota exceeded
    if (error instanceof Error && error.message.includes('OVER_QUERY_LIMIT')) {
      console.error('\n⚠️  You have exceeded your Google Places API quota.');
      console.error('   Check your usage at: https://console.cloud.google.com/apis/');
    }

    process.exit(1);
  }
}

// Run the script
main();
