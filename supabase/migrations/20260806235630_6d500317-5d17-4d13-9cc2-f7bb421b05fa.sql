ALTER TABLE public.control_register
  ADD COLUMN IF NOT EXISTS evidence_class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS control_register_family_code_idx ON public.control_register (family_code);
CREATE INDEX IF NOT EXISTS control_register_stage_idx ON public.control_register (stage_number);