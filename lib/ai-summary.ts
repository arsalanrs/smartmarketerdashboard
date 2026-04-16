import type { Prisma } from '@prisma/client'
import OpenAI from 'openai'
import { prisma } from './prisma'

function asJson(v: unknown): Prisma.InputJsonValue {
  return v as Prisma.InputJsonValue
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

export interface DashboardMetrics {
  totalVisitors: number
  engagedVisitors: number
  repeatVisitors: number
  highIntentVisitors: number
  newVisitors: number
  returningVisitors: number
  engagementBreakdown: {
    Casual: number
    Researcher: number
    HighIntent: number
    Action: number
  }
  topUrls: Array<{ url: string; visits: number }>
  topEvents: Array<{ eventType: string; count: number }>
  highIntentVisitorsList: Array<{
    visitorKey: string
    score: number
    visits: number
    timeOnPage: number
  }>
}

export type ObservationConfidence = 'High' | 'Medium' | 'Low'

export interface KeyObservationItem {
  observation: string
  confidence: ObservationConfidence
}

export interface PriorityAction {
  action: string
  estimatedImpact: string
  urgency: string
}

export interface AISummaryPayload {
  executiveSummary: string
  keyObservations: KeyObservationItem[]
  recommendedActions: string[]
  notableSegments: Array<{ segment: string; description: string }>
  priorityAction: PriorityAction | null
  revenueInsights: string[]
}

export function normalizeKeyObservations(data: unknown): KeyObservationItem[] {
  if (!Array.isArray(data)) return []
  return data.map((item) => {
    if (typeof item === 'string') {
      return { observation: item, confidence: 'Medium' as const }
    }
    if (item && typeof item === 'object' && 'observation' in item) {
      const o = item as { observation?: string; confidence?: string }
      const c = (o.confidence || 'Medium').trim()
      const confidence: ObservationConfidence =
        c === 'High' || c === 'Low' || c === 'Medium' ? c : 'Medium'
      return { observation: String(o.observation ?? ''), confidence }
    }
    return { observation: '', confidence: 'Medium' as const }
  })
}

export function normalizePriorityAction(data: unknown): PriorityAction | null {
  if (!data || typeof data !== 'object') return null
  const p = data as Record<string, unknown>
  const action = p.action
  if (typeof action !== 'string' || !action.trim()) return null
  return {
    action: action.trim(),
    estimatedImpact: String(p.estimatedImpact ?? ''),
    urgency: String(p.urgency ?? ''),
  }
}

export function normalizeRevenueInsights(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  return data.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

/**
 * Generate AI summary for tenant and time window
 */
export async function generateAISummary(
  tenantId: string,
  windowStart: Date,
  windowEnd: Date,
  metrics: DashboardMetrics,
  roiContext?: unknown
): Promise<AISummaryPayload> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const inputData = {
    metrics: {
      totalVisitors: metrics.totalVisitors,
      engagedVisitors: metrics.engagedVisitors,
      repeatVisitors: metrics.repeatVisitors,
      highIntentVisitors: metrics.highIntentVisitors,
      newVsReturning: {
        new: metrics.newVisitors,
        returning: metrics.returningVisitors,
      },
      engagementBreakdown: metrics.engagementBreakdown,
      topUrls: metrics.topUrls.slice(0, 10),
      topEvents: metrics.topEvents.slice(0, 10),
      highIntentCount: metrics.highIntentVisitorsList.length,
    },
  }

  const roiBlock =
    roiContext != null && typeof roiContext === 'object' && Object.keys(roiContext as object).length > 0
      ? `

Revenue recovery / business context (from the client's ROI calculator — use real numbers when referencing opportunity):
${JSON.stringify(roiContext, null, 2)}
`
      : ''

  const prompt = `You are analyzing visitor behavior data for a client dashboard. Generate a concise executive summary and actionable insights.

Data:
${JSON.stringify(inputData, null, 2)}
${roiBlock}

Generate:
1. Executive Summary (3-5 sentences): Overview of visitor behavior, engagement trends, and key highlights. If ROI context is provided, tie traffic and segments to revenue language where appropriate.

2. Key Observations (3-5 items): Notable patterns, anomalies, or trends. Each item MUST include a confidence level: High, Medium, or Low (based on strength of evidence in the data).

3. Recommended Actions (3-5 bullet points): Specific steps. Each must make clear WHO to target, WHAT to do or say, WHY (cite metrics or URLs), and estimated IMPACT when possible. If ROI context exists, reference dollar or pipeline ranges from it.

4. Notable Segments (2-4 items): Interesting visitor segments (e.g. high intent without CTA clicks). Reference actual page paths from topUrls when relevant.

5. priorityAction: One object with action (string), estimatedImpact (string, can be a range), urgency (e.g. "This Week"). If roiContext is present, flag the single highest-leverage action as the priority and prefix the action text with "🔥 Priority #1: ". If roiContext is absent, still pick the strongest action from behavior data.

6. revenueInsights: 2-4 short strings with revenue or pipeline angles — ONLY if roiContext was provided; otherwise return an empty array.

7. Flag unusual scroll drop-offs, traffic spikes, or device/geo patterns if inferable from the data.

Return as JSON:
{
  "executiveSummary": "...",
  "keyObservations": [
    { "observation": "...", "confidence": "High" }
  ],
  "recommendedActions": ["...", "..."],
  "notableSegments": [
    {"segment": "...", "description": "..."}
  ],
  "priorityAction": { "action": "...", "estimatedImpact": "...", "urgency": "..." },
  "revenueInsights": ["..."]
}

Do not include any PII (emails, phone numbers, names) in the output. Focus on behavioral patterns and metrics.`

  try {
    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a data analyst providing insights on visitor behavior. Always return valid JSON. Do not include PII.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)

    return {
      executiveSummary: parsed.executiveSummary || '',
      keyObservations: normalizeKeyObservations(parsed.keyObservations),
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      notableSegments: Array.isArray(parsed.notableSegments) ? parsed.notableSegments : [],
      priorityAction: normalizePriorityAction(parsed.priorityAction),
      revenueInsights: normalizeRevenueInsights(parsed.revenueInsights),
    }
  } catch (error: unknown) {
    console.error('Error generating AI summary:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate AI summary: ${msg}`)
  }
}

function toApiShape(
  row: {
    id: string
    executiveSummary: string
    keyObservations: unknown
    recommendedActions: unknown
    notableSegments: unknown
    priorityAction: unknown
    revenueInsights: unknown
    createdAt: Date
  }
) {
  return {
    id: row.id,
    executiveSummary: row.executiveSummary,
    keyObservations: normalizeKeyObservations(row.keyObservations),
    recommendedActions: Array.isArray(row.recommendedActions)
      ? (row.recommendedActions as string[])
      : [],
    notableSegments: Array.isArray(row.notableSegments) ? row.notableSegments : [],
    priorityAction: normalizePriorityAction(row.priorityAction),
    revenueInsights: normalizeRevenueInsights(row.revenueInsights),
    createdAt: row.createdAt,
  }
}

/**
 * Get or generate AI summary for tenant
 */
export async function getOrGenerateSummary(
  tenantId: string,
  windowStart: Date,
  windowEnd: Date,
  metrics: DashboardMetrics,
  forceRegenerate: boolean = false,
  roiContext?: unknown
) {
  if (!forceRegenerate) {
    const existing = await prisma.tenantSummary.findUnique({
      where: {
        tenantId_windowStart_windowEnd: {
          tenantId,
          windowStart,
          windowEnd,
        },
      },
    })

    if (existing) {
      return toApiShape(existing)
    }
  }

  const summary = await generateAISummary(
    tenantId,
    windowStart,
    windowEnd,
    metrics,
    roiContext
  )

  const saved = await prisma.tenantSummary.upsert({
    where: {
      tenantId_windowStart_windowEnd: {
        tenantId,
        windowStart,
        windowEnd,
      },
    },
    update: {
      executiveSummary: summary.executiveSummary,
      keyObservations: asJson(summary.keyObservations),
      recommendedActions: asJson(summary.recommendedActions),
      notableSegments: asJson(summary.notableSegments),
      priorityAction: asJson(summary.priorityAction),
      revenueInsights: asJson(summary.revenueInsights),
    },
    create: {
      tenantId,
      windowStart,
      windowEnd,
      executiveSummary: summary.executiveSummary,
      keyObservations: asJson(summary.keyObservations),
      recommendedActions: asJson(summary.recommendedActions),
      notableSegments: asJson(summary.notableSegments),
      priorityAction: asJson(summary.priorityAction),
      revenueInsights: asJson(summary.revenueInsights),
    },
  })

  return toApiShape(saved)
}
