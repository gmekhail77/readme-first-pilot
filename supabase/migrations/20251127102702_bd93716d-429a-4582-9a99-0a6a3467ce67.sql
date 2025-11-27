-- Remove recursive admin policy on user_roles causing infinite recursion
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;