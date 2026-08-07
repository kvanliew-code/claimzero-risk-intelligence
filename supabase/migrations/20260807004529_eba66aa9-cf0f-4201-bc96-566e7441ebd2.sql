CREATE OR REPLACE FUNCTION public.evaluate_predicate(profile jsonb, predicate jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE (predicate->>'op')
    WHEN '==' THEN CASE
      WHEN jsonb_typeof(COALESCE(profile->(predicate->>'field'), 'null'::jsonb)) = 'array' THEN
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(profile->(predicate->>'field')) AS sel
          WHERE sel = predicate->'values'->>0
        )
      ELSE profile->>(predicate->>'field') = predicate->'values'->>0
    END
    WHEN '!=' THEN CASE
      WHEN jsonb_typeof(COALESCE(profile->(predicate->>'field'), 'null'::jsonb)) = 'array' THEN
        NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(profile->(predicate->>'field')) AS sel
          WHERE sel = predicate->'values'->>0
        )
      ELSE profile->>(predicate->>'field') <> predicate->'values'->>0
    END
    WHEN '>=' THEN COALESCE((profile->>(predicate->>'field'))::numeric, 0) >= (predicate->'values'->>0)::numeric
    WHEN 'in' THEN profile->>(predicate->>'field') = ANY(ARRAY(SELECT jsonb_array_elements_text(predicate->'values')))
    WHEN 'includes' THEN EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(profile->(predicate->>'field'), '[]'::jsonb)) AS sel
      WHERE sel = ANY(ARRAY(SELECT jsonb_array_elements_text(predicate->'values')))
    )
    ELSE false
  END;
$$;