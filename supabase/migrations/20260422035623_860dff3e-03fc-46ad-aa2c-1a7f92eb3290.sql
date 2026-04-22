-- 1. Add columns to atms table
ALTER TABLE public.atms
  ADD COLUMN IF NOT EXISTS status_approval text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing rows are pre-existing approved ATMs (default 'approved' is correct)
-- New submissions from agents will explicitly set 'pending'

CREATE INDEX IF NOT EXISTS idx_atms_status_approval ON public.atms(status_approval);
CREATE INDEX IF NOT EXISTS idx_atms_submitted_by ON public.atms(submitted_by);

-- 2. Create agent_onboarding_progress table
CREATE TABLE IF NOT EXISTS public.agent_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE,
  onboarding_seen boolean NOT NULL DEFAULT false,
  profile_completed boolean NOT NULL DEFAULT false,
  first_atm_submitted boolean NOT NULL DEFAULT false,
  first_atm_approved boolean NOT NULL DEFAULT false,
  pending_atm_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own progress"
ON public.agent_onboarding_progress FOR SELECT
TO authenticated
USING (agent_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Agents update own progress"
ON public.agent_onboarding_progress FOR UPDATE
TO authenticated
USING (agent_id = auth.uid())
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents insert own progress"
ON public.agent_onboarding_progress FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins manage progress"
ON public.agent_onboarding_progress FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE TRIGGER update_agent_onboarding_progress_updated_at
BEFORE UPDATE ON public.agent_onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Allow agents to insert ATMs as pending submissions
CREATE POLICY "Agents can submit pending ATMs"
ON public.atms FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND status_approval = 'pending'
  AND submitted_by = auth.uid()
);

CREATE POLICY "Agents view own submissions"
ON public.atms FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

-- 4. Update handle_new_user to honor account_type metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
BEGIN
  INSERT INTO public.profiles (user_id, telefone, nome, provincia, cidade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'telefone', NEW.email),
    NEW.raw_user_meta_data ->> 'nome',
    NEW.raw_user_meta_data ->> 'provincia',
    NEW.raw_user_meta_data ->> 'cidade'
  );

  _account_type := NEW.raw_user_meta_data ->> 'account_type';

  IF _account_type = 'agent' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent'::app_role)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.agent_onboarding_progress (agent_id)
    VALUES (NEW.id)
    ON CONFLICT (agent_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 5. Storage bucket for ATM photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atm-photos', 'atm-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents upload own atm photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'atm-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents view own atm photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'atm-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view all atm photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'atm-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
);

-- 6. Function to approve a pending ATM and create/link zone
CREATE OR REPLACE FUNCTION public.approve_pending_atm(
  _atm_id uuid,
  _zone_id uuid DEFAULT NULL,
  _zone_name text DEFAULT NULL,
  _zone_price numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _atm record;
  _final_zone_id uuid;
  _agent_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _atm FROM public.atms WHERE id = _atm_id AND status_approval = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATM not found or not pending';
  END IF;

  _agent_id := _atm.submitted_by;

  IF _zone_id IS NULL THEN
    INSERT INTO public.zones (name, latitude, longitude, price_kz, status)
    VALUES (
      COALESCE(_zone_name, _atm.bank_name || ' - ' || COALESCE(_atm.cidade, 'Zona')),
      _atm.latitude,
      _atm.longitude,
      COALESCE(_zone_price, 0),
      'active'
    )
    RETURNING id INTO _final_zone_id;
  ELSE
    _final_zone_id := _zone_id;
  END IF;

  UPDATE public.atms
  SET status_approval = 'approved',
      zone_id = _final_zone_id
  WHERE id = _atm_id;

  IF _agent_id IS NOT NULL THEN
    INSERT INTO public.agent_zones (agent_id, zone_id, referral_code)
    VALUES (_agent_id, _final_zone_id, public.generate_referral_code())
    ON CONFLICT DO NOTHING;

    UPDATE public.agent_onboarding_progress
    SET first_atm_approved = true
    WHERE agent_id = _agent_id;

    PERFORM public.notify_user(
      _agent_id,
      'ATM Aprovado',
      'O seu ATM foi aprovado e a zona foi criada. Já pode aceder ao Dashboard.',
      'success'
    );
  END IF;

  RETURN _final_zone_id;
END;
$function$;

-- 7. Function to reject a pending ATM
CREATE OR REPLACE FUNCTION public.reject_pending_atm(
  _atm_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _agent_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT submitted_by INTO _agent_id FROM public.atms WHERE id = _atm_id;

  UPDATE public.atms
  SET status_approval = 'rejected',
      rejection_reason = _reason
  WHERE id = _atm_id;

  IF _agent_id IS NOT NULL THEN
    UPDATE public.agent_onboarding_progress
    SET first_atm_submitted = false,
        pending_atm_id = NULL
    WHERE agent_id = _agent_id;

    PERFORM public.notify_user(
      _agent_id,
      'ATM Rejeitado',
      'O seu ATM foi rejeitado. Motivo: ' || _reason || '. Por favor submeta novamente.',
      'error'
    );
  END IF;
END;
$function$;

-- 8. Backfill agent_onboarding_progress for existing agents
INSERT INTO public.agent_onboarding_progress (
  agent_id, onboarding_seen, profile_completed, first_atm_submitted, first_atm_approved
)
SELECT
  ur.user_id,
  true,
  true,
  EXISTS (SELECT 1 FROM public.agent_zones az WHERE az.agent_id = ur.user_id),
  EXISTS (SELECT 1 FROM public.agent_zones az WHERE az.agent_id = ur.user_id)
FROM public.user_roles ur
WHERE ur.role = 'agent'::app_role
ON CONFLICT (agent_id) DO NOTHING;