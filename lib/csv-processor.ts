import Papa from 'papaparse'
import { prisma } from './prisma'
import { parseCoordinates, getGeoLocation } from './geo'
import { calculateEngagementScore, getEngagementSegment, isKeyPage, isCTAClick, isExitIntent, isVideoEngaged, VisitorFlags } from './scoring'

export interface CSVRow {
  [key: string]: string | undefined
}

export interface ProcessedEvent {
  visitorKey: string
  uuid?: string
  ip?: string
  eventTs: Date
  eventType?: string
  url?: string
  referrerUrl?: string
  timeOnPageMs?: number
  idleTimeMs?: number
  scrollPct?: number
  threshold?: string
  elementIdentifier?: string
  elementText?: string
  title?: string
  coordinates?: { lat: number; lng: number } | null
  rawJson?: any
}

/**
 * Normalize timestamp to UTC ISO
 */
function normalizeTimestamp(value: string | undefined): Date | null {
  if (!value) return null
  try {
    return new Date(value)
  } catch {
    return null
  }
}

/**
 * Parse CSV row into ProcessedEvent
 */
function parseRow(row: CSVRow): ProcessedEvent | null {
  // Try multiple timestamp column name variations (uppercase first for Smart Pixel format)
  const eventTs = normalizeTimestamp(
    row['EVENT_TIMESTAMP'] ||
    row['Event Timestamp'] || 
    row['event_timestamp'] || 
    row['timestamp'] ||
    row['Timestamp'] ||
    row['Time'] ||
    row['time'] ||
    row['Date'] ||
    row['date']
  )
  if (!eventTs) {
    // Log first few rows that fail to help debug
    console.warn('Row missing timestamp, skipping:', Object.keys(row).slice(0, 5))
    return null
  }

  const uuid = row['UUID'] || row['Uuid'] || row['uuid'] || undefined
  const ip = row['IP_ADDRESS'] || row['Ip Address'] || row['ip_address'] || row['ip'] || undefined
  const visitorKey = uuid || ip || 'unknown'

  // Parse EVENT_DATA JSON if present (Smart Pixel format)
  let eventData: any = null
  let url: string | undefined
  let referrerUrl: string | undefined
  let timeOnPageMs: number | undefined
  let idleTimeMs: number | undefined
  let title: string | undefined

  if (row['EVENT_DATA']) {
    try {
      const eventDataStr = typeof row['EVENT_DATA'] === 'string' ? row['EVENT_DATA'] : JSON.stringify(row['EVENT_DATA'])
      eventData = JSON.parse(eventDataStr)
      
      url = eventData?.url || undefined
      referrerUrl = eventData?.referrer || undefined
      title = eventData?.title || undefined
      
      // Time on page from EVENT_DATA (already in milliseconds)
      if (eventData?.timeOnPage) {
        timeOnPageMs = Math.max(0, Math.min(600000, parseInt(eventData.timeOnPage)))
      }
      
      // Idle time from EVENT_DATA (already in milliseconds)
      if (eventData?.idleTime) {
        idleTimeMs = Math.max(0, parseInt(eventData.idleTime))
      }
    } catch (e) {
      // If JSON parse fails, continue with fallback columns
    }
  }

  // Fallback to direct columns if EVENT_DATA doesn't have them
  if (!url) {
    url = row['URL'] || row['Url'] || row['url'] || undefined
  }
  if (!referrerUrl) {
    referrerUrl = row['REFERRER_URL'] || row['Referrer Url'] || row['Referrer'] || row['referrer_url'] || row['referrer'] || undefined
  }
  if (!timeOnPageMs) {
    const timeOnPage = row['Timeonpage'] || row['time_on_page'] || row['timeonpage'] || row['TIME_ON_PAGE']
    timeOnPageMs = timeOnPage ? Math.max(0, Math.min(600000, parseInt(timeOnPage) * 1000)) : undefined
  }
  if (!idleTimeMs) {
    const idleTime = row['Idletime'] || row['idle_time'] || row['idletime'] || row['IDLE_TIME']
    idleTimeMs = idleTime ? Math.max(0, parseInt(idleTime) * 1000) : undefined
  }

  const scrollPct = row['Percentage'] || row['percentage'] || row['scroll_percentage'] || row['SCROLL_PERCENTAGE']
  const scrollPctNum = scrollPct ? parseFloat(scrollPct) : undefined

  const coordinates = parseCoordinates(
    row['Coordinates'] || row['coordinates'] || undefined
  )

  const eventType = row['EVENT_TYPE'] || row['Event Type'] || row['event_type'] || undefined

  return {
    visitorKey,
    uuid,
    ip,
    eventTs,
    eventType,
    url,
    referrerUrl,
    timeOnPageMs,
    idleTimeMs,
    scrollPct: scrollPctNum,
    threshold: row['Threshold'] || row['threshold'] || row['THRESHOLD'] || undefined,
    elementIdentifier: row['Elementidentifier'] || row['Element Identifier'] || row['element_identifier'] || row['ELEMENT_IDENTIFIER'] || undefined,
    elementText: row['Elementtext'] || row['Element Text'] || row['element_text'] || row['ELEMENT_TEXT'] || undefined,
    title,
    coordinates,
    rawJson: row,
  }
}

