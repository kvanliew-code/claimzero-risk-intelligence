-- Opportunity layer: the pre-client pipeline (Spec v1.0, Part Seven)
create type public.opportunity_stage as enum (
  'IDENTIFIED','CONTACTED','MET','DEMO','PROPOSAL','ENGAGED','DELIVERED','MONITORING','LOST','DORMANT'
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null unique,
  org_name text not null,
  org_type text not null default '',
  segment text not null default '',
  contact_name text not null default '',
  contact_title text not null default '',
  email text not null default '',
  phone text not null default '',
  source text not null default '',
  source_detail text not null default '',
  stage public.opportunity_stage not null default 'IDENTIFIED',
  stage_entered date,
  project_name text not null default '',
  project_value_usd numeric not null default 0,
  assessment_fee_usd numeric not null default 0,
  monitoring_arr_usd numeric not null default 0,
  probability_pct integer not null default 0,
  expected_close date,
  reviewer_days_required integer not null default 0,
  next_action text not null default '',
  next_action_date date,
  owner text not null default '',
  notes text not null default '',
  channel_deal boolean not null default false,
  out_of_scope boolean not null default false,
  loss_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_loss_reason_required
    check (stage <> 'LOST' or length(btrim(loss_reason)) > 0)
);

grant select, insert, update, delete on public.opportunities to authenticated;
grant all on public.opportunities to service_role;

alter table public.opportunities enable row level security;

create policy opportunities_read_staff on public.opportunities
  for select to authenticated using (private.is_staff(auth.uid()));
create policy opportunities_write_staff on public.opportunities
  for all to authenticated
  using (private.is_staff(auth.uid()))
  with check (private.is_staff(auth.uid()));

create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.update_updated_at_column();

-- Reviewer capacity available per forecast month
create table public.reviewer_capacity (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,
  reviewer_days_available integer not null default 20,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reviewer_capacity to authenticated;
grant all on public.reviewer_capacity to service_role;
alter table public.reviewer_capacity enable row level security;
create policy reviewer_capacity_read_staff on public.reviewer_capacity
  for select to authenticated using (private.is_staff(auth.uid()));
create policy reviewer_capacity_write_admin on public.reviewer_capacity
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));

insert into public.reviewer_capacity (month, reviewer_days_available) values
  ('2026-08-01',18),('2026-09-01',18),('2026-10-01',18),('2026-11-01',18),
  ('2026-12-01',14),('2027-01-01',18),('2027-02-01',18);

