ALTER TABLE public.atms
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS fila text,
  ADD COLUMN IF NOT EXISTS has_paper boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Operacional';