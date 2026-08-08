// ClaimZero — portfolio data. Project records are read from public.projects;
// the illustrative aspect/detail content below is concept data only.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


export type StatusName = "Critical" | "Serious" | "Watch" | "Stable";

export const STATUS: Record<StatusName, { varName: string; icon: string }> = {
  Critical: { varName: "var(--cz-critical)", icon: "▲" },
  Serious: { varName: "var(--cz-serious)", icon: "◆" },
  Watch: { varName: "var(--cz-warn)", icon: "●" },
  Stable: { varName: "var(--cz-good)", icon: "✓" },
};

export const statusOf = (s: number): StatusName =>
  s >= 80 ? "Critical" : s >= 65 ? "Serious" : s >= 45 ? "Watch" : "Stable";

function makeRnd(start: number) {
  let seed = start;
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}



// Re-exported so existing consumers keep working; the nine stages are defined
// once, in ./stages.
export { STAGE_OPTIONS } from "./stages";





export interface Project {
  id: number;
  name: string;
  city: string;
  type: string;
  stage: string;
  sizeM: number;
  idx: number;
  trend: number[];
  exposure: number;
  topRisk: string;
  topAspect: string;
  delta: number;
}

/**
 * Projects are read from public.projects — the table is the source of truth and
 * the FK target for project_controls / project_assignments. `projects` is a live
 * array reference that is filled in place by loadProjects(), so existing
 * synchronous consumers keep working once the list has been hydrated.
 */
export const projects: Project[] = [];

/** Deterministic 8-point trend derived from the stored index (charts only). */
function trendFor(id: number, idx: number): number[] {
  const r = makeRnd(1000 + id * 7919);
  return Array.from({ length: 8 }, (_, k) =>
    Math.round(Math.max(5, Math.min(98, idx + (r() - 0.55) * 26 - k * 1.5))),
  ).reverse();
}

type ProjectRow = {
  id: number;
  name: string;
  city: string;
  type: string;
  stage: string;
  size_m: number | string;
  idx: number;
  exposure: number | string;
  top_risk: string;
  top_aspect: string;
};

export function toProject(row: ProjectRow): Project {
  const trend = trendFor(row.id, row.idx);
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    type: row.type,
    stage: row.stage,
    sizeM: Number(row.size_m),
    idx: row.idx,
    trend,
    exposure: Number(row.exposure),
    topRisk: row.top_risk,
    topAspect: row.top_aspect,
    delta: Math.round((trend[7] as number) - (trend[4] as number)),
  };
}

let projectsPromise: Promise<Project[]> | null = null;

/** Load (once) the portfolio from the database and hydrate `projects` in place. */
export function loadProjects(): Promise<Project[]> {
  if (!projectsPromise) {
    projectsPromise = (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,city,type,stage,size_m,idx,exposure,top_risk,top_aspect")
        .order("id");
      if (error) {
        projectsPromise = null;
        throw error;
      }
      const rows = (data ?? []).map((r) => toProject(r as ProjectRow));
      projects.length = 0;
      projects.push(...rows);
      return projects;
    })();
  }
  return projectsPromise;
}


/** React hook: the hydrated portfolio. */
export function useProjects(): Project[] {
  const { data } = useQuery({
    queryKey: ["cz-projects"],
    queryFn: loadProjects,
    staleTime: 5 * 60_000,
  });
  return data ?? projects;
}


/**
 * Defect D-18, removed 8 Aug 2026.
 *
 * A twelve-aspect `ASPECTS` array and an `aspectsFor()` accessor lived here. Each
 * entry carried invented dollar values and — worse — invented source citations
 * ("Loan Admin Statement, Jul 2026 · Draw #22", "Bank Requisition #22 vs. Schedule
 * Update 2026-07-27"). `aspectsFor()` applied a seeded LCG jitter per project id, so
 * the same fabricated finding scored differently on every project.
 *
 * Its only consumer, /project/$id/reports, now reads real thirty-aspect scores from
 * the database via `useProjectScoring`. Deleted rather than deprecated: a fabricated
 * citation left in the tree is a fabricated citation waiting to be re-imported.
 *
 * Thirty aspects live in `public.aspects` and are read through `fetchAspects()`.
 */
