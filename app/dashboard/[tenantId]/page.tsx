'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import KPICards from '@/components/KPICards'
import EngagementBreakdown from '@/components/EngagementBreakdown'
import VisitorMap from '@/components/VisitorMap'
import VisitorList from '@/components/VisitorList'
import VisitorDetail from '@/components/VisitorDetail'
import AISummary from '@/components/AISummary'

interface DashboardData {
  windowStart: string
  windowEnd: string
  metrics: {
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
  profiles: Array<{
    id: string
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
  }>
}

interface VisitorDetailData {
  profile: any
  events: any[]
}

export default function DashboardPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const [window, setWindow] = useState('L30')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorDetailData | null>(null)
  const [loadingVisitor, setLoadingVisitor] = useState(false)

  useEffect(() => {
    if (tenantId) {
      fetchDashboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, window])

  // Auto-refresh every 30 seconds to catch new uploads (less aggressive)
  useEffect(() => {
    if (!tenantId) return
    
    const interval = setInterval(() => {
      // Only refresh if not currently loading
      if (!loading) {
        fetchDashboard()
      }
    }, 30000) // 30 seconds instead of 10

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, window])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?tenantId=${tenantId}&window=${window}`)
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to load dashboard')
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      alert('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleVisitorClick = async (visitor: any) => {
    setLoadingVisitor(true)
    try {
      const res = await fetch(
        `/api/visitor/${encodeURIComponent(visitor.visitorKey)}?tenantId=${tenantId}`
      )
      if (res.ok) {
        const visitorData = await res.json()
        setSelectedVisitor(visitorData)
      } else {
        alert('Failed to load visitor details')
      }
    } catch (error) {
      console.error('Error fetching visitor:', error)
      alert('Failed to load visitor details')
    } finally {
      setLoadingVisitor(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center text-red-600">Failed to load dashboard data</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="rounded-md bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:bg-gray-400"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="L7">Last 7 days</option>
            <option value="L30">Last 30 days</option>
            <option value="L90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6">
        <KPICards metrics={data.metrics} />
      </div>

      {/* Engagement Breakdown */}
      <div className="mb-6">
        <EngagementBreakdown
          breakdown={data.metrics.engagementBreakdown}
          total={data.metrics.totalVisitors}
        />
      </div>

      {/* Map and AI Summary Side by Side */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VisitorMap visitors={data.profiles} />
        <AISummary tenantId={tenantId} window={window} />
      </div>

      {/* Visitor List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Visitors</h2>
          <Link
            href={`/dashboard/${tenantId}/visitors`}
            className="text-sm link-primary-blue"
          >
            View All Visitors →
          </Link>
        </div>
        <VisitorList visitors={data.profiles} onVisitorClick={handleVisitorClick} />
      </div>

      {/* Visitor Detail Drawer */}
      {selectedVisitor && (
        <VisitorDetail
          tenantId={tenantId}
          visitor={selectedVisitor.profile}
          events={selectedVisitor.events}
          onClose={() => setSelectedVisitor(null)}
        />
      )}

      {loadingVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6">
            <p>Loading visitor details...</p>
          </div>
        </div>
      )}
    </div>
  )
}

