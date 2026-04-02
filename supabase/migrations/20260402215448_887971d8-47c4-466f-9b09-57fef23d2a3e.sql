
-- Add obs column to atms
ALTER TABLE public.atms ADD COLUMN IF NOT EXISTS obs text;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_atms_zone_id ON public.atms(zone_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_zone ON public.subscriptions(user_id, zone_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_zones_agent ON public.agent_zones(agent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_zone_status ON public.subscriptions(zone_id, status);
