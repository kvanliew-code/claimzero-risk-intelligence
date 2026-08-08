# SCHEMA_REQUESTS.md

**Lovable owns every migration in this file. Claude Code appends here and never writes to `supabase/migrations/`.**

Requests are numbered in the order they were raised. REQ-001 through REQ-005 predate this file's move into the
repo and are restated in one line each at the bottom; REQ-001 is stated in full because it is still the deepest
unfixed blocker in the product.

---

## REQ-000 — do this first. A read, not a migration.

Report these four counts verbatim before writing anything. Every decision downstream depends on them and nobody
has actually looked.

```sql
SELECT count(*) FROM public.projects;
SELECT count(*) FROM public.report_definitions;
SELECT count(*) FROM public.family_applicability_rules;
SELECT count(*) AS controls_without_aspect FROM public.control_register WHERE aspect_id IS NULL;
```

**Post the numbers. Do not summarise them.**

---

## REQ-006 — Thirty-aspect migration  ★ MUST PRECEDE THE 891-CONTROL REGISTER LOAD

Replaces the fifteen-aspect model with thirty, sequenced by first activation in the lifecycle. Full list in
`CLAIMZERO_OPERATING_BRIEF.md` §2.

- Insert 15 new rows into `public.aspects` with `owner_question` and `family_codes`.
- Renumber existing A01–A15 to their new positions **inside a single transaction**, remapping
  `control_register.aspect_id` and `aspect_weight_overrides.aspect_id` in the same statement.
- Add `aspects.stream` (text) and `aspects.first_active_stage` (int) so a gate scores only live aspects.
- **Do not delete the old ids.** Add `aspects.legacy_aspect_id` so any stored report remains reproducible.

*Breaks without it:* the register loads against a fifteen-aspect taxonomy and every subsequent change is a data
migration instead of a renumber.

## REQ-007 — `risks` and `risk_events` — persistent risk identity

The doctrine says risk identity persists from first signal through consequence and closure. There is no table.
This is the largest gap in the schema.

- `risks(id, project_id, aspect_id, title, first_signal_at, first_signal_known_at, state, severity,
  responsible_seat_id, closure_requirement, closed_at, closure_evidence_id, superseded_by)`
- `state` enum: `SIGNAL | ACTIVE | ESCALATED | CONSEQUENCE_REALISED | MITIGATED | CLOSED | REOPENED`
- `risk_events(id, risk_id, occurred_at, known_at, event_type, control_id, evidence_id, note, actor)`
- A risk may be reopened; closure requires an evidence reference. **Regulatory closure does not close a risk.**

## REQ-008 — `review_items` extension (the Work Queue)

- Add: `class char(1)` (`A|B|C`), `assigned_to uuid`, `decision_level int` (0–4), `cycle_key text`
  (ISO reporting week), `held boolean default false`, `rank_score numeric`, `rule_id text`, `session_id uuid`,
  `decided_in_minutes int`.
- `CHECK (status IN ('PENDING','APPROVED','CHANGES_REQUESTED','REJECTED'))`
- `CHECK (kind IN ('risk','exposure','report','evidence'))`
- `CHECK (class IN ('A','B','C'))`
- `UNIQUE (project_id, control_id, rule_id, cycle_key)` — kills the duplicate-click defect.
- **`exposure_usd` must remain nullable and NULL when not quantified. Never default 0.** *Null is not zero.*
- New table `review_sessions(id, user_id, started_at, ended_at, items_worked, minutes)` — this is what makes
  realised capacity measurable.

## REQ-009 — Roles and reporting lines

- Extend `app_role` with `principal`, `administrator`, `client_viewer`.
- `org_reporting(executive_user_id, member_user_id, role)` — an executive holding two PMs with ten projects each
  is not currently expressible.
- `pods(id, name)` and `pod_members(pod_id, user_id, seat)`.
- RLS: narrow the six methodology tables re-widened by `20260807020709` to staff **plus PMs holding at least one
  project assignment.** Ken has approved this.

## REQ-010 — `report_definitions` seed  ★ CONTENT NOW AUTHORED

Original request: table had DDL and zero rows; the reports page rendered blank. Seed rows for the report types
plus `PROPOSAL`, `ENGAGEMENT_LETTER`, `OPERATOR_MANUAL`.

