ALTER TABLE public.control_register ADD COLUMN IF NOT EXISTS continuous boolean NOT NULL DEFAULT false;
ALTER TABLE public.control_register ALTER COLUMN min_tier SET DEFAULT 'A';