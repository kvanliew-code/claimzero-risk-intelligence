# ClaimZero — Operating Model Brief v1

**For: Claude Code (build) and Lovable (schema). CC: Ken Van Liew.**
Written 7 Aug 2026. Extends `BRIEF.md`, `ORGANIZATIONAL_LAYER.md`, `NAVIGATION_PROPOSAL.md`,
`PRECONSTRUCTION_EXPANSION.md`, `ASPECT_MODEL_v2.md`.

This captures a night of dictation from a principal with forty years and roughly $3.5B built, and converts it
into something two agents can execute against without asking him a question. **Read §14 first if you only have
five minutes** — it is the build order.

---

## 1. Verified state — what is actually true in the repo

Read from `origin/main @ eaae27c`, not from anyone's status report.

### 1.1 What landed and is real

| Thing | State | Where |
|---|---|---|
| **Nine stages** | ✅ **Done.** Acquisition · Entitlement · Schematic · Design Development · Preconstruction · Construction · Takeout · Certificate of Occupancy · Sellout | `src/lib/claimzero/stages.ts:13-23`; migration `20260807050542` |
| Stage renumber 7→9 | ✅ Applied across six tables | `20260807050542:8-79` |
| Legacy stage aliases | ✅ Old 7 labels resolve to numbers | `stages.ts:40-54` |
| Report generators | ✅ **Four**, not two: `RISK_MITIGATION_PLAN`, `TIME_AND_MONEY`, `DEVELOPMENT_CONTROL_REPORT_CARD`, `STAGE_GATE` | `reports.ts:1157-1162` |
| Section primitives | ✅ Ten rendered — the seven originals plus `metric_grid`, `grade_card`, `transcript` | `reports.ts:24-34` |
| Evidence storage | ✅ Real — `control_evidence` plus a bucket with four RLS policies | `20260806231920` |
| `family_applies()` tautology | ✅ Fixed | `20260807020709` |
| Project-scoped RLS | ✅ Assignment-scoped, not open | `20260807020205:20-24` |

**Stages are done.** That was the largest structural change and it is in.

### 1.2 What is broken, stale, or a lie in the UI

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D-01 | **Stages 3 (Schematic) and 7 (Takeout) are empty shells.** Seeded by copying a neighbour's weights with `exit_criteria = '[]'`. No controls, no exit criteria. **A project in either stage passes its gate by default because there is nothing to fail.** | `20260807050542:44-52` | **CRITICAL** |
| D-02 | **Two competing aspect models** — 15 in the DB (drives scoring) vs 12 hardcoded in `src/lib/claimzero/data.ts:147-352` (drives demo) | — | HIGH |
| D-03 | Sidebar still reads **"The Twelve Aspects"** | `src/components/cz/sidebar.tsx:38` | MEDIUM — visible to a prospect |
| D-04 | **`report_definitions` has DDL and zero rows.** Nine types claimed in a comment; none exist. | `20260807021143:1-13` | **CRITICAL — oldest open blocker** |
| D-05 | `SECTION_TYPES` omits `transcript`, but the engine fully renders it. Any stored definition using it fails validation. | `reports.ts:24-34` | HIGH — bites the moment D-04 is fixed |
| D-06 | **The engagement → intake gate is copy, not code.** | `engagements.tsx:125` | MEDIUM |
| D-07 | Intake labelled "the 23-field profile"; there are ~28 fields | `intake.tsx:24` | LOW — but it is a number in front of a client |
| D-08 | `review_items.status` and `.kind` are unconstrained `text` | `20260806164724` | MEDIUM |
| D-09 | **`review_items` has no assignee column at all** | same | **CRITICAL** |
| D-10 | **Nothing enqueues automatically.** Every item needs a human click. No trigger, no cron, no edge function. | `escalation.ts:191-214` | **CRITICAL** |
| D-11 | Queue dedupe is in-memory only. No unique constraint. Concurrent clicks duplicate. | `queue.tsx:264` | MEDIUM |
| D-12 | `exposure_usd` hardcoded `0` on every insert — the exposure KPI is a column of zeros | `escalation.ts:191-214` | HIGH |
| D-13 | **"Reviewer capacity" is a sales metric wearing a reviewer's name.** Zero connection to `review_items`. Nobody's real workload is measured anywhere. | `pipeline.ts:376-413` | HIGH |
| D-14 | `20260807020709` re-widened six methodology tables to **every** `project_manager`, hours after `20260807020205` narrowed them to staff. A PM with zero assignments reads all 891 controls, every escalation rule and every exit criterion. | `20260807020709:2-23` | **Confirm intent — that is the IP** |
| D-15 | Project document register is **entirely synthetic** — the file header says so. It generates plausible filenames. | `docs.ts:1-2, 47+` | HIGH |

### 1.3 The four original data blockers

| Blocker | Status |
|---|---|
| `projects` — zero rows | ⚠️ Needs a DB read. **Lovable: confirm.** |
| `report_definitions` — zero rows | ❌ **Still open.** No seed migration exists. |
| `family_applicability_rules` — 144 rules never loaded | ⚠️ Table and functions exist; seed unverified |
| `family_code`/`aspect_id` taxonomy break | ⚠️ Back-fill exists at `20260806124500:85-87`; whether it matched rows is unverified |

