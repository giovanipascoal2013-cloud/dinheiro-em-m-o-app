
-- Fix 1: Prevent users from modifying their own role in profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()));

-- Fix 2: Restrict referrals INSERT to only allow agent_id = auth.uid()
DROP POLICY IF EXISTS "Anyone authenticated can create referrals" ON public.referrals;
CREATE POLICY "Agents can create their own referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid() AND has_role(auth.uid(), 'agent'::app_role));

-- Fix 3: Set search_path on functions missing it
CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$function$;
