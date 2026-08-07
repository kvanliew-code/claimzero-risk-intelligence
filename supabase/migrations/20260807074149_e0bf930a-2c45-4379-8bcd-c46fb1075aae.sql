DROP INDEX IF EXISTS public.review_items_dedupe_uidx;

CREATE UNIQUE INDEX review_items_dedupe_uidx
  ON public.review_items (project_id, control_id, COALESCE(rule_id, ''), COALESCE(cycle_key, ''));