> **To Lovable, before anything else:** run and report the four counts in `docs/SCHEMA_REQUESTS.md` REQ-000.
> Every downstream decision depends on them and nobody has actually looked. Report the numbers, not a summary.

---

## 2. The Thirty Aspects

Supersedes the fifteen. **The migration must precede the 891-control register load** — after that it is a data
migration instead of a renumber.

Sequenced by **when each first goes live in the lifecycle**, not by importance. A stage gate scores only the
aspects that are active; an aspect with no applicable control at the current stage reads **NOT YET APPLICABLE**,
never green.

| # | Aspect | New? |
|---|---|---|
| 01 | Concept & Highest and Best Use | **NEW** |
| 02 | Site Control & Deal Structure | **NEW** |
| 03 | Entitlement & Development Rights | |
| 04 | Site, Ground & Environmental | |
| 05 | Utilities, Access & Offsite | |
| 06 | Local Authority & Jurisdictional Clearance | **NEW** |
| 07 | Adjacent Property & License Agreements | **NEW** |
| 08 | Site Logistics & Public Way | **NEW** |
| 09 | Monitoring, Vibration & Protection | **NEW** |
| 10 | Certificate of Occupancy Readiness | **NEW** |
| 11 | Program Integrity & Owner Decision Control | |
| 12 | Professional Team Procurement & Coverage | **NEW** |
| 13 | Design Coordination & Documentation | |
| 14 | Contract Structure, Scope & Counterparty | |
| 15 | Quality, Commissioning & Systems Verification | |
| 16 | Cost Position & Contingency | |
| 17 | Anticipated Cost & Change Genealogy | **NEW** |
| 18 | Capital Structure & Sponsor Solvency | |
| 19 | Lender & Capital Partner Relations | **NEW** |
| 20 | Payment, Draw & Cash Movement | |
| 21 | Procurement, Buyout & Long Lead | |
| 22 | Owner-Furnished Scope & FF&E | **NEW** |
| 23 | Supply Chain, Tariff & Trade Policy | **NEW** |
| 24 | Schedule Integrity & Critical Path | |
| 25 | Trade Performance on Critical Path | **NEW** |
| 26 | Communication Integrity | **NEW** |
| 27 | Team Capacity & Continuity | **NEW** |
| 28 | Field Reporting & Source-System Health | **NEW** |
| 29 | Safety, Insurance & Dispute Exposure | |
| 30 | Demand, Absorption & Sales Execution | |

**Sixteen are new.** Every one traces to a specific event, not a framework: 221 West 29th produced 09. The
Miami FF&E produced 22. The Meridian elevator produced 10 and 25. The lender's questions produced 19 and 23.
40 East 66th produced 17 and 28.

### 2.1 Six streams — and the honest problem with them

| Stream | Aspects | Question |
|---|---|---|
| Land & Entitlement | 01–05 | Can we build it at all? |
| Authority & Neighbours | 06–10 | What is outside our control? |
| Design & Contract | 11–15 | What are we building, and who is on the hook? |
| Cost & Capital | 16–20 | Does the money work, and does it keep flowing? |
| Procurement & Time | 21–25 | Will it arrive, and will it finish? |
| Delivery System | 26–30 | Is the organisation capable of delivering it? |

**A defect in my own model, flagged.** Six streams of five is clean and wrong at the edge: **29 (Safety,
Insurance & Dispute) and 30 (Demand & Absorption) are not delivery-system measures.** 26, 27 and 28 measure the
organisation. 29 and 30 measure exposure and outcome.

**Recommendation:** keep the six-stream grid for the report card, and publish the organisational three (26–28)
as a named sub-index — **Delivery System Health** — graded separately and shown on the Overview. Honest, keeps
the clean grid, and puts the moat on its own line. **Do not let it block the migration** — aspect numbers are
unaffected either way.

### 2.2 Trade complexity — aspect 25 is not granular enough

Ken: *"a couple of trades are so complex — the curtain wall is probably one of the most complicated, the
reinforced concrete, the processes they have to go through are seriously intense."*

Aspect 25 as specified treats every trade the same. **A drywall subcontractor and a unitized curtain wall
subcontractor are not the same kind of object.** Manpower-versus-planned is a valid signal for drywall; it is
nearly useless for curtain wall, where the job is lost eighteen months earlier in engineering, testing and
extrusion die lead times, and the men on site are the last thing to go wrong.

**Do not add aspects.** Add **trade complexity profiles** under aspect 25 — a per-trade process chain with its
own gates, evidence and early-warning signal. See `docs/TRADE_COMPLEXITY.md`.

---

## 3. Navigation

**Project menu (11):** Overview · Report Card · **Risks** · Controls · **Evidence** · Schedule & Critical Path ·
Cost & Draw · Certificate Path · **Directory** · Reports · **Timeline**

**Command centre (12):** Daily Digest · Portfolio · Report Library | Pipeline · Clients · **Proposals** ·
Engagements · Project Intake | **Work Queue** · Capacity · **Training** · Settings

