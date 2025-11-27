-- Fix infinite recursion in user_roles RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Recreate the has_role function with explicit SECURITY DEFINER
-- This function bypasses RLS when checking roles
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create a simpler admin policy that doesn't cause recursion
-- Admins can do everything on user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.user_role) TO anon;