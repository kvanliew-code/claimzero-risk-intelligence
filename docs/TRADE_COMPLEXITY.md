# Trade Complexity Profiles — aspect 25

**Companion to `CLAIMZERO_OPERATING_BRIEF.md` §2.2. Source: K. Van Liew, 7 Aug 2026.**

> *"There's a couple of trades that are so complex. The curtain wall is probably one of the most complicated
> trades. The reinforced concrete — the processes they have to go through, it's seriously intense."*

---

## 1. Why aspect 25 needs this

Aspect 25 as first specified measures **trade performance on the critical path** with one signal set for every
trade: manpower on site vs. manpower assumed, installed quantity vs. planned, predecessor readiness, crew
continuity.

**That is correct for a commodity trade and nearly useless for a complex one.**

Drywall fails on manpower. You can see it in a daily report in a week. **Curtain wall does not fail on
manpower — it fails eighteen months earlier**, in performance mock-up testing, in an extrusion die that was
never ordered, in a shop drawing cycle that went four rounds because the architect changed a sightline. By the
time the men are short on site, the job was lost a year ago and there is nothing left to do about it.

So a trade is not one kind of object. **A trade has a process chain, and the complex ones have chains that
start before the contract is even bought out.**

## 2. The model

Add `trade_profiles` under aspect 25. Each profile carries:

| Field | Meaning |
|---|---|
| `trade_code` | CSI-aligned, e.g. `03-CIP`, `08-CW`, `14-ELEV` |
| `complexity_class` | `COMMODITY` · `ENGINEERED` · `ENGINEERED_TESTED` |
| `chain[]` | Ordered gates with a lead-time allowance each |
| `governing_signal` | **The one signal that actually predicts failure for this trade** |
| `earliest_signal_stage` | The lifecycle stage where the first gate opens |
| `evidence_types[]` | What a gate is closed with |
| `float_to_finish` | Days between this trade's completion and the certificate |

**`governing_signal` is the whole point.** It is what the weekly report leads with for that trade, and it is
different per trade:

| Complexity class | Governing signal | Why |
|---|---|---|
| `COMMODITY` | Manpower vs. required | Fails in weeks; visible in daily reports |
| `ENGINEERED` | Submittal and fabrication release cycle | Fails in months; visible in the submittal log |
| `ENGINEERED_TESTED` | Mock-up and acceptance test dates against the order-by date | Fails in quarters; visible only if somebody built the chain |

**Manpower is the right lead indicator for exactly one of the three classes. Reporting it as though it were
universal is how a complex trade goes green until the month it goes red permanently.**

---

## 3. `08-CW` Curtain Wall & Façade — `ENGINEERED_TESTED`

The chain, and every one of these is a gate that can and does stop a job:

| # | Gate | Typical allowance | What kills it |
|---|---|---|---|
| 1 | Design assist engaged / performance spec issued | | Engaged after DD, so the system is designed twice |
| 2 | System selection — unitized vs. stick-built | | Chosen late; unitized changes hoisting, floor edge, sequence, and the schedule logic |
| 3 | Delegated engineering — structural calcs, thermal, deflection, movement joints | 8–16 wks | Delegated design has no schedule allowance in the CPM. **Aspect 14's most common failure lands here.** |
| 4 | Shop drawings — round trips | 4–8 wks/round | Three rounds is normal, four is a signal, five means someone is changing the design |
| 5 | **Performance mock-up — visual, then AAMA-standard air/water/structural/seismic testing at an independent lab** | 12–20 wks | Fails the first test and nobody built a re-test allowance. **The single most common hard stop on a façade.** |
| 6 | Extrusion dies cut and approved | 6–12 wks | Dies are trade-specific tooling with their own lead time nobody schedules |
| 7 | Glass order — coating, IGU fabrication, tempering, laminating | 12–26 wks | Coating capacity is booked seasonally; a colour change restarts it |
| 8 | Anchor and embed coordination with the concrete/steel trade | | **Missed embeds are discovered after the pour and become a remediation, not an adjustment** |
| 9 | Field mock-up on the building | 4–6 wks | Slab-edge tolerance from the concrete trade fails the mock-up |
| 10 | Unit fabrication and assembly | continuous | Rate-limited by the extrusion and glass feed, not by labour |
| 11 | Shipping, staging, hoisting slot | | Crane and hoist time is shared; the façade loses to structure every time |
| 12 | Installation by elevation and floor | continuous | |
| 13 | **Field water testing — AAMA 501.2 spray** | | A failure here is a leak in a finished building |
| 14 | Punch, sealant warranty, closeout | | |

**Governing signal:** the **date the mock-up test is booked**, measured against the date glass must be ordered
to hold the schedule. Everything before installation is a lead-time chain; that one date is where the chain
either holds or is already broken.

**Slab-edge tolerance is a curtain wall risk that lives in the concrete trade.** The two profiles must be
linked — see §4 gate 9. No platform on the market connects them, because they are two different CSI divisions
with two different subcontractors and nobody owns the interface.

---

## 4. `03-CIP` Cast-in-Place Reinforced Concrete — `ENGINEERED_TESTED`

Ken is right that it is intense, and it is intense for a different reason: **concrete is the only trade whose
errors are literally buried.** Everything else can be opened up and corrected. A missed embed, a wrong bar
placement, an under-strength pour becomes a structural remediation with an engineer's stamp on it.

