/**
 * Google Places Provider Seeding Edge Function
 * 
 * This function seeds the providers table with real business data from Google Places API.
 * 
 * REQUIREMENTS:
 * - GOOGLE_PLACES_API_KEY secret must be configured in Lovable Cloud
 * - Respects Google Places API Terms of Service
 * - Uses Supabase service role key (auto-injected by Lovable Cloud)
 * 
 * USAGE:
 * POST /functions/v1/seed-providers
 * Body: {
 *   serviceType: "cleaning" | "landscaping" | "pool",
 *   city: "Gilbert" | "Mesa" | "Chandler",
 *   state: "AZ",
 *   insert: boolean  // false = dry run (preview), true = insert into DB
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  serviceType: "cleaning" | "landscaping" | "pool";
  city: "Gilbert" | "Mesa" | "Chandler";
  state: string;
  insert?: boolean;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlaceDetails {
  formatted_phone_number?: string;
  website?: string;
}

interface MappedProvider {
  business_name: string;
  cities: string[];
  services: string[];
  rating: number | null;
  total_reviews: number;
  phone: string | null;
  website: string | null;
  place_id: string;
  source: string;
  auto_created: boolean;
  status: string;
  pricing_tier: string;
  years_experience: number;
  insurance_verified: boolean;
}

const SERVICE_QUERIES = {
  cleaning: "house cleaning service",
  landscaping: "landscaping service",
  pool: "pool cleaning service",
};

const extractZipCode = (address: string): string | null => {
  const zipMatch = address.match(/\b\d{5}\b/);
  return zipMatch ? zipMatch[0] : null;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!googleApiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const body: RequestBody = await req.json();
    const { serviceType, city, state, insert = false } = body;

    if (!serviceType || !city || !state) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: serviceType, city, state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching ${serviceType} providers in ${city}, ${state}...`);

    // Build search query
    const query = `${SERVICE_QUERIES[serviceType]} in ${city} ${state}`;
    
    // Fetch places from Google Places Text Search API
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.append("query", query);
    searchUrl.searchParams.append("key", googleApiKey);

    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${searchData.status} - ${searchData.error_message || "Unknown error"}`);
    }

    if (searchData.status === "ZERO_RESULTS") {
      return new Response(
        JSON.stringify({ message: "No results found", providers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const places: PlaceResult[] = searchData.results || [];
    console.log(`Found ${places.length} places from initial search`);

    // Fetch place details for phone and website (batch to avoid rate limits)
    const mappedProviders: MappedProvider[] = [];

    for (const place of places.slice(0, 60)) { // Cap at 60 results
      try {
        // Fetch place details for additional info
        const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
        detailsUrl.searchParams.append("place_id", place.place_id);
        detailsUrl.searchParams.append("fields", "formatted_phone_number,website");
        detailsUrl.searchParams.append("key", googleApiKey);

        const detailsResponse = await fetch(detailsUrl.toString());
        const detailsData = await detailsResponse.json();
        const details: PlaceDetails = detailsData.result || {};

        // Extract ZIP code from address
        const zipCode = extractZipCode(place.formatted_address);

        mappedProviders.push({
          business_name: place.name,
          cities: [city],
          services: [serviceType],
          rating: place.rating || null,
          total_reviews: place.user_ratings_total || 0,
          phone: details.formatted_phone_number || null,
          website: details.website || null,
          place_id: place.place_id,
          source: "GOOGLE_PLACES",
          auto_created: true,
          status: "pending",
          pricing_tier: "standard",
          years_experience: 0,
          insurance_verified: false,
        });
      } catch (detailError) {
        console.error(`Error fetching details for place ${place.place_id}:`, detailError);
        // Continue with limited data
        mappedProviders.push({
          business_name: place.name,
          cities: [city],
          services: [serviceType],
          rating: place.rating || null,
          total_reviews: place.user_ratings_total || 0,
          phone: null,
          website: null,
          place_id: place.place_id,
          source: "GOOGLE_PLACES",
          auto_created: true,
          status: "pending",
          pricing_tier: "standard",
          years_experience: 0,
          insurance_verified: false,
        });
      }
    }

    console.log(`Mapped ${mappedProviders.length} providers`);

    // If dry run, just return the mapped data
    if (!insert) {
      return new Response(
        JSON.stringify({
          message: "Preview mode - no data inserted",
          count: mappedProviders.length,
          providers: mappedProviders,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert mode: upsert into database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const provider of mappedProviders) {
      try {
        // Check if provider already exists
        const { data: existing } = await supabase
          .from("providers")
          .select("id")
          .eq("place_id", provider.place_id)
          .maybeSingle();

        if (existing) {
          // Update existing provider
          const { error: updateError } = await supabase
            .from("providers")
            .update({
              business_name: provider.business_name,
              cities: provider.cities,
              services: provider.services,
              rating: provider.rating,
              total_reviews: provider.total_reviews,
              phone: provider.phone,
              website: provider.website,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error(`Error updating provider ${provider.business_name}:`, updateError);
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Insert new provider
          const { error: insertError } = await supabase
            .from("providers")
            .insert(provider);

          if (insertError) {
            console.error(`Error inserting provider ${provider.business_name}:`, insertError);
            skipped++;
          } else {
            inserted++;
          }
        }
      } catch (providerError) {
        console.error(`Error processing provider ${provider.business_name}:`, providerError);
        skipped++;
      }
    }

    console.log(`Insert summary: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        message: "Seeding complete",
        summary: {
          inserted,
          updated,
          skipped,
          total: mappedProviders.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in seed-providers function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
