/**
 * Google Places Provider Seeding Edge Function
 * 
 * This function seeds the providers table with real business data from Google Places API (New).
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
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
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

    // Build search query for new Places API
    const textQuery = `${SERVICE_QUERIES[serviceType]} in ${city} ${state}`;
    
    // Use new Places API (New) - Text Search endpoint
    const searchUrl = "https://places.googleapis.com/v1/places:searchText";
    
    // Field mask to specify what data we want back
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.rating",
      "places.userRatingCount",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.location"
    ].join(",");

    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20, // Max 20 per request in new API
      }),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      throw new Error(
        `Google Places API error: ${searchResponse.status} - ${errorData.error?.message || "Unknown error"}`
      );
    }

    const searchData = await searchResponse.json();
    const places: PlaceResult[] = searchData.places || [];
    
    if (places.length === 0) {
      return new Response(
        JSON.stringify({ message: "No results found", providers: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${places.length} places from search`);

    // Map places to providers
    const mappedProviders: MappedProvider[] = places.map((place) => {
      const businessName = place.displayName?.text || "Unknown Business";
      const address = place.formattedAddress || "";
      
      return {
        business_name: businessName,
        cities: [city],
        services: [serviceType],
        rating: place.rating || null,
        total_reviews: place.userRatingCount || 0,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        place_id: place.id,
        source: "GOOGLE_PLACES",
        auto_created: true,
        status: "pending",
        pricing_tier: "standard",
        years_experience: 0,
        insurance_verified: false,
      };
    });

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