| # | Gate | What kills it |
|---|---|---|
| 1 | **Formwork system selection and cycle design** | The cycle (4-day, 3-day, 2-day floor) *is* the tower schedule. Nobody validates the assumed cycle against the crane, the crew and the shoring inventory before it goes in the baseline. |
| 2 | Formwork engineering and shoring/reshoring design, stamped | Reshoring inventory sized for the assumed cycle; a slower cycle means more shoring than exists on site |
| 3 | **Rebar detailing and shop drawings (ACI 315)**, plus placing drawings | Congestion at columns and transfer beams is discovered by the placer at 5am, not by the detailer |
| 4 | Mill certs, coupler and mechanical splice approvals | |
| 5 | **Mix designs, trial batches and 28-day trial cylinders** | Trial mixes take 28 days *before* the first pour. Approve the mix in week 40 and you have moved the schedule, not the paperwork. |
| 6 | Special inspections agency engaged and inspection plan approved | **Missing special-inspection reports block the CO and cannot be reconstructed after the work is covered** |
| 7 | **Embed, sleeve and blockout coordination — MEP, façade, elevator, hoist, tieback** | The interface gate. This is where the façade, the elevator and the MEP trades all reach into the concrete trade, and where a single missed item becomes a core drill through post-tensioning. |
| 8 | Post-tensioning shop drawings, stressing sequence, **stressing records** | Stressing records are the evidence a floor may be loaded. Missing records stop the trade above. |
| 9 | **Slab edge and column tolerance survey, floor by floor** | Feeds `08-CW` gate 9. Out-of-tolerance edge is discovered at façade mock-up, one year later. |
| 10 | Cold/hot weather protection plan, maturity method approval | A December pour with no approved protection plan is a test-failure waiting to happen |
| 11 | **Cylinder breaks — 7-day and 28-day, by pour** | The 28-day break is the gate on stripping and on loading. A low break is a structural investigation. |
| 12 | Stripping and reshoring release, floor by floor | |
| 13 | Repairs, patching, honeycomb remediation with engineer sign-off | |

**Governing signal:** **the floor cycle actually achieved versus the cycle the baseline assumed**, measured
from pour to pour. Not manpower — a concrete crew is always fully manned. **The cycle is the schedule.** One day
of slip per floor on a fifty-storey tower is fifty days, and it accumulates invisibly because each individual
floor looks close to plan.

**Second signal:** open embed and blockout coordination items ahead of the current pour floor. **Anything not
closed before the pour is permanent.**

---

## 5. The other trades that deserve a profile

| Trade | Class | Governing signal | The thing nobody watches |
|---|---|---|---|
| `14-ELEV` Vertical transportation | `ENGINEERED_TESTED` | Agency acceptance inspection booked date | Elevator is a certificate gate *and* the only permanent means of moving finish trades. Temporary-use permits and the switch to permanent power sit on the same path. Meridian was lost here. |
| `05-STL` Structural steel | `ENGINEERED` | Fabrication release vs. mill order date | Connection design delegated to the fabricator; approval cycle unscheduled |
| `26-SVC` Electrical service, switchgear, generators | `ENGINEERED_TESTED` | **Utility energization date held in writing** | The utility has no contract with the project and no schedule obligation to it. 40–60 week switchgear lead times. |
| `21/28-LS` Sprinkler, standpipe, fire alarm | `ENGINEERED_TESTED` | Acceptance-test date with the fire official | Building-wide certificate column — gates every floor. Tests are scheduled with an agency, not a subcontractor. |
| `31-SOE` Excavation support, underpinning, dewatering | `ENGINEERED_TESTED` | Monitoring threshold exceedances | Ties directly to aspects 07 and 09. **221 West 29th.** |
| `23-MEC` Central plant equipment | `ENGINEERED` | Equipment release vs. structural opening/rigging date | Rigged in through openings that close as the structure rises |
| `Commodity` Drywall, paint, flooring, tile | `COMMODITY` | Manpower vs. required | The original aspect 25 signal is correct here and only here |

---

## 6. Two rules that come out of this

**1. A trade's earliest gate opens long before its contract is bought out.** Curtain wall design assist belongs
in stage 4 Design Development; the mock-up test date is set in stage 5 Preconstruction; the men arrive in stage
6. **A trade-performance screen that starts at construction is already a year late.** Trade profiles activate at
`earliest_signal_stage`, not at mobilisation.

**2. Interface gates belong to both trades and are owned by neither.** Slab edge tolerance, embeds, blockouts,
rigging openings, hoist and crane slots — every one sits between two subcontractors and outside both scopes.
**Model them as their own object with a named owner, or they will keep being discovered late.** In practice the
owner's rep is the only party with an interest in closing them, which is exactly why ClaimZero should hold them.

---

## 7. Build note

This is not a new aspect and does not renumber anything. It is:

- a `trade_profiles` reference table (methodology data, like the control register)
- a `project_trades` join with the profile, the current gate, the governing-signal value, and days on the
  critical path
- a section primitive `trade_chain` for the Critical Path Report — the chain rendered as gates with dates,
  showing which gate is open and what it is waiting on
- an interface-gate object linking two trades and a named owner

Sequence it in **Tier 5 item 23** of the build order, after the Work Queue is real.
