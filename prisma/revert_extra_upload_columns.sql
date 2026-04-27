-- Optional: remove Upload columns added after the dd85dcc baseline so `prisma db push` matches schema.
-- Run in Supabase SQL editor (or psql) if your DB still has these from later experiments.
ALTER TABLE "uploads" DROP COLUMN IF EXISTS "geo_enrichment_total";
ALTER TABLE "uploads" DROP COLUMN IF EXISTS "geo_enrichment_processed";
ALTER TABLE "uploads" DROP COLUMN IF EXISTS "ingest_aux";
ALTER TABLE "uploads" DROP COLUMN IF EXISTS "visitor_profile_total";
ALTER TABLE "uploads" DROP COLUMN IF EXISTS "visitor_profile_processed";
