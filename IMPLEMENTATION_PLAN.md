# Smart Marketer Dashboard — Feature Implementation Plan

**Version:** 2.0 Additions  
**Goal:** Add Revenue Leak Calculator + Enhanced AI Summary without touching existing functionality  
**Safety Rule:** All new features are **additive only** — no existing files are modified destructively

---

## Overview of Changes

| Feature | Type | Files Affected |
|---|---|---|
| ROI / Revenue Leak Calculator | New Component + UI section | `components/ROICalculator.tsx` (new), `app/dashboard/[tenantId]/page.tsx` (append only) |
| Enhanced AI Summary | Upgrade to existing prompt + output | `lib/ai-summary.ts`, `components/AISummary.tsx` |
| ROI data passed into AI | Bridge between calculator + AI | `app/api/ai-summary/route.ts` |

---

## Feature 1: Revenue Leak Calculator (ROI Section)

### What It Does
A collapsible card below the KPI section where the user inputs their business numbers. The dashboard then computes how much revenue is **leaking** from unengaged, high-intent, and unconverted traffic.

### Inputs (user-editable fields)
| Field | Label | Example |
|---|---|---|
| `closeRate` | Close / Conversion Rate (%) | 3% |
| `averageOrderValue` | Average Order Value ($) | $2,500 |
| `leadValue` | Average Lead Value ($) | $150 |
| `monthlyAdSpend` | Monthly Ad Spend ($) | $10,000 |
| `salesCycledays` | Avg Sales Cycle (days) | 14 |

### Calculated Outputs (auto-computed from pixel data + inputs)
| Output | Formula |
|---|---|
| **Unconverted High-Intent Visitors** | `metrics.highIntentVisitors - metrics.Action` (visitors scoring ≥6 but no CTA click) |
| **Estimated Lost Revenue (Conservative)** | `unconvertedHighIntent × closeRate × averageOrderValue` |
| **Estimated Lost Revenue (Optimistic)** | `unconvertedHighIntent × (closeRate × 2) × averageOrderValue` |
| **Cost Per Unengaged Visitor** | `monthlyAdSpend / totalVisitors` |
| **Wasted Ad Spend** | `costPerVisitor × (totalVisitors - engagedVisitors)` |
| **Revenue At Risk (Researcher segment)** | `Researcher count × leadValue × closeRate` |

