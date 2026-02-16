'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import VisitorSidebar from '@/components/VisitorSidebar'
import VisitorDetailPanel from '@/components/VisitorDetailPanel'

interface DashboardData {
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
    ip?: string | null
  }>
  metrics: {
    totalVisitors: number
  }
}

interface VisitorDetailData {
  profile: any
  events: any[]
}

export default function VisitorsPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const [window, setWindow] = useState('L30')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorDetailData | null>(null)
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null)
  const [loadingVisitor, setLoadingVisitor] = useState(false)
  const [tenantName, setTenantName] = useState<string>('')

  useEffect(() => {
    if (tenantId) {
      fetchDashboard()
      fetchTenantName()
    }
  }, [tenantId, window])

  const fetchTenantName = async () => {
    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const tenants = await res.json()
        const tenant = tenants.find((t: any) => t.id === tenantId)
        if (tenant) {
          setTenantName(tenant.name)
        }
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
    }
  }

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?tenantId=${tenantId}&window=${window}`)
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
        
        // Auto-select first visitor if none selected
        if (dashboardData.profiles.length > 0 && !selectedVisitorId) {
          handleVisitorSelect(dashboardData.profiles[0])
        }
      } else {
        const error = await res.json()
        console.error('Failed to load dashboard:', error)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVisitorSelect = async (visitor: any) => {
    setSelectedVisitorId(visitor.id)
    setLoadingVisitor(true)
    try {
      const res = await fetch(
        `/api/visitor/${encodeURIComponent(visitor.visitorKey)}?tenantId=${tenantId}`
      )
      if (res.ok) {
        const visitorData = await res.json()
        setSelectedVisitor(visitorData)
      } else {
        console.error('Failed to load visitor details')
      }
    } catch (error) {
      console.error('Error fetching visitor:', error)
    } finally {
      setLoadingVisitor(false)
    }
  }

  // Generate AI summary for selected visitor
  const generateVisitorSummary = (visitor: any, events: any[]) => {
    const referrer = events.find((e: any) => e.referrerUrl)?.referrerUrl
    const firstVisit = new Date(visitor.firstSeenAt)
    const lastVisit = new Date(visitor.lastSeenAt)
    const isSingleVisit = visitor.visitsCount === 1
    const hasExitIntent = visitor.flags?.exit_intent_triggered
    const hasClicks = visitor.flags?.cta_clicked
    const eventsList = events.map((e: any) => e.eventType).filter(Boolean).join(', ')

    let summary = `This visitor`
    if (isSingleVisit) {
      summary += `, who accessed our site${referrer ? ` through ${referrer}` : ''}, made their first and only visit on ${firstVisit.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}.`
      summary += ` With a single page view, there is an opportunity to engage this visitor further and potentially convert them into a recurring user.`
    } else {
      summary += ` has made ${visitor.visitsCount} visits to the website, with their last visit on ${lastVisit.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}.`
      if (referrer) {
        summary += ` They were referred to the site from ${referrer}`
      }
      if (hasExitIntent || hasClicks) {
        summary += ` and have engaged with ${hasExitIntent ? 'exit_intent' : ''}${hasExitIntent && hasClicks ? ' and ' : ''}${hasClicks ? 'click' : ''} events during their visits.`
      }
      summary += ` Understanding their behavior and interests can help tailor a targeted marketing approach to further engage this visitor.`
    }

    if (!visitor.city && !visitor.country && !visitor.identity) {
      summary += ` Their location and contact information remain unknown, presenting a challenge in tailoring personalized outreach strategies.`
    }

    return summary
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">Loading visitors...</div>
      </div>
    )
  }

  if (!data || data.profiles.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="mb-2">No visitors found</p>
          <p className="text-sm">Upload a CSV file to see visitor data</p>
        </div>
      </div>
    )
  }

  // Calculate total events
  const totalEvents = data.profiles.reduce((sum, p) => sum + p.totalEvents, 0)

  // Get IP addresses for visitors (from first event or profile)
  const visitorsWithIp = data.profiles.map((profile) => ({
    ...profile,
    ip: profile.ip || null, // We'll need to get this from raw events
  }))

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0">
        <VisitorSidebar
          visitors={visitorsWithIp}
          selectedVisitorId={selectedVisitorId}
          onVisitorSelect={handleVisitorSelect}
          totalEvents={totalEvents}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loadingVisitor ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-500">Loading visitor details...</div>
          </div>
        ) : selectedVisitor ? (
          <VisitorDetailPanel
            visitor={{
              ...selectedVisitor.profile,
              ip: selectedVisitor.profile.ip || null,
            }}
            events={selectedVisitor.events}
            tenantName={tenantName}
            tenantId={tenantId}
            aiSummary={generateVisitorSummary(selectedVisitor.profile, selectedVisitor.events)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-500">
              <p>Select a visitor from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

