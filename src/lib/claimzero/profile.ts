// ClaimZero — project profile field metadata.
// The 23 intake fields that drive the family applicability engine.
// Option sets mirror the values the server-side predicate evaluator matches on.

import { supabase } from "@/integrations/supabase/client";

export type FieldKind = "text" | "number" | "select" | "multiselect" | "boolean";

export interface ProfileField {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  help?: string;
  group: "Identity" | "Delivery & contract" | "Jurisdiction & site" | "Capital & disposition" | "Execution";
}

const opt = (...vals: string[]) =>
  vals.map((v) => ({
    value: v,
    label: v
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

export { STAGE_OPTIONS as STAGE_NAMES } from "./stages";


export const PROFILE_FIELDS: ProfileField[] = [
  { key: "name", label: "Project name", kind: "text", group: "Identity" },
  { key: "city", label: "City", kind: "text", group: "Identity" },
  { key: "state", label: "State", kind: "text", group: "Identity", help: "Two-letter code" },
  {
    key: "county_jurisdiction",
    label: "County / authority having jurisdiction",
    kind: "text",
    group: "Identity",
  },
  { key: "size_m", label: "Project value ($M)", kind: "number", group: "Identity" },
  {
    key: "stage",
    label: "Current lifecycle stage",
    kind: "select",
    group: "Identity",
    options: STAGE_NAMES.map((s) => ({ value: s, label: s })),
  },
  {
    key: "asset_class",
    label: "Asset class",
    kind: "multiselect",
    group: "Identity",
    help: "Multi-select. Applicable control families are unioned across every selection, never intersected.",
    options: opt(
      "CONDO",
      "RENTAL",
      "MIXED_USE",
      "OFFICE",
      "RETAIL",
      "HOSPITALITY",
      "HEALTHCARE",
      "INSTITUTIONAL",
      "INDUSTRIAL",
      "SENIOR",
      "STUDENT",
      "ADAPTIVE_REUSE",
      "FITOUT",
      "LAND",
    ),
  },
  {
    key: "delivery_model",
    label: "Delivery model",
    kind: "select",
    group: "Delivery & contract",
    options: opt(
      "CM_AT_RISK_GMP",
      "CM_AGENCY",
      "DESIGN_BID_BUILD",
      "DESIGN_BUILD",
      "FAST_TRACK_MULTI_PRIME",
      "IPD",
      "OWNER_BUILDER",
    ),
  },
  {
    key: "contract_form",
    label: "Contract form",
    kind: "select",
    group: "Delivery & contract",
    options: opt("AIA_A102", "AIA_A104", "AIA_A133", "AIA_A141", "CONSENSUSDOCS", "CUSTOM_OWNER_FORM"),
  },
  {
    key: "architect_agreement",
    label: "Architect agreement",
    kind: "select",
    group: "Delivery & contract",
    options: opt("AIA_B101", "AIA_B103", "AIA_B133", "CUSTOM_OWNER_FORM", "NONE"),
  },
  {
    key: "contract_value_band",
    label: "Contract value band",
    kind: "select",
    group: "Delivery & contract",
    help: "Seeds the engagement tier: under 25M → ESSENTIAL, 25M–100M → STANDARD, above 100M → COMPREHENSIVE.",
    options: opt("UNDER_25M", "25M_100M", "100M_500M", "OVER_500M"),
  },
  {
    key: "project_tier",
    label: "Engagement tier",
    kind: "select",
    group: "Delivery & contract",
    help: "Seeded from the value band. Override only with a recorded reason.",
    options: opt("ESSENTIAL", "STANDARD", "COMPREHENSIVE"),
  },
  {
    key: "hvhz",
    label: "High-velocity hurricane zone",
    kind: "boolean",
    group: "Jurisdiction & site",
  },
  {
    key: "threshold_building",
    label: "Threshold building",
    kind: "boolean",
    group: "Jurisdiction & site",
  },
  {
    key: "building_height_stories",
    label: "Height (stories)",
    kind: "number",
    group: "Jurisdiction & site",
  },
  {
    key: "below_grade_levels",
    label: "Below-grade levels",
    kind: "number",
    group: "Jurisdiction & site",
  },
  {
    key: "site_condition",
    label: "Site condition",
    kind: "select",
    group: "Jurisdiction & site",
    options: opt(
      "GREENFIELD",
      "INFILL_OCCUPIED",
      "OCCUPIED_RENOVATION",
      "DEMOLITION_REQUIRED",
      "BROWNFIELD_REMEDIATION",
    ),
  },
  {
    key: "entitlement_status",
    label: "Entitlement status",
    kind: "select",
    group: "Jurisdiction & site",
    options: opt(
      "AS_OF_RIGHT",
      "PERMITTED",
      "REZONING_REQUIRED",
      "VARIANCE_SPECIAL_EXCEPTION",
      "PUD_MASTER_PLAN",
    ),
  },
  {
    key: "historic_designation",
    label: "Historic designation",
    kind: "boolean",
    group: "Jurisdiction & site",
  },
  {
    key: "capital_structure",
    label: "Capital structure",
    kind: "multiselect",
    group: "Capital & disposition",
    help: "Multi-select. Unioned, never intersected.",
    options: opt(
      "CONSTRUCTION_LOAN",
      "JV_EQUITY",
      "PREFERRED_EQUITY",
      "MEZZANINE",
      "EB5",
      "C_PACE",
      "LIHTC",
      "HISTORIC_TAX_CREDIT",
      "BOND_FINANCED",
      "SELLER_FINANCING",
    ),
  },
  {
    key: "sales_structure",
    label: "Sales / disposition structure",
    kind: "select",
    group: "Capital & disposition",
    options: opt(
      "FOR_SALE_CONDO",
      "FOR_SALE_FEE_SIMPLE",
      "RENTAL_MARKET",
      "RENTAL_REGULATED",
      "HOLD_STABILIZE",
      "MERCHANT_BUILD_SELL",
      "BUILD_TO_SUIT",
    ),
  },
  { key: "public_funding", label: "Public funding", kind: "boolean", group: "Capital & disposition" },
  { key: "ground_lease", label: "Ground lease", kind: "boolean", group: "Capital & disposition" },
  {
    key: "schedule_software",
    label: "Schedule software",
    kind: "select",
    group: "Execution",
    options: opt("PRIMAVERA_P6", "MS_PROJECT", "ASTA_POWERPROJECT", "SMARTSHEET", "NONE"),
  },
  {
    key: "native_schedule_files_required",
    label: "Native schedule files required",
    kind: "boolean",
    group: "Execution",
  },
  {
    key: "labor_market",
    label: "Labor market",
    kind: "select",
    group: "Execution",
    options: opt("UNION", "OPEN_SHOP", "MIXED"),
  },
  {
    key: "occupancy_phasing",
    label: "Occupancy phasing",
    kind: "select",
    group: "Execution",
    options: opt("SINGLE_TCO", "PHASED_TCO_BY_FLOOR", "PHASED_BY_BUILDING", "OCCUPIED_THROUGHOUT"),
  },
];

export const FIELD_GROUPS = [
  "Identity",
  "Delivery & contract",
  "Jurisdiction & site",
  "Capital & disposition",
  "Execution",
] as const;

/** Engagement tier seeded from the contract value band. */
export function tierFromValueBand(band: string): "ESSENTIAL" | "STANDARD" | "COMPREHENSIVE" {
  if (band === "UNDER_25M") return "ESSENTIAL";
  if (band === "25M_100M") return "STANDARD";
  if (band === "100M_500M" || band === "OVER_500M") return "COMPREHENSIVE";
  return "ESSENTIAL";
}

export const STAGE_NUMBER: Record<string, number> = {
  "Pre-Acquisition": 1,
  Entitlement: 2,
  Design: 3,
  Preconstruction: 4,
  Construction: 5,
  Closeout: 6,
  Sellout: 7,
};

export type ProfileDraft = Record<string, string | number | boolean | string[]>;

export const EMPTY_DRAFT: ProfileDraft = {
  name: "",
  city: "",
  state: "",
  county_jurisdiction: "",
  size_m: 0,
  stage: "Pre-Acquisition",
  asset_class: [],
  delivery_model: "CM_AT_RISK_GMP",
  contract_form: "AIA_A133",
  architect_agreement: "AIA_B101",
  contract_value_band: "25M_100M",
  project_tier: "STANDARD",
  hvhz: false,
  threshold_building: false,
  building_height_stories: 0,
  below_grade_levels: 0,
  site_condition: "GREENFIELD",
  entitlement_status: "AS_OF_RIGHT",
  historic_designation: false,
  capital_structure: [],
  sales_structure: "RENTAL_MARKET",
  public_funding: false,
  ground_lease: false,
  schedule_software: "PRIMAVERA_P6",
  native_schedule_files_required: true,
  labor_market: "MIXED",
  occupancy_phasing: "SINGLE_TCO",
};

const PREDICATE_KEYS = [
  "asset_class",
  "delivery_model",
  "contract_form",
  "architect_agreement",
  "project_tier",
  "contract_value_band",
  "state",
  "county_jurisdiction",
  "hvhz",
  "threshold_building",
  "building_height_stories",
  "below_grade_levels",
  "site_condition",
  "entitlement_status",
  "capital_structure",
  "sales_structure",
  "schedule_software",
  "native_schedule_files_required",
  "labor_market",
  "occupancy_phasing",
  "public_funding",
  "historic_designation",
  "ground_lease",
];

/** Applicable / suppressed family counts for a draft profile, evaluated server-side. */
export async function previewApplicability(draft: ProfileDraft) {
  const profile: Record<string, unknown> = {};
  for (const k of PREDICATE_KEYS) profile[k] = draft[k];
  const { data, error } = await supabase.rpc("get_family_applicability_reasons", {
    profile: profile as never,
  });
  if (error) throw error;
  const rows = (data ?? []) as { family_code: string; applies: boolean; reason: string | null }[];
  return {
    applies: rows.filter((r) => r.applies).length,
    suppressed: rows.filter((r) => !r.applies),
    total: rows.length,
  };
}

/** Insert a project from an intake draft. Returns the new project id. */
export async function createProjectFromDraft(draft: ProfileDraft) {
  const { data: maxRow } = await supabase
    .from("projects")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const id = ((maxRow?.id as number | undefined) ?? -1) + 1;
  const stage = String(draft["stage"]);
  const assets = (draft["asset_class"] as string[]) ?? [];
  const row = {
    ...draft,
    id,
    type: assets[0]
      ? assets[0]
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Mixed-Use",
    current_stage: STAGE_NUMBER[stage] ?? 1,
    engagement_level: String(draft["project_tier"]),
  };

  const { error } = await supabase.from("projects").insert(row as never);
  if (error) throw error;
  return id;
}
