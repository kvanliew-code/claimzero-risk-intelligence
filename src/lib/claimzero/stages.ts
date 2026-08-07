// ClaimZero — THE canonical lifecycle vocabulary.
//
// Nine stages, using the client-facing names from the website. The engine runs
// on these numbers directly: there is no phase->stage mapping layer, because a
// mapping layer is where the drift came from. If a screen, report or seed needs
// a stage name it imports it from here. Nothing else defines one.
//
// Stage 3 Schematic and stage 7 Takeout are the two stages added in the
// 7 -> 9 restructure. Takeout is one of only two moments an Owner can lose the
// asset outright, which is why it earns a stage of its own rather than living
// inside Sellout.

export const STAGES = [
  { number: 1, name: "Acquisition" },
  { number: 2, name: "Entitlement" },
  { number: 3, name: "Schematic" },
  { number: 4, name: "Design Development" },
  { number: 5, name: "Preconstruction" },
  { number: 6, name: "Construction" },
  { number: 7, name: "Takeout" },
  { number: 8, name: "Certificate of Occupancy" },
  { number: 9, name: "Sellout" },
] as const;

export type StageName = (typeof STAGES)[number]["name"];

/** Ordered stage labels — use for every selector, filter and legend. */
export const STAGE_OPTIONS = STAGES.map((s) => s.name) as readonly StageName[];

/** Ordered stage numbers 1..9. */
export const STAGE_NUMBERS = STAGES.map((s) => s.number);

const BY_NUMBER = new Map<number, StageName>(STAGES.map((s) => [s.number, s.name]));
const BY_NAME = new Map<string, number>(STAGES.map((s) => [s.name, s.number]));

/**
 * Pre-restructure labels, kept ONLY so historic rows and saved filters resolve.
 * Never render from this map — resolve to a number, then call stageName().
 */
const LEGACY_ALIASES: Record<string, number> = {
  "Pre-Acquisition": 1,
  "Acquisition Due Diligence": 1,
  "Site Plan and Entitlement Approval": 2,
  "Site Plan & Entitlement Approval": 2,
  Design: 4,
  "Design Development and Construction Documents": 4,
  "Preconstruction GMP and Buyout": 5,
  "Preconstruction, GMP & Buyout": 5,
  Closeout: 8,
  "Closeout TCO and Certificate of Occupancy": 8,
  "Closeout, TCO & CO": 8,
  "Sales Lease-Up Stabilization and Takeout": 9,
  "Sales, Lease-Up, Stabilisation & Takeout": 9,
};

/** Stage number -> canonical display name. */
export const stageName = (n: number): string => BY_NUMBER.get(n) ?? `Stage ${n}`;

/** Any stage label (current or legacy) -> stage number. Defaults to 1. */
export const stageNumberOf = (label: string | null | undefined): number => {
  if (!label) return 1;
  return BY_NAME.get(label) ?? LEGACY_ALIASES[label] ?? 1;
};

/** True when `label` is one of the nine. Used to catch drift in seeds. */
export const isCanonicalStage = (label: string): label is StageName => BY_NAME.has(label);
