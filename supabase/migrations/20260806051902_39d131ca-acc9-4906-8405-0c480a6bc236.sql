
-- ============ control register ============
CREATE TABLE public.control_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id text NOT NULL UNIQUE,
  stage_number int NOT NULL,
  stage_name text NOT NULL DEFAULT '',
  family_code text NOT NULL DEFAULT '',
  family_name text NOT NULL DEFAULT '',
  requirement text NOT NULL DEFAULT '',
  expected_evidence text NOT NULL DEFAULT '',
  primary_owner_role text NOT NULL DEFAULT 'Owner',
  dependency text NOT NULL DEFAULT '',
  min_tier text NOT NULL DEFAULT 'C' CHECK (min_tier IN ('A','B','C')),
  domain text NOT NULL DEFAULT 'compliance' CHECK (domain IN ('cost','schedule','design','quality','people','compliance')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_register TO authenticated;
GRANT ALL ON public.control_register TO service_role;
ALTER TABLE public.control_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY control_register_read_staff ON public.control_register FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'project_manager'));
CREATE POLICY control_register_admin_write ON public.control_register FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ lifecycle stages ============
CREATE TABLE public.lifecycle_stages (
  stage_number int PRIMARY KEY,
  stage_name text NOT NULL,
  domain_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  exit_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifecycle_stages TO authenticated;
GRANT ALL ON public.lifecycle_stages TO service_role;
ALTER TABLE public.lifecycle_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY lifecycle_stages_read ON public.lifecycle_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY lifecycle_stages_admin_write ON public.lifecycle_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ escalation rules ============
CREATE TABLE public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'control',
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'Serious',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalation_rules TO authenticated;
GRANT ALL ON public.escalation_rules TO service_role;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY escalation_rules_read ON public.escalation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY escalation_rules_admin_write ON public.escalation_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ project control instances ============
CREATE TABLE public.project_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id int NOT NULL,
  control_id text NOT NULL,
  status text NOT NULL DEFAULT 'Evidence Not Located'
    CHECK (status IN ('Evidence Not Located','Work Not Started','Work In Progress','Complete-Verified')),
  evidence_ref text NOT NULL DEFAULT '',
  verified_by text NOT NULL DEFAULT '',
  verified_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, control_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_controls TO authenticated;
GRANT ALL ON public.project_controls TO service_role;
ALTER TABLE public.project_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_controls_read ON public.project_controls FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.user_id = auth.uid() AND pa.project_id = project_controls.project_id
  )
);
CREATE POLICY project_controls_write ON public.project_controls FOR ALL TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.user_id = auth.uid() AND pa.project_id = project_controls.project_id
  )
) WITH CHECK (
  public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.user_id = auth.uid() AND pa.project_id = project_controls.project_id
  )
);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER control_register_touch BEFORE UPDATE ON public.control_register FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER lifecycle_stages_touch BEFORE UPDATE ON public.lifecycle_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER escalation_rules_touch BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER project_controls_touch BEFORE UPDATE ON public.project_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seed: stages ============
INSERT INTO public.lifecycle_stages (stage_number, stage_name, domain_weights, exit_criteria) VALUES
(1,'Acquisition Due Diligence','{"cost":0.25,"schedule":0.10,"design":0.10,"quality":0.05,"people":0.10,"compliance":0.40}','["All Tier-applicable title and survey controls Complete-Verified","Underwriting pro forma reconciled to signed purchase agreement","No open environmental condition without a priced remedy"]'),
(2,'Site Plan and Entitlement Approval','{"cost":0.15,"schedule":0.25,"design":0.15,"quality":0.05,"people":0.10,"compliance":0.30}','["Approving resolution or site plan approval on file","All conditions of approval logged with an owner","Zoning analysis reconciled to the approved massing"]'),
(3,'Design Development and Construction Documents','{"cost":0.20,"schedule":0.20,"design":0.35,"quality":0.10,"people":0.05,"compliance":0.10}','["100% CD set issued and archived","Consultant coordination sign-off recorded","Design contingency reconciled to the current estimate"]'),
(4,'Preconstruction GMP and Buyout','{"cost":0.35,"schedule":0.25,"design":0.15,"quality":0.10,"people":0.05,"compliance":0.10}','["Executed GMP amendment with exhibit list","Baseline schedule accepted in writing","Buyout log shows no unbought critical-path scope"]'),
(5,'Construction','{"cost":0.30,"schedule":0.30,"design":0.10,"quality":0.15,"people":0.05,"compliance":0.10}','["Current month requisition reconciled to the schedule of values","Schedule update accepted with no unexplained float loss","No open notice-of-claim correspondence unanswered"]'),
(6,'Closeout TCO and Certificate of Occupancy','{"cost":0.15,"schedule":0.20,"design":0.05,"quality":0.30,"people":0.05,"compliance":0.25}','["All special inspection sign-offs filed","Punch list closed or bonded","TCO/CO issued and archived"]'),
(7,'Sales Lease-Up Stabilization and Takeout','{"cost":0.30,"schedule":0.15,"design":0.05,"quality":0.10,"people":0.05,"compliance":0.35}','["Absorption tracked against pro forma for three consecutive months","Takeout financing term sheet executed","Warranty and O&M package delivered to operations"]');