export type CockpitRow = [string, string, string, boolean?];
export interface CockpitSection {
  h: string;
  rows?: CockpitRow[];
  note?: string;
}
export interface Cockpit {
  title: string;
  sub: string;
  sections: CockpitSection[];
}

export const COCKPITS: Record<number, Cockpit> = {
  5: {
    title: "Design & Shop Drawings — Cockpit",
    sub: "The submittal loop, followed daily. Alert fires on 3 days of reviewer inactivity or any rejection touching the critical path.",
    sections: [
      {
        h: "Daily-followed thread · CW-118 Curtain Wall (critical path)",
        rows: [
          ["Mar 02 — Rev 0 submitted", "façade sub → architect", "18-day review"],
          ["Mar 20 — Rejected: revise & resubmit", "architect", "thermal detail"],
          ["Apr 14 — Rev 1 resubmitted", "façade sub", "—"],
          ["May 06 — Rejected (2nd)", "architect", "corner-unit glazing"],
          ["Jun 01 — Rev 2: approved as noted, except corners", "architect", "partial release"],
          ["Jul 09 — Rev 3 rejected: thermal break detail", "architect", "⚑ escalated"],
          ["Jul 29 — Rev 4 in review", "architect", "day 7 of 10 — watched daily", true],
        ],
      },
      {
        h: "Also on daily watch in this aspect",
        rows: [
          ["Submittal aging deltas (all logs)", "auto, 6h pull", "2 crossed 10-day line today"],
          ["Drawing log & addenda changes", "auto", "ASI-41 issued yesterday"],
          ["BIM / coordination clash report", "weekly + on-event", "12 open, 3 new"],
        ],
      },
      {
        h: "Passive seat scorecards (from the record — nobody asked anyone anything)",
        rows: [
          ["Architect — review cycle 19d vs 10 contract", "score", "62 / 100"],
          ["Façade consultant — resubmittal driver", "score", "55 / 100"],
          ["CM — expediting & log hygiene", "score", "71 / 100"],
        ],
      },
    ],
  },
  4: {
    title: "Schedule / Critical Path — Cockpit",
    sub: "Critical-path items monitored daily against the live schedule. Monthly updates are history; this is telemetry.",
    sections: [
      {
        h: "Daily critical-path watch",
        rows: [
          ["Curtain wall install rate, L61–70", "plan 6.0 units/day", "actual 4.2 — ⚑ alerting", true],
          ["Hoist removal → lobby finishes sequence", "float", "−12 days — ⚑ alerting", true],
          ["ConEd energization vs TCO need date", "need Oct 20", "scheduled Oct 28 — ⚑"],
          ["Elevator agency inspection slot", "need Sep 30", "not yet booked — ⚑"],
          ["Lobby stone delivery (long-lead)", "ETA Sep 04", "on track"],
          ["Roofing completion (dry-in gate)", "baseline Aug 22", "Aug 25 forecast"],
          ["Top of house — elevator machine room", "gates car acceptance & TCO", "MEP rough-in 84%"],
          [
            "Turnover package: lobby + floors 1–10 + life-safety",
            "the “open the building” gate",
            "tracking Oct TCO #1",
          ],
        ],
      },
      {
        h: "Verification channels",
        rows: [
          [
            "Site video walk (OpenSpace) — progress delta vs schedule",
            "daily",
            "L63 framing verified 6h ago",
          ],
          [
            "Turnstile manpower vs CM daily report",
            "daily",
            "212 verified vs 226 reported — ⚑ variance",
          ],
          [
            "Percent-complete reconciliation (billed vs verified)",
            "per requisition",
            "−3.1% on L58–63",
          ],
        ],
      },
    ],
  },
  8: {
    title: "NYC Agencies & City Process — Cockpit",
    sub: "Every agency that can stop this building, polled continuously — from the violations that existed at closing to the CO that stabilizes the investment.",
    sections: [
      {
        h: "Violations register — path to TCO / CO",
        rows: [
          ["Open at project start (inherited with the building)", "7", "6 cleared · 1 remains"],
          ["New since start", "3", "1 Class 2 open — ⚑ blocks CO", true],
          ["Cleared to date", "9 of 10", "last: ECB dismissed Jul 22"],
          ["CO-blocking items outstanding", "2", "violation + elevator sign-off"],
        ],
      },
      {
        h: "Agency watch (polled daily)",
        rows: [
          ["DOB — objections, filings, permits", "1 objection", "21 days unanswered — ⚑"],
          ["DOT — sidewalk closure & crane permits", "renewal", "expires Sep 12"],
          ["MTA — adjacent-structure monitoring", "monthly reports", "current"],
          ["Parks / street trees — protection compliance", "shed near trees", "inspection passed Jul 18"],
          ["FDNY — standpipe / alarm sign-offs", "2 pending", "scheduled Aug 14"],
          ["DEP / ConEd — connections & energization", "energization", "need-date watch — see Schedule"],
        ],
      },
      {
        h: "Why this matters",
        note: "The certificate of occupancy is the gate to stabilization, takeout, and the returns the developer originally underwrote. Every item above is tracked backwards from CO — nothing gets discovered in the last month.",
      },
    ],
  },
};

