// ClaimZero — the thirty-aspect taxonomy, as constants.
//
// Source: CLAIMZERO_OPERATING_BRIEF.md §2 (names, numbers, sequencing) and §2.1
// (the six streams). Verified line-by-line against `public.aspects` on
// 8 Aug 2026 — ids, names, streams and `first_active_stage` match the table, so
// this file is a compile-time mirror of the authoritative source, not a second
// source of truth. Scoring continues to read `public.aspects` at runtime
// (`fetchAspects()` in ./scoring.ts); these constants exist for the REQ-006
// migration, for tests, and for surfaces that need the taxonomy without a
// round-trip.
//
// Sequenced by WHEN each aspect first goes live in the lifecycle, not by
// importance. An aspect with no applicable control at the current stage reads
// NOT YET APPLICABLE — never green.
//
// NOT INCLUDED: a mapping to "the website's four report-card categories."
// Those four categories do not exist anywhere in this repository — the report
// card (`reportCardGenerator`, src/lib/claimzero/reports.ts) grades one subject
// per aspect and groups by nothing else. Naming four categories here would be a
// guess, and §14.4 forbids that. Blocker logged in docs/SCHEMA_REQUESTS.md.

export const ASPECT_STREAMS = [
  "Land & Entitlement",
  "Authority & Neighbours",
  "Design & Contract",
  "Cost & Capital",
  "Procurement & Time",
  "Delivery System",
] as const;

export type AspectStream = (typeof ASPECT_STREAMS)[number];

export interface AspectConstant {
  /** 1–30, the canonical aspect number. */
  number: number;
  /** `A01` … `A30` — the id used by the register and by public.aspects. */
  aspect_id: string;
  aspect_name: string;
  stream: AspectStream;
  /** Earliest lifecycle stage (1–9) at which the aspect can carry a control. */
  first_active_stage: number;
  /** Aspect id under the fifteen-aspect model, where one existed. */
  legacy_aspect_id: string | null;
}

const a = (
  number: number,
  aspect_name: string,
  stream: AspectStream,
  first_active_stage: number,
  legacy_aspect_id: string | null,
): AspectConstant => ({
  number,
  aspect_id: `A${String(number).padStart(2, "0")}`,
  aspect_name,
  stream,
  first_active_stage,
  legacy_aspect_id,
});

export const ASPECTS_30: AspectConstant[] = [
  a(1, "Concept & Highest and Best Use", "Land & Entitlement", 1, null),
  a(2, "Site Control & Deal Structure", "Land & Entitlement", 1, null),
  a(3, "Entitlement & Development Rights", "Land & Entitlement", 2, "A01"),
  a(4, "Site, Ground & Environmental", "Land & Entitlement", 1, "A03"),
  a(5, "Utilities, Access & Offsite", "Land & Entitlement", 2, "A04"),
  a(6, "Local Authority & Jurisdictional Clearance", "Authority & Neighbours", 2, "A02"),
  a(7, "Adjacent Property & License Agreements", "Authority & Neighbours", 4, null),
  a(8, "Site Logistics & Public Way", "Authority & Neighbours", 5, null),
  a(9, "Monitoring, Vibration & Protection", "Authority & Neighbours", 6, null),
  a(10, "Certificate of Occupancy Readiness", "Authority & Neighbours", 6, null),
  a(11, "Program Integrity & Owner Decision Control", "Design & Contract", 3, "A05"),
  a(12, "Professional Team Procurement & Coverage", "Design & Contract", 2, null),
  a(13, "Design Coordination & Documentation", "Design & Contract", 3, "A06"),
  a(14, "Contract Structure, Scope & Counterparty", "Design & Contract", 4, "A07"),
  a(15, "Quality, Commissioning & Systems Verification", "Design & Contract", 6, "A13"),
  a(16, "Cost Position & Contingency", "Cost & Capital", 1, "A08"),
  a(17, "Anticipated Cost & Change Genealogy", "Cost & Capital", 5, null),
  a(18, "Capital Structure & Sponsor Solvency", "Cost & Capital", 1, "A11"),
  a(19, "Lender & Capital Partner Relations", "Cost & Capital", 2, null),
  a(20, "Payment, Draw & Cash Movement", "Cost & Capital", 6, "A12"),
  a(21, "Procurement, Buyout & Long Lead", "Procurement & Time", 5, "A09"),
  a(22, "Owner-Furnished Scope & FF&E", "Procurement & Time", 5, null),
  a(23, "Supply Chain, Tariff & Trade Policy", "Procurement & Time", 5, null),
  a(24, "Schedule Integrity & Critical Path", "Procurement & Time", 4, "A10"),
  a(25, "Trade Performance on Critical Path", "Procurement & Time", 6, null),
  a(26, "Communication Integrity", "Delivery System", 1, null),
  a(27, "Team Capacity & Continuity", "Delivery System", 1, null),
  a(28, "Field Reporting & Source-System Health", "Delivery System", 6, null),
  a(29, "Safety, Insurance & Dispute Exposure", "Delivery System", 6, "A14"),
  a(30, "Demand, Absorption & Sales Execution", "Delivery System", 1, "A15"),
];

export const ASPECT_BY_ID: Record<string, AspectConstant> = Object.fromEntries(
  ASPECTS_30.map((x) => [x.aspect_id, x]),
);

/** Aspects belonging to a stream, in canonical order. */
export const aspectsInStream = (stream: AspectStream): AspectConstant[] =>
  ASPECTS_30.filter((x) => x.stream === stream);

/**
 * Delivery System Health — the organisational sub-index (§2.1). 29 and 30
 * measure exposure and outcome, not the organisation, so they are excluded
 * from the sub-index while remaining in the Delivery System stream.
 */
export const DELIVERY_SYSTEM_HEALTH_ASPECTS = ["A26", "A27", "A28"] as const;

/**
 * Fifteen-aspect id → thirty-aspect id, for the REQ-006 migration and for any
 * stored artefact that still carries a legacy id. Aspects with no legacy
 * predecessor (the sixteen new ones) are absent by design.
 */
export const LEGACY_ASPECT_MAP: Record<string, string> = Object.fromEntries(
  ASPECTS_30.filter((x) => x.legacy_aspect_id).map((x) => [
    x.legacy_aspect_id as string,
    x.aspect_id,
  ]),
);
