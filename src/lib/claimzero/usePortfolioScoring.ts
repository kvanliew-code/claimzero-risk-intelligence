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
  type ControlInstance,
  type ControlSpec,
  type ControlStatus,
} from "./controls";
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
  tier: "A" | "B" | "C";
  scores: AspectScore[];
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
 * yet, the same deterministic generator the Controls tab persists is applied
 * in memory, so the portfolio card and the control register never disagree.
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
      status: seededStatus(
        project.id,
        spec.control_id,
        spec.stage_number,
        stageNumber,
      ) as ControlStatus,
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
