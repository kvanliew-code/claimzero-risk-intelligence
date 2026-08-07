-- ============ REQ-008 review_items ============
ALTER TABLE public.review_items
  ADD COLUMN IF NOT EXISTS class char(1),
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS decision_level int,
  ADD COLUMN IF NOT EXISTS cycle_key text,
  ADD COLUMN IF NOT EXISTS held boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rank_score numeric,
  ADD COLUMN IF NOT EXISTS rule_id text,
  ADD COLUMN IF NOT EXISTS session_id uuid;

ALTER TABLE public.review_items
  ADD COLUMN IF NOT EXISTS decided_in_minutes int;

ALTER TABLE public.review_items
  ADD CONSTRAINT review_items_class_chk CHECK (class IS NULL OR class IN ('A','B','C'));

ALTER TABLE public.review_items
  ADD CONSTRAINT review_items_status_chk CHECK (status IN ('PENDING','APPROVED','CHANGES_REQUESTED','REJECTED'));

ALTER TABLE public.review_items
  ADD CONSTRAINT review_items_kind_chk CHECK (kind IN ('risk','exposure','report','evidence'));

-- null is not zero
ALTER TABLE public.review_items ALTER COLUMN exposure_usd DROP DEFAULT;
ALTER TABLE public.review_items ALTER COLUMN exposure_usd DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS review_items_dedupe_uidx
  ON public.review_items (project_id, control_id, rule_id, cycle_key);

CREATE TABLE IF NOT EXISTS public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  items_worked int NOT NULL DEFAULT 0,
  minutes numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_sessions TO authenticated;
GRANT ALL ON public.review_sessions TO service_role;
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_sessions_own_read ON public.review_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_staff(auth.uid()));
CREATE POLICY review_sessions_own_write ON public.review_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER review_sessions_touch BEFORE UPDATE ON public.review_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REQ-006 thirty aspects ============
ALTER TABLE public.aspects
  ADD COLUMN IF NOT EXISTS stream text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_active_stage int,
  ADD COLUMN IF NOT EXISTS legacy_aspect_id text;

