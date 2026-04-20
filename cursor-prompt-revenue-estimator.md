# Cursor Prompt: Smart Marketer Dashboard — Revenue Estimator Feature

## Context & Codebase Overview

This is a **Next.js 14 App Router** project (`smartmarketerdashboard-main`) with the following key architecture:

- **Framework**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: PostgreSQL via Prisma ORM
- **Key Models**: `Upload`, `RawEvent`, `VisitorProfile`, `Tenant`, `TenantSummary`
- **Upload Flow**: CSV pixel file → `app/api/upload/route.ts` → `lib/csv-processor.ts` (streaming parser via PapaParse) → inserts into `RawEvent` table → builds `VisitorProfile` rows with engagement scoring
- **Scoring System** (`lib/scoring.ts`): Engagement score is a 0–15 integer. `HighIntent` segment = score ≥ 6, `Action` = score ≥ 9. `getEngagementSegment()` maps score → `'Casual' | 'Researcher' | 'HighIntent' | 'Action'`
- **CSV Processor** (`lib/csv-processor.ts`): Already tracks `minTs` / `maxTs` (the earliest and latest `EVENT_TIMESTAMP` values across all rows). Already identifies "high-intent" visitors via engagement scoring. `identityByVisitor` map tracks whether a visitor has a real `HEM_SHA256`, `UUID`, or `IP_ADDRESS` (used as `visitorKey`). Rows where `visitorKey === 'unknown'` are unidentifiable.
- **Upload DB Model**: Has `rowCount`, `processedRows`, `fileSizeBytes`, `status`, `createdAt`, `processedAt`, `tenantId`. **Does NOT yet have `dataStartDate` or `dataEndDate` fields.**
- **Dashboard**: `app/dashboard/[tenantId]/page.tsx` fetches `DashboardData` from `/api/dashboard`. The dashboard shows `KPICards` with `totalVisitors`, `highIntentVisitors`, `engagedVisitors`, etc.
- **Upload UI**: `app/admin/upload/page.tsx` — a simple form with tenant selector + file picker. No revenue estimator exists yet.

---

## What to Build

Implement a **Revenue Estimator panel** that appears on the Upload page **after** a CSV pixel file is successfully processed. It must be data-driven: pull all its inputs from the processed pixel data rather than asking for manual entry. Here is the full spec:

---

## Task 1 — Persist Date Range from CSV into the Upload Record

### File: `prisma/schema.prisma`
Add two new optional fields to the `Upload` model:

```prisma
model Upload {
  // ... existing fields ...
  dataStartDate   DateTime? @map("data_start_date")  // earliest EVENT_TIMESTAMP in the file
  dataEndDate     DateTime? @map("data_end_date")     // latest EVENT_TIMESTAMP in the file
  totalEvents     Int?      @map("total_events")       // total raw event rows processed
  uniqueVisitors  Int?      @map("unique_visitors")    // distinct visitorKeys (excl. 'unknown')
  highIntentCount Int?      @map("high_intent_count")  // visitors with engagementScore >= 6
}
```

Run `npx prisma migrate dev --name add_upload_stats` after adding these fields.

### File: `lib/csv-processor.ts`
In **both** `processCSVUploadFromStream` and `processCSVUpload`, after all visitor profiles have been upserted and before the final `prisma.upload.update({ status: 'completed' ... })` call, add logic to:

1. Count distinct `visitorKeys` that are not `'unknown'` — you already have `realVisitorKeys.length`
2. Count how many of those produced a `VisitorProfile` with `engagementScore >= 6` — query `prisma.visitorProfile.count({ where: { tenantId, uploadId: ..., engagementScore: { gte: 6 } } })`. Note: `VisitorProfile` doesn't have `uploadId` — so instead, query `prisma.visitorProfile.count({ where: { tenantId, windowStart, windowEnd, engagementScore: { gte: 6 } } })`.
3. Then update the upload record with all five new fields:

```typescript
await prisma.upload.update({
  where: { id: uploadId },
  data: {
    status: 'completed',
    rowCount: totalProcessed,
    processedAt: new Date(),
    dataStartDate: new Date(minTs),
    dataEndDate: new Date(maxTs),
    totalEvents: totalProcessed,
    uniqueVisitors: realVisitorKeys.length,
    highIntentCount: highIntentCount, // from the count query above
  },
})
```

