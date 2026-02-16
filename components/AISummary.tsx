'use client'

import { useState, useEffect } from 'react'

interface AISummaryProps {
  tenantId: string
  window: string
}

interface Summary {
  id: string
  executiveSummary: string
  keyObservations: string[]
  recommendedActions: string[]
  notableSegments: Array<{ segment: string; description: string }>
  createdAt: string
}

export default function AISummary({ tenantId, window }: AISummaryProps) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-summary?tenantId=${tenantId}&window=${window}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      } else if (res.status === 404) {
        // 404 is expected when no summary exists yet - don't show as error
        setError(null)
        setSummary(null)
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to load summary')
      }
    } catch (err: any) {
      // Only show error if it's not a network error (which might be expected)
      if (err.name !== 'TypeError') {
        setError(err.message || 'Failed to load summary')
      }
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, window, forceRegenerate: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to generate summary')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  // Load summary on mount
  useEffect(() => {
    loadSummary()
  }, [tenantId, window])

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
          <div className="flex gap-2">
            <button
              onClick={loadSummary}
              disabled={loading}
              className="rounded-md px-3 py-1 text-sm text-white disabled:opacity-50 btn-primary-orange"
            >
              Refresh
            </button>
            <button
              onClick={generateSummary}
              disabled={loading}
              className="rounded-md px-3 py-1 text-sm text-white disabled:opacity-50 btn-primary-blue"
            >
              {loading ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && !summary && (
          <div className="text-center text-gray-500">Loading...</div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {summary && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Executive Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{summary.executiveSummary}</p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Key Observations</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                {summary.keyObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Recommended Actions</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                {summary.recommendedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>

            {summary.notableSegments && summary.notableSegments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Notable Segments</h3>
                <div className="space-y-2">
                  {summary.notableSegments.map((seg, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{seg.segment}</p>
                      <p className="text-xs text-gray-600">{seg.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Generated: {new Date(summary.createdAt).toLocaleString()}
            </div>
          </div>
        )}

        {!summary && !loading && !error && (
          <div className="text-center text-gray-500">
            <p>No summary available. Click "Generate Summary" to create one.</p>
          </div>
        )}
      </div>
    </div>
  )
}

