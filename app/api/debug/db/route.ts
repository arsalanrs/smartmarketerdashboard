import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            uploads: true,
            rawEvents: true,
            visitorProfiles: true,
          },
        },
      },
    })

    // Get all uploads
    const uploads = await prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get raw events count
    const rawEventsCount = await prisma.rawEvent.count()

    // Get visitor profiles count
    const visitorProfilesCount = await prisma.visitorProfile.count()

    // Get geo cache entries (to check for duplicate locations)
    const geoCacheEntries = await prisma.geoCache.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
    })

    // Get sample raw events with IPs
    const sampleRawEvents = await prisma.rawEvent.findMany({
      take: 20,
      orderBy: { eventTs: 'desc' },
      select: {
        id: true,
        tenantId: true,
        visitorKey: true,
        eventTs: true,
        eventType: true,
        url: true,
        ip: true,
        coordinates: true,
      },
    })

    // Get unique IPs from raw events
    const uniqueIPs = await prisma.rawEvent.groupBy({
      by: ['ip'],
      where: {
        ip: { not: null },
      },
      _count: {
        ip: true,
      },
      orderBy: {
        _count: {
          ip: 'desc',
        },
      },
      take: 20,
    })

    // Get sample visitor profiles with identity
    const sampleProfiles = await prisma.visitorProfile.findMany({
      take: 10,
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        visitorKey: true,
        engagementScore: true,
        engagementSegment: true,
        visitsCount: true,
        totalEvents: true,
        windowStart: true,
        windowEnd: true,
        identity: true,
        city: true,
        region: true,
        country: true,
        lat: true,
        lng: true,
      },
    })

    return NextResponse.json({
      summary: {
        tenantsCount: tenants.length,
        uploadsCount: uploads.length,
        rawEventsCount,
        visitorProfilesCount,
      },
      tenants,
      recentUploads: uploads,
      sampleRawEvents,
      sampleProfiles,
      geoCacheEntries,
      uniqueIPs: uniqueIPs.map((u: { ip: string | null; _count: { ip: number } }) => ({
        ip: u.ip,
        count: u._count.ip,
      })),
    })
  } catch (error: any) {
    console.error('Database debug error:', error)
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

