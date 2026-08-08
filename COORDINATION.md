# COORDINATION.md

Who owns what, what is in flight, what is blocked. Required by `CLAUDE.md` — every finisher moves
their row to Done with the commit SHA.

**Created 8 Aug 2026.** Seven commits had landed before this file existed; they are logged below
retroactively.

---

## Lanes

| Lane | Owner | Scope |
|---|---|---|
| Database, migrations, RLS | **Lovable** | Everything in `supabase/migrations/`. Claude Code never writes here. |
| App logic, seed loader, playback engine, tests, calibration dashboard | **Claude Code** | Appends schema needs to `docs/SCHEMA_REQUESTS.md`. |
| Product decisions, methodology, provenance | **Ken** | Anything that changes evidence meaning or owner-facing intent. |

---

## Done

| SHA | What | Lane |
|---|---|---|
| `6f0dd11` | `docs/registers/ClaimZero_Schematic_and_Takeout_Register_v2_T30.csv` — 47 controls (19 Schematic / 28 Takeout). **See provenance hold, REQ-011.** | Claude |
| `4b24545` | REQ-011 register path corrected; SWO `known_at` note | Claude |
| `34e6ca4` | `transcript` added to `SECTION_TYPES` (defect D-03) | Claude |
| `9423b26` | README — dead app URL and wrong marketing TLD replaced; `bun.lock` install note added | Claude |
| `4be3c39` | **Provenance hold** on REQ-011 — the 47 controls are Claude-authored, not methodology | Claude |
| `003be5c` | **D-16 fixed** — Portfolio index no longer fabricates `COMPLETE_VERIFIED` | Claude |
| `c6b266e` | **REQ-015** — bitemporality stated as columns, derived from the CZ-001 seed | Claude |
| `4d76447` | This file created — lanes, commit log, corrections, blocked items | Claude |
| `0e6a753` | SWO `known_at` settled at 2019-03-06; REQ-015 backfill hold lifted | Claude |
| `pending` | **D-18 fixed** — frozen "August 6, 2026" removed; `src/lib/claimzero/today.ts` is now the single UTC-stable source of today for reports and the document register | Lovable |
| `pending` | **SEC-01 fixed** — Reviewers and PMs could read the entire commercial pipeline (498 contacts with email/phone, deal values). New `private.is_commercial` (admin+executive) now gates `clients`, `engagements`, `opportunities`, `reviewer_capacity`; Pipeline nav hidden and routes guarded. Walked live in all three roles. | Lovable |
| `pending` | Leaked-password protection (HIBP) enabled on auth | Lovable |
| `2189095` | **Stage gate fixed** — verdict now keyed off substantive findings, so READY is reachable | Claude |
| `e1b62ca` | **D-18 (1/2)** — /project/$id/reports rewired onto `useProjectScoring`; real thirty-aspect scores, honest empty state, no silent cap | Claude |
| `pending` | **Tier 1 §14.1–5** — `transcript` confirmed in `SECTION_TYPES`; fourteen report definitions authored as data (`report-definitions.ts`); thirty-aspect constants + streams + legacy map (`aspect-taxonomy.ts`); demo findings repointed off the twelve-aspect names onto the thirty taxonomy; intake field count derived from `PROFILE_FIELD_COUNT`. 18 unit tests added under `src/lib/claimzero/__tests__/`. | Claude |
| `7d70716` | **D-18 (2/2)** — `ASPECTS` and `aspectsFor()` deleted from `data.ts`: 234 lines of invented dollar values and fabricated source citations removed | Claude |

---

## Corrections of record — read before trusting earlier notes

**C-1 — The SWO `known_at` is SETTLED at 2019-03-06.** Not open, despite what
`claude/CZ_Source_Materials_Audit_2026-08-08.md` says. `CZ001_40E66_CALIBRATION_FINDINGS_v1.md`
lists `2019-03-06_Monthy Report - 40 East 66th .docx` as source R1, read in full;
`HANDOFF_2026-08-07_overnight.md` states the six-day gap was proven against it. `CLAUDE.md` is
**correct as written.** What is wrong is the seed:
`40E-EVT-20190228-PARTIAL-SWO.source_ids` lists only the April report and is missing the March one.
**REQ-015 backfill may proceed with `known_at = 2019-03-06`.**

**C-2 — The CZ-002 (221 West 29th) seed EXISTS.** Earlier notes in this session said it did not.
It has been in `/Shared/11 - ClaimZero/Development/` since 02:24 on 7 Aug:
`CZ002_221W29_Seed_Package_v1.zip`, `CZ002_221W29_FULL_PROJECT_SEED_v1.json`,
`CZ002_221W29_HISTORICAL_PLAYBACK_v1.json`/`.md`, `CZ002_221W29_CODE_IMPORT_AND_PLAYBACK_PROMPT.md`,
`ClaimZero_221W29_Demo_Seed_Brief_v1.0.md`. **Both flagship fixtures are available.**

**C-3 — `CZ001_40E66_CALIBRATION_FINDINGS_v2.md` exists** and extends v1 from two monthly reports
to the full 2019 series. Use v2, not v1, for the cost curve and the delay scorecard.

**C-4 — Method note.** Three findings this session were reported as absent after searching only one
location. **A negative finding must state its search space.** "Not in X" — never "does not exist".
The seed packages, the CZ-002 fixture and the v2 findings were all present in Egnyte the whole time.

---

## Blocked — needs Ken

