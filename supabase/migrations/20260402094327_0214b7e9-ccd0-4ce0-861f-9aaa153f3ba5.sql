
-- Agents can update ATMs in their assigned zones
CREATE POLICY "Agents can update ATMs in their zones"
ON public.atms FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND zone_id IN (SELECT zone_id FROM agent_zones WHERE agent_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND zone_id IN (SELECT zone_id FROM agent_zones WHERE agent_id = auth.uid())
);

-- Supervisors can update withdrawals (approve)
CREATE POLICY "Supervisors can update withdrawals"
ON public.withdrawals FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- Supervisors can view all withdrawals
CREATE POLICY "Supervisors can view all withdrawals"
ON public.withdrawals FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role));
