-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- Adds columns expected by Prisma TenantSummary (lib/ai-summary upsert).
-- Table name matches @@map("tenant_summaries") in prisma/schema.prisma

ALTER TABLE tenant_summaries
  ADD COLUMN IF NOT EXISTS priority_action JSONB,
  ADD COLUMN IF NOT EXISTS revenue_insights JSONB;
