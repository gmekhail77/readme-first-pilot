-- Temporarily remove foreign key from profiles to allow seed data
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert 10 test profiles for providers
INSERT INTO public.profiles (id, full_name, email, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Gilbert Budget Clean Owner', 'gilbert.budget@test.com', '(480) 555-0101'),
  ('11111111-2222-2222-2222-222222222222', 'Gilbert Home Services Owner', 'gilbert.standard@test.com', '(480) 555-0102'),
  ('11111111-3333-3333-3333-333333333333', 'Gilbert Elite Care Owner', 'gilbert.premium@test.com', '(480) 555-0103'),
  ('22222222-1111-1111-1111-111111111111', 'Mesa Value Services Owner', 'mesa.budget@test.com', '(480) 555-0201'),
  ('22222222-2222-2222-2222-222222222222', 'Mesa Pro Maintenance Owner', 'mesa.standard1@test.com', '(480) 555-0202'),
  ('22222222-3333-3333-3333-333333333333', 'Mesa Quality Care Owner', 'mesa.standard2@test.com', '(480) 555-0203'),
  ('22222222-4444-4444-4444-444444444444', 'Mesa Premier Services Owner', 'mesa.premium@test.com', '(480) 555-0204'),
  ('33333333-1111-1111-1111-111111111111', 'Chandler Affordable Care Owner', 'chandler.budget@test.com', '(480) 555-0301'),
  ('33333333-2222-2222-2222-222222222222', 'Chandler Home Experts Owner', 'chandler.standard@test.com', '(480) 555-0302'),
  ('33333333-3333-3333-3333-333333333333', 'Chandler Luxury Services Owner', 'chandler.premium@test.com', '(480) 555-0303');

-- Insert 10 test providers

-- GILBERT PROVIDERS (3 total)
INSERT INTO public.providers (
  id, user_id, business_name, services, cities, pricing_tier, 
  years_experience, insurance_verified, rating, total_reviews, status
) VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Gilbert Budget Clean', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Gilbert'], 'budget', 3, true, 4.2, 45, 'approved'),
  ('11111111-2222-2222-2222-222222222222', '11111111-2222-2222-2222-222222222222', 'Gilbert Home Services', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Gilbert'], 'standard', 7, true, 4.7, 128, 'approved'),
  ('11111111-3333-3333-3333-333333333333', '11111111-3333-3333-3333-333333333333', 'Gilbert Elite Care', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Gilbert'], 'premium', 12, true, 4.9, 203, 'approved');

-- MESA PROVIDERS (4 total)
INSERT INTO public.providers (
  id, user_id, business_name, services, cities, pricing_tier, 
  years_experience, insurance_verified, rating, total_reviews, status
) VALUES
  ('22222222-1111-1111-1111-111111111111', '22222222-1111-1111-1111-111111111111', 'Mesa Value Services', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Mesa'], 'budget', 4, true, 4.3, 67, 'approved'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Mesa Pro Maintenance', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Mesa'], 'standard', 6, true, 4.6, 95, 'approved'),
  ('22222222-3333-3333-3333-333333333333', '22222222-3333-3333-3333-333333333333', 'Mesa Quality Care', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Mesa'], 'standard', 8, true, 4.8, 156, 'approved'),
  ('22222222-4444-4444-4444-444444444444', '22222222-4444-4444-4444-444444444444', 'Mesa Premier Services', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Mesa'], 'premium', 15, true, 5.0, 287, 'approved');

-- CHANDLER PROVIDERS (3 total)
INSERT INTO public.providers (
  id, user_id, business_name, services, cities, pricing_tier, 
  years_experience, insurance_verified, rating, total_reviews, status
) VALUES
  ('33333333-1111-1111-1111-111111111111', '33333333-1111-1111-1111-111111111111', 'Chandler Affordable Care', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Chandler'], 'budget', 5, true, 4.4, 82, 'approved'),
  ('33333333-2222-2222-2222-222222222222', '33333333-2222-2222-2222-222222222222', 'Chandler Home Experts', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Chandler'], 'standard', 9, true, 4.7, 145, 'approved'),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Chandler Luxury Services', 
   ARRAY['cleaning', 'landscaping', 'pool']::service_type[], ARRAY['Chandler'], 'premium', 14, true, 4.9, 221, 'approved');