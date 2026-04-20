-- Supabase / Postgres: add upload stats for Revenue Estimator (run if not using `prisma db push`)

ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS data_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_events INTEGER,
  ADD COLUMN IF NOT EXISTS unique_visitors INTEGER,
  ADD COLUMN IF NOT EXISTS high_intent_count INTEGER;
