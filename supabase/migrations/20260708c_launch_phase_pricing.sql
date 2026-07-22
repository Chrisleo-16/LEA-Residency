-- Launch-phase pricing: reduces the subscription-fee floors so early
-- landlords aren't priced like an established enterprise product before
-- LEA has any track record. The cost-plus side (1.8x markup on real
-- PayHero processing cost) is untouched — that part already scales fairly
-- with actual usage. Only the flat per-tier minimums drop.
--
-- Previous floors: starter 1000, standard 2500, growth 4500, enterprise 4500 + 100/unit
-- Launch floors:   starter  400, standard 1000, growth 2000, enterprise 2000 +  50/unit
--
-- Revisit these once there's a real cohort of paying, retained landlords —
-- raising prices deliberately with notice is very different from baking in
-- a silent auto-increase, so this migration does NOT include one.

CREATE OR REPLACE FUNCTION calculate_landlord_subscription_fee(p_landlord_id uuid)
RETURNS TABLE (
  tier text,
  unit_count int,
  total_payhero_cost numeric,
  monthly_fee numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH unit_costs AS (
    SELECT
      COUNT(*) AS unit_count,
      COALESCE(SUM(payhero_fee_for_amount(rent_amount)), 0) AS total_cost
    FROM units
    WHERE landlord_id = p_landlord_id
  )
  SELECT
    CASE
      WHEN unit_count <= 5 THEN 'starter'
      WHEN unit_count <= 15 THEN 'standard'
      WHEN unit_count <= 30 THEN 'growth'
      ELSE 'enterprise'
    END AS tier,
    unit_count,
    total_cost AS total_payhero_cost,
    GREATEST(
      total_cost * 1.8,
      CASE
        WHEN unit_count <= 5 THEN 400
        WHEN unit_count <= 15 THEN 1000
        WHEN unit_count <= 30 THEN 2000
        ELSE 2000 + (unit_count - 30) * 50
      END
    ) AS monthly_fee
  FROM unit_costs
$$;
