-- Helper function to check if a user owns a property without causing RLS recursion
CREATE OR REPLACE FUNCTION public.user_owns_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_profiles
    WHERE id = _property_id AND user_id = _user_id
  );
$function$;

-- Update jobs policies to use the helper function instead of direct joins
DROP POLICY IF EXISTS "Customers can insert jobs" ON public.jobs;
CREATE POLICY "Customers can insert jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_property(auth.uid(), property_id));

DROP POLICY IF EXISTS "Customers can view own jobs" ON public.jobs;
CREATE POLICY "Customers can view own jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.user_owns_property(auth.uid(), property_id));