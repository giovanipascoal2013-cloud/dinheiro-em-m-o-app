-- =====================================================================
-- Dinheiro em Mão — Schema inicial consolidado
-- Aplicar num projecto Supabase novo e vazio com:
--   psql "$DATABASE_URL" -f migrations/0001_initial_schema.sql
-- ou via Supabase CLI:
--   supabase db push   (se este ficheiro for colocado em supabase/migrations/)
-- =====================================================================

-- ---------- Extensões ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Enum de roles ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','supervisor','agent','user','financeiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Função utilitária: updated_at ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =====================================================================
-- TABELAS
-- =====================================================================

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  telefone text NOT NULL,
  nome text,
  provincia text,
  cidade text,
  iban text,
  iban_titular text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- zones
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  price_kz numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_zones_updated BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- atms
CREATE TABLE public.atms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  bank_name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  has_cash boolean NOT NULL DEFAULT true,
  has_paper boolean DEFAULT true,
  cidade text,
  provincia text,
  fila text,
  status text DEFAULT 'Operacional',
  obs text,
  status_approval text NOT NULL DEFAULT 'approved',
  submitted_by uuid,
  photo_url text,
  rejection_reason text,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- agent_zones
CREATE TABLE public.agent_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  zone_id uuid NOT NULL UNIQUE REFERENCES public.zones(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- agent_ratings
CREATE TABLE public.agent_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- agent_activity_log
CREATE TABLE public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  atm_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'update',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- agent_onboarding_progress
CREATE TABLE public.agent_onboarding_progress (
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
CREATE TRIGGER trg_aop_updated BEFORE UPDATE ON public.agent_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  zone_id text NOT NULL,
  amount_kz numeric NOT NULL,
  method text NOT NULL DEFAULT 'multicaixa_express',
  status text NOT NULL DEFAULT 'pending',
  payment_ref text,
  phone_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tx_updated BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  zone_id text NOT NULL,
  amount_kz numeric NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  payment_ref text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- withdrawals
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  amount_kz numeric NOT NULL,
  method text NOT NULL DEFAULT 'iban',
  bank_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_with_updated BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  referral_code text NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- platform_settings
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- FUNÇÕES
-- =====================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, _title, _message, _type);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_users_by_role(_role public.app_role, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT user_id, _title, _message, _type FROM public.user_roles WHERE role = _role;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _account_type text;
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'agent') ON CONFLICT DO NOTHING;
    INSERT INTO public.agent_onboarding_progress (agent_id) VALUES (NEW.id) ON CONFLICT (agent_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.approve_pending_atm(
  _atm_id uuid, _zone_id uuid DEFAULT NULL, _zone_name text DEFAULT NULL, _zone_price numeric DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _atm record; _final_zone_id uuid; _agent_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _atm FROM public.atms WHERE id = _atm_id AND status_approval = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'ATM not found or not pending'; END IF;
  _agent_id := _atm.submitted_by;

  IF _zone_id IS NULL THEN
    INSERT INTO public.zones (name, latitude, longitude, price_kz, status)
    VALUES (
      COALESCE(_zone_name, _atm.bank_name || ' - ' || COALESCE(_atm.cidade, 'Zona')),
      _atm.latitude, _atm.longitude, COALESCE(_zone_price, 0), 'active'
    ) RETURNING id INTO _final_zone_id;
  ELSE
    _final_zone_id := _zone_id;
  END IF;

  UPDATE public.atms SET status_approval = 'approved', zone_id = _final_zone_id WHERE id = _atm_id;

  IF _agent_id IS NOT NULL THEN
    INSERT INTO public.agent_zones (agent_id, zone_id, referral_code)
    VALUES (_agent_id, _final_zone_id, public.generate_referral_code()) ON CONFLICT DO NOTHING;
    UPDATE public.agent_onboarding_progress SET first_atm_approved = true WHERE agent_id = _agent_id;
    PERFORM public.notify_user(_agent_id, 'ATM Aprovado',
      'O seu ATM foi aprovado e a zona foi criada. Já pode aceder ao Dashboard.', 'success');
  END IF;

  RETURN _final_zone_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_pending_atm(_atm_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _agent_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT submitted_by INTO _agent_id FROM public.atms WHERE id = _atm_id;
  UPDATE public.atms SET status_approval = 'rejected', rejection_reason = _reason WHERE id = _atm_id;
  IF _agent_id IS NOT NULL THEN
    UPDATE public.agent_onboarding_progress
      SET first_atm_submitted = false, pending_atm_id = NULL
      WHERE agent_id = _agent_id;
    PERFORM public.notify_user(_agent_id, 'ATM Rejeitado',
      'O seu ATM foi rejeitado. Motivo: ' || _reason || '. Por favor submeta novamente.', 'error');
  END IF;
END; $$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Financeiro can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));

-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Supervisors can view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Financeiro can view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));