CREATE TABLE IF NOT EXISTS public.aspect_id_history (
  old_aspect_id text PRIMARY KEY,
  old_aspect_name text NOT NULL,
  new_aspect_id text NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aspect_id_history TO authenticated;
GRANT ALL ON public.aspect_id_history TO service_role;
ALTER TABLE public.aspect_id_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY aspect_id_history_read ON public.aspect_id_history
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

CREATE TEMP TABLE aspect_map(old_id text PRIMARY KEY, new_id text NOT NULL) ON COMMIT DROP;
INSERT INTO aspect_map(old_id,new_id) VALUES
 ('A01','A03'),('A02','A06'),('A03','A04'),('A04','A05'),('A05','A11'),
 ('A06','A13'),('A07','A14'),('A08','A16'),('A09','A21'),('A10','A24'),
 ('A11','A18'),('A12','A20'),('A13','A15'),('A14','A29'),('A15','A30');

INSERT INTO public.aspect_id_history(old_aspect_id, old_aspect_name, new_aspect_id)
SELECT a.aspect_id, a.aspect_name, m.new_id
FROM public.aspects a JOIN aspect_map m ON m.old_id = a.aspect_id
ON CONFLICT (old_aspect_id) DO NOTHING;

-- free up the id space
UPDATE public.aspects SET aspect_id = 'LEGACY_' || aspect_id WHERE aspect_id ~ '^A[0-9]{2}$';

INSERT INTO public.aspects (aspect_id, aspect_name, owner_question, family_codes, stream, first_active_stage, legacy_aspect_id) VALUES
 ('A01','Concept & Highest and Best Use','Are we building the right thing on this site?','','Land & Entitlement',1,NULL),
 ('A02','Site Control & Deal Structure','Do we actually control the land on terms we can build on?','','Land & Entitlement',1,NULL),
 ('A03','Entitlement & Development Rights','Do we have the right to build what we underwrote?','','Land & Entitlement',2,'A01'),
 ('A04','Site, Ground & Environmental','What is in the ground, and what will it cost us?','','Land & Entitlement',1,'A03'),
 ('A05','Utilities, Access & Offsite','Can we get power, water, sewer and access when we need them?','','Land & Entitlement',2,'A04'),
 ('A06','Local Authority & Jurisdictional Clearance','Will the authority let us proceed on schedule?','','Authority & Neighbours',2,'A02'),
 ('A07','Adjacent Property & License Agreements','Do we have the neighbour agreements we need to build?','','Authority & Neighbours',4,NULL),
 ('A08','Site Logistics & Public Way','Can we stage, crane and close the street lawfully?','','Authority & Neighbours',5,NULL),
 ('A09','Monitoring, Vibration & Protection','Are we protecting adjacent structures and proving it?','','Authority & Neighbours',6,NULL),
 ('A10','Certificate of Occupancy Readiness','What stands between us and a CO today?','','Authority & Neighbours',6,NULL),
 ('A11','Program Integrity & Owner Decision Control','Is the program stable and are decisions being made on time?','','Design & Contract',3,'A05'),
 ('A12','Professional Team Procurement & Coverage','Is every design discipline retained, insured and scoped?','','Design & Contract',2,NULL),
 ('A13','Design Coordination & Documentation','Are the documents coordinated enough to build from?','','Design & Contract',3,'A06'),
 ('A14','Contract Structure, Scope & Counterparty','Who is on the hook, for what, and can they perform?','','Design & Contract',4,'A07'),
 ('A15','Quality, Commissioning & Systems Verification','Will the systems work and can we prove it?','','Design & Contract',6,'A13'),
 ('A16','Cost Position & Contingency','Where is the cost, and how much room is left?','','Cost & Capital',1,'A08'),
 ('A17','Anticipated Cost & Change Genealogy','Where is cost heading, and where did each change come from?','','Cost & Capital',5,NULL),
 ('A18','Capital Structure & Sponsor Solvency','Is the capital stack real and is the sponsor solvent?','','Cost & Capital',1,'A11'),
 ('A19','Lender & Capital Partner Relations','Are we in good standing with the people funding this?','','Cost & Capital',2,NULL),
 ('A20','Payment, Draw & Cash Movement','Is money moving to the people doing the work?','','Cost & Capital',6,'A12'),
 ('A21','Procurement, Buyout & Long Lead','Is it bought, and will it arrive in time?','','Procurement & Time',5,'A09'),
 ('A22','Owner-Furnished Scope & FF&E','Is the owner-supplied scope tracked like a trade?','','Procurement & Time',5,NULL),
 ('A23','Supply Chain, Tariff & Trade Policy','What outside our contract can move our costs and dates?','','Procurement & Time',5,NULL),
 ('A24','Schedule Integrity & Critical Path','Is the schedule honest, and what is really driving the end date?','','Procurement & Time',4,'A10'),
 ('A25','Trade Performance on Critical Path','Are the trades that control the end date actually performing?','','Procurement & Time',6,NULL),
 ('A26','Communication Integrity','Is what is being said matching what is being done?','','Delivery System',1,NULL),
 ('A27','Team Capacity & Continuity','Do we have the people, and are they staying?','','Delivery System',1,NULL),
 ('A28','Field Reporting & Source-System Health','Are the source systems current and trustworthy?','','Delivery System',6,NULL),
 ('A29','Safety, Insurance & Dispute Exposure','What is our exposure if this goes wrong?','','Delivery System',6,'A14'),
 ('A30','Demand, Absorption & Sales Execution','Will it sell or lease at the pace we underwrote?','','Delivery System',1,'A15');

-- carry forward the legacy owner question and family codes where a mapping exists
UPDATE public.aspects n
SET family_codes = o.family_codes
FROM public.aspects o
WHERE n.legacy_aspect_id IS NOT NULL
  AND o.aspect_id = 'LEGACY_' || n.legacy_aspect_id
  AND o.family_codes <> '';

-- remap dependents
UPDATE public.control_register c SET aspect_id = m.new_id
FROM aspect_map m WHERE c.aspect_id = m.old_id;

UPDATE public.aspect_weight_overrides w SET aspect_id = m.new_id
FROM aspect_map m WHERE w.aspect_id = m.old_id;

DELETE FROM public.aspects WHERE aspect_id LIKE 'LEGACY_%';

ALTER TABLE public.aspects ALTER COLUMN stream DROP DEFAULT;

-- ============ D-14 narrow methodology reads ============
DROP POLICY IF EXISTS aspects_read ON public.aspects;
CREATE POLICY aspects_read ON public.aspects FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

DROP POLICY IF EXISTS control_register_read_staff ON public.control_register;
CREATE POLICY control_register_read_staff ON public.control_register FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

DROP POLICY IF EXISTS escalation_rules_read ON public.escalation_rules;
CREATE POLICY escalation_rules_read ON public.escalation_rules FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

DROP POLICY IF EXISTS sec_read ON public.stage_exit_criteria;
CREATE POLICY sec_read ON public.stage_exit_criteria FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

DROP POLICY IF EXISTS lifecycle_stages_read ON public.lifecycle_stages;
CREATE POLICY lifecycle_stages_read ON public.lifecycle_stages FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));

DROP POLICY IF EXISTS awo_read ON public.aspect_weight_overrides;
CREATE POLICY awo_read ON public.aspect_weight_overrides FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.user_id = auth.uid()));