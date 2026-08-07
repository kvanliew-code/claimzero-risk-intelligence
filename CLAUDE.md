# CLAUDE.md — instructions for Claude Code on this repo

## Read before doing anything

1. **`CLAIMZERO_OPERATING_BRIEF.md`** — the controlling document. §1 is the verified state of this repo
   (fifteen logged defects with file and line). §14 is your build order. Start there.
2. `COORDINATION.md` — who owns what, what is in flight, what is blocked
3. `CANONICAL_NUMBERS.md` — one number per concept. **Nine stages. Thirty aspects.**
4. `REPORT_STYLE.md` — house style. **No finding without a remedy.**
5. `docs/SCHEMA_REQUESTS.md` — REQ-000 through REQ-014, Lovable's queue

## Your lane

You own **application logic, the seed loader, the historical playback engine, tests, and the calibration dashboard.**

## You do not write migrations

**Do not create files in `supabase/migrations/`.** Lovable owns the database and holds the Supabase connection. It commits migrations to this repo directly and syncs from `main`. If you also write migrations you will collide on timestamps and Lovable will overwrite your work.

When you need a schema change:

1. Append it to `docs/SCHEMA_REQUESTS.md` — the SQL, plus one line on why it is needed and what breaks without it
2. Say so plainly in your response so Ken can hand it to Lovable
3. Carry on with whatever does not depend on it

## Git

- Small commits, push often. Anything uncommitted is invisible to Lovable.
- **Never force-push, rebase, or amend a pushed commit.** It destroys Lovable's project history — see `AGENTS.md`.
- Pull before you start. Lovable commits frequently and without warning.

## Non-negotiable doctrine

- Null is not zero. Missing is not stable. Unknown is not green.
- Regulatory closure is not causal closure. A closed RFI does not close the underlying risk.
- Future evidence cannot enter an earlier historical playback.
- No invented dollar values. No invented delay days without verified CPM logic.
- Risk identity persists from first signal through consequence and closure.
- Every material risk carries a responsible seat, or explicitly flags that accountability is missing.
- Published reports stay frozen. Every client-facing report is human-reviewed.
- **No problem is ever presented without a recommendation.** That is where the value is.
- **No silent caps.** If the engine bounds coverage — top-N, sampling, a weekly budget — the UI must say what was held back. Silent truncation reads as "we covered everything" when we did not.

You may propose architecture, schema, indexing, API design, UI organisation, tests and performance work. You may **not** silently change evidence meaning, historical boundaries, closure rules, risk identity, accountability requirements, the reviewer requirement, source provenance, or owner-facing intent.

**If a calibration fixture fails, show the failure before changing any business rule.** The fixture is probably right and the engine is probably wrong.

## The two things to build first

### 1. Tier 1 of the build order (`CLAIMZERO_OPERATING_BRIEF.md` §14)

No schema dependency. Unblocks everything else. Four items, all doable immediately: seed content for `report_definitions`; add `transcript` to `SECTION_TYPES`; delete the twelve-aspect ghost in `src/lib/claimzero/data.ts`; author the thirty-aspect constants.

### 2. Bitemporality — still the deepest unfixed blocker

Historical playback is not implementable on the current schema. No table anywhere records when a control changed state — there is no `occurred_at`, `known_at`, `status_changed_at`, or state history of any kind.

Every event and every piece of evidence needs **two** dates:

- `occurred_at` — when it happened in the world
- `known_at` — when ClaimZero could first have known it from a loaded source

**Playback filters on `known_at`, never `occurred_at`.** The CZ-001 case proves it against primary documents: the 2/28/2019 partial Stop Work Order *happened* on 28 February and became **knowable on 3/6/2019**, when the monthly report covering that period disclosed it — a **six-day gap**, verified in `2019-03-06_Monthy Report - 40 East 66th .docx`. A single-date implementation collapses that gap and is wrong at every checkpoint falling inside it.

*(Correction of record: earlier versions of this file stated the SWO became knowable on 4/23/2019. That was wrong. The 6 March report discloses it twice, verbatim. See `CZ001_40E66_CALIBRATION_FINDINGS_v1.md` in the ClaimZero Egnyte folder.)*

Enforce quarantine server-side, not with an application-level filter. One forgotten `.filter()` contaminates a report, and contamination is fatal for a product whose value is defensibility.

## When you finish

Update `COORDINATION.md` — move your row from In Flight to Done with the commit SHA. If you found a defect in Lovable's lane, log it under Defects. Do not fix it yourself.
