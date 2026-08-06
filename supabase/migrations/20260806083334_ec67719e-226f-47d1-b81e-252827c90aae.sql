ALTER TABLE public.project_controls DROP CONSTRAINT IF EXISTS project_controls_status_check;
ALTER TABLE public.project_controls DROP CONSTRAINT IF EXISTS project_controls_status_chk;
ALTER TABLE public.control_register DROP CONSTRAINT IF EXISTS control_register_criticality_chk;
ALTER TABLE public.control_register DROP CONSTRAINT IF EXISTS control_register_irreversibility_chk;

ALTER TABLE public.control_register
  ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'HIGH',
  ADD COLUMN IF NOT EXISTS irreversibility text NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS inherits_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS responsible_seat text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supporting_seats text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trigger_logic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dependencies text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS downstream_exposure text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS applicable_delivery_models text NOT NULL DEFAULT '';

ALTER TABLE public.control_register
  ADD CONSTRAINT control_register_criticality_chk CHECK (criticality IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  ADD CONSTRAINT control_register_irreversibility_chk CHECK (irreversibility IN ('VERY_HIGH','HIGH','MEDIUM','LOW'));

UPDATE public.project_controls SET status = CASE status
  WHEN 'Evidence Not Located' THEN 'EVIDENCE_NOT_LOCATED'
  WHEN 'Work Not Started' THEN 'NOT_STARTED'
  WHEN 'Work In Progress' THEN 'IN_PROGRESS'
  WHEN 'Complete-Verified' THEN 'COMPLETE_VERIFIED'
  ELSE status END;

ALTER TABLE public.project_controls ALTER COLUMN status SET DEFAULT 'NOT_STARTED';

ALTER TABLE public.project_controls
  ADD CONSTRAINT project_controls_status_chk CHECK (status IN (
    'N/A','NOT_STARTED','EVIDENCE_NOT_LOCATED','IN_PROGRESS','COMPLETE_UNVERIFIED','COMPLETE_VERIFIED',
    'CONTROLLED_ASSUMPTION','BLOCKED','OVERDUE','ADVERSE','ACCEPTED_RISK','SUPERSEDED'));