"Review Queue" is renamed **Work Queue** (§4 — the administrator lives in it more than the reviewer does), and
**Training** is added (§10).

**Risks remains the highest-priority new screen.** The engine has controls, evidence, aspects, escalation rules
and a queue, and nowhere does a *risk* exist as an object with identity that persists from first signal through
consequence to closure. The doctrine says "risk identity persists" and "regulatory closure is not causal
closure." Neither statement is currently true in code.

---

## 4. The Work Queue — the critical design

Ken: *"We gotta figure out how our project manager does not sit there clicking on buttons."*
That sentence is the product-viability question.

### 4.1 The arithmetic that kills the naive design

Thirty aspects. A register heading toward ~891 controls. Rules firing on any control in
`ADVERSE | BLOCKED | OVERDUE | EVIDENCE_NOT_LOCATED`. One construction-stage project generates dozens of
fireable conditions a week. Multiply by eight projects. A reviewer facing 200+ items a week either
rubber-stamps them or stops opening the screen. **Both destroy the defensibility that is the entire product. A
rubber-stamped review is worse than no review, because it creates a record of a judgment never made.**

So the queue is not a feed. It is a **rationed, classified, batched work system.**

### 4.2 Three classes of item — the single most important decision in this brief

| Class | Judgment required | Handler | Target share |
|---|---|---|---|
| **A — Machine-decided** | None. Deterministic. | **Nobody.** Posts straight to control status. | ~70% |
| **B — Record triage** | About the *record*, not the risk | **Administrator** | ~20% |
| **C — Risk decision** | Risk, consequence, exposure, remedy | **Reviewer** | ~10% |

**Class A never enters the queue.** Document not received by its due date. A field is null. A date has passed.
A feed has not updated in N days. A permit expiry inside its window. These are facts — the engine asserts them,
stamps them, and moves on. Zero human time. *(The control reads `EVIDENCE_NOT_LOCATED`, not `OK` — unknown is
still not green.)*

**Class B — administrator.** *Is this the right document for this control? Does the date match? Is it legible?
Whose is it? Is it a duplicate of Tuesday's?* Real work, not reviewer work. ~2 minutes an item.

**Class C — reviewer.** *Does this become a finding? What is the exposure? What is the remedy, which seat owns
it, by when? Does it go in the client's report?* 8–15 minutes, and the only work that needs the licence, the
judgment and the signature.

> **If Class A is not built, nothing else in this section matters. The 70% is the whole margin.**

### 4.3 The weekly item budget — and no silent caps

Each project has a **weekly Class C budget** (default **12**). The engine ranks fired conditions by
`severity × materiality × aging` and surfaces the top N. The rest are **held, not discarded.**

**The UI must always state the truth:** *"18 conditions fired · 12 surfaced · 6 held — view held."* A held item
that ages past its SLA is force-promoted regardless of budget. Silent truncation reads as "we covered
everything" when we did not, and that is exactly the failure this product exists to prevent.

### 4.4 Cadence — the queue is worked in sessions, not continuously

| Session | Who | When | Purpose |
|---|---|---|---|
| **Daily sweep** | Administrator | Every working day, ~15 min/project | Clear Class B, chase missing records |
| **Midweek review** | Reviewer | **Tuesday** | Class C from Fri–Tue |
| **Close of week** | Reviewer | **Friday** | Clear all Class C. **Closes the reporting week.** |
| **Report window** | Reviewer / Executive | Friday close → Monday 06:00 | Weekly reports generate, review, publish |

**The enforcing rule, and it is doctrine:**
> **A weekly report cannot be generated while unworked Class C items exist for that project with a submission
> date before the Friday cutoff.** The generator refuses and names the blocking items.

That single rule makes "human-reviewed" real instead of a claim. It also converts the queue from a chore into
the gate a reviewer must pass to produce the deliverable he is paid for — the only reliable way to get a queue
worked.

### 4.5 SLA by severity

| Severity | Class C due within | Escalates to |
|---|---|---|
| CRITICAL | 2 business days | Executive (L3) automatically at breach |
| HIGH | 5 business days | Executive at breach |
| MEDIUM | 10 business days | Named in the weekly report as unworked |
| LOW | Next stage gate | — |

Replace the flat 5-day service line at `queue.tsx:322-370`.

### 4.6 Assignment

`review_items` gets `assigned_to`, assigned **at enqueue**, deterministically:

1. Class B → the project's `administrator`, else the pod administrator
2. Class C → the project's `reviewer`, else the assigned `project_manager` holding the reviewer role
3. CRITICAL, or exposure ≥ the L3 threshold → **additionally** flagged to the executive over that project
4. No assignee resolvable → the pod's unassigned tray, and raise a configuration defect. **It never silently
   disappears.**

### 4.7 What the screen must show

**Top band — one row per project the user can see, ranked by pressure:**
Project · Stage · Class B open · Class C open · Oldest · SLA breaches · Exposure pending · Next session

This is Ken's *"someone at a glance is gonna have to see the projects."* A PM sees his 8. An executive sees his
two PMs' 16, grouped by PM. The principal sees all of them.

