'use client'

import { useEffect, useRef, useState } from 'react'

interface Visitor {
  id: string
  visitorKey: string
  lat: number | null
  lng: number | null
  city: string | null
  engagementScore: number
  visitsCount: number
  totalTimeOnPageMs: number
  lastSeenAt: string
}

interface VisitorMapProps {
  visitors: Visitor[]
}

export default function VisitorMap({ visitors }: VisitorMapProps) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)

  // Initialize map only once
  useEffect(() => {
    if (!containerRef.current || initializedRef.current || typeof window === 'undefined') return

    // Dynamically import Leaflet only on client side
    import('leaflet').then((L) => {
      // Default: US center, zoom 4. When we have markers, fitBounds will override.
      const map = L.default.map(containerRef.current!).setView([39.5, -98.35], 4)

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      mapRef.current = map
      initializedRef.current = true
      setMapReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        initializedRef.current = false
        markersRef.current = []
      }
    }
  }, [])

  // Update markers when visitors change or map becomes ready (fixes empty map on production)
  useEffect(() => {
    if (!mapRef.current || !initializedRef.current || !mapReady) return

    import('leaflet').then((L) => {
      // Remove existing markers
      markersRef.current.forEach((marker) => {
        mapRef.current.removeLayer(marker)
      })
      markersRef.current = []

      // Add new markers
      const visitorsWithCoords = visitors.filter((v) => v.lat && v.lng)
      
      visitorsWithCoords.forEach((visitor) => {
        const color = 
          visitor.engagementScore >= 9 ? '#FF8C02' :
          visitor.engagementScore >= 6 ? '#FF8C02' :
          visitor.engagementScore >= 3 ? '#1D6E95' :
          '#6b7280'

        const marker = L.default.circleMarker([visitor.lat!, visitor.lng!], {
          radius: 6,
          fillColor: color,
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7,
        }).addTo(mapRef.current)

        marker.bindPopup(`
          <div style="padding: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">Visitor: ${visitor.visitorKey.slice(-6)}</p>
            <p style="margin: 2px 0;">Score: ${visitor.engagementScore}</p>
            <p style="margin: 2px 0;">Visits: ${visitor.visitsCount}</p>
            <p style="margin: 2px 0;">Time: ${Math.round(visitor.totalTimeOnPageMs / 1000)}s</p>
            ${visitor.city ? `<p style="margin: 2px 0;">Location: ${visitor.city}</p>` : ''}
          </div>
        `)

        markersRef.current.push(marker)
      })

      // Fit bounds to show all markers
      if (visitorsWithCoords.length > 0) {
        const bounds = L.default.latLngBounds(
          visitorsWithCoords.map((v) => [v.lat!, v.lng!])
        )
        mapRef.current.fitBounds(bounds, { padding: [20, 20] })
      }
    })
  }, [visitors, mapReady])

  const coordCount = visitors.filter((v) => v.lat && v.lng).length

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Visitor Map</h2>
        <p className="text-sm text-gray-500 mt-1">
          {coordCount > 0
            ? `${coordCount} visitors with location data`
            : 'No location data — re-upload CSV with address or IP for map'}
        </p>
      </div>
      <div ref={containerRef} className="h-96 w-full relative">
        {coordCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-[1000]">
            <p className="text-sm text-gray-600">Re-upload CSV with address fields for accurate map</p>
          </div>
        )}
      </div>
    </div>
  )
}