| # | Decision | Blocks |
|---|---|---|
| 1 | **Rank band width** — exact rank order, or top-N membership? No tolerance is defined anywhere in the fixtures. | The playback test harness cannot be written. |
| 2 | **Drop-off semantics** — a risk leaving the ranked list: CLOSED, or open-but-unranked? Global rules imply the latter; nothing states it, and no closure event exists in the seed. | Risk continuity assertions. |
| 3 | **The aspect count** — 6 / 12 / 15 across three business documents, while the build targets 30. | Register, scoring, report card, every client-facing figure. |
| 4 | **REQ-011** — review and approve the 47 Claude-authored Schematic/Takeout controls, or replace them from the production register. | Stages 3 and 7 remain unassessable. |
| 5 | `Rusk Termination` sits in `/Shared/10 - PROJECTS/40 E 66th Archive` while the live matter folder is in CASES. | Separation-wall / Daubert exposure. |

---

## In flight

| Item | Owner | State |
|---|---|---|
| §24 calibration dashboard (17 columns, spec in the master break plan) | Claude Code | **Not started.** Build before running any checkpoint, so a GREEN 4/23 shows the failure rather than hiding it. |
| REQ-000 four row counts | Lovable | **Unanswered after five asks.** |
| REQ-010 `report_definitions` seed | Lovable | Content authored in `src/lib/claimzero/report-definitions.ts`; **seed upsert still owed by Lovable.** Count discrepancy (12 vs 14) filed for Ken. |
| REQ-010b report-card categories | Ken | **Blocked.** The four categories named in §14.4 do not exist anywhere in the repo; thirty-aspect mapping cannot be authored without them. |
| REQ-015 bitemporality | Lovable | Filed `c6b266e`. Backfill unblocked by C-1. |

---

## Lovable, overnight 7→8 Aug

16 commits and 3 migrations. RLS policy tightening on the commercial tables
(`20260808052603`), a `user_roles` insert (`20260807221831`), one empty migration, and the
hardcoded `TODAY` in `reports.tsx` replaced with `TODAY_LONG`.

**REQ-015 bitemporality was NOT implemented.** No `known_at`, `occurred_at`, `visible_from` or
`available_from` appears in any migration. It remains the critical path.

---

## Defects

Full log: `CZ_VERIFIED_DEFECT_MEMO_2026-08-07.md` in `/Shared/11 - ClaimZero/Development/`.

| ID | Summary | State |
|---|---|---|
| D-03 | `transcript` missing from `SECTION_TYPES` | **Fixed** `34e6ca4` |
| D-16 | Portfolio index fabricated `COMPLETE_VERIFIED` | **Fixed** `003be5c` |
| D-17 | Weekly and Monthly report bodies are hardcoded literals; `TODAY` frozen at "August 6, 2026" | Open |
| D-18 | Twelve-aspect ghost with invented citations, live on `/project/$id/reports` | **Fixed** `e1b62ca` + `7d70716` |
| D-19 | `report_definitions.sections` read from the DB and never used | Open |
| D-20 | Four generators against nine claimed report types | Open |
| D-21 | `first_active_stage` contradicts the brief ordering claim | Open — `aspect-taxonomy.ts` mirrors the table values verbatim rather than resolving it |
| D-07 | Intake profile-field count hardcoded as "23" | **Fixed** — derived from `PROFILE_FIELD_COUNT` |
| NEW | **Stage gate could never return READY** — `scoring.ts` pushed the frozen-snapshot reason unconditionally and keyed the verdict off `reasons.length` | **Fixed** `2189095` |
| NEW | **Auth session does not hold** — bounces to `/auth` while the shell reads "Signed in" | Open |
| NEW | **Seed contamination** — `RISK-40E-REG-SITEPROTECT.first_signal_date = 2019-02-28` is the occurrence date | Open |

---

## Build order

Per §21 of `CLAIMZERO_MASTER_CALIBRATION_TEST_AND_BREAK_PLAN_v1.md` — this supersedes any ad-hoc
ordering: **Wave 0** correctness/security · **Wave 1** shared report engine · **Wave 2** seed CZ-002
(13 checkpoints) · **Wave 3** seed CZ-001 (4 + outcome) · **Wave 4** Reports 07 and 03 ·
**Wave 5** remaining library · **Wave 6** third case.

The demo acceptance bar is **§29 — fifteen conditions**, not any list invented elsewhere.

---

## Live role walk — 8 Aug 2026, 05:30 UTC

Signed in as `exec@`, `pm@`, `reviewer@` and walked `/`, `/portfolio`, `/reports`, `/queue`,
`/settings`, `/pipeline`, `/clients`, `/engagements`, `/intake`.

- No route bounced to `/auth`; session holds across navigation for all three roles.
- No console errors beyond the known extension-induced hydration attribute warning.
- **SEC-01 found and fixed** — see Done above. Re-walked after the fix: Executive sees the full
  client and opportunity list; PM and Reviewer get the Restricted card and zero rows at the
  database layer.
- Database linter clean. Security scan returns one `warn`:
  assignment-scoped read policies on `control_register`, `aspects`, `lifecycle_stages`,
  `escalation_rules`, `stage_exit_criteria`, `aspect_weight_overrides`, `aspect_id_history`
  do not match `project_id`. **Accepted as designed** — these are global methodology reference
  tables, not project data. Any assigned user is meant to read the whole register.

### Still untested
- Evidence upload → storage → `control_evidence` round trip (0 rows in the table).
- Print/PDF fidelity of the four active report generators.
- Reviewer Queue triage write path under a non-admin session.
