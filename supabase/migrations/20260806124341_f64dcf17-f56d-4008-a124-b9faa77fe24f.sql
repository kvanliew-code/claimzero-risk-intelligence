CREATE TABLE IF NOT EXISTS public.aspects (
  aspect_id text PRIMARY KEY,
  aspect_name text NOT NULL,
  owner_question text NOT NULL DEFAULT '',
  family_codes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspects TO authenticated;
GRANT ALL ON public.aspects TO service_role;
ALTER TABLE public.aspects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aspects_read ON public.aspects;
CREATE POLICY aspects_read ON public.aspects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS aspects_admin_write ON public.aspects;
CREATE POLICY aspects_admin_write ON public.aspects FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.control_register ADD COLUMN IF NOT EXISTS aspect_id text;

CREATE TABLE IF NOT EXISTS public.stage_exit_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id text NOT NULL UNIQUE,
  stage_number int NOT NULL,
  stage_name text NOT NULL DEFAULT '',
  exit_criterion text NOT NULL,
  evidence_required text NOT NULL DEFAULT '',
  blocking text NOT NULL DEFAULT 'HARD',
  linked_families text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_exit_criteria TO authenticated;
GRANT ALL ON public.stage_exit_criteria TO service_role;
ALTER TABLE public.stage_exit_criteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_read ON public.stage_exit_criteria;
CREATE POLICY sec_read ON public.stage_exit_criteria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sec_admin_write ON public.stage_exit_criteria;
CREATE POLICY sec_admin_write ON public.stage_exit_criteria FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.aspect_weight_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_number int NOT NULL,
  aspect_id text NOT NULL,
  weight numeric NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_number, aspect_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspect_weight_overrides TO authenticated;
GRANT ALL ON public.aspect_weight_overrides TO service_role;
ALTER TABLE public.aspect_weight_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS awo_read ON public.aspect_weight_overrides;
CREATE POLICY awo_read ON public.aspect_weight_overrides FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS awo_admin_write ON public.aspect_weight_overrides;
CREATE POLICY awo_admin_write ON public.aspect_weight_overrides FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS rule_id text;
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS aspect_id text;
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS conditions text NOT NULL DEFAULT '';
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS severity_floor text NOT NULL DEFAULT 'YELLOW';
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT '';
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS false_positive_checks text NOT NULL DEFAULT '';
ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS stages int[] NOT NULL DEFAULT '{}';
UPDATE public.escalation_rules SET rule_id = 'LEGACY-' || left(id::text,8) WHERE rule_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS escalation_rules_rule_id_key ON public.escalation_rules (rule_id);

INSERT INTO public.aspects (aspect_id,aspect_name,owner_question,family_codes) VALUES
('A01','Entitlement & Development Rights','Will we get the approval, and will it survive?','ACQ-ZON; ACQ-REG; ACQ-TTL; ENT-PTH; ENT-ADM; ENT-HRG; ENT-CMP; ENT-RES; PAV-CND; PAV-CHL; SLS-REG'),
('A02','Permits, Inspections & Agency Clearance','Will the paper be in hand when we need it, and are we clear with the inspectors?','ENT-ENV; ENT-FNL; DES-COD; DES-PMT; PRE-PER; PRE-NTP; CON-AGY; CLO-INS; CLO-VIO'),
('A03','Site, Ground & Environmental Conditions','What is this piece of ground going to hit us with that nobody priced?','ACQ-GEO; ACQ-ENV; ACQ-HYD; ACQ-BLD; ACQ-SRV; ENT-STM; PRE-TMP; CON-ENC'),
('A04','Utilities, Access & Offsite Infrastructure','Will there be power, water, sewer and a legal way in when we need them?','ACQ-UTL; ACQ-ACC; ENT-UTL; ENT-TRF; DES-UTL; CON-UTL'),
('A05','Program Integrity & Owner Decision Control','Are we still building what we underwrote, and are we the ones holding it up?','DES-BAS; DES-OWN; DES-ARC; ENT-ARC; ENT-LND; PRE-ASM; CON-OWN'),
('A06','Design Coordination & Documentation','Are the drawings finished, do they fit together, and can they be built?','DES-STR; DES-MEP; DES-ELE; DES-ENC; DES-CIV; DES-CRD; DES-SPC; ENT-CIV; PRE-DES; PRE-BIM; CON-RFI'),
('A07','Contract Structure, Scope & Counterparty Capability','Is the team real, and does the contract put the risk where we think it is?','ACQ-OWN; ACQ-TEAM; PRE-DEL; PRE-BIF; PRE-CON; PRE-SCP; PRE-SEL; PRE-SUB; CON-SUB; CON-FLD'),
('A08','Cost Position & Contingency','What will this cost when it is done, and how much room is left?','DES-CST; PRE-CST; PRE-EST; PRE-CTG; CON-CST; CON-CHG'),
('A09','Procurement, Buyout & Long Lead','Is it bought, is the price locked, and will it show up on time?','DES-LLD; PRE-AWD; PRE-BUY; PRE-PRC; PRE-LBR; CON-PRC'),
('A10','Schedule Integrity & Critical Path','When does this open, and does the schedule still match the field?','ACQ-SCH; DES-SCH; PRE-SCH; CON-SCH; CLO-TRN'),
('A11','Capital Structure & Sponsor Solvency','Does the money to finish and exit exist, and is it still committed?','ACQ-FIN; FIN-CAP; FIN-EQY; FIN-COV; PAV-RUN; SLS-INV; SLS-TKO'),
('A12','Payment, Draw & Cash Movement','Is every dollar leaving the account actually in the ground?','FIN-DRW; PRE-PAY; CON-PAY; CLO-FIN; SLS-DEP'),
('A13','Quality, Commissioning & Handover','Is the work any good, and can we actually accept it?','PRE-QA; CON-QAL; CLO-CX; CLO-PCH; CLO-DOC; CLO-OPS'),
('A14','Safety, Insurance & Dispute Exposure','If this goes wrong, who pays — and is somebody building a case?','ACQ-INS; PRE-INS; CON-SAF; CON-COR; CLO-RSK'),
('A15','Demand, Revenue & Absorption','Will it sell or lease at our number?','PAV-ANC; SLS-VEL; SLS-PRC; SLS-CLS; SLS-OPS')
ON CONFLICT (aspect_id) DO UPDATE SET aspect_name=EXCLUDED.aspect_name, owner_question=EXCLUDED.owner_question, family_codes=EXCLUDED.family_codes;

UPDATE public.control_register cr SET aspect_id = m.aspect_id
FROM (SELECT a.aspect_id, btrim(f) AS family_code FROM public.aspects a, unnest(string_to_array(a.family_codes,';')) f) m
WHERE btrim(cr.family_code) = m.family_code AND cr.aspect_id IS DISTINCT FROM m.aspect_id;