**Three tabs:** `Mine` · `My projects` · `All I can see` — the last respects RLS and simply shows less for a PM.

**A session control:** `Start Friday close — 11 items, est. 22 min`. Work items one at a time with keyboard
decisions, show progress, end with a summary of what was decided. **Sessions are the interaction model.**
Nobody browses a queue; they run a session.

### 4.8 Automatic enqueue

- Rule evaluation moves **server-side** — a scheduled function (nightly, plus on evidence change) writes
  classified items. Client-side `escalation.ts` becomes a preview only.
- Unique constraint `(project_id, control_id, rule_id, cycle_key)` where `cycle_key` is the reporting week.
  Kills D-11 and stops the same condition re-firing every night for a month.
- `exposure_usd` computed, not zero (D-12). Where no defensible figure exists it is **NULL and reported as
  "exposure not quantified"** — never 0. *Null is not zero.*

---

## 5. Capacity — what a person can actually carry

**Straight answer first: there is no published benchmark for any of it.** Job postings, bank regulator guidance,
monitoring-firm publications, agency audits, CFMA-derived summaries — no association publishes concurrent-project
caseloads for on-site PMs, owner's reps, or construction loan monitors. Anyone who quotes you one is making it
up. What follows is a model built from real anchors with the assumptions exposed.

### 5.1 The anchors that do exist

| Anchor | Number | Source | Grade |
|---|---|---|---|
| HUD inspection fee, new construction | **0.5% of commitment** ($5 per $1,000) | 24 CFR 200.40 | **Regulation** |
| FTA project-management oversight | **up to 1%** of §5309 capital funds; $39.3M obligated FY2009 | GAO-10-909 | **Federal audit** |
| Commercial draw inspection | $250–$350 each | Millman, 2022 | Trade |
| Construction *monitor* vs bank inspector | **≥ 2×** the inspector's fee | zumBrunnen | Trade |
| Owner's rep fee | 1–5% of construction cost, declining with size; retainer $5K–$25K+/month | Four independent firm sources, converging | Marketing, corroborated |
| RFIs | **9.9 per $1M**; **796 per project**; **$1,080 and ~8 hours** each; 6.4-day average first reply; **13.2% unjustifiable** | Navigant Construction Forum — 1,362 projects, 1,083,807 RFIs | **Original research — the best number here** |
| Change orders | **11.29 executed COs** average on projects > $50M; cost variation 3.2–5.0% | AIA — 892,457 COs, 18,229 projects | **Original research** |
| Report length discipline | Exec summary **≤ 4 pages**, body **≤ 20**; site-visit summary within **48 hours** | FTA Oversight Procedure 25, 2023 | **Federal procedure** |
| Monthly deliverable spec | Pay app + change orders + schedule; opinion on CO impact; contingency adequacy; delay identification **with proposed solutions** | Freddie Mac monitoring best practice, 2019 | **GSE standard** |

Two are worth pausing on.

**The Freddie Mac spec independently validates Ken's rule.** It requires the monitor to identify potential
delays *with proposed solutions.* That is "we never present problems without recommendations" written into a GSE
standard. Put it in the sales deck.

**HUD 0.5% and FTA 1% bracket monitoring-only work at roughly 0.5–1% of construction cost** versus 1–5% for a
full owner's rep. That ratio — a fifth to a half — is the economic proof that a monitoring role carries several
times the caseload of an owner's rep. It is the closest thing to evidence that exists.

### 5.2 The load model

A **$100M project generates ~990 RFIs over its life** (9.9 × 100) — **33–41 per month** across a 24–30 month
construction duration, peaks 1.5–2×. ClaimZero does not answer RFIs; it measures their aging and dependency.
But that is the document volume the engine ingests.

Reviewer minutes per project per month, construction stage:

| Activity | Basis | Min/month |
|---|---|---|
| Class C decisions | ~4/wk × 10 min | 172 |
| Weekly report review and sign | 45 min × 4.3 | 194 |
| Monthly executive report | | 180 |
| Monthly draw / ACR / pencil-walkthrough review | | 120 |
| Client contact | 30 min/wk | 129 |
| Escalations and exceptions | 20% loading | 159 |
| **Total** | | **~954 min ≈ 16 hrs** |

Acquisition and entitlement run **4–6 hrs/month**; preconstruction ~10.

At **130 productive hours per month**:

| Portfolio mix | Projects per reviewer |
|---|---|
| All construction-stage | **8** |
| Mixed lifecycle (realistic) | **10–12** |
| Heavy client interaction / on-site presence | **3–4** |

**Ken's instincts were right on both counts** — a PM at about three with heavy client interaction, an executive
at about eight. Both fall out of the arithmetic. A building PM carries one project because he owns the outcome
and lives on site; a monitoring reviewer carries 8–12 because he owns the record and the judgment.

### 5.3 The pod — the unit of scale

| Seat | Count | Carries | Level |
|---|---|---|---|
| Executive | 1 | 16–20 projects, all escalations, client relationships | L3 |
| Reviewer / PM | 2 | 8–10 each | L2 |
| Administrator | 1 | 16–20 projects of Class B and chasing | L1 |
| **Pod** | **4 people** | **16–20 projects** | |

