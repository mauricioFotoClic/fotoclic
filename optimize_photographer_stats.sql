-- Create a function to fetch photographers with pre-calculated stats
-- Aliased output columns to avoid PL/pgSQL ambiguity errors

CREATE OR REPLACE FUNCTION get_photographers_with_stats()
RETURNS TABLE (
  user_data jsonb,
  photo_cnt bigint,
  sales_cnt bigint,
  comm_val numeric,
  likes_cnt bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(u.*) as user_data,
    COALESCE(p_stats.p_count, 0) as photo_cnt,
    COALESCE(s_stats.s_count, 0) as sales_cnt,
    COALESCE(s_stats.comm_val, 0) as comm_val,
    COALESCE(p_stats.l_count, 0) as likes_cnt
  FROM users u
  LEFT JOIN (
    SELECT p.photographer_id, COUNT(*) as p_count, SUM(p.likes_count) as l_count
    FROM photos p
    GROUP BY p.photographer_id
  ) p_stats ON u.id = p_stats.photographer_id
  LEFT JOIN (
    SELECT s.photographer_id, COUNT(*) as s_count, SUM(s.commission) as comm_val
    FROM sales s
    GROUP BY s.photographer_id
  ) s_stats ON u.id = s_stats.photographer_id
  WHERE u.role = 'photographer';
END;
$$;
