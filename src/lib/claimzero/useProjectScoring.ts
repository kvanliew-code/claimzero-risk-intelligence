// Loads the register, the project's control instances and the aspect library,
// then runs the ClaimZero Scoring Specification v1.0 over them. Every screen
// that shows a number reads it from here — nothing is hand-entered.

import { useEffect, useState } from "react";
import {
  ensureInstances,
  fetchFamilyApplicability,
  fetchRegister,
  stageNumberFor,
  tierFor,
  type ProjectTier,
  type ControlInstance,
  type ControlSpec,
  type FamilyApplicability,
} from "./controls";
import {
  composite,
  evaluateStageGate,
  fetchAspects,
  fetchExitCriteria,
  fetchWeightOverrides,
  scoreAspects,
  type AspectDef,
  type AspectScore,
  type Composite,
  type ExitCriterion,
  type SpecStageGate,
} from "./scoring";
import type { Project } from "./data";
import { supabase } from "@/integrations/supabase/client";

/** True only when a frozen Stage Gate snapshot exists for this project. */
async function stageSnapshotExists(projectId: number): Promise<boolean> {
  const { data: def } = await supabase
    .from("report_definitions")
    .select("id")
    .eq("key", "STAGE_GATE")
    .maybeSingle();
  if (!def) return false;
  const { count } = await supabase
    .from("report_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("report_id", (def as { id: string }).id);
  return (count ?? 0) > 0;
}

export interface ProjectScoring {
  loading: boolean;
  error: string | null;
  register: ControlSpec[];
  instances: ControlInstance[];
  instanceMap: Map<string, ControlInstance>;
  aspects: AspectDef[];
  scores: AspectScore[];
  composite: Composite | null;
  gate: SpecStageGate | null;
  exitCriteria: ExitCriterion[];
  familyApplicability: FamilyApplicability;
  stageNumber: number;
  tier: ProjectTier;
}

export function useProjectScoring(project: Project): ProjectScoring {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    register: ControlSpec[];
    instances: ControlInstance[];
    aspects: AspectDef[];
    exitCriteria: ExitCriterion[];
    overrides: Record<string, number>;
    familyApplicability: FamilyApplicability;
  }>({
    loading: true,
    error: null,
    register: [],
    instances: [],
    aspects: [],
    exitCriteria: [],
    overrides: {},
    familyApplicability: new Map(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [register, aspects, exitCriteria, overrides, familyApplicability] =
          await Promise.all([
            fetchRegister(),
            fetchAspects(),
            fetchExitCriteria(),
            fetchWeightOverrides(),
            fetchFamilyApplicability(project.id).catch(
              () => new Map() as FamilyApplicability,
            ),
          ]);
        const instances = await ensureInstances(project, register);
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          register,
          instances,
          aspects,
          exitCriteria,
          overrides,
          familyApplicability,
        });
      } catch (e) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "Unable to score this project",
          }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project]);

  const stageNumber = stageNumberFor(project);
  const tier = tierFor(project);
  const instanceMap = new Map(state.instances.map((i) => [i.control_id, i]));
  const scores = state.aspects.length
    ? scoreAspects(
        state.aspects,
        state.register,
        instanceMap,
        stageNumber,
        tier,
        undefined,
        state.familyApplicability,
      )
    : [];
  const comp = scores.length ? composite(scores, stageNumber, state.overrides) : null;
  const gate = state.register.length
    ? evaluateStageGate(
        stageNumber,
        state.register,
        instanceMap,
        state.exitCriteria,
        tier,
        scores,
        undefined,
        state.familyApplicability,
      )
    : null;

  return {
    loading: state.loading,
    error: state.error,
    register: state.register,
    instances: state.instances,
    instanceMap,
    aspects: state.aspects,
    scores,
    composite: comp,
    gate,
    exitCriteria: state.exitCriteria,
    familyApplicability: state.familyApplicability,
    stageNumber,
    tier,
  };
}