**Sixty projects ≈ 3½ pods ≈ 14–16 delivery people.** That is the answer to the two-year goal, and it is a real
company, not a side project.

**Break-even, with the assumption exposed:** at an average $12,000/month per project — *the number I cannot
source and you must set* — a pod at 16 projects bills **$192K/month, $2.3M/year**. Loaded pod cost runs roughly
$700–900K. **A pod breaks even at 5–7 projects and sits at ~65% gross margin at 16.** The first pod is the
hardest; every one after is a copy.

**Do this before pricing anything:** call Partner ESI, EBI and KOW and ask for a monitoring quote on a
representative $100M project. One phone call converts the largest unknown in this model into primary evidence.

### 5.4 Fix the capacity feature

Keep the sales-constraint view and add the missing half: **committed load** (per-project monthly hours by stage,
per reviewer, from actual assignments), **realised load** (minutes worked in sessions — free once §4.7 exists),
and **the three-line chart**: forecast demand · committed · realised. When realised runs above committed for two
months, the model is wrong and gets recalibrated from real data.

**That recalibration loop is worth more than the initial estimate.** After twenty projects you own the benchmark
nobody publishes, computed from your own operation.

---

## 6. Roles, scoping, and approval levels

### 6.1 Roles

Current `app_role`: `admin | executive | project_manager | reviewer`. Proposed:

| Role | Sees | Decides |
|---|---|---|
| `principal` | Everything | L4 — publication, delay-day statements, top-threshold exposure |
| `executive` | Projects of the PMs reporting to them | L3 — CRITICAL findings, threshold exposure, published-position changes |
| `reviewer` | Assigned projects | L2 — findings, remedies, exposure below threshold |
| `project_manager` | Assigned projects | L2 where also granted `reviewer`; else L1 + evidence capture |
| `administrator` | Projects of the pod they support | L1 — record triage, evidence matching, chasing |
| `client_viewer` | One client's projects, **published reports only** | Nothing |

Two structural additions: **`org_reporting` (executive ↔ project_manager)** — *"an executive may have two project
managers with ten projects each"* is not currently expressible, so an executive either sees everything or
nothing — and **`client_viewer`**, how the owner eventually reads his own frozen reports. Schema now, screen
later.

### 6.2 Scoping — one decision to confirm

`20260807020709` re-widened six methodology tables to every `project_manager` (D-14). The control register is
the IP. **Recommendation: narrow to staff plus PMs with at least one assignment.** One predicate, costs nothing.

### 6.3 The four approval levels — and the idea worth stealing

| Level | Holder | Authority |
|---|---|---|
| **L0** | Machine | Deterministic control status. No human. |
| **L1** | Administrator | Evidence matched, record accepted or rejected, chase issued |
| **L2** | Reviewer | Finding created with remedy, exposure stated, aspect grade moved |
| **L3** | Executive | Any CRITICAL finding · exposure ≥ threshold · any change to a published position |
| **L4** | Principal | Publication of any client-facing report · **any statement of delay days** · exposure ≥ upper threshold |

**Now the idea.** Filed construction loan agreements define "Minor Change Orders" the lender need not approve at
**$250,000 individually / $1,000,000 aggregate**, observed market range $50K–$500K individual and $1M–$3M
aggregate. Four *separate* authority systems govern the same change order — the construction contract, the
owner's internal delegation of authority, the loan documents, and the JV agreement — each drafted by different
lawyers at different times, each with its own threshold and its own definition of "aggregate", **and they are
never reconciled with each other.**

> **Set ClaimZero's L3/L4 thresholds per engagement to mirror the client's own loan-document and JV consent
> thresholds.** Then our escalation is not arbitrary internal policy — it mirrors the client's actual
> capital-stack consent matrix, and we escalate exactly where his lender's consent right attaches.

Two things fall out free:

1. **A consent-obligations register** per project — every action requiring lender, mezz or JV approval, its
   threshold, its notice period, and whether the notice was actually given. Aspect 19.
2. **The aggregate trip-wire.** The binding constraint on a long job is the aggregate, not the individual
   threshold: **$1M aggregate on a $200M project is exhausted around month eight,** and nobody is counting.

And a genuine gap in industry practice, not a search failure:

> **No published approval threshold, in any of the four authority systems, is keyed to schedule impact. Every
> one is denominated in dollars.** A change order that adds zero cost and nineteen days to the critical path
> requires nobody's approval anywhere. ClaimZero can be the first product that escalates on time impact, and it
> costs one extra threshold column.

---

## 7. The commercial spine — client to first report

Opportunity → Client → Proposal → Engagement (signed) → Project Intake → **Day 0** report + Information Request
→ **Day 10** Knowledge Base report → **Day 21** first Risk Mitigation Plan → weekly cadence.

**The engagement gate becomes code, not copy** (D-06): intake cannot open without an engagement in `signed`.

### 7.1 Proposal and engagement letter are report definitions

Same structure as every other report — audience, decision, sections, citations, reviewer gate, document number,
revision, frozen on issue. **Build `PROPOSAL` and `ENGAGEMENT_LETTER` in the same GENERATORS map.** No second
templating system, no second archive, no drift between what the proposal promised and what the reports deliver.