---

## Task 2 — Expose Upload Stats via API

### File: `app/api/upload/[uploadId]/route.ts`
The GET handler here already returns the upload object. Ensure the response includes all the new fields:
`dataStartDate`, `dataEndDate`, `totalEvents`, `uniqueVisitors`, `highIntentCount`.

No schema changes needed to the route itself — Prisma will include them automatically once the migration runs — but double-check the `select` or returned object doesn't strip them.

---

## Task 3 — Revenue Estimator Component

### File: `components/RevenueEstimator.tsx` *(create new)*

Build a self-contained React component that receives:

```typescript
interface RevenueEstimatorProps {
  uploadId: string
  tenantId: string
}
```

Inside the component:
1. On mount, fetch `GET /api/upload/${uploadId}` and read: `dataStartDate`, `dataEndDate`, `uniqueVisitors`, `highIntentCount`, `rowCount`
2. Derive the **date range** and **days in record**:
   ```typescript
   const daysInRecord = Math.max(1, Math.round((new Date(dataEndDate).getTime() - new Date(dataStartDate).getTime()) / (1000 * 60 * 60 * 24)))
   ```
3. Derive **monthly visitor estimate** (extrapolation formula):
   ```typescript
   const monthlyVisitors = Math.round((uniqueVisitors / daysInRecord) * 30)
   ```
4. The component renders a card with:
   - A **"Based on your actual pixel data"** callout banner at the top:
     > 📊 Based on your actual pixel data from **[dataStartDate formatted]** to **[dataEndDate formatted]** ({daysInRecord} days)
   - A **form** with the following fields. Each field should be editable (controlled inputs) but pre-populated from pixel data:

     | Field | Label | Default Value | Source |
     |---|---|---|---|
     | `monthlyVisitors` | Monthly Visitors (from your pixel) | `monthlyVisitors` derived above | Auto-filled from pixel |
     | `matchRate` | Identification Match Rate (%) | `50` | Default mid-range (40–60%) |
     | `closeRate` | Close Rate (%) | `10` | User adjustable |
     | `avgDealValue` | Average Deal Value ($) | `1000` | User adjustable |

   - A **Match Rate slider** (range 40–60, step 1) with a label showing `"Realistic range: 40%–60% (industry actual)"`. Do not allow values below 10 or above 80 to prevent absurdity.
   - A **"Small Sample Notice"** — if `daysInRecord < 14`, show a yellow callout:
     > ⚠️ Your pixel file covers only {daysInRecord} days. The monthly estimate below is extrapolated. A 30-day sample gives the most reliable projection.

5. The component **computes and displays** the following derived metrics live (re-calculate on every input change):

   ```
   Identified Visitors/Month  = monthlyVisitors × (matchRate / 100)
   High-Intent Identified     = identifiedVisitors × (highIntentCount / uniqueVisitors)
                                  [or fallback: identifiedVisitors × 0.30 if uniqueVisitors = 0]
   Projected Leads/Month      = High-Intent Identified (these are your actionable leads)
   Potential Monthly Revenue  = projectedLeads × (closeRate / 100) × avgDealValue
   Annual Revenue Potential   = Potential Monthly Revenue × 12
   ```

6. Display the results in a clear **results panel** with 5 metric boxes, each formatted as:
   - **Label** (e.g., "Identified Visitors/Month")
   - **Big number** (e.g., "247")
   - **Subtle explanation** (e.g., "at 50% match rate")

   Use the brand blue `#1D6E95` for the top-line revenue figure. Make the `Annual Revenue Potential` box visually larger/prominent.

7. Add a **"Why these numbers?"** expandable section (use a `<details>` or toggle state) that explains:
   - Match rate: "40–60% reflects real identification rates from Smart Pixel data — not the conservative 10% often cited. This is based on actual performance."
   - High-intent filter: "Only visitors who visited key pages (pricing, contact, demo, checkout), clicked CTAs, or showed exit intent are counted as high-intent leads."
   - Extrapolation: "Your {daysInRecord}-day pixel sample was scaled to 30 days using: (events in file ÷ days in record) × 30."

