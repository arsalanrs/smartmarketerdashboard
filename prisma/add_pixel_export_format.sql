-- Supabase / Postgres: store pixel export interpretation (run if not using `prisma db push`)

ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS pixel_export_format TEXT;
