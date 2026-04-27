-- Live progress for visitor profile phase (used by admin upload polling).
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "visitor_profile_total" INTEGER;
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "visitor_profile_processed" INTEGER;