-- ============ seed: escalation rules ============
INSERT INTO public.escalation_rules (name, description, scope, condition, severity) VALUES
('Evidence not located over 14 days','Any control instance sitting in Evidence Not Located for more than 14 days escalates to the Weekly Top Ten regardless of score.','control','{"field":"status","operator":"equals","value":"Evidence Not Located","days_in_status_gt":14}','Serious'),
('Compliance control not started','A compliance-domain control still Work Not Started inside the active stage escalates immediately.','control','{"field":"status","operator":"equals","value":"Work Not Started","domain":"compliance"}','Critical'),
('Stage completeness below 60%','Any project whose active-stage completeness falls below 60 percent escalates to the Weekly Top Ten.','metric','{"metric":"stage_completeness","operator":"lt","value":60}','Serious'),
('Three or more owner-owed controls open','Three or more owner-owed controls not Complete-Verified at once escalates the project.','project','{"owner_role":"Owner","operator":"count_gte","value":3,"status_not":"Complete-Verified"}','Serious');

-- ============ seed: control register ============
INSERT INTO public.control_register (control_id, stage_number, stage_name, family_code, family_name, requirement, expected_evidence, primary_owner_role, dependency, min_tier, domain) VALUES
('ACQ-TTL-001',1,'Acquisition Due Diligence','TTL','Title & Survey','Obtain and review the title commitment with all recorded exceptions.','Title commitment PDF with exception documents attached','Counsel','An unreviewed exception can defeat the development right after closing.','C','compliance'),
('ACQ-TTL-002',1,'Acquisition Due Diligence','TTL','Title & Survey','Commission an ALTA/NSPS survey reconciled to the title exceptions.','Sealed ALTA survey and surveyor exception matrix','Owner','Encroachments discovered post-closing are uninsurable and unbudgeted.','C','compliance'),
('ACQ-ENV-003',1,'Acquisition Due Diligence','ENV','Environmental','Complete a Phase I ESA and act on any recognized environmental condition.','Phase I ESA report and, where triggered, Phase II scope','Owner','Unremediated contamination stops financing and delays site work.','B','compliance'),
('ACQ-FIN-004',1,'Acquisition Due Diligence','FIN','Underwriting','Reconcile the underwriting pro forma to the executed purchase agreement.','Pro forma workbook with tie-out schedule to the PSA','Owner','A basis error at acquisition compounds through every later draw.','C','cost'),
('ACQ-ZON-005',1,'Acquisition Due Diligence','ZON','Zoning','Obtain a written zoning analysis confirming the as-of-right envelope.','Zoning analysis memorandum signed by counsel or the architect','Architect','Assumed density that does not exist is a total-loss risk.','C','compliance'),
('ENT-APP-001',2,'Site Plan and Entitlement Approval','APP','Applications','File the complete site plan application package with the approving agency.','Stamped application receipt and full submission set','Owner','Incomplete filings restart statutory review clocks.','C','schedule'),
('ENT-APP-002',2,'Site Plan and Entitlement Approval','APP','Applications','Log every condition of approval with a named responsible owner.','Conditions-of-approval matrix with owner and due date','Owner','Unowned conditions surface at TCO when they cannot be cured.','C','compliance'),
('ENT-COR-003',2,'Site Plan and Entitlement Approval','COR','Agency Correspondence','Maintain a dated register of all agency correspondence and objections.','Correspondence register with response dates','Owner','Unanswered objections silently consume entitlement float.','B','schedule'),
('ENT-LGL-004',2,'Site Plan and Entitlement Approval','LGL','Legal Opinions','Obtain a legal opinion on any variance or special permit relied upon.','Counsel opinion letter','Counsel','A relied-upon variance that fails on appeal voids the program.','A','compliance'),
('DES-SET-001',3,'Design Development and Construction Documents','SET','Drawing Sets','Archive each issued design phase set with an issue transmittal.','Issued set PDFs plus transmittal record','Architect','Missing issue history destroys the design-intent record in a claim.','C','design'),
('DES-COO-002',3,'Design Development and Construction Documents','COO','Coordination','Record consultant coordination sign-off before CD issuance.','Signed coordination checklist across A/S/M/E/P','Architect','Uncoordinated documents become change orders during construction.','B','design'),
('DES-UTL-004',3,'Design Development and Construction Documents','UTL','Utilities','Confirm written utility availability and service capacity for the program.','Utility will-serve letters for power, water, sewer and gas','Owner','Capacity shortfalls discovered at buyout stop the critical path.','C','schedule'),
('DES-SPC-005',3,'Design Development and Construction Documents','SPC','Specifications','Issue project specifications aligned to the current CD set.','Specification manual with revision index','Architect','Spec-to-drawing conflict is the most common change-order source.','B','design'),
('DES-EST-006',3,'Design Development and Construction Documents','EST','Estimating','Reconcile the design-phase estimate to the underwriting budget.','Estimate reconciliation with variance narrative','CM','Undetected design drift silently consumes contingency.','C','cost'),
('PRE-GMP-001',4,'Preconstruction GMP and Buyout','GMP','GMP','Execute the GMP amendment with a complete exhibit and inclusion list.','Executed GMP amendment and exhibits','Owner','An ambiguous GMP basis is the root of most cost claims.','C','cost'),
('PRE-BUY-002',4,'Preconstruction GMP and Buyout','BUY','Buyout','Maintain a buyout log tracking each trade against the GMP allowance.','Buyout log with awarded vs carried values','CM','Unbought critical-path scope defers exposure into construction.','C','cost'),
('PRE-SCH-003',4,'Preconstruction GMP and Buyout','SCH','Schedule','Accept a baseline CPM schedule in writing with the critical path identified.','Accepted baseline schedule file and acceptance letter','CM','Without an accepted baseline, delay claims cannot be defended.','C','schedule'),
('PRE-CON-004',4,'Preconstruction GMP and Buyout','CON','Contracts','Execute the construction contract with insurance and bond exhibits attached.','Executed contract, certificates of insurance and bonds','Counsel','Missing bonds leave the owner unsecured on default.','B','compliance'),
('PRE-LLD-005',4,'Preconstruction GMP and Buyout','LLD','Long-Lead','Record long-lead procurement need dates against the baseline schedule.','Long-lead matrix with order and need dates','CM','A missed order date cannot be recovered with money alone.','B','schedule'),
('CON-REQ-001',5,'Construction','REQ','Requisitions','Reconcile each monthly requisition to the schedule of values and progress.','Signed requisition with pencil-walk reconciliation','CM','Overbilling against progress erodes retainage protection.','C','cost'),
('CON-ACR-002',5,'Construction','ACR','Cost Reporting','Issue a monthly anticipated cost report against the GMP.','Anticipated cost report with contingency roll-forward','CM','Late recognition of overrun removes every mitigation option.','C','cost'),
('CON-SCH-003',5,'Construction','SCH','Schedule','Accept a monthly schedule update with a narrative on float movement.','Monthly update file and float variance narrative','CM','Unexplained float loss is the earliest reliable delay signal.','C','schedule'),
('CON-RFI-004',5,'Construction','RFI','RFIs','Track RFI aging and responder concentration weekly.','RFI log with age and responder analysis','Architect','Aging RFIs convert directly into schedule impact claims.','B','design'),
('CON-QAS-005',5,'Construction','QAS','Quality & Safety','Log every inspection result and corrective action to closure.','Inspection log with corrective action sign-off','CM','Repeat failures indicate systemic subcontractor risk.','C','quality'),
('CON-NOT-006',5,'Construction','NOT','Notice Watch','Screen contractor correspondence for notice and reservation-of-rights language.','Notice watch log with counsel referral record','Counsel','Unanswered notice letters preserve the other side''s claim.','A','compliance'),
('CON-PPL-007',5,'Construction','PPL','Team','Confirm key personnel named in the contract remain assigned to the project.','Staffing roster reconciled to contract exhibit','Owner','Silent key-personnel substitution degrades delivery quality.','A','people'),
('CLO-INS-001',6,'Closeout TCO and Certificate of Occupancy','INS','Inspections','File all special inspection sign-offs required for occupancy.','Special inspection reports and agency filings','CM','A single missing sign-off can hold occupancy for months.','C','compliance'),
('CLO-PCH-002',6,'Closeout TCO and Certificate of Occupancy','PCH','Punch List','Close or bond the punch list with owner acceptance.','Punch list with acceptance signature or bond','CM','Open punch items become warranty disputes after handover.','C','quality'),
('CLO-CCO-003',6,'Closeout TCO and Certificate of Occupancy','CCO','Occupancy','Obtain and archive the TCO and final certificate of occupancy.','TCO and CO certificates','Owner','Occupancy timing controls revenue start and loan conversion.','C','compliance'),
('CLO-OMW-004',6,'Closeout TCO and Certificate of Occupancy','OMW','O&M and Warranty','Deliver the O&M manuals and warranty package to operations.','O&M manual set and warranty register','CM','Warranties not registered expire before defects surface.','B','quality'),
('STB-ABS-001',7,'Sales Lease-Up Stabilization and Takeout','ABS','Absorption','Track absorption and deposit velocity against the pro forma monthly.','Absorption report with pro forma variance','Owner','Absorption shortfall breaks the takeout underwriting.','C','cost'),
('STB-TKO-002',7,'Sales Lease-Up Stabilization and Takeout','TKO','Takeout','Execute the takeout financing term sheet before construction loan maturity.','Executed term sheet and maturity calendar','Owner','Maturity without a takeout forces a distressed refinance.','C','cost'),
('STB-OPS-003',7,'Sales Lease-Up Stabilization and Takeout','OPS','Operations','Transition the asset to operations with a documented handover checklist.','Signed operations handover checklist','Owner','An undocumented handover leaves defect responsibility unresolved.','B','people'),
('STB-CMP-004',7,'Sales Lease-Up Stabilization and Takeout','CMP','Compliance','Confirm ongoing regulatory and affordability compliance reporting is filed.','Filed compliance reports with agency receipts','Counsel','Missed compliance filings trigger penalties and abatement loss.','A','compliance');
