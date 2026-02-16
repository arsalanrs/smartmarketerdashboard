import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitorKey: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const { visitorKey: visitorKeyParam } = await params
    const visitorKey = decodeURIComponent(visitorKeyParam)

    // Get visitor profile
    const profile = await prisma.visitorProfile.findFirst({
      where: {
        tenantId,
        visitorKey,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    // Get raw events for this visitor
    const events = await prisma.rawEvent.findMany({
      where: {
        tenantId,
        visitorKey,
      },
      orderBy: { eventTs: 'asc' },
      take: 1000, // Limit for performance
    })

    // Get IP from first event
    const firstEvent = events.find((e: any) => e.ip)
    const ip = firstEvent?.ip || null

    return NextResponse.json({
      profile: {
        id: profile.id,
        visitorKey: profile.visitorKey,
        firstSeenAt: profile.firstSeenAt,
        lastSeenAt: profile.lastSeenAt,
        visitsCount: profile.visitsCount,
        totalEvents: profile.totalEvents,
        pageViews: profile.pageViews,
        uniquePagesCount: profile.uniquePagesCount,
        totalTimeOnPageMs: profile.totalTimeOnPageMs,
        avgTimeOnPageMs: profile.avgTimeOnPageMs,
        maxScrollPercentage: profile.maxScrollPercentage,
        flags: profile.flags,
        engagementScore: profile.engagementScore,
        engagementSegment: profile.engagementSegment,
        lat: profile.lat,
        lng: profile.lng,
        city: profile.city,
        region: profile.region,
        country: profile.country,
        identity: profile.identity,
        ip,
      },
      events: events.map((e: any) => ({
        id: e.id,
        eventTs: e.eventTs,
        eventType: e.eventType,
        url: e.url,
        referrerUrl: e.referrerUrl,
        timeOnPageMs: e.timeOnPageMs,
        scrollPct: e.scrollPct,
        elementIdentifier: e.elementIdentifier,
        elementText: e.elementText,
        title: e.title,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