### 7.2 Day 0 — the report that says nothing false

**What we know.** The profile, the stage, the applicable control families, the initial risk posture. At Day 0
nearly every aspect is **UNKNOWN**, and unknown is not green. **So the first thing a client ever receives from
ClaimZero is an honest statement of what cannot yet be asserted.** No competitor's onboarding document does
that, and it sets the standard for every report after it.

**The Information Request.** Not an email asking for "the usual documents." A **numbered, tracked, dated
instrument** generated from the applicable control set — Item · Document · Control · Owed by (seat) · Due · Why
it matters if absent. Issued as `IR-001`, revision-controlled, every line traceable to a control and a named
seat. Responses land as evidence against those controls automatically. **This compresses thirty days of
document-chasing into ten**, and it is a demo moment: intake finishes and a formal, project-specific document
request prints in four seconds.

### 7.3 Day 10 — the Knowledge Base report

What arrived, what did not, what the arrivals tell us, and — the important half — **what the absences tell us.**
A seller who cannot produce the geotechnical report is a finding, not a delay.

### 7.4 Day 21 — the first Risk Mitigation Plan

The existing generator with real evidence behind it, plus the 21 contract clauses from `ORGANIZATIONAL_LAYER.md`
§4 as an appendix — because the RMP is the instrument that creates the telemetry for aspects 26–28. **The plan
is not a report about the project. It is the thing that makes the project measurable.**

---

## 8. Accounting — build the trigger, not the ledger

**Do not build accounting inside ClaimZero.** Books live in QuickBooks Online.

**On engagement → `signed`, one event creates:** a billing profile (fee basis, retainer, billing day, term,
escalation, expenses); a fee schedule (dated line items attached to deliverables); revenue milestones tied to
actual deliverables — Day 0, Day 21, each monthly executive report, each stage gate; and a retainer invoice **as
a draft, never auto-sent.**

**Phasing.** Phase 1: internal billing ledger + CSV/IIF export — zero integration risk, immediately useful.
Phase 2: QuickBooks Online via OAuth — Customers, Invoices, Payments; ClaimZero is system of record for *what
was delivered*, QBO for *what was billed and collected*. Phase 3: reconciliation — delivered vs billed vs
collected, per project and per pod. **Unbilled delivered work is the leak in every professional services firm**,
and it is one query.

**Out of scope, deliberately:** payroll, GL, tax, AP.

---

## 9. Pipeline KPIs, the sixty-project goal, BD compensation

### 9.1 The goal, worked backwards

Assumed conversion — **planning assumptions; the first ninety days of real data replaces every one:**
Identified→Contacted 60% · Contacted→Met 35% · Met→Demo 60% · Demo→Proposal 55% · Proposal→Engaged 30%.

Compounded: **~2.1% of identified become engaged.** Sixty engagements needs roughly **2,900 identified contacts**
over 24 months — about **28 new qualified contacts a week.** One full-time business-development seat.

**The far cheaper path, and the one to run first:** Ken's own network. A warm introduction from a principal who
has built $3.5B does not convert at 2.1%. **Sixty projects out of a cold list is a two-year slog. Sixty out of
Ken's network plus a young rep working the follow-through is a twelve-month plan.** Measure warm and cold
separately from day one — they are different businesses and averaging them hides both.

### 9.2 KPIs the Pipeline screen must carry

**Activity:** new qualified contacts/wk · meetings/wk · demos/wk · proposals issued/wk · proposal value/wk.
**Conversion:** stage-to-stage rate, warm vs cold, rolling 90 days · median days in stage · loss reasons by code
(`loss_reason_code` already exists — use it).
**Outcome:** engagements signed/month · ARR added · average fee · first contact to signature.
**Constraint:** the reviewer-capacity line on every forecast. **Never show the forecast without it.**

### 9.3 Business-development compensation

Recoverable draw against commission, trued up quarterly · year-one commission on **collected** fees · reduced
residual in years two and three (renewals are not his work) · accelerator above quota · **split credit defined
before the first deal closes**, because most early deals will be Ken-sourced and rep-executed · clawback on
non-payment.

**Two hard constraints:** commission on **collected** fees, never booked; and **no commission on a deal the pod
cannot staff** — otherwise the rep sells past capacity and the delivery quality that is the entire product goes
with it. Tie quota to the capacity line in §5.

*Not legal or compensation advice. Have counsel paper this before an offer goes out.*

---

## 10. Training and the Operator Manual

**`/training` as a first-class menu item**, four role tracks — Administrator · Reviewer · Executive · Client.
Six to eight short screens each, real screenshots, **each ending with the one rule that track cannot break.**

1. **Contextual help on every screen** — a `?` explaining what this screen decides and what a good decision
   looks like here. People learn where they work.
2. **The Operator Manual is a report.** `OPERATOR_MANUAL` in the GENERATORS map, versioned with the methodology,
   printable, re-issued when the methodology version changes. **The manual can never silently drift from the
   product**, because it is generated from it.
