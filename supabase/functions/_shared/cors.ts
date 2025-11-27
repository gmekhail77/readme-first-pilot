// CORS configuration for Supabase Edge Functions
// Set ALLOWED_ORIGIN environment variable in production to restrict access

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCorsPreflightRequest(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function createCorsResponse(
  body: string | object,
  status: number = 200
): Response {
  const responseBody = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(responseBody, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
