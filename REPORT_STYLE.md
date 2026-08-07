# ClaimZero — Report Style

Binding rules for every report the platform issues. A report that breaks one of
these is a defect, not a stylistic difference.

---

## Rule 1 — NO FINDING WITHOUT A REMEDY

**Every failing or at-risk line in every report carries the specific work that
raises it, with a named responsible seat, a cost and a required-by date.**

A mark without a remedy is a complaint, not intelligence. Owners do not pay us
to be told the score; they pay us to be told what to do about it before it
becomes a claim.

A remedy has exactly four parts and all four are mandatory:

| Part | Requirement |
| --- | --- |
| `work` | The specific work that closes the item. Never "monitor", "review", "consider" or "track". |
| `seat` | A named responsible seat. Never a company, never a department, never blank. |
| `cost` | What the remedy costs, or an explicit withholding. |
| `requiredBy` | A date, or the gate the work must precede. |

This is enforced in the type system, not by convention:
`ReportSection` of type `finding_list` requires `remedy: Remedy` on every item,
and the `transcript` section requires a remedy on every subject below the pass
mark. A generator that omits one does not compile.

### Withholding rather than estimating

`cost` and `requiredBy` may be withheld when the underlying facts have not been
captured — never estimated. The withholding is itself a finding and belongs in
`unresolvedInputs`. "Not yet quoted — obtain a figure from the responsible
seat" is an acceptable cost. An invented number is not.

### Unnamed seats

Where a control carries no responsible seat, the remedy renders
`— NO NAMED SEAT — assign before this report is issued` and the report records
an unresolved input. A plan cannot be enforced against an unnamed party.

### Retroactive application

This rule applies to every generator already shipped, not only to new ones:

- Risk Mitigation Plan — escalation triggers now carry the work that clears them.
- Time & Money — every open critical control carries its closing work.
- Stage Gate — every irreversible open item carries its remedy before the gate
  decision block.
- Development Control Report Card — every subject below the pass mark.
- Weekly Development Intelligence and Due Diligence & Feasibility inherit the
  rule through the shared `finding_list` primitive; they cannot be implemented
  without it.

---

## Rule 2 — Nine stages, one vocabulary

Reports use the canonical lifecycle names and nothing else:

1. Acquisition
2. Entitlement
3. Schematic
4. Design Development
5. Preconstruction
6. Construction
7. Takeout
8. Certificate of Occupancy
9. Sellout

There is no mapping layer. `src/lib/claimzero/stages.ts` is the single source
of truth. No report header, stage selector, filter or table may display a stage
name that is not one of those nine.

---

## Rule 3 — Grades run the other way, on purpose

The Development Control Report Card marks each aspect at **100 minus the aspect
risk score**, so **high is good**. This is the deliberate inverse of the risk
index shown elsewhere in the platform. The two never disagree — they are the
same number read from opposite ends — but an Owner reads a grade intuitively
and a risk index they do not.

- Credits are proportional to applicable control mass at the current stage.
- A subject with no applicable control at the current stage is **N/A and
  excluded** from the term grade. It is never counted as passing.
- Red, amber and green appear **alongside** the letter and the percentage,
  never instead of them.

---

## Rule 4 — Nothing is estimated

Every figure comes from the record. Where an input has not been captured, the
report prints an explicit withholding and lists the missing input. A withheld
figure is never rendered as zero.
