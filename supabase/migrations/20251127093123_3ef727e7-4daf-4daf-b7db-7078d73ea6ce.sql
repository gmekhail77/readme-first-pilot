-- Create enum types for better type safety
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
CREATE TYPE provider_status AS ENUM ('pending', 'approved', 'suspended');
CREATE TYPE service_type AS ENUM ('cleaning', 'landscaping', 'pool');
CREATE TYPE job_status AS ENUM ('pending_deposit', 'confirmed', 'in_progress', 'completed', 'paid', 'cancelled');
CREATE TYPE pricing_tier AS ENUM ('budget', 'standard', 'premium');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create providers table
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  services service_type[] NOT NULL,
  cities TEXT[] NOT NULL,
  pricing_tier pricing_tier NOT NULL DEFAULT 'standard',
  years_experience INTEGER NOT NULL DEFAULT 0,
  insurance_verified BOOLEAN NOT NULL DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  status provider_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Create property_profiles table
CREATE TABLE public.property_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  square_feet INTEGER,
  lot_size INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  pool_type TEXT,
  pool_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.property_profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending_deposit',
  pricing_details JSONB NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_providers_status ON public.providers(status);
CREATE INDEX idx_providers_cities ON public.providers USING GIN(cities);
CREATE INDEX idx_providers_services ON public.providers USING GIN(services);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_provider_id ON public.jobs(provider_id);
CREATE INDEX idx_jobs_property_id ON public.jobs(property_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for providers
CREATE POLICY "Customers can view approved providers"
  ON public.providers FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Providers can view own profile"
  ON public.providers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Providers can update own profile"
  ON public.providers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Providers can insert own profile"
  ON public.providers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all providers"
  ON public.providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all providers"
  ON public.providers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for property_profiles
CREATE POLICY "Users can view own properties"
  ON public.property_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own properties"
  ON public.property_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own properties"
  ON public.property_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Providers can view properties for their jobs"
  ON public.property_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      INNER JOIN public.providers p ON j.provider_id = p.id
      WHERE j.property_id = property_profiles.id AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for jobs
CREATE POLICY "Customers can view own jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_profiles pp
      WHERE pp.id = jobs.property_id AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view assigned jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = jobs.provider_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update assigned jobs"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = jobs.provider_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_profiles pp
      WHERE pp.id = jobs.property_id AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all jobs"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_profiles_updated_at
  BEFORE UPDATE ON public.property_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();