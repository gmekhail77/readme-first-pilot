-- Modify providers foreign key to reference profiles instead of auth.users
-- This allows us to seed test data more easily

-- Drop the existing foreign key constraint
ALTER TABLE public.providers 
  DROP CONSTRAINT IF EXISTS providers_user_id_fkey;

-- Add new foreign key constraint pointing to profiles
ALTER TABLE public.providers 
  ADD CONSTRAINT providers_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;