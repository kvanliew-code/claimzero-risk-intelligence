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

## REQ-010 — `report_definitions` seed  ★ OLDEST OPEN BLOCKER

Table has DDL and zero rows; the reports page renders blank because of it. Seed rows for the nine report types
plus `PROPOSAL`, `ENGAGEMENT_LETTER`, `OPERATOR_MANUAL`. Definition content is authored by Claude Code in
parallel — leave `sections` empty rather than guessing at it.

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

## REQ-002 → REQ-005 — one line each

Restated in summary; the original statements live in the pre-repo working copy of this file.

| REQ | Subject |
|---|---|
| **002** | Server-side temporal quarantine — a view or RLS predicate that makes future-dated evidence unreachable, rather than an application filter |
| **003** | `projects.project_code` — a stable human-readable identifier (CZ-001, CZ-003) distinct from the surrogate key |
| **004** | Risk state machine — superseded by and folded into REQ-007 |
| **005** | Control overlay — per-project additions and suppressions to the register, with a reason and an author, so a client-specific control does not mutate the methodology |
