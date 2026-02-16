import OpenAI from 'openai'
import { prisma } from './prisma'

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

/**
 * Generate AI summary for tenant and time window
 */
export async function generateAISummary(
  tenantId: string,
  windowStart: Date,
  windowEnd: Date,
  metrics: DashboardMetrics
): Promise<{
  executiveSummary: string
  keyObservations: string[]
  recommendedActions: string[]
  notableSegments: Array<{ segment: string; description: string }>
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  // Prepare input data (redact PII by default)
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

  const prompt = `You are analyzing visitor behavior data for a client dashboard. Generate a concise executive summary and actionable insights.

Data:
${JSON.stringify(inputData, null, 2)}

Generate:
1. Executive Summary (3-5 sentences): Overview of visitor behavior, engagement trends, and key highlights
2. Key Observations (3-5 bullet points): Notable patterns, anomalies, or trends
3. Recommended Actions (3-5 bullet points): Specific, actionable steps to improve engagement or conversion
4. Notable Segments (2-4 items): Highlight interesting visitor segments (e.g., "18% high intent but no CTA clicks", "Strong repeat visitor engagement on pricing page")

Return as JSON:
{
  "executiveSummary": "...",
  "keyObservations": ["...", "..."],
  "recommendedActions": ["...", "..."],
  "notableSegments": [
    {"segment": "High Intent No Action", "description": "..."}
  ]
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
      keyObservations: Array.isArray(parsed.keyObservations) ? parsed.keyObservations : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      notableSegments: Array.isArray(parsed.notableSegments) ? parsed.notableSegments : [],
    }
  } catch (error: any) {
    console.error('Error generating AI summary:', error)
    throw new Error(`Failed to generate AI summary: ${error.message}`)
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
  forceRegenerate: boolean = false
) {
  // Check if summary exists
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
      return {
        id: existing.id,
        executiveSummary: existing.executiveSummary,
        keyObservations: existing.keyObservations as string[],
        recommendedActions: existing.recommendedActions as string[],
        notableSegments: existing.notableSegments as any[],
        createdAt: existing.createdAt,
      }
    }
  }

  // Generate new summary
  const summary = await generateAISummary(tenantId, windowStart, windowEnd, metrics)

  // Store in database
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
      keyObservations: summary.keyObservations as any,
      recommendedActions: summary.recommendedActions as any,
      notableSegments: summary.notableSegments as any,
    },
    create: {
      tenantId,
      windowStart,
      windowEnd,
      executiveSummary: summary.executiveSummary,
      keyObservations: summary.keyObservations as any,
      recommendedActions: summary.recommendedActions as any,
      notableSegments: summary.notableSegments as any,
    },
  })

  return {
    id: saved.id,
    executiveSummary: saved.executiveSummary,
    keyObservations: saved.keyObservations as string[],
    recommendedActions: saved.recommendedActions as string[],
    notableSegments: saved.notableSegments as any[],
    createdAt: saved.createdAt,
  }
}

