-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'agent', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create zones table
CREATE TABLE public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    price_kz NUMERIC NOT NULL DEFAULT 1500,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on zones
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Create ATMs table
CREATE TABLE public.atms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE NOT NULL,
    bank_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    has_cash BOOLEAN NOT NULL DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ATMs
ALTER TABLE public.atms ENABLE ROW LEVEL SECURITY;

-- Create agent_zones table (assigns agents to zones)
CREATE TABLE public.agent_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (agent_id, zone_id)
);

-- Enable RLS on agent_zones
ALTER TABLE public.agent_zones ENABLE ROW LEVEL SECURITY;

-- Create referrals table (tracks referral usage)
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT NOT NULL,
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for zones
CREATE POLICY "Anyone can view zones"
ON public.zones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and admins can manage zones"
ON public.zones
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ATMs
CREATE POLICY "Anyone can view ATMs"
ON public.atms
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and admins can manage ATMs"
ON public.atms
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_zones
CREATE POLICY "Agents can view their own zones"
ON public.agent_zones
FOR SELECT
TO authenticated
USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors and admins can manage agent zones"
ON public.agent_zones
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for referrals
CREATE POLICY "Agents can view their own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can create referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_zones_updated_at
BEFORE UPDATE ON public.zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;