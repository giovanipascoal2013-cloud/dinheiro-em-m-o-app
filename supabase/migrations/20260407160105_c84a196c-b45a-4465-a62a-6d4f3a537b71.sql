
-- Table: agent_ratings
CREATE TABLE public.agent_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, zone_id)
);

ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;

-- Users can view their own votes
CREATE POLICY "Users can view own ratings" ON public.agent_ratings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins/supervisors can view all ratings
CREATE POLICY "Admins can view all ratings" ON public.agent_ratings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role));

-- Users can insert their own ratings
CREATE POLICY "Users can insert own ratings" ON public.agent_ratings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON public.agent_ratings
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Table: agent_activity_log
CREATE TABLE public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  atm_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'update',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;

-- Agents can insert their own logs
CREATE POLICY "Agents can insert own activity" ON public.agent_activity_log
FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid());

-- Admins/supervisors can view all activity
CREATE POLICY "Admins can view all activity" ON public.agent_activity_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role));