export const DAILY30: { g: string; items: [string, string, string][] }[] = [
  {
    g: "THE BUILD PATH — foundation → superstructure → curtain wall → elevators → MEP startup → open the building",
    items: [
      ["Critical-path float & sequence health", "schedule delta vs baseline", "⚑"],
      ["Superstructure cycle rate", "floors poured/topped vs planned cycle", ""],
      ["Enclosure / dry-in progress", "roof + façade weather-tight — gates finishes", ""],
      ["Curtain wall thread", "shop drawings → fab release → install rate/day", "⚑"],
      ["Elevator path", "fab · install · agency inspection booking", "⚑"],
      [
        "MEP startup & commissioning readiness",
        "equipment set · permanent power · startup tests",
        "",
      ],
      [
        "Phased turnover / TCO sequence",
        "top of house (elevator machine room) · lobby · first 10 floors · life-safety live → then floor-by-floor turnovers",
        "",
      ],
      [
        "Long-lead deliveries vs need dates",
        "steel · glass · switchgear · generators · elevators",
        "",
      ],
    ],
  },
  {
    g: "THE PAPER TRAIL — where disputes are born",
    items: [
      ["Critical-path RFIs & ball-in-court aging", "who is holding it, for how long", ""],
      ["Submittal aging & rejections", "the loop that stalls fabrication", ""],
      ["Drawings, ASIs & coordination clashes", "scope-of-record movement", ""],
      ["Change-event pipeline & unsigned-work exposure", "dollars forming; work without paper", ""],
      ["Owner decision queue aging", "the honest mirror — when the owner is the delay", ""],
      [
        "Notice & claim language scan",
        "reservation-of-rights · delay notices · acceleration",
        "⚑",
      ],
    ],
  },
  {
    g: "GROUND TRUTH — is the record telling the truth",
    items: [
      ["Daily log completeness & reported manpower", "by trade, from the CM record", ""],
      ["Verified manpower", "turnstile / access-control vs daily report", "⚑"],
      ["Site-video work-in-place verification", "camera & walk data vs schedule and billing", ""],
      ["Inspection results & re-tests", "incl. special inspections; repeat offenders", ""],
      ["Safety", "incidents · near-misses · stop-works", ""],
    ],
  },
  {
    g: "THE MONEY — what the owner alone sees",
    items: [
      ["Daily interest carry & reserve runway", "vs forecast TCO", ""],
      ["The pencil walk", "scheduled vs billed vs verified, as the req builds", ""],
      ["Contingency burn vs percent complete", "burn rate vs progress", ""],
      ["Projected cost-at-completion movement", "anticipated cost report deltas", ""],
      ["Covenant calendar & conditions to next draw", "tests, deadlines, conditions", ""],
      ["Sub / vendor financial health", "payment stress — lien risk before the lien", ""],
    ],
  },
  {
    g: "THE CITY & THE EXIT — tracked backwards from the CO",
    items: [
      [
        "DOB poll",
        "violations register (inherited · new · cleared · CO-blocking), objections, permits",
        "⚑",
      ],
      ["DOT / MTA / FDNY / DEP / Parks", "permits, expirations, monitoring compliance", ""],
      ["Utility energization path", "vs TCO need dates", ""],
      ["Compliance paper", "COIs · bonds · insurance expirations · lien/docket poll", ""],
      ["Sales & deposits", "contracts · deposits · rescissions vs pro forma pace", ""],
    ],
  },
];