**Status, 8 Aug 2026.** Eleven rows are present in `public.report_definitions`. The definition content is now
authored in the repository at **`src/lib/claimzero/report-definitions.ts`** — `REPORT_DEFINITIONS`, typed as
`ReportDefinition[]`, one entry per key, every `sections[].type` validated against `SECTION_TYPES` by
`src/lib/claimzero/__tests__/report-definitions.test.ts`.

**Action for Lovable (seed only — no schema change required):** upsert the fourteen rows in
`REPORT_DEFINITIONS` into `public.report_definitions` on `report_key`, writing `title`, `audience`, `decision`,
`applicable_stages`, `cadence`, `sections` (jsonb), `active`, `sort_order`. The eleven existing rows are
reproduced byte-for-byte from the table, so the upsert is a no-op for them; the three new rows are
`PROPOSAL` (12), `ENGAGEMENT_LETTER` (13) and `OPERATOR_MANUAL` (14), all `active = false` because no generator
exists for them yet. **Do not activate a definition without a generator** — an active definition with no
generator renders an empty report.

**Open count discrepancy — Ken.** `CLAIMZERO_OPERATING_BRIEF.md` §14.2 says "all twelve definitions". Eleven
report types exist in the table and §7.1 / this request add three more, which is fourteen. No three were
dropped to reach twelve: pruning published methodology to satisfy a number is not a call Claude or Lovable
should make. Confirm the canonical figure and `CANONICAL_NUMBERS.md` will be updated to match.

## REQ-010b — report-card categories do not exist  ★ BLOCKER, Ken

`CLAIMZERO_OPERATING_BRIEF.md` §14.4 requires the thirty aspects to map to "the website's four report-card
categories." **Those four categories are not in this repository.** `reportCardGenerator`
(`src/lib/claimzero/reports.ts`) grades one subject per aspect and groups by nothing above the aspect; the only
higher grouping anywhere in the code is `DOMAINS` in `controls.ts` (six: cost, schedule, design, quality,
people, compliance) and the six streams in §2.1. Neither is four.

The thirty-aspect constants landed without the mapping (`src/lib/claimzero/aspect-taxonomy.ts`) rather than
with four invented category names. **Supply the four category names — or the page they appear on — and the
mapping plus its unit test is a ten-minute change.**


## REQ-011 — Stages 3 (Schematic) and 7 (Takeout) content  ★ CRITICAL

`20260807050542` created both by copying a neighbour's `domain_weights` with `exit_criteria = '[]'::jsonb`.
**A project in either stage currently passes its gate by default because there is nothing to fail.**
### ⛔ DO NOT LOAD YET — PROVENANCE HOLD (added 7 Aug 2026)

`docs/registers/ClaimZero_Schematic_and_Takeout_Register_v2_T30.csv` (commit `6f0dd11`) is in the repo, but it is
**NOT approved methodology.** Provenance, stated plainly:

- The 47 controls (19 Schematic, 28 Takeout) were **authored by Claude on 7 Aug 2026 from domain reasoning.**
- They are **not** extracted from the 891-control register, **not** from any source document Ken supplied, and
  **not** produced by Lovable or any other collaborator.
- `v1` of the file was written at 04:55 UTC and `v2_T30` at 09:55 UTC, both in a Claude sandbox. Neither existed
  anywhere else. That is why nobody can find an upstream copy — there is none.
- The `v1 → v2_T30` step is a pure aspect-id remap to the thirty-aspect taxonomy (REQ-006). Control ids and
  requirement text are byte-identical between the two; `legacy_aspect_id` preserves the old ids for audit.
- The file carries **no source citation column.** No control in it traces to a document.

**Lovable: do not load this file into `exit_criteria`, `control_register`, or `family_applicability_rules`.**
Seeding it would make Claude-authored content the published methodology for two of the nine stages, which
breaks the doctrine this product is sold on. It is a **draft for Ken’s review**, nothing more.

**The underlying defect is still real and still open:** stages 3 and 7 have `exit_criteria = '[]'::jsonb`, so
they cannot be assessed. The correct fix is either (a) Ken reviews and approves the drafted 47, or (b) the
content comes from the 891-control register. Until one of those happens, the honest engine behaviour is to
return **INSUFFICIENT BASIS TO ASSESS** for those stages — not to pass, and not to fail on a generic reason.

**Do not invent controls, and do not treat the committed CSV as a source.**

