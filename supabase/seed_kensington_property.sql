-- Align existing luxury London listing with Kensington Palace Gardens (safe to re-run)
UPDATE physical_assets
SET
  title = 'High-End Modern Residence',
  address = 'Kensington Palace Gardens, London, UK',
  latitude = 51.502,
  longitude = -0.1874,
  square_feet = COALESCE(square_feet, 6200),
  bedrooms = COALESCE(bedrooms, 6),
  bathrooms = COALESCE(bathrooms, 5),
  year_built = COALESCE(year_built, 2018),
  updated_at = now()
WHERE
  address ILIKE '%98705321098%'
  OR address ILIKE '%Registry Lane%'
  OR address ILIKE '%LUXURY PROPERTY%'
  OR title ILIKE '%high-end modern%'
  OR title ILIKE '%luxury%london%'
  OR title ILIKE '%HM Title%'
  OR title ILIKE '%SMOKE%';
