
-- Add província and cidade columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cidade text;

-- Update handle_new_user to capture new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, telefone, nome, provincia, cidade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'telefone', NEW.email),
    NEW.raw_user_meta_data ->> 'nome',
    NEW.raw_user_meta_data ->> 'provincia',
    NEW.raw_user_meta_data ->> 'cidade'
  );
  RETURN NEW;
END;
$$;
