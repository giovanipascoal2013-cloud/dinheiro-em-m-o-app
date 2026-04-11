
-- Function to notify all users with a given role
CREATE OR REPLACE FUNCTION public.notify_users_by_role(_role app_role, _title text, _message text, _type text DEFAULT 'info')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT user_id FROM public.user_roles WHERE role = _role;
END;
$$;

-- Function to notify a specific user
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, _title, _message, _type);
END;
$$;