/**
 * Group events into sessions (30 minute gap threshold)
 */
function groupIntoSessions(events: ProcessedEvent[]): ProcessedEvent[][] {
  if (events.length === 0) return []
  
  const sorted = [...events].sort((a, b) => a.eventTs.getTime() - b.eventTs.getTime())
  const sessions: ProcessedEvent[][] = []
  let currentSession: ProcessedEvent[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = sorted[i - 1].eventTs.getTime()
    const currTime = sorted[i].eventTs.getTime()
    const gapMinutes = (currTime - prevTime) / (1000 * 60)

    if (gapMinutes <= 30) {
      currentSession.push(sorted[i])
    } else {
      sessions.push(currentSession)
      currentSession = [sorted[i]]
    }
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession)
  }

  return sessions
}

/**
 * Process CSV upload and create visitor profiles
 */
export async function processCSVUpload(
  tenantId: string,
  uploadId: string,
  csvContent: string
): Promise<{ rowCount: number; error?: string }> {
  try {
    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parseResult.errors.length > 0) {
      console.warn('CSV parse errors:', parseResult.errors)
    }

    const rows = parseResult.data
    console.log(`Parsed ${rows.length} rows from CSV`)
    
    const processedEvents: ProcessedEvent[] = []

    // Simple parsing - just use whatever is there, no filtering
    for (const row of rows) {
      const event = parseRow(row)
      if (event) {
        processedEvents.push(event)
      }
    }
    
    console.log(`Successfully parsed ${processedEvents.length} events from ${rows.length} rows`)
    
    if (processedEvents.length === 0) {
      const errorMsg = `No valid events found. CSV had ${rows.length} rows but none had valid timestamps. Check that CSV has a timestamp column.`
      console.error(errorMsg)
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'error',
          error: errorMsg,
          rowCount: 0,
        },
      })
      return { rowCount: 0, error: errorMsg }
    }

    // Insert raw events in batches
    const batchSize = 1000
    for (let i = 0; i < processedEvents.length; i += batchSize) {
      const batch = processedEvents.slice(i, i + batchSize)
      await prisma.rawEvent.createMany({
        data: batch.map((event) => ({
          tenantId,
          uploadId,
          visitorKey: event.visitorKey,
          uuid: event.uuid || null,
          ip: event.ip || null,
          eventTs: event.eventTs,
          eventType: event.eventType || null,
          url: event.url || null,
          referrerUrl: event.referrerUrl || null,
          timeOnPageMs: event.timeOnPageMs || null,
          idleTimeMs: event.idleTimeMs || null,
          scrollPct: event.scrollPct || null,
          threshold: event.threshold || null,
          elementIdentifier: event.elementIdentifier || null,
          elementText: event.elementText || null,
          title: event.title || null,
          coordinates: event.coordinates ? (event.coordinates as any) : null,
          rawJson: event.rawJson || null,
        })),
        skipDuplicates: false,
      })
    }

    // Group by visitor and compute profiles
    const visitorGroups = new Map<string, ProcessedEvent[]>()
    for (const event of processedEvents) {
      const key = event.visitorKey
      if (!visitorGroups.has(key)) {
        visitorGroups.set(key, [])
      }
      visitorGroups.get(key)!.push(event)
    }

    // Calculate time window (default: last 30 days from latest event)
    const allTimestamps = processedEvents.map((e) => e.eventTs.getTime())
    const latestTs = Math.max(...allTimestamps)
    const earliestTs = Math.min(...allTimestamps)
    const windowEnd = new Date(latestTs)
    const windowStart = new Date(Math.max(earliestTs, latestTs - 30 * 24 * 60 * 60 * 1000))

    // Process each visitor
    for (const [visitorKey, events] of visitorGroups.entries()) {
      await processVisitorProfile(tenantId, visitorKey, events, windowStart, windowEnd)
    }

    if (processedEvents.length === 0) {
      const errorMsg = `No valid events found. CSV had ${rows.length} rows but none had valid timestamps. Check CSV format.`
      console.error(errorMsg)
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'error',
          error: errorMsg,
          rowCount: 0,
        },
      })
      return { rowCount: 0, error: errorMsg }
    }

    // Update upload status
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'completed',
        rowCount: processedEvents.length,
        processedAt: new Date(),
      },
    })

    return { rowCount: processedEvents.length }
  } catch (error: any) {
    console.error('Error processing CSV:', error)
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'error',
        error: error.message || 'Unknown error',
      },
    })
    return { rowCount: 0, error: error.message }
  }
}

