# ClaimZero — Register v4.0, Applicability Engine, RMP & BD Reporting

## Goal
Finish the six-file build: register v4.0 verification, project-profile-driven applicability, tier rename, Risk Mitigation Plan report, and Business Development reporting.

## Build order

### 1. Verify Register v4.0 import
- Confirm 891 active controls in `control_register`.
- Confirm tier distribution: CORE 344, EXTENDED 514, COMPREHENSIVE 33.
- Confirm Stage 4 = 168, Stage 5 = 198 (per spec).
- Confirm no silent `min_tier` defaults — every row carries the label from the CSV.

### 2. Project profile fields + intake form
- Add 23 profile columns to `public.projects` (asset_class, delivery_model, contract_form, …, ground_lease).
- Existing projects get a default profile that suppresses nothing.
- Render the intake form from the field metadata; multi-select fields use union semantics.

### 3. Family applicability engine
- Create `public.family_applicability_rule` table.
- Load 144 rows from `ClaimZero_Family_Applicability_Rules_v1.0.csv`.
- Implement one server-side predicate evaluator (SQL function) used by every consumer.
- Grammar: `==`, `!=`, `in (...)`, `includes A|B`, `>= N`, `NOT`.
- Extend `isApplicable` in `src/lib/claimzero/scoring.ts` to call the evaluator — the only change to that file.
- Suppressed families render visibly with a reason string, never silently.

### 4. Tier rename
- Migrate `control_register.min_tier`: A→CORE, B→EXTENDED, C→COMPREHENSIVE.
- Migrate project tier: A→ESSENTIAL, B→STANDARD, C→COMPREHENSIVE.
- Update code enums, `tierFor`, CSV importer, and UI labels.
- Keep ordinal comparison identical.

### 5. Risk Mitigation Plan (RMP) tables and report
- Add `mitigation_template` to `control_register`.
- Create `rmp_issuance`, `rmp_item`, `rmp_source_document` tables with RLS.
- Build server-side RMP generator:
  - Severity derivation from criticality, irreversibility, status, age.
  - `close_by` derivation with priority rules and derived-default footnote.
  - Continuity invariant: same `item_id`, aging `consecutive_issuances`, severity increases with age.
  - Block issuance when ADVERSE items lack authored `mitigating_action`.
  - Suppress composite index when confidence < 60.
  - Section 3.7 "What we do not know" always shown.
- Add printable RMP report route.

### 6. Business Development reporting
- Extend `opportunities` table: `stage_entered_at`, `source`, `source_detail`, `conflict_flag`, `project_id`, `project_profile_draft`, `engagement_level_proposed`, `annual_value`, `expected_start`, `lost_reason`.
- Backfill synthetic rows and watermark all BD reports until a real `source_contact_id` exists.
- Build reports 3.1 (Pipeline position) and 3.2 (Aging and stall) first.
- Build Intake bridge: create project from opportunity and copy profile draft.
- Build report 3.4 (Capacity and commitment) with red "DELIVERY CAPACITY EXCEEDED" states.
- Conflict check last.

## Acceptance gates
- Applicability engine returns the spec's five representative profile counts within tolerance.
- RMP items always trace to a `control_instance_id`.
- ISSUED RMP issuances are immutable; supersede only.
- BD reports watermark synthetic data until real pipeline data exists.

## Open design decision
Schedule Intelligence families (PRE-SDR, CON-SQA, CON-FSA) are mapped to **A10 Schedule Integrity & Critical Path** pending your confirmation.