## REQ-012 — Engagement billing

- `engagement_billing(engagement_id, fee_basis, retainer_amount, monthly_amount, pct_of_cost, billing_day,
  term_months, escalation_pct, expense_treatment)`
- `fee_schedule(id, engagement_id, due_on, amount, deliverable_key, status)`
- `revenue_milestones(id, project_id, deliverable_key, recognised_at, amount)`
- Fired on `engagements.status → 'signed'`. **Invoices are created as drafts and never auto-sent.**

## REQ-013 — `consent_obligations`

Per capital-stack position: the action requiring consent, the holder, the individual threshold, the aggregate
threshold, the notice period, and a running aggregate consumed to date.

Market anchors for defaults, from filed construction loan agreements: minor change orders **$250,000
individually / $1,000,000 aggregate**; observed range $50K–$500K individual, $1M–$3M aggregate.
**The aggregate is the binding constraint** — $1M aggregate on a $200M job is exhausted around month eight and
nobody counts it.

Add a `schedule_impact_days` threshold column alongside the dollar thresholds. **No published approval threshold
in any authority system is keyed to schedule impact.** Being first is free.

## REQ-014 — Information requests

- `information_requests(id, project_id, number, revision, issued_at, issued_by, due_at, status)`
- `information_request_items(id, request_id, control_id, document_name, owed_by_seat_id, due_at, status,
  received_evidence_id)`

Numbered, revision-controlled, every line traceable to a control and a named seat. This is the Day-0 instrument
that compresses thirty days of document-chasing into ten.

---

## REQ-001 — Bitemporality  ★ STILL THE DEEPEST UNFIXED BLOCKER

Historical playback is not implementable on the current schema. No table anywhere records when a control changed
state — there is no `occurred_at`, `known_at`, `status_changed_at`, or state history of any kind.

Every event and every piece of evidence needs **two** dates:

- `occurred_at` — when it happened in the world
- `known_at` — when ClaimZero could first have known it from a loaded source

**Playback filters on `known_at`, never `occurred_at`.** The CZ-001 seed already depends on this: the 2/28/2019
partial Stop Work Order *happened* on 28 February and became **knowable on 3/6/2019**, when the monthly report
covering that period disclosed it — a **six-day gap**, verified in `2019-03-06_Monthy Report - 40 East 66th .docx`.
A single-date implementation collapses that gap and is wrong at every checkpoint falling inside it.

*(Correction of record: earlier versions of this file stated 4/23/2019. That was wrong — the 6 March report
discloses the SWO twice, verbatim. `CLAUDE.md` carries the same correction.)*

**Enforce quarantine server-side, not with an application-level filter.** One forgotten `.filter()` contaminates
a report, and contamination is fatal for a product whose value is defensibility.

## REQ-015 — Bitemporality, concretely  ★ SUPERSEDES THE GENERAL FORM OF REQ-001

REQ-001 stated the principle. This states the columns, and it is derived from reading the CZ-001
calibration seed rather than from first principles. Audit: `claude/CZ_Source_Materials_Audit_2026-08-08.md`.

**Verified state of the fixture.** Exhaustive key search of `CZ001_40E66_FULL_PROJECT_SEED_v1.json`
returns exactly these date-bearing keys: `date`, `as_of`, `authored_date`, `first_signal_date`,
`reporting_through`, `scheduled_start`, `scheduled_finish`, `start`, `end`. There is **no**
`occurred_at`, `known_at`, `disclosed_at`, `observed_at`, `ingested_at` or `visible_from` anywhere.
Every one of the 15 events carries a single `date`.

The known-vs-occurred distinction survives in **one prose string on 1 of 15 events**:

```
40E-EVT-20190228-PARTIAL-SWO
  date:        "2019-02-28"          <- occurrence
  source_ids:  ["40E66-SRC-MONTHLY-20190423"]
  evidence_note: "Known through 4/23 report; do not expose before report
                  availability unless primary DOB record is loaded."
```

### Three problems, not one

1. **No second date.** As above.
2. **The workaround fails on the load-bearing source.** `40E66-SRC-MONTHLY-20190423` has **no
   `authored_date`** — only 5 of 16 sources do. It carries `reporting_through: "2019-03-30"`, which
   is a coverage boundary, not an availability date. A join through `source_ids` returns NULL
   exactly where the fixture needs it.