insert into public.opportunities (
  opportunity_id, org_name, org_type, segment, contact_name, contact_title, email, phone,
  source, source_detail, stage, stage_entered, project_name, project_value_usd,
  assessment_fee_usd, monitoring_arr_usd, probability_pct, expected_close,
  reviewer_days_required, next_action, next_action_date, owner, notes,
  channel_deal, out_of_scope, loss_reason
) values
('OPP-0001','Harbor Point Partners','Private Developer','Segment 1 — Private Developers','Marisa Colangelo','Managing Partner','m.colangelo@example.com','201-555-0142','Referral','Introduced by Peter Lehrer','MONITORING','2026-05-18','Harbor Point Residences',184000000,145000,186000,100,'2026-05-18',4,'Month 3 QBR — expansion to second asset','2026-08-14','K. van Liew','Converted from assessment. Reference account. Willing to be a case study.',false,false,''),
('OPP-0002','Ridgeline Development Group','Private Developer','Segment 1 — Private Developers','Anthony Petrosino','Principal','a.petrosino@example.com','973-555-0188','Conference','ULI Northeast — spoke after panel','ENGAGED','2026-07-22','Ridgeline Crossing Phase II',96000000,110000,0,100,'2026-07-22',3,'Kickoff call — collect Owner Package','2026-08-08','K. van Liew','Assessment signed. Intake not started. Watch: they have not sent loan docs.',false,false,''),
('OPP-0003','Meridian Capital Holdings','Family Office','Segment 1 — Private Developers','Diane Ruthers','Director of Real Assets','d.ruthers@example.com','212-555-0119','Lender referral','Construction lender required independent monitoring','PROPOSAL','2026-07-29','Two-asset program review',240000000,165000,240000,65,'2026-08-29',5,'Follow up on proposal — decision committee meets 8/12','2026-08-11','K. van Liew','Lender mandate channel. Strongest logo if it lands.',false,false,''),
('OPP-0004','Calder & Boyce Development','Private Developer','Segment 1 — Private Developers','Ray Boyce','Founder','r.boyce@example.com','908-555-0173','Inbound','Found claimzero.ai after a bad change order','PROPOSAL','2026-08-01','Calder Mill Redevelopment',41000000,68000,84000,45,'2026-09-05',2,'Send revised proposal with phased scope','2026-08-08','K. van Liew','Price sensitive. Emerging sponsor — the undercapitalized profile.',false,false,''),
('OPP-0005','Stonebridge University','University','Segment 2 — Institutions','Dr. Alan Wexford','VP Facilities & Capital Planning','a.wexford@example.com','609-555-0155','Referral','Introduced by a trustee','DEMO','2026-07-30','Science Center Replacement',212000000,180000,264000,40,'2026-10-15',6,'Second demo for provost and CFO','2026-08-19','K. van Liew','Endowment funded. Escalation argument not carry argument.',false,false,''),
('OPP-0006','Northfield Institute of Technology','University','Segment 2 — Institutions','Karen Mbeki','AVP Capital Projects','k.mbeki@example.com','201-555-0197','Conference','APPA regional','DEMO','2026-08-04','Engineering Quad Phase I',88000000,120000,156000,30,'2026-11-20',4,'Demo scheduled — send prep materials','2026-08-12','K. van Liew','Procore held by CM. Design development monitoring wedge.',false,false,''),
('OPP-0007','Vantage Residential Trust','Institutional Owner','Segment 3 — Institutional','Gregory Ilan','SVP Development','g.ilan@example.com','212-555-0164','Outbound','Cold outreach — 6 active projects','MET','2026-07-25','Portfolio — 6 assets',610000000,0,720000,25,'2026-12-01',12,'Send portfolio pricing and reviewer capacity plan','2026-08-13','K. van Liew','Portfolio deal. Would consume most of current reviewer capacity.',false,false,''),
('OPP-0008','Delmar Brothers','Private Developer','Segment 1 — Private Developers','Sal Delmar','Partner','s.delmar@example.com','732-555-0130','Referral','Existing client referral','MET','2026-08-02','Delmar Landing',57000000,78000,96000,35,'2026-10-01',3,'Schedule demo','2026-08-09','K. van Liew','Second generation family shop. Skeptical of software.',false,false,''),
('OPP-0009','Kestrel Point Capital','Family Office','Segment 1 — Private Developers','Yvette Marchand','Investment Principal','y.marchand@example.com','646-555-0126','Lender referral','Equity partner wants independent read','MET','2026-08-03','Kestrel Point Tower',148000000,135000,180000,30,'2026-11-01',4,'Send one-pager and case example','2026-08-10','K. van Liew','Family office channel — softer contract, faster decision.',false,false,''),
('OPP-0010','Amberline Properties','Private Developer','Segment 1 — Private Developers','Nick Ferraro','Director of Construction','n.ferraro@example.com','201-555-0181','Inbound','Website — downloaded sample report','CONTACTED','2026-08-04','Amberline Flats',34000000,58000,72000,15,'2026-11-15',2,'Discovery call','2026-08-08','K. van Liew','Unqualified. Confirm they are owner side not CM.',false,false,''),
('OPP-0011','Pinehurst Development Co','Private Developer','Segment 1 — Private Developers','Julia Renwick','VP Development','j.renwick@example.com','914-555-0111','Conference','NAIOP breakfast','CONTACTED','2026-08-01','Pinehurst Commons',72000000,92000,120000,15,'2026-12-15',3,'Follow up — no response to first email','2026-08-11','K. van Liew','Two touches no reply. One more then dormant.',false,false,''),
('OPP-0012','Corbin Trust Bank','Lender','Channel — Lender Mandate','Douglas Freen','SVP Construction Lending','d.freen@example.com','212-555-0107','Outbound','Channel play not a direct sale','MET','2026-07-18','Referral channel agreement',0,0,0,50,'2026-10-01',0,'Draft channel terms — they refer, we monitor','2026-08-15','K. van Liew','Highest leverage relationship in the pipeline. Not a project sale.',true,false,''),
('OPP-0013','Ashford Municipal Authority','Public Agency','OUT OF SCOPE','','','','','Inbound','Unsolicited RFI','LOST','2026-07-10','Water treatment expansion',0,0,0,0,'2026-07-10',0,'Declined — public agencies out of scope','2026-07-10','K. van Liew','Struck per segment strategy. Elected board, referendum politics.',false,true,'OUT_OF_SCOPE_SEGMENT'),
('OPP-0014','Whitmore Realty Partners','Private Developer','Segment 1 — Private Developers','Ellen Whitmore','Managing Director','e.whitmore@example.com','203-555-0193','Referral','Introduced at a closing','IDENTIFIED','2026-08-05','Unknown — 3 assets rumored',0,0,0,10,'2027-01-15',0,'Research portfolio then request intro','2026-08-12','K. van Liew','No contact yet. Warm path exists.',false,false,''),
('OPP-0015','Sentinel Grove Developers','Private Developer','Segment 1 — Private Developers','Marcus Oyelaran','CEO','m.oyelaran@example.com','862-555-0158','Inbound','Podcast listener','IDENTIFIED','2026-08-05','Sentinel Grove Phase I',29000000,52000,66000,10,'2027-02-01',0,'Qualify — confirm project is funded','2026-08-13','K. van Liew','Emerging sponsor. First ground-up.',false,false,''),
('OPP-0016','Larkspur Health System','Healthcare Institution','Segment 2 — Institutions','Priya Nandakumar','Director of Facilities Development','p.nandakumar@example.com','215-555-0146','Conference','Healthcare facilities summit','CONTACTED','2026-07-28','Ambulatory Center',63000000,88000,114000,20,'2026-12-01',3,'Send institutional case material','2026-08-14','K. van Liew','New vertical. Test whether the institutional wedge travels.',false,false,''),
('OPP-0017','Cordova Equity Group','Family Office','Segment 1 — Private Developers','Hector Cordova','Principal','h.cordova@example.com','305-555-0138','Referral','Prior colleague','DORMANT','2026-06-12','Cordova Bayfront',115000000,0,0,5,NULL,0,'Revisit Q4 — project on hold pending entitlement','2026-10-01','K. van Liew','Project stalled at entitlement. Ironic — exactly our use case.',false,false,''),
('OPP-0018','Braddock Industrial','Private Developer','Segment 1 — Private Developers','Tom Braddock','Owner','t.braddock@example.com','610-555-0172','Outbound','Cold — 2 active industrial projects','LOST','2026-07-05','Braddock Logistics Park',78000000,0,0,0,'2026-07-05',0,'Lost — said CM already gives him reports',NULL,'K. van Liew','Lost to the exact objection we need a better answer for.',false,false,'INCUMBENT_CM_REPORTS');