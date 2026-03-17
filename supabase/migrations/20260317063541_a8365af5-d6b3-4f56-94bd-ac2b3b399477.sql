
-- Fix zones: allow anon + authenticated to SELECT
DROP POLICY IF EXISTS "Anyone can view zones" ON public.zones;
CREATE POLICY "Anyone can view zones" ON public.zones
  FOR SELECT TO anon, authenticated USING (true);

-- Fix atms: allow anon + authenticated to SELECT
DROP POLICY IF EXISTS "Anyone can view ATMs" ON public.atms;
CREATE POLICY "Anyone can view ATMs" ON public.atms
  FOR SELECT TO anon, authenticated USING (true);