/**
 * Process visitor profile from events
 */
async function processVisitorProfile(
  tenantId: string,
  visitorKey: string,
  events: ProcessedEvent[],
  windowStart: Date,
  windowEnd: Date
): Promise<void> {
  if (events.length === 0) return

  // Group into sessions
  const sessions = groupIntoSessions(events)

  // Calculate aggregates
  const sortedEvents = [...events].sort((a, b) => a.eventTs.getTime() - b.eventTs.getTime())
  const firstSeenAt = sortedEvents[0].eventTs
  const lastSeenAt = sortedEvents[sortedEvents.length - 1].eventTs

  const pageViews = events.filter((e) => {
    const et = (e.eventType || '').toLowerCase()
    return et.includes('page_view') || et.includes('pageview') || et === 'view'
  }).length

  const uniquePages = new Set(events.map((e) => e.url).filter(Boolean)).size

  const totalTimeOnPageMs = events
    .map((e) => e.timeOnPageMs || 0)
    .reduce((sum, t) => sum + t, 0)

  const avgTimeOnPageMs = pageViews > 0 ? totalTimeOnPageMs / pageViews : 0

  const maxScrollPct = Math.max(
    ...events.map((e) => e.scrollPct || 0),
    0
  )

  // Calculate flags
  const visitedKeyPage = events.some((e) => isKeyPage(e.url))
  const ctaClicked = events.some((e) => isCTAClick(e.elementIdentifier, e.url))
  const exitIntentTriggered = events.some((e) => isExitIntent(e.eventType))
  const videoEngaged = events.some((e) => isVideoEngaged(e.eventType))

  const flags: VisitorFlags = {
    is_repeat_visitor: sessions.length >= 2,
    high_attention: totalTimeOnPageMs >= 60000,
    visited_key_page: visitedKeyPage,
    cta_clicked: ctaClicked,
    exit_intent_triggered: exitIntentTriggered,
    video_engaged: videoEngaged,
  }

  // Calculate score
  const score = calculateEngagementScore({
    visitsCount: sessions.length,
    totalTimeOnPageMs,
    maxScrollPercentage: maxScrollPct,
    visitedKeyPage,
    ctaClicked,
    exitIntentTriggered,
    videoEngaged,
  })

  const segment = getEngagementSegment(score)

  // Extract identity overlay first (needed for address-based geo)
  const firstEvent = events[0]
  const identity: any = {}
  const raw = firstEvent?.rawJson as Record<string, unknown> | undefined

  if (raw) {
    // Handle both uppercase (Smart Pixel) and mixed case column names
    if (raw['FIRST_NAME'] || raw['First Name'] || raw['first_name']) {
      identity.firstName = raw['FIRST_NAME'] || raw['First Name'] || raw['first_name']
    }
    if (raw['LAST_NAME'] || raw['Last Name'] || raw['last_name']) {
      identity.lastName = raw['LAST_NAME'] || raw['Last Name'] || raw['last_name']
    }
    if (raw['COMPANY_NAME'] || raw['Company Name'] || raw['company_name']) {
      identity.companyName = raw['COMPANY_NAME'] || raw['Company Name'] || raw['company_name']
    }
    if (raw['COMPANY_DOMAIN'] || raw['Company Domain'] || raw['company_domain']) {
      identity.companyDomain = raw['COMPANY_DOMAIN'] || raw['Company Domain'] || raw['company_domain']
    }
    if (raw['JOB_TITLE'] || raw['Job Title'] || raw['job_title']) {
      identity.jobTitle = raw['JOB_TITLE'] || raw['Job Title'] || raw['job_title']
    }
    if (raw['SENIORITY_LEVEL'] || raw['Seniority Level'] || raw['seniority_level']) {
      identity.seniorityLevel = raw['SENIORITY_LEVEL'] || raw['Seniority Level'] || raw['seniority_level']
    }
    if (raw['BUSINESS_EMAIL'] || raw['Business Email'] || raw['business_email']) {
      identity.businessEmail = raw['BUSINESS_EMAIL'] || raw['Business Email'] || raw['business_email']
    }
    if (raw['DIRECT_NUMBER'] || raw['Direct Number'] || raw['direct_number']) {
      identity.phone = raw['DIRECT_NUMBER'] || raw['Direct Number'] || raw['direct_number']
    }
    if (raw['MOBILE_PHONE'] || raw['Mobile Phone'] || raw['mobile_phone']) {
      identity.mobilePhone = raw['MOBILE_PHONE'] || raw['Mobile Phone'] || raw['mobile_phone']
    }
    // Extract address fields
    if (raw['PERSONAL_ADDRESS'] || raw['Personal Address'] || raw['personal_address']) {
      identity.address = raw['PERSONAL_ADDRESS'] || raw['Personal Address'] || raw['personal_address']
    }
    if (raw['COMPANY_ADDRESS'] || raw['Company Address'] || raw['company_address']) {
      identity.companyAddress = raw['COMPANY_ADDRESS'] || raw['Company Address'] || raw['company_address']
    }
    if (raw['PERSONAL_CITY'] || raw['Personal City'] || raw['personal_city']) {
      identity.city = raw['PERSONAL_CITY'] || raw['Personal City'] || raw['personal_city']
    }
    if (raw['PERSONAL_STATE'] || raw['Personal State'] || raw['personal_state']) {
      identity.state = raw['PERSONAL_STATE'] || raw['Personal State'] || raw['personal_state']
    }
    if (raw['PERSONAL_ZIP'] || raw['Personal Zip'] || raw['personal_zip']) {
      identity.zip = raw['PERSONAL_ZIP'] || raw['Personal Zip'] || raw['personal_zip']
    }
  }

  // Get geo: prefer address geocoding when sheet has address (accurate map), else IP-based
  let geo: { lat?: number; lng?: number; city?: string; region?: string; country?: string } = {}
  const addressFromSheet = (raw?.['PERSONAL_ADDRESS'] || raw?.['Personal Address'] || raw?.['personal_address'] || raw?.['COMPANY_ADDRESS'] || raw?.['Company Address'] || raw?.['company_address']) as string | undefined
  const cityFromSheet = (raw?.['PERSONAL_CITY'] || raw?.['Personal City'] || raw?.['personal_city'] || raw?.['COMPANY_CITY'] || raw?.['Company City'] || raw?.['company_city']) as string | undefined
  const stateFromSheet = (raw?.['PERSONAL_STATE'] || raw?.['Personal State'] || raw?.['personal_state'] || raw?.['COMPANY_STATE'] || raw?.['Company State'] || raw?.['company_state']) as string | undefined
  const zipFromSheet = (raw?.['PERSONAL_ZIP'] || raw?.['Personal Zip'] || raw?.['personal_zip'] || raw?.['COMPANY_ZIP'] || raw?.['Company Zip'] || raw?.['company_zip']) as string | undefined
  const countryFromSheet = (raw?.['PERSONAL_COUNTRY'] || raw?.['Personal Country'] || raw?.['personal_country'] || raw?.['COMPANY_COUNTRY'] || raw?.['Company Country'] || raw?.['company_country'] || 'US') as string
  const hasAddressFromSheet = !!(addressFromSheet || cityFromSheet || stateFromSheet || zipFromSheet)

  if (hasAddressFromSheet) {
    // Prefer address geocoding when sheet has address - map shows accurate location
    const { geocodeAddress } = await import('./geo')
    const addressGeo = await geocodeAddress(
      addressFromSheet || '',
      cityFromSheet || '',
      stateFromSheet || '',
      zipFromSheet || '',
      countryFromSheet || 'US'
    )
    if (addressGeo?.lat && addressGeo?.lng) {
      geo = {
        lat: addressGeo.lat,
        lng: addressGeo.lng,
        city: addressGeo.city || cityFromSheet || undefined,
        region: addressGeo.region || stateFromSheet || undefined,
        country: addressGeo.country || countryFromSheet || undefined,
      }
      console.log(`Using address geocode for visitor ${visitorKey}:`, geo)
    }
  }

  if (!geo.lat || !geo.lng) {
    // Fallback: IP-based geo or event coordinates
    const eventWithGeo = events.find((e) => e.coordinates || e.ip)
    if (eventWithGeo) {
      if (eventWithGeo.coordinates) {
        geo = {
          lat: eventWithGeo.coordinates.lat,
          lng: eventWithGeo.coordinates.lng,
        }
        console.log(`Using event coordinates for visitor ${visitorKey}:`, geo)
      } else if (eventWithGeo.ip) {
        const geoData = await getGeoLocation(eventWithGeo.ip)
        if (geoData) {
          geo = geoData
          console.log(`Using IP geo for visitor ${visitorKey}:`, geo)
        }
      }
    }
  }

  // Upsert visitor profile
  await prisma.visitorProfile.upsert({
    where: {
      tenantId_windowStart_windowEnd_visitorKey: {
        tenantId,
        windowStart,
        windowEnd,
        visitorKey,
      },
    },
    update: {
      lastSeenAt,
      visitsCount: sessions.length,
      totalEvents: events.length,
      pageViews,
      uniquePagesCount: uniquePages,
      totalTimeOnPageMs,
      avgTimeOnPageMs,
      maxScrollPercentage: maxScrollPct,
      flags: flags as any,
      engagementScore: score,
      engagementSegment: segment,
      lat: geo.lat || null,
      lng: geo.lng || null,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      identity: Object.keys(identity).length > 0 ? identity : null,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      windowStart,
      windowEnd,
      visitorKey,
      firstSeenAt,
      lastSeenAt,
      visitsCount: sessions.length,
      totalEvents: events.length,
      pageViews,
      uniquePagesCount: uniquePages,
      totalTimeOnPageMs,
      avgTimeOnPageMs,
      maxScrollPercentage: maxScrollPct,
      flags: flags as any,
      engagementScore: score,
      engagementSegment: segment,
      lat: geo.lat || null,
      lng: geo.lng || null,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      identity: Object.keys(identity).length > 0 ? identity : null,
    },
  })
}