-- zones
CREATE POLICY "Anyone can view zones" ON public.zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Supervisors and admins can manage zones" ON public.zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Financeiro can update zone prices" ON public.zones FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'financeiro')) WITH CHECK (public.has_role(auth.uid(),'financeiro'));

-- atms
CREATE POLICY "Anyone can view ATMs" ON public.atms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Agents can submit pending ATMs" ON public.atms FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'agent') AND status_approval = 'pending' AND submitted_by = auth.uid());
CREATE POLICY "Agents view own submissions" ON public.atms FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "Agents can update ATMs in their zones" ON public.atms FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND zone_id IN (SELECT zone_id FROM public.agent_zones WHERE agent_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'agent') AND zone_id IN (SELECT zone_id FROM public.agent_zones WHERE agent_id = auth.uid()));
CREATE POLICY "Supervisors and admins can manage ATMs" ON public.atms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));

-- agent_zones
CREATE POLICY "Agents can view their own zones" ON public.agent_zones FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Financeiro can view agent zones" ON public.agent_zones FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "Supervisors and admins can manage agent zones" ON public.agent_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));

-- agent_ratings
CREATE POLICY "Users can view own ratings" ON public.agent_ratings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ratings" ON public.agent_ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ratings" ON public.agent_ratings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all ratings" ON public.agent_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- agent_activity_log
CREATE POLICY "Agents can insert own activity" ON public.agent_activity_log FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Admins can view all activity" ON public.agent_activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- agent_onboarding_progress
CREATE POLICY "Agents view own progress" ON public.agent_onboarding_progress FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Agents insert own progress" ON public.agent_onboarding_progress FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Agents update own progress" ON public.agent_onboarding_progress FOR UPDATE TO authenticated
  USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Admins manage progress" ON public.agent_onboarding_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Financeiro can view all transactions" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));

-- subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supervisors can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Supervisors can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Financeiro can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "Agents can view subscriptions in their zones" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'agent') AND zone_id::uuid IN (SELECT zone_id FROM public.agent_zones WHERE agent_id = auth.uid()));

-- withdrawals
CREATE POLICY "Agents can view their own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agents can create their own withdrawals" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() AND public.has_role(auth.uid(),'agent'));
CREATE POLICY "Admins can update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Supervisors can view all withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Supervisors can update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "Financeiro can view all withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "Financeiro can update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'financeiro')) WITH CHECK (public.has_role(auth.uid(),'financeiro'));

-- referrals
CREATE POLICY "Agents can view their own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'supervisor') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Agents can create their own referrals" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() AND public.has_role(auth.uid(),'agent'));

-- notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins and supervisors can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- platform_settings
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Financeiro and admin can update settings" ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

-- =====================================================================
-- STORAGE — bucket atm-photos (privado)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('atm-photos', 'atm-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents upload own ATM photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'atm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Agents view own ATM photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'atm-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'supervisor')
  ));

-- =====================================================================
-- ÍNDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_atms_zone ON public.atms(zone_id);
CREATE INDEX IF NOT EXISTS idx_atms_status_approval ON public.atms(status_approval);
CREATE INDEX IF NOT EXISTS idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_zone ON public.subscriptions(zone_id);
CREATE INDEX IF NOT EXISTS idx_tx_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);