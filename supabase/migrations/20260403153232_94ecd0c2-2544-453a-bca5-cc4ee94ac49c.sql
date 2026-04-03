
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (key, value) VALUES ('price_per_atm', '500');

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Financeiro and admin can update settings"
ON public.platform_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view all withdrawals"
ON public.withdrawals FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can update withdrawals"
ON public.withdrawals FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view all transactions"
ON public.transactions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can update zone prices"
ON public.zones FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view agent zones"
ON public.agent_zones FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro can view roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));
