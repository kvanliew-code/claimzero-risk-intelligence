// Portfolio-wide scoring. One fetch of the register, the aspect library, the
// weight overrides and every stored control instance — then the ClaimZero
// Scoring Specification v1.0 is run per project. Portfolio, Daily Digest and
// Reports all read this, so one number means one thing everywhere.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRegister,
  seededStatus,
  stageNumberFor,
  tierFor,
  type ProjectTier,
  type ControlInstance,
  type ControlSpec,
  type ControlStatus,
} from "./controls";
import { isDemoProject } from "./demo";
import {
  composite,
  fetchAspects,
  fetchWeightOverrides,
  scoreAspects,
  type AspectDef,
  type AspectScore,
  type Composite,
} from "./scoring";
import type { Project } from "./data";

export interface ProjectRollup {
  project: Project;
  stageNumber: number;
  tier: ProjectTier;
  scores: AspectScore[];
  instances: Map<string, ControlInstance>;
  composite: Composite;
  /** The published index, or null when confidence is below 60 (§6). */
  index: number | null;
  /** Always available for sorting/ranking, even when it may not be published. */
  raw: number;
  worst: AspectScore[];
}

export interface PortfolioScoring {
  loading: boolean;
  error: string | null;
  register: ControlSpec[];
  aspects: AspectDef[];
  rollups: ProjectRollup[];
  byId: Map<number, ProjectRollup>;
}

/**
 * Instances stored in Lovable Cloud win. Where a project has not been opened
 * yet, the control is UNKNOWN — and unknown is not green.
 *
 * Defect D-16 (fixed 8 Aug 2026). This function used to fill every unstored
 * control with seededStatus() and no demo guard. That generator returns
 * COMPLETE_VERIFIED for roughly 30% of current-stage controls and ~90% of
 * controls two or more stages behind, so the Composite Project Risk Index on
 * the Portfolio page was computed partly from controls marked "verified" that
 * had no evidence, no verifier and no date. ensureInstances() in ./controls
 * persists the same controls as EVIDENCE_NOT_LOCATED, so the Portfolio page
 * and the Controls page reported different states for the same control — the
 * exact disagreement the old comment here claimed to prevent.
 *
 * This path now mirrors ensureInstances() exactly: seeded history only for the
 * scripted demo project, EVIDENCE_NOT_LOCATED for every real one. A real
 * project with nothing loaded reads INSUFFICIENT confidence, which is true.
 */
function instanceMapFor(
  project: Project,
  register: ControlSpec[],
  stored: Map<string, ControlInstance>,
  stageNumber: number,
): Map<string, ControlInstance> {
  const out = new Map<string, ControlInstance>();
  for (const spec of register) {
    if (spec.stage_number > stageNumber) continue;
    const s = stored.get(spec.control_id);
    if (s) {
      out.set(spec.control_id, s);
      continue;
    }
    out.set(spec.control_id, {
      id: `virtual:${project.id}:${spec.control_id}`,
      project_id: project.id,
      control_id: spec.control_id,
      // Doctrine: unknown is not green. Only the scripted demo project carries
      // a synthetic history; every real project starts genuinely unlocated.
      status: (isDemoProject(project.id)
        ? seededStatus(project.id, spec.control_id, spec.stage_number, stageNumber)
        : "EVIDENCE_NOT_LOCATED") as ControlStatus,
      evidence_ref: "",
      verified_by: "",
      verified_date: null,
      notes: "",
    } as unknown as ControlInstance);
  }
  return out;
}

export function usePortfolioScoring(projects: Project[]): PortfolioScoring {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    register: ControlSpec[];
    aspects: AspectDef[];
    overrides: Record<string, number>;
    stored: Map<number, Map<string, ControlInstance>>;
  }>({
    loading: true,
    error: null,
    register: [],
    aspects: [],
    overrides: {},
    stored: new Map(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [register, aspects, overrides, instances] = await Promise.all([
          fetchRegister(),
          fetchAspects(),
          fetchWeightOverrides(),
          supabase.from("project_controls").select("*"),
        ]);
        if (instances.error) throw instances.error;
        const stored = new Map<number, Map<string, ControlInstance>>();
        for (const row of (instances.data ?? []) as unknown as ControlInstance[]) {
          const m = stored.get(row.project_id) ?? new Map<string, ControlInstance>();
          m.set(row.control_id, row);
          stored.set(row.project_id, m);
        }
        if (cancelled) return;
        setState({ loading: false, error: null, register, aspects, overrides, stored });
      } catch (e) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "Unable to score the portfolio",
          }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rollups = useMemo(() => {
    if (!state.register.length || !state.aspects.length) return [];
    return projects.map((project) => {
      const stageNumber = stageNumberFor(project);
      const tier = tierFor(project);
      const instances = instanceMapFor(
        project,
        state.register,
        state.stored.get(project.id) ?? new Map(),
        stageNumber,
      );
      const scores = scoreAspects(state.aspects, state.register, instances, stageNumber, tier);
      const comp = composite(scores, stageNumber, state.overrides);
      const worst = scores
        .filter((s) => s.score !== null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      return {
        project,
        stageNumber,
        tier,
        scores,
        instances,
        composite: comp,
        index: comp.index,
        raw: comp.raw,
        worst,
      } satisfies ProjectRollup;
    });
  }, [projects, state.register, state.aspects, state.overrides, state.stored]);

  const byId = useMemo(() => new Map(rollups.map((r) => [r.project.id, r])), [rollups]);

  return {
    loading: state.loading,
    error: state.error,
    register: state.register,
    aspects: state.aspects,
    rollups,
    byId,
  };
}
