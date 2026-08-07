-- ============================================================
-- ClaimZero: 7 -> 9 lifecycle stage restructure
-- Renumber DESCENDING to avoid collisions, then insert new 3 & 7.
-- Map: 7->9, 6->8, 5->6, 4->5, 3->4, 2->2, 1->1
-- ============================================================

-- Canonical remap function (single-shot, no sequential double-mapping)
CREATE OR REPLACE FUNCTION public.cz_remap_stage(n integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE n
    WHEN 7 THEN 9
    WHEN 6 THEN 8
    WHEN 5 THEN 6
    WHEN 4 THEN 5
    WHEN 3 THEN 4
    ELSE n
  END;
$$;

CREATE OR REPLACE FUNCTION public.cz_stage_name(n integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE n
    WHEN 1 THEN 'Acquisition'
    WHEN 2 THEN 'Entitlement'
    WHEN 3 THEN 'Schematic'
    WHEN 4 THEN 'Design Development'
    WHEN 5 THEN 'Preconstruction'
    WHEN 6 THEN 'Construction'
    WHEN 7 THEN 'Takeout'
    WHEN 8 THEN 'Certificate of Occupancy'
    WHEN 9 THEN 'Sellout'
    ELSE 'Stage ' || n::text
  END;
$$;

-- ---------- lifecycle_stages (PK on stage_number: descending order) ----------
UPDATE public.lifecycle_stages SET stage_number = 9 WHERE stage_number = 7;
UPDATE public.lifecycle_stages SET stage_number = 8 WHERE stage_number = 6;
UPDATE public.lifecycle_stages SET stage_number = 6 WHERE stage_number = 5;
UPDATE public.lifecycle_stages SET stage_number = 5 WHERE stage_number = 4;
UPDATE public.lifecycle_stages SET stage_number = 4 WHERE stage_number = 3;

-- Insert the two NEW stages, seeding weights/criteria from their nearest neighbour
INSERT INTO public.lifecycle_stages (stage_number, stage_name, domain_weights, exit_criteria)
SELECT 3, 'Schematic', domain_weights, '[]'::jsonb
FROM public.lifecycle_stages WHERE stage_number = 4
ON CONFLICT (stage_number) DO NOTHING;

INSERT INTO public.lifecycle_stages (stage_number, stage_name, domain_weights, exit_criteria)
SELECT 7, 'Takeout', domain_weights, '[]'::jsonb
FROM public.lifecycle_stages WHERE stage_number = 9
ON CONFLICT (stage_number) DO NOTHING;

UPDATE public.lifecycle_stages SET stage_name = public.cz_stage_name(stage_number);

-- ---------- control_register ----------
UPDATE public.control_register SET stage_number = public.cz_remap_stage(stage_number);
UPDATE public.control_register SET stage_name = public.cz_stage_name(stage_number);

-- ---------- stage_exit_criteria ----------
UPDATE public.stage_exit_criteria SET stage_number = public.cz_remap_stage(stage_number);
UPDATE public.stage_exit_criteria SET stage_name = public.cz_stage_name(stage_number);

-- ---------- aspect_weight_overrides ----------
UPDATE public.aspect_weight_overrides SET stage_number = public.cz_remap_stage(stage_number);

-- ---------- escalation_rules.stages (int[]) ----------
UPDATE public.escalation_rules
SET stages = COALESCE(
  (SELECT array_agg(public.cz_remap_stage(e) ORDER BY public.cz_remap_stage(e))
   FROM unnest(stages) AS e),
  '{}'::integer[]
)
WHERE stages IS NOT NULL AND array_length(stages, 1) > 0;

-- ---------- projects.current_stage ----------
UPDATE public.projects SET current_stage = public.cz_remap_stage(current_stage);

DROP FUNCTION public.cz_remap_stage(integer);