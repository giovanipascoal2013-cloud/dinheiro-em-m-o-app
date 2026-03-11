
-- Allow agents to SELECT subscriptions in their zones
CREATE POLICY "Agents can view subscriptions in their zones"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role)
  AND zone_id::uuid IN (SELECT zone_id FROM public.agent_zones WHERE agent_id = auth.uid())
);