3. **A guided first session** — walk a new reviewer through three real items. Ten minutes, once, replaces most
   of a training day.

**The doctrine card.** One page, printed, on the wall: *Null is not zero. Missing is not stable. Unknown is not
green. Regulatory closure is not causal closure. No finding without a remedy. Published reports stay frozen.*

---

## 11. Settings

| Group | Contents |
|---|---|
| **Methodology** | Active version · register admin · escalation rules · exit criteria · aspect weights per stage · **version freeze** |
| **People & access** | Users · roles · executive↔PM reporting map · project assignments · pod membership |
| **Thresholds** | L3/L4 approval thresholds · SLA days by severity · weekly Class C budget · **per-engagement overrides mirroring the client's loan documents** (§6.3) |
| **Firm** | Reviewer capacity by month · working calendar · session days · report cutoff · letterhead, signature blocks |
| **Integrations** | QuickBooks · storage · source-system connections · the project email of record per project |

**The version freeze is not a nicety.** If a client disputes a report issued in March, you must regenerate it
against March's methodology. Changing a weight in August must not silently rewrite history.

---

## 12. The AIA module — and the licence problem

Ingest the executed agreement. Diff it against the unmodified AIA baseline. For every deletion, insertion or
modification return: **what changed · which risk it moves · to whom · and the recommended position.**

### 12.1 The documents

`A101` Owner–Contractor stipulated sum · `A102/A103` cost of the work with/without GMP · **`A201` General
Conditions — where 80% of the risk lives and where the edits are made** · `A133/A134` Owner–CM as constructor ·
`B101/B133` Owner–Architect · `C401` Architect–Consultant · `A401` Contractor–Subcontractor (flow-down lives
here) · `A312` bonds · `G702/G703, G701, G704` the instruments the engine already reads.

### 12.2 The A201 clauses to watch, and the edits that matter

| Clause | Subject | The edit to flag |
|---|---|---|
| §3.2 | Contractor's review of the documents | Expanded into a duty to discover design errors — shifts design risk to the CM, then to the owner via claim |
| §4.2 | Architect's authority | **Architect may order changes with no dollar threshold at all**, bounded only by a no-cost/no-time test it applies to itself |
| §7 | Changes in the work | Notice periods shortened; pricing method removed; markup capped without defining base |
| §8.3 | Delays and extensions | **No-damage-for-delay** inserted — the single most consequential edit in American construction contracting |
| §9.3–9.7 | Payments | **Pay-if-paid** substituted for pay-when-paid; retainage release moved; stored-materials rules narrowed |
| §11 | Insurance | Limits reduced; additional-insured narrowed; **waiver of subrogation deleted** |
| §15.1.6 | Consequential damages | Mutual waiver deleted on one side only |
| §15 | Claims | Notice cut from 21 days to 7; initial decision maker changed to an interested party |

**The output is not "this was edited."** It is: *§8.3.1 has been modified to insert a no-damage-for-delay
provision. Delay cost risk has moved from the contractor to the owner. Recommended position: strike, or cap at
an agreed daily rate.* **A finding with a remedy — the same editorial rule as every other report.**

### 12.3 The problem nobody mentions

**AIA documents are copyrighted.** The baseline text cannot be stored, embedded or reproduced without a licence,
and a comparison feature that reproduces AIA language is a licensing exposure, not a grey area. Three routes:

1. **Licence from AIA.** Cleanest, has a cost, a conversation to have deliberately rather than discover.
2. **Clause-level fingerprinting** — detect *that* §8.3.1 deviates from standard and characterise the deviation
   in our own words without reproducing AIA text. Safer, harder, and **arguably a better product** because the
   output is our analysis rather than a redline.
3. **Client-supplied baseline** — the client uploads their own licensed copy; we diff two documents they own.
   No exposure at all. Slower, and honestly the right MVP.

**Recommendation: build route 3 now, negotiate route 1 in parallel, design toward route 2** — fingerprinting is
what scales to ConsensusDocs, EJCDC and bespoke owner forms, which is where institutional and university clients
actually live.

**One more hole:** this feature produces output that reads like legal advice. It must be framed as risk-position
analysis for the owner's counsel, human-reviewed, and counsel must sign off on the framing before it reaches a
client. Expensive to retrofit.

---

## 13. Schema requests

**Lovable owns migrations. Full text in `docs/SCHEMA_REQUESTS.md`.**

| REQ | Subject |
|---|---|
| **000** | Report four row counts before writing anything |
| **006** | Thirty-aspect migration — **must precede the 891-control load** |
| **007** | `risks` + `risk_events` — persistent risk identity |
| **008** | `review_items` extension: class, assignee, decision level, cycle key, held, CHECKs, unique constraint |
| **009** | `org_reporting`, pods, roles `principal` / `administrator` / `client_viewer` |
| **010** | `report_definitions` seed — oldest open blocker |
| **011** | Stages 3 and 7 content — a project currently passes those gates by default |
| **012** | `engagement_billing`, `fee_schedule`, `revenue_milestones` |
| **013** | `consent_obligations` — thresholds, notice periods, running aggregate |
| **014** | `information_requests` + items |

---

