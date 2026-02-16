'use client'

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

interface VisitorDetailProps {
  tenantId?: string
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
  }
  events: Event[]
  onClose: () => void
}

export default function VisitorDetail({ tenantId, visitor, events, onClose }: VisitorDetailProps) {
  const maskVisitorKey = (key: string) => {
    if (key.length <= 6) return '***' + key
    return '***' + key.slice(-6)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
          <div className="sticky top-0 border-b bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {visitor.identity?.firstName || visitor.identity?.lastName
                  ? `${visitor.identity.firstName || ''} ${visitor.identity.lastName || ''}`.trim()
                  : `Visitor: ${maskVisitorKey(visitor.visitorKey)}`}
              </h2>
              <div className="flex items-center gap-3">
                {tenantId && (
                  <Link
                    href={`/dashboard/${tenantId}/visitors`}
                    className="text-sm link-primary-blue"
                  >
                    View full details →
                  </Link>
                )}
                <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
            {/* Summary */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-2xl font-bold">{visitor.engagementScore}</p>
                <p className="text-xs text-gray-500">{visitor.engagementSegment}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Visits</p>
                <p className="text-2xl font-bold">{visitor.visitsCount}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Time on Page</p>
                <p className="text-2xl font-bold">{Math.round(visitor.totalTimeOnPageMs / 1000)}s</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Pages</p>
                <p className="text-2xl font-bold">{visitor.uniquePagesCount}</p>
              </div>
            </div>

            {/* Flags */}
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Signals</h3>
              <div className="flex flex-wrap gap-2">
                {visitor.flags?.is_repeat_visitor && (
                  <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(29, 110, 149, 0.1)', color: '#1D6E95' }}>
                    Repeat Visitor
                  </span>
                )}
                {visitor.flags?.high_attention && (
                  <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(29, 110, 149, 0.1)', color: '#1D6E95' }}>
                    High Attention
                  </span>
                )}
                {visitor.flags?.visited_key_page && (
                  <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(255, 140, 2, 0.1)', color: '#FF8C02' }}>
                    Visited Key Page
                  </span>
                )}
                {visitor.flags?.cta_clicked && (
                  <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(255, 140, 2, 0.1)', color: '#FF8C02' }}>
                    CTA Clicked
                  </span>
                )}
                {visitor.flags?.exit_intent_triggered && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-800">
                    Exit Intent
                  </span>
                )}
                {visitor.flags?.video_engaged && (
                  <span className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(29, 110, 149, 0.1)', color: '#1D6E95' }}>
                    Video Engaged
                  </span>
                )}
              </div>
            </div>

            {/* Location */}
            {(visitor.city || visitor.country) && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Location</h3>
                <p className="text-sm text-gray-600">
                  {[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Identity (if present) */}
            {visitor.identity && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Identity</h3>
                <div className="text-sm text-gray-600">
                  {visitor.identity.firstName && (
                    <p>Name: {visitor.identity.firstName} {visitor.identity.lastName}</p>
                  )}
                  {visitor.identity.companyName && (
                    <p>Company: {visitor.identity.companyName}</p>
                  )}
                  {visitor.identity.jobTitle && (
                    <p>Title: {visitor.identity.jobTitle}</p>
                  )}
                </div>
              </div>
            )}

            {/* Event Timeline */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Event Timeline</h3>
              <div className="space-y-2">
                {events.slice(0, 100).map((event) => (
                  <div
                    key={event.id}
                    className="rounded border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {event.eventType || 'Event'}
                        </p>
                        {event.url && (
                          <p className="text-gray-600 truncate">{event.url}</p>
                        )}
                        {event.elementIdentifier && (
                          <p className="text-gray-500 text-xs">
                            Element: {event.elementIdentifier}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right text-xs text-gray-500">
                        <p>{new Date(event.eventTs).toLocaleString()}</p>
                        {event.timeOnPageMs && (
                          <p>{Math.round(event.timeOnPageMs / 1000)}s</p>
                        )}
                        {event.scrollPct !== null && (
                          <p>{event.scrollPct.toFixed(0)}% scroll</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {events.length > 100 && (
                  <p className="text-center text-sm text-gray-500">
                    Showing first 100 of {events.length} events
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

