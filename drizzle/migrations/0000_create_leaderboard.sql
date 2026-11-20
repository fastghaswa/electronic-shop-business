CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  earnings BIGINT NOT NULL DEFAULT 0,
  products_sold INTEGER NOT NULL DEFAULT 0,
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT (id, name, level, earnings, products_sold, updated_at) ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is public"
ON public.leaderboard FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX leaderboard_earnings_idx ON public.leaderboard (earnings DESC);

CREATE OR REPLACE FUNCTION public.submit_score(
  p_id UUID, p_secret TEXT, p_name TEXT, p_level INTEGER, p_earnings BIGINT, p_sold INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
  v_existing TEXT;
  v_name TEXT;
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 16 THEN RETURN FALSE; END IF;
  v_name := left(trim(coalesce(p_name, '')), 24);
  IF v_name = '' THEN v_name := 'Shopkeeper'; END IF;
  IF p_level < 1 OR p_level > 500 OR p_earnings < 0 OR p_earnings > 100000000000 OR p_sold < 0 OR p_sold > 100000000 THEN
    RETURN FALSE;
  END IF;
  v_hash := encode(extensions.digest(p_secret, 'sha256'), 'hex');
  SELECT secret_hash INTO v_existing FROM public.leaderboard WHERE id = p_id;
  IF v_existing IS NULL THEN
    INSERT INTO public.leaderboard (id, name, level, earnings, products_sold, secret_hash)
    VALUES (p_id, v_name, p_level, p_earnings, p_sold, v_hash);
    RETURN TRUE;
  ELSIF v_existing = v_hash THEN
    UPDATE public.leaderboard
      SET name = v_name, level = p_level, earnings = p_earnings, products_sold = p_sold, updated_at = now()
      WHERE id = p_id;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_score(UUID, TEXT, TEXT, INTEGER, BIGINT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_score(UUID, TEXT, TEXT, INTEGER, BIGINT, INTEGER) TO anon, authenticated;