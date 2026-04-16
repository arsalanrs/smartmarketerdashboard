'use client'

import { useState } from 'react'

interface Visitor {
  id: string
  visitorKey: string
  ip?: string | null
  visitsCount: number
  totalEvents: number
  lastSeenAt: string
  engagementSegment: string
  identity?: any
}

interface VisitorSidebarProps {
  visitors: Visitor[]
  selectedVisitorId: string | null
  onVisitorSelect: (visitor: Visitor) => void
  totalEvents: number
}

export default function VisitorSidebar({
  visitors,
  selectedVisitorId,
  onVisitorSelect,
  totalEvents,
}: VisitorSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const getVisitorDisplayName = (visitor: Visitor) => {
    if (visitor.identity) {
      const firstName = visitor.identity.firstName || ''
      const lastName = visitor.identity.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      if (fullName) return fullName
    }
    // Fallback to masked key
    if (visitor.visitorKey.length <= 6) return visitor.visitorKey
    return visitor.visitorKey.slice(-12)
  }

  const filteredVisitors = visitors.filter((v) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = v.identity ? `${v.identity.firstName || ''} ${v.identity.lastName || ''}`.trim().toLowerCase() : ''
    const company = v.identity?.companyName?.toLowerCase() || ''
    return (
      v.visitorKey.toLowerCase().includes(query) ||
      (v.ip && v.ip.toLowerCase().includes(query)) ||
      name.includes(query) ||
      company.includes(query)
    )
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {visitors.length} Unique Visitors ({totalEvents} events)
        </h2>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-gray-200 p-4 space-y-2">
        <input
          type="text"
          placeholder="Search visitors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-[#1D6E95] focus:ring-[#1D6E95] placeholder-gray-400"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          + Add Filter (0/5)
        </button>
      </div>

      {/* Visitor List */}
      <div className="flex-1 overflow-y-auto">
        {filteredVisitors.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No visitors found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredVisitors.map((visitor) => (
              <button
                key={visitor.id}
                onClick={() => onVisitorSelect(visitor)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedVisitorId === visitor.id ? 'border-l-4' : ''
                }`}
                style={selectedVisitorId === visitor.id 
                  ? { backgroundColor: 'rgba(29, 110, 149, 0.1)', borderLeftColor: '#1D6E95' }
                  : { borderLeftColor: 'transparent' }
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getVisitorDisplayName(visitor)}
                    </p>
                    {visitor.identity?.companyName && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{visitor.identity.companyName}</p>
                    )}
                    {visitor.ip && (
                      <p className="text-xs text-gray-500 mt-1">{visitor.ip}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Last seen: {new Date(visitor.lastSeenAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {visitor.visitsCount} {visitor.visitsCount === 1 ? 'visit' : 'visits'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

