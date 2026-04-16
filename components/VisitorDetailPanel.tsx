'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

interface Event {
  id: string
  eventTs: string
  eventType: string | null
  url: string | null
  referrerUrl: string | null
  timeOnPageMs: number | null
  scrollPct: number | null
  elementIdentifier: string | null
  elementText: string | null
  title: string | null
}

interface VisitorDetailPanelProps {
  visitor: {
    visitorKey: string
    firstSeenAt: string
    lastSeenAt: string
    visitsCount: number
    totalEvents: number
    pageViews: number
    uniquePagesCount: number
    totalTimeOnPageMs: number
    avgTimeOnPageMs: number
    maxScrollPercentage: number
    flags: any
    engagementScore: number
    engagementSegment: string
    lat: number | null
    lng: number | null
    city: string | null
    region: string | null
    country: string | null
    identity: any
    ip?: string | null
  }
  events: Event[]
  tenantName?: string
  tenantId?: string
  aiSummary?: string
}

export default function VisitorDetailPanel({
  visitor,
  events,
  tenantName,
  tenantId,
  aiSummary,
}: VisitorDetailPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  const maskVisitorKey = (key: string) => {
    if (key.length <= 6) return key
    return key.slice(-12)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return

    if (visitor.lat && visitor.lng) {
      import('leaflet').then((L) => {

        const map = L.default.map(mapRef.current!).setView([visitor.lat!, visitor.lng!], 10)

        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map)

        L.default.marker([visitor.lat!, visitor.lng!]).addTo(map)

        mapInstanceRef.current = map
      })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [visitor.lat, visitor.lng])

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Breadcrumbs and Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <nav className="text-sm text-gray-500 mb-2">
              <span>Home</span>
              {tenantName && (
                <>
                  <span className="mx-2">›</span>
                  <span>{tenantName}</span>
                </>
              )}
              <span className="mx-2">›</span>
              <span className="text-gray-900">Visitors</span>
            </nav>
            <h1 className="text-xl font-semibold text-gray-900">
              {visitor.identity?.firstName || visitor.identity?.lastName
                ? `${visitor.identity.firstName || ''} ${visitor.identity.lastName || ''}`.trim()
                : `Visitor: ${maskVisitorKey(visitor.visitorKey)}`}
              {tenantName ? ` - ${tenantName}` : ''}
            </h1>
          </div>
          {tenantId && (
            <Link
              href={`/dashboard/${tenantId}`}
              className="text-sm link-primary-blue"
            >
              ← Back to Dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Map Section - at top, large */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div ref={mapRef} className="h-64 w-full relative">
            {(!visitor.lat || !visitor.lng) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    No location data available
                  </p>
                  <p className="text-xs text-gray-500">
                    {visitor.identity?.address || visitor.identity?.city || visitor.identity?.state || visitor.identity?.zip
                      ? 'Address could not be geocoded. Re-upload with valid address.'
                      : 'Visitors need address or IP for location on map'}
                  </p>
                </div>
              </div>
            )}
          </div>
          {visitor.lat && visitor.lng && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Selected visitor&apos;s location
              </span>
            </div>
          )}
        </div>

        {/* AI Summary and Contact Information Side by Side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* AI Summary */}
          {aiSummary && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">AI Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{aiSummary}</p>
            </div>
          )}

          {/* Contact Information - only show Address when sheet has it */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
            {visitor.identity && (
              <div className="space-y-2">
                {(visitor.identity.firstName || visitor.identity.lastName) && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Name:</span> {visitor.identity.firstName || ''} {visitor.identity.lastName || ''}
                  </p>
                )}
                {visitor.identity.companyName && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Company:</span> {visitor.identity.companyName}
                  </p>
                )}
                {visitor.identity.businessEmail && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Email:</span> {visitor.identity.businessEmail}
                  </p>
                )}
                {visitor.identity.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Phone:</span> {visitor.identity.phone}
                  </p>
                )}
                {(visitor.identity.address || visitor.identity.companyAddress || visitor.identity.city || visitor.identity.state || visitor.identity.zip) && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-900 mb-1">Address:</p>
                    <p className="text-sm text-gray-600">
                      {[
                        visitor.identity.address || visitor.identity.companyAddress,
                        visitor.identity.city,
                        visitor.identity.state,
                        visitor.identity.zip
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            {visitor.ip && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium text-gray-900">IP:</span> <span className="font-mono">{visitor.ip}</span>
              </p>
            )}
            {(visitor.city || visitor.region || visitor.country) && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium text-gray-900">Location:</span> {[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Visit Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Visit Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Visits:</span>
              <span className="font-medium text-gray-900">{visitor.visitsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">First Seen:</span>
              <span className="font-medium text-gray-900">{formatDate(visitor.firstSeenAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Seen:</span>
              <span className="font-medium text-gray-900">{formatDate(visitor.lastSeenAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Time:</span>
              <span className="font-medium text-gray-900">
                {Math.round(visitor.totalTimeOnPageMs / 1000)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Engagement Score:</span>
              <span className="font-medium text-gray-900">
                {visitor.engagementScore} ({visitor.engagementSegment})
              </span>
            </div>
          </div>
        </div>

        {/* Visit History */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Visit History</h3>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">No events found</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {event.eventType || 'event'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{formatDate(event.eventTs)}</p>
                    {event.url && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        From: {event.url}
                      </p>
                    )}
                    {event.elementIdentifier && (
                      <p className="text-xs text-gray-500 mt-1">
                        Element: {event.elementIdentifier}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