## 14. Build order — for Claude Code

**Do them in this order.** Nothing blocks on something later.

### Tier 1 — tonight (no schema dependency)

1. **Add `transcript` to `SECTION_TYPES`** (D-05). One line. First, so #2 validates.
2. **`report_definitions` seed content** — author all twelve definitions as data, ready for REQ-010.
   *Accept: every key in `GENERATORS` has a definition, and every `sections[]` validates.*
3. **Kill the twelve-aspect ghost** (D-02, D-03) — delete `ASPECTS` from `data.ts`, point `demo-surfaces` at the
   DB, fix `sidebar.tsx:38`. *Accept: `grep -ri "twelve aspects" src/` returns nothing.*
4. **Thirty-aspect constants + report-card mapping**, ready for REQ-006.
   *Accept: 30 aspects, 6 streams, mapping to the website's 4, unit-tested for completeness and uniqueness.*
5. **Compute the intake field count** (D-07) — never hardcode it.

### Tier 2 — the Work Queue (§4)

6. **Item classification at generation.** A/B/C. *Accept: a fixture project produces ≥60% Class A and zero Class
   A rows land in `review_items`.*
7. **Ranking and the weekly budget.** Top-12 surfaced, rest held, **"18 fired · 12 surfaced · 6 held" visible.**
   *Accept: **a test asserts the held count is displayed.** This is the no-silent-caps rule and it is not
   optional.*
8. **Assignment on enqueue** (§4.6), including the unassigned tray and the configuration defect it raises.
9. **Sessions** — start / work / summarise, keyboard decisions, elapsed-minutes capture.
   *Accept: a completed session writes per-item decision times; realised load is queryable.*
10. **SLA by severity** (§4.5), replacing the flat 5-day line.
11. **The report gate** — a weekly report refuses to generate with unworked pre-cutoff Class C items, and names
    them. *Accept: a fixture with one unworked CRITICAL blocks generation and the error names the item.*
12. **`exposure_usd` computed or NULL — never 0** (D-12). *Accept: the UI renders NULL as "not quantified."*

### Tier 3 — the commercial spine (§7)

13. `PROPOSAL` and `ENGAGEMENT_LETTER` generators.
14. **Enforce the engagement gate in code** (D-06). *Accept: intake with an unsigned engagement is refused.*
15. **Day 0 report + Information Request generation.** *Accept: completing intake on a fixture produces an
    `IR-001` where every line names a control and a seat.*
16. Billing profile + fee schedule on engagement signature (§8, phase 1 — ledger and export only).

### Tier 4

17. **Risks screen and state machine** (REQ-007) — the missing organ.
18. **Evidence screen** replacing the synthetic document register (D-15).
19. **Directory** with seat response latency (aspects 26–27).
20. **Training routes + `OPERATOR_MANUAL` generator** (§10).
21. **Contextual help framework** — one `?` component, content per route.

### Tier 5

22. Certificate Path — the `signoff_matrix` primitive and screen.
23. Schedule & Critical Path — trade-level, aspect 25, with the trade complexity profiles.
24. Cost & Draw — ACR and change genealogy, aspect 17.
25. Timeline / historical playback — **still blocked on bitemporal columns, REQ-001.**

### Standing instructions

- **Push after every green commit.** Uncommitted work is invisible to Lovable and to Ken.
- **No migrations.** Schema changes go to `docs/SCHEMA_REQUESTS.md` and are called out in the response.
- **If a calibration fixture fails, show the failure before changing a business rule.**
- **Update `COORDINATION.md`** — In Flight → Done with the commit SHA.

---

## 15. Open decisions — Ken only

| # | Decision | Recommendation |
|---|---|---|
| 1 | Stream 6 contains 29 and 30, which are not delivery-system measures (§2.1) | Publish **Delivery System Health (26–28)** as a named sub-index; keep the six-stream grid |
| 2 | Methodology tables readable by every PM, assigned or not (D-14) | Narrow to staff + PMs with ≥1 assignment |
| 3 | Average monthly fee per project (§5.3) | **Call Partner ESI, EBI, KOW this week.** One hour converts the largest unknown into evidence. |
| 4 | Weekly Class C budget — 12? | Start at 12, recalibrate after four weeks of real sessions |
| 5 | Session days — Tuesday and Friday? | Yes. Friday closes the week so Monday's report is true. |
| 6 | AIA route (§12.3) | Client-supplied now, negotiate the licence in parallel, design toward fingerprinting |
| 7 | BD compensation (§9.3) | Recoverable draw + year-one commission on **collected** fees; **no commission on unstaffable work** |
| 8 | `client_viewer` in the MVP? | Schema now, screen later |

---

**Doctrine, unchanged and non-negotiable:**
Null is not zero. Missing is not stable. Unknown is not green. Regulatory closure is not causal closure. Future
evidence cannot enter an earlier historical playback. No invented dollar values. No delay days without verified
CPM logic. Risk identity persists from first signal through consequence and closure. Every material risk carries
a responsible seat, or explicitly flags that accountability is missing. Published reports stay frozen. Every
client-facing report is human-reviewed. **And no problem is ever presented without a recommendation.**