3. **Quarantine is a date inside an enum.** `historical_use: "QUARANTINED_BEFORE_2020-06-19"`.
   Enforcing it today requires a regex or a hardcoded constant.

### Live contamination bug already in the fixture

`RISK-40E-REG-SITEPROTECT.first_signal_date = "2019-02-28"` — the occurrence date. Any playback
filtering risks on that field leaks the Stop Work Order into a 2019-03-01 run. This originates in
the seed, not the engine, and there is no field available to express the correction.

### The break plan requires THREE dates

§11.G of `CLAIMZERO_MASTER_CALIBRATION_TEST_AND_BREAK_PLAN_v1.md`: the engine must distinguish
**observation date / document authored date / system ingestion date**, and historical eligibility
must use the appropriate field. Two columns pass the fixture; they do not pass the break test.

### Requested schema

```sql
-- events and evidence
ALTER TABLE public.events        ADD COLUMN occurred_at date NOT NULL,
                                 ADD COLUMN known_at    date NOT NULL,
                                 ADD COLUMN ingested_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.events        ADD CONSTRAINT events_known_after_occurred
                                 CHECK (known_at >= occurred_at);

-- sources: availability is distinct from coverage
ALTER TABLE public.source_registry ADD COLUMN authored_date  date,
                                   ADD COLUMN available_from date;
-- backfill, from the seed evidence_note:
UPDATE public.source_registry SET available_from = DATE '2019-04-23'
  WHERE source_id = '40E66-SRC-MONTHLY-20190423';

-- risks: first signal has two dates too
ALTER TABLE public.risks ADD COLUMN first_signal_known_at date;
-- RISK-40E-REG-SITEPROTECT: occurred 2019-02-28, known per the disclosing report

-- quarantine as data, not as an enum string
ALTER TABLE public.source_registry ADD COLUMN visible_from date;
UPDATE public.source_registry SET visible_from = DATE '2020-06-19'
  WHERE historical_use LIKE 'QUARANTINED_BEFORE_%';
```

### Enforcement — server side, not application side

Playback filters on `known_at`, never `occurred_at`. This must be a view or an RLS predicate, not
a `.filter()` in the client. Per §6 of the break plan: **"Do not calculate the present and then
hide future rows from the UI. The future data must be unavailable to the engine."**

*Breaks without it:* historical playback is not implementable, the four CZ-001 checkpoints cannot
be run honestly, and the six-day gap that the whole calibration case exists to demonstrate
collapses to zero.

### SETTLED — backfill may proceed (resolved 8 Aug 2026)

The SWO `known_at` is **2019-03-06**. Evidence: `CZ001_40E66_CALIBRATION_FINDINGS_v1.md` lists
`2019-03-06_Monthy Report - 40 East 66th .docx` as source R1, read in full;
`HANDOFF_2026-08-07_overnight.md` records the six-day gap as proven against that primary document.
Both files are in `/Shared/11 - ClaimZero/Development/`.

`CLAUDE.md` is correct as written. **The seed is what is wrong:**
`40E-EVT-20190228-PARTIAL-SWO.source_ids` lists only `40E66-SRC-MONTHLY-20190423` and is missing
the March report. Correct the seed, do not correct the doctrine.

```sql
-- the six-day gap, which is the whole point of the CZ-001 fixture
UPDATE public.events
   SET occurred_at = DATE '2019-02-28',
       known_at    = DATE '2019-03-06'
 WHERE event_id = '40E-EVT-20190228-PARTIAL-SWO';

-- and the contaminated risk row
UPDATE public.risks
   SET first_signal_known_at = DATE '2019-03-06'
 WHERE risk_id = 'RISK-40E-REG-SITEPROTECT';
```

---

## REQ-002 → REQ-005 — one line each

Restated in summary; the original statements live in the pre-repo working copy of this file.

| REQ | Subject |
|---|---|
| **002** | Server-side temporal quarantine — a view or RLS predicate that makes future-dated evidence unreachable, rather than an application filter |
| **003** | `projects.project_code` — a stable human-readable identifier (CZ-001, CZ-003) distinct from the surrogate key |
| **004** | Risk state machine — superseded by and folded into REQ-007 |
| **005** | Control overlay — per-project additions and suppressions to the register, with a reason and an author, so a client-specific control does not mutate the methodology |
