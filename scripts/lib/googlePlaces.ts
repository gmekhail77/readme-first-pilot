/**
 * Google Places API Client
 * JobMatchAZ Provider Seeding Tool
 *
 * IMPORTANT LEGAL NOTICE:
 * ========================
 * This module uses the official Google Places API.
 * Before using this tool, you MUST:
 * 1. Read and comply with the Google Places API Terms of Service:
 *    https://developers.google.com/maps/terms
 * 2. Ensure your usage complies with Google's usage policies
 * 3. Store your API key securely (never commit to version control)
 * 4. Be aware of API quotas and pricing:
 *    https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
 *
 * DO NOT attempt to bypass rate limits or access restrictions.
 */

import type {
  GoogleTextSearchResponse,
  GooglePlaceDetailsResponse,
  GooglePlaceResult,
  GooglePlaceDetails,
  ServiceType,
  City,
} from './types';

const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Rate limiting: Google recommends waiting 2 seconds between pagination requests
const PAGINATION_DELAY_MS = 2000;

// Fields to request from Place Details API (to minimize billing)
// See: https://developers.google.com/maps/documentation/places/web-service/place-details#fields
const DETAIL_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'formatted_phone_number',
  'international_phone_number',
  'website',
  'rating',
  'user_ratings_total',
  'types',
  'geometry',
  'opening_hours',
  'url',
].join(',');

/**
 * Build the search query for a service type and city
 */
function buildSearchQuery(service: ServiceType, city: City): string {
  const serviceQueries: Record<ServiceType, string> = {
    cleaning: 'house cleaning service',
    landscaping: 'landscaping service',
    pool: 'pool cleaning service',
  };

  return `${serviceQueries[service]} in ${city} AZ`;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform a Text Search request to Google Places API
 */
export async function textSearch(
  apiKey: string,
  query: string,
  pageToken?: string
): Promise<GoogleTextSearchResponse> {
  const params = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  }

  const url = `${GOOGLE_PLACES_BASE_URL}/textsearch/json?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const data: GoogleTextSearchResponse = await response.json();

  // Check for API-level errors
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      `Google Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`
    );
  }

  return data;
}

/**
 * Fetch Place Details for a specific place
 */
export async function getPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<GooglePlaceDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: DETAIL_FIELDS,
    key: apiKey,
  });

  const url = `${GOOGLE_PLACES_BASE_URL}/details/json?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const data: GooglePlaceDetailsResponse = await response.json();

  if (data.status !== 'OK') {
    if (data.status === 'NOT_FOUND') {
      console.warn(`Place not found: ${placeId}`);
      return null;
    }
    throw new Error(
      `Google Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`
    );
  }

  return data.result;
}

/**
 * Fetch all places for a service type and city, handling pagination
 */
export async function fetchAllPlaces(
  apiKey: string,
  service: ServiceType,
  city: City,
  options: {
    maxResults?: number;
    fetchDetails?: boolean;
    onProgress?: (message: string) => void;
  } = {}
): Promise<{
  places: GooglePlaceResult[];
  details: Map<string, GooglePlaceDetails>;
}> {
  const { maxResults = 60, fetchDetails = true, onProgress = console.log } = options;

  const query = buildSearchQuery(service, city);
  onProgress(`Searching for: "${query}"`);

  const allPlaces: GooglePlaceResult[] = [];
  const detailsMap = new Map<string, GooglePlaceDetails>();

  let pageToken: string | undefined;
  let pageCount = 0;

  // Fetch all pages of results
  do {
    if (pageToken) {
      // Google requires a short delay before using next_page_token
      onProgress(`Waiting ${PAGINATION_DELAY_MS}ms before next page...`);
      await sleep(PAGINATION_DELAY_MS);
    }

    pageCount++;
    onProgress(`Fetching page ${pageCount}...`);

    const response = await textSearch(apiKey, query, pageToken);

    if (response.results.length === 0) {
      onProgress('No more results found.');
      break;
    }

    // Filter out closed businesses
    const activeResults = response.results.filter(
      (place) => place.business_status !== 'CLOSED_PERMANENTLY'
    );

    allPlaces.push(...activeResults);
    onProgress(`Found ${activeResults.length} active businesses on page ${pageCount}`);

    // Check if we've reached the max
    if (allPlaces.length >= maxResults) {
      onProgress(`Reached max results limit (${maxResults})`);
      break;
    }

    pageToken = response.next_page_token;
  } while (pageToken);

  // Trim to max results
  const trimmedPlaces = allPlaces.slice(0, maxResults);
  onProgress(`Total places found: ${trimmedPlaces.length}`);

  // Fetch details for each place if requested
  if (fetchDetails && trimmedPlaces.length > 0) {
    onProgress(`Fetching details for ${trimmedPlaces.length} places...`);

    for (let i = 0; i < trimmedPlaces.length; i++) {
      const place = trimmedPlaces[i];

      try {
        const details = await getPlaceDetails(apiKey, place.place_id);
        if (details) {
          detailsMap.set(place.place_id, details);
        }

        // Brief delay to avoid hitting rate limits
        if (i < trimmedPlaces.length - 1) {
          await sleep(100);
        }

        if ((i + 1) % 10 === 0) {
          onProgress(`Fetched details for ${i + 1}/${trimmedPlaces.length} places`);
        }
      } catch (error) {
        console.warn(`Failed to fetch details for ${place.name}: ${error}`);
      }
    }

    onProgress(`Successfully fetched details for ${detailsMap.size} places`);
  }

  return { places: trimmedPlaces, details: detailsMap };
}

/**
 * Validate the API key by making a simple test request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Make a simple search that should return results
    const response = await textSearch(apiKey, 'restaurant in Phoenix AZ');
    return response.status === 'OK' || response.status === 'ZERO_RESULTS';
  } catch (error) {
    return false;
  }
}
