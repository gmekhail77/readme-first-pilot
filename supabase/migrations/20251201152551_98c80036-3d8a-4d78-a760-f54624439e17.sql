-- Add columns to providers table for Google Places seeding
ALTER TABLE public.providers
ADD COLUMN phone text,
ADD COLUMN website text,
ADD COLUMN place_id text UNIQUE,
ADD COLUMN source text DEFAULT 'USER_REGISTERED',
ADD COLUMN auto_created boolean DEFAULT false;

-- Make user_id nullable for auto-created providers
ALTER TABLE public.providers ALTER COLUMN user_id DROP NOT NULL;

-- Add index on place_id for fast lookups during upsert
CREATE INDEX idx_providers_place_id ON public.providers(place_id);