8. Styling: match the existing app style — `rounded-xl bg-white shadow-sm border border-gray-200`, `text-gray-900` headings, `#1D6E95` accents, consistent with `KPICards.tsx` and the rest of the dashboard.

---

## Task 4 — Integrate into Upload Page

### File: `app/admin/upload/page.tsx`

1. Import `RevenueEstimator` from `@/components/RevenueEstimator`
2. Add state: `const [completedUploadId, setCompletedUploadId] = useState<string | null>(null)`
3. In `pollUploadStatus`, when `status.status === 'completed'`, set `setCompletedUploadId(data.id)` (you already have `data.id` from the initial upload response — pass it through or keep it in a ref)
4. After the upload form section, conditionally render:
   ```tsx
   {completedUploadId && (
     <div className="mt-8">
       <RevenueEstimator uploadId={completedUploadId} tenantId={selectedTenantId} />
     </div>
   )}
   ```
5. The existing redirect to `/dashboard/${tenantId}` after 2 seconds should be **removed or extended to 8 seconds** so the user sees the Revenue Estimator before being sent away. Add a manual "Go to Dashboard →" button instead of auto-redirecting.

---

## Task 5 — Dashboard KPI Enhancement (Optional but Recommended)

### File: `components/KPICards.tsx`

Add a 6th KPI card: **"Est. Monthly Revenue"**. This requires passing a `revenueEstimate` prop:

- In `app/dashboard/[tenantId]/page.tsx`, after `data` loads, compute:
  ```typescript
  const highIntent = data.metrics.highIntentVisitors
  const defaultMatchRate = 0.50
  const defaultCloseRate = 0.10
  const defaultDealValue = 1000
  const estRevenue = Math.round(highIntent * defaultMatchRate * defaultCloseRate * defaultDealValue)
  ```
- Pass `estRevenue` to `KPICards` and display it with a `$` prefix and a subtitle `"at 50% match, 10% close, $1k deal"`.
- This gives every dashboard a persistent revenue anchor, reinforcing the value of the data.

---

## Important Implementation Notes

1. **No new npm packages needed.** Everything should be vanilla React state + Tailwind + existing Prisma client.

2. **The `minTs`/`maxTs` variables already exist** in `processCSVUploadFromStream` and `processCSVUpload` in `lib/csv-processor.ts`. You are just persisting them to the DB — do not re-derive them.

3. **`highIntentCount` query timing**: The VisitorProfile upserts happen in the `for (const visitorKey of realVisitorKeys)` loop. The count query must come **after** that loop completes, before the final upload status update.

4. **Match rate default is 50%** (midpoint of 40–60% range). Never default to 10% anywhere in the new UI.

5. **Format all currency** with `toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`.

6. **Format dates** in the callout banner as `"Apr 13, 2025"` using `new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`.

7. **Small sample baseline**: If `daysInRecord < 3` (extremely thin data), cap the extrapolated `monthlyVisitors` at a floor of `uniqueVisitors * 4` (assumes weekly cadence) rather than going to zero or infinity.

8. **Do not break the existing redirect flow** entirely — just delay it or replace with a button. The processing overlay (`fixed inset-0 z-50`) should be dismissed when `status === 'completed'` before showing the estimator.

---

## File Change Summary

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add 5 fields to `Upload` model |
| `lib/csv-processor.ts` | Persist `dataStartDate`, `dataEndDate`, `uniqueVisitors`, `highIntentCount` on upload complete (both streaming and non-streaming paths) |
| `app/api/upload/[uploadId]/route.ts` | Verify new fields are returned in GET response |
| `components/RevenueEstimator.tsx` | **Create new** — full revenue estimator panel |
| `app/admin/upload/page.tsx` | Import and conditionally render `RevenueEstimator` after successful upload; replace auto-redirect with manual CTA button |
| `components/KPICards.tsx` | Add optional `estMonthlyRevenue` prop and 6th card |
| `app/dashboard/[tenantId]/page.tsx` | Compute and pass `estMonthlyRevenue` to `KPICards` |
