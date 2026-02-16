'use client'

import { useState, useEffect } from 'react'

interface DebugData {
  summary: {
    tenantsCount: number
    uploadsCount: number
    rawEventsCount: number
    visitorProfilesCount: number
  }
  tenants: Array<{
    id: string
    name: string
    domain: string | null
    createdAt: string
    _count: {
      uploads: number
      rawEvents: number
      visitorProfiles: number
    }
  }>
  recentUploads: Array<{
    id: string
    tenantId: string
    filename: string
    status: string
    rowCount: number | null
    createdAt: string
    processedAt: string | null
    error: string | null
  }>
  sampleRawEvents: Array<{
    id: string
    tenantId: string
    visitorKey: string
    eventTs: string
    eventType: string | null
    url: string | null
    ip: string | null
  }>
      sampleProfiles: Array<{
        id: string
        tenantId: string
        visitorKey: string
        engagementScore: number
        engagementSegment: string
        visitsCount: number
        totalEvents: number
        windowStart: string
        windowEnd: string
        identity: any
        city: string | null
        region: string | null
        country: string | null
        lat: number | null
        lng: number | null
      }>
      geoCacheEntries: Array<{
        ip: string
        city: string | null
        region: string | null
        country: string | null
        lat: number | null
        lng: number | null
        updatedAt: string
      }>
      uniqueIPs: Array<{
        ip: string | null
        count: number
      }>
    }

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/debug/db')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to load debug data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load debug data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Loading database info...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <h2 className="font-semibold">Error</h2>
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Database Debug</h1>
        <button
          onClick={fetchData}
          className="rounded-md px-4 py-2 text-white btn-primary-blue"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Tenants</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.tenantsCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Uploads</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.uploadsCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Raw Events</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.rawEventsCount}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Visitor Profiles</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.visitorProfilesCount}</div>
        </div>
      </div>

      {/* Tenants */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Tenants</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Domain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Uploads
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Raw Events
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Profiles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {tenant.domain || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {tenant._count.uploads}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {tenant._count.rawEvents}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {tenant._count.visitorProfiles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Uploads</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Filename
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Row Count
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.recentUploads.map((upload) => (
                <tr key={upload.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {upload.filename}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        upload.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : upload.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {upload.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {upload.rowCount ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(upload.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600">
                    {upload.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unique IPs */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Unique IP Addresses in Database</h2>
        <div className="mb-2 text-sm text-gray-600">
          This shows all unique IP addresses found in raw events. If only one IP appears, all visitors share the same IP.
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Event Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.uniqueIPs.map((entry, idx) => (
                <tr key={idx}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                    {entry.ip || '(no IP)'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {entry.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.uniqueIPs.length === 0 && (
            <div className="py-4 text-center text-gray-500">No IP addresses found</div>
          )}
        </div>
      </div>

      {/* Sample Raw Events */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sample Raw Events (Latest 20)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Visitor Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  IP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Coordinates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.sampleRawEvents.map((event) => {
                const coords = event.coordinates as any
                const coordStr = coords?.lat && coords?.lng
                  ? `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`
                  : '-'
                
                return (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-mono text-xs">
                      {event.visitorKey.slice(-8)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {event.eventType || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {event.url ? (
                        <span className="truncate max-w-xs block" title={event.url}>
                          {event.url}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-500">
                      {event.ip || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {coordStr}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(event.eventTs).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.sampleRawEvents.length === 0 && (
            <div className="py-4 text-center text-gray-500">No raw events found</div>
          )}
        </div>
      </div>

      {/* Sample Profiles */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sample Visitor Profiles (Latest 10)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Visitor Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Segment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Visits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Events
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.sampleProfiles.map((profile) => {
                const identity = profile.identity as any
                const fullName = identity?.firstName || identity?.lastName
                  ? `${identity.firstName || ''} ${identity.lastName || ''}`.trim()
                  : null
                const company = identity?.companyName || null
                const location = [profile.city, profile.region]
                  .filter(Boolean)
                  .join(', ') || '-'

                return (
                  <tr key={profile.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {fullName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                      {profile.visitorKey.slice(-8)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {company || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {location}
                      {profile.lat && profile.lng && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({profile.lat.toFixed(2)}, {profile.lng.toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {profile.engagementScore}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {profile.engagementSegment}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {profile.visitsCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {profile.totalEvents}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.sampleProfiles.length === 0 && (
            <div className="py-4 text-center text-gray-500">No visitor profiles found</div>
          )}
        </div>
      </div>

      {/* Geo Cache */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Geo Cache (Latest 10 IPs)</h2>
        <div className="mb-2 text-sm text-gray-600">
          This shows what locations are cached for IP addresses. If all IPs show the same location, there may be a geo provider issue.
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Country
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Coordinates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.geoCacheEntries.map((entry) => (
                <tr key={entry.ip}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                    {entry.ip}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {entry.city || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {entry.region || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {entry.country || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {entry.lat && entry.lng ? `${entry.lat.toFixed(2)}, ${entry.lng.toFixed(2)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(entry.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.geoCacheEntries.length === 0 && (
            <div className="py-4 text-center text-gray-500">No geo cache entries found</div>
          )}
        </div>
      </div>
    </div>
  )
}