### Display
- Big bold **"Revenue At Risk"** hero number (red/orange)
- Breakdown table showing each leak source
- Subtle disclaimer: *"These are estimates based on your inputs and observed engagement data."*
- Toggle to collapse/expand the section (so it doesn't overwhelm the dashboard on first load)



### Files to Create/Modify

#### `components/ROICalculator.tsx` — **NEW FILE**
```
- Accepts: metrics object (from existing DashboardData), no API changes needed
- Self-contained state for user inputs (stored in localStorage so it persists per tenant)
- Uses localStorage key: `roi_inputs_${tenantId}` to persist inputs across sessions
- All calculations are pure client-side math, zero backend changes
- Collapsible with a chevron toggle
- Matches existing dashboard design (white card, rounded-xl, border-gray-200)
```

#### `app/dashboard/[tenantId]/page.tsx` — **APPEND ONLY**
```
- Import ROICalculator at the top
- Add <ROICalculator metrics={data.metrics} tenantId={tenantId} /> 
  AFTER the <KPICards /> line and BEFORE <EngagementBreakdown />
- No other changes to this file
```

---

## Feature 2: Enhanced AI Summary

### What's Wrong With the Current One
- Generic prompt — could apply to any SaaS analytics tool
- "Recommended Actions" are vague ("improve engagement", "consider retargeting")
- Doesn't know the **business context** (what they sell, what a conversion is worth)
- Doesn't call out the specific visitors who are closest to converting

### What We're Improving

#### A. Richer Prompt in `lib/ai-summary.ts`

The new prompt will:

1. **Include ROI context** if the user has filled in their calculator inputs (passed as optional `roiContext` param)
2. **Name specific segments with urgency** — e.g. "47 visitors hit your pricing page but didn't click CTA — at your $2,500 AOV that's up to $35,000 in pipeline"
3. **Give channel-specific recommendations** — retargeting copy angles, email follow-up timing, landing page CRO suggestions
4. **Prioritize actions by impact** — rank recommendations 1–5 by estimated revenue impact
5. **Flag anomalies** — unusual scroll drop-offs, traffic spikes, device/geo patterns worth acting on

#### New prompt additions (append to existing prompt string):
```
- If roiContext is provided, reference specific dollar amounts in recommendations
- Each recommended action must include: WHO to target, WHAT to say/do, WHY (data backing it), and estimated IMPACT
- Flag the single highest-leverage action as "🔥 Priority #1"
- If high-intent visitors didn't click CTA, write specific retargeting copy suggestions
- Reference actual page URLs from topUrls in recommendations (e.g. "visitors who hit /pricing")
- Score confidence level of each observation: High / Medium / Low
```

#### B. Updated Response Schema
Add two new fields to the JSON response:
```json
{
  "executiveSummary": "...",
  "keyObservations": [...],
  "recommendedActions": [...],         // existing — now with impact ratings
  "notableSegments": [...],            // existing
  "priorityAction": {                  // NEW
    "action": "Launch retargeting campaign for 47 high-intent non-converters",
    "estimatedImpact": "$12,000–$35,000",
    "urgency": "This Week"
  },
  "revenueInsights": [...]             // NEW — only present if roiContext passed
}
```

#### C. Updated `components/AISummary.tsx`
- Render `priorityAction` as a highlighted banner at the top (yellow/amber background, 🔥 icon)
- Render `revenueInsights` as a new collapsible section below recommended actions
- Add confidence badges (🟢 High / 🟡 Medium / 🔴 Low) next to key observations
- No changes to existing layout of current fields

#### D. Pass ROI context from calculator to AI
In `app/api/ai-summary/route.ts`:
- Accept optional `roiContext` in POST body
- Pass it through to `generateAISummary()`
- Frontend reads `localStorage` for saved ROI inputs and includes them in the POST body when generating summary

---

## Implementation Order (for Cursor)

### Step 1 — ROI Calculator Component (safest, fully isolated)
1. Create `components/ROICalculator.tsx`
2. Add import + single JSX line to `app/dashboard/[tenantId]/page.tsx`
3. Test: Calculator shows up, inputs save to localStorage, math is correct

### Step 2 — Enhanced AI Prompt (backend only, no UI risk)
1. Modify `lib/ai-summary.ts`:
   - Add `roiContext?: {...}` to `generateAISummary` params
   - Upgrade the prompt string
   - Add new fields to return type
2. Test by hitting `POST /api/ai-summary` directly with Postman/curl

### Step 3 — Updated AI Summary UI (display new fields)
1. Modify `components/AISummary.tsx`:
   - Add Priority Action banner (render only if field exists — backward compatible)
   - Add Revenue Insights section (render only if field exists — backward compatible)
   - Add confidence badges
2. Test: Old summaries still render. New generated ones show enhanced output.

### Step 4 — Bridge ROI → AI
1. In `components/AISummary.tsx` generateSummary function: read `localStorage` for `roi_inputs_${tenantId}` and include in POST body
2. In `app/api/ai-summary/route.ts`: accept and forward `roiContext`
3. Test: Fill in calculator, generate AI summary, confirm dollar amounts appear in output

---

## Risk Assessment

| Change | Risk | Mitigation |
|---|---|---|
| ROICalculator new component | None — new file | Isolated, no dependencies on existing data flow |
| Adding import to dashboard page | Minimal | Wrap in try/catch, calculator crashes won't break dashboard |
| AI prompt upgrade | Low | New fields use optional rendering, old summaries display fine |
| ROI → AI bridge | Low | `roiContext` is optional param, AI gracefully skips if missing |
| Database changes | **Zero** | No schema changes required for any of this |

---

## Component Design Spec

### ROI Calculator Card
```
┌─────────────────────────────────────────────────────┐
│ 💸 Revenue Leak Analysis               [▼ Expand]  │
├─────────────────────────────────────────────────────┤
│  Your Business Numbers                              │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Close Rate % │  │   Avg AOV $  │               │
│  │     3.0      │  │    2500      │               │
│  └──────────────┘  └──────────────┘               │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  💰 ESTIMATED REVENUE AT RISK                │  │
│  │         $47,250 – $94,500                    │  │
│  │  Based on 63 high-intent non-converters      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Breakdown:                                         │
│  • Wasted ad spend (unengaged traffic):  $3,240    │
│  • High-intent non-converters (conserv): $47,250   │
│  • Researcher segment revenue at risk:   $8,100    │
└─────────────────────────────────────────────────────┘
```

### AI Priority Action Banner
```
┌─────────────────────────────────────────────────────┐
│ 🔥 Priority Action This Week                        │
│ Launch retargeting campaign targeting the 63        │
│ visitors who reached /pricing but didn't convert.   │
│ Estimated Impact: $12,000–$35,000                   │
│                                  Urgency: This Week │
└─────────────────────────────────────────────────────┘
```

---

## Notes for Cursor

- **Do not modify** `lib/csv-processor.ts`, `lib/scoring.ts`, `lib/prisma.ts`, `lib/geo.ts`
- **Do not modify** `prisma/schema.prisma` — no DB migration needed
- **Do not modify** `app/api/dashboard/route.ts` or `app/api/upload/` routes
- All new state is client-side (localStorage) or optional API params
- The ROI calculator reads from the already-fetched `metrics` prop — no new API calls
- Keep all existing component props and interfaces intact; only extend them
- Use the existing Tailwind classes and color palette (`#1D6E95`, `#FF8C02`) for consistency
