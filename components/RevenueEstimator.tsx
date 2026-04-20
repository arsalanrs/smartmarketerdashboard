'use client'

import { useEffect, useMemo, useState } from 'react'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatBannerDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export interface RevenueEstimatorProps {
  uploadId: string
  tenantId: string
}

interface UploadPayload {
  id: string
  status: string
  rowCount: number | null
  dataStartDate: string | null
  dataEndDate: string | null
  totalEvents: number | null
  uniqueVisitors: number | null
  highIntentCount: number | null
}

export default function RevenueEstimator({ uploadId }: RevenueEstimatorProps) {
  const [upload, setUpload] = useState<UploadPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [matchRate, setMatchRate] = useState(50)
  const [closeRate, setCloseRate] = useState(10)
  const [avgDealValue, setAvgDealValue] = useState(1000)
  const [monthlyVisitorsInput, setMonthlyVisitorsInput] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/upload/${uploadId}`)
        if (!res.ok) {
          setLoadError('Could not load upload details.')
          return
        }
        const data = (await res.json()) as UploadPayload
        if (cancelled) return
        setUpload(data)
        setLoadError(null)

        const unique = data.uniqueVisitors ?? 0
        const start = data.dataStartDate ? new Date(data.dataStartDate).getTime() : null
        const end = data.dataEndDate ? new Date(data.dataEndDate).getTime() : null

        let daysInRecord = 1
        let monthly = 0

        if (start != null && end != null && !Number.isNaN(start) && !Number.isNaN(end)) {
          daysInRecord = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
          monthly = Math.round((unique / daysInRecord) * 30)
          if (daysInRecord < 3) {
            monthly = Math.max(monthly, unique * 4)
          }
        } else {
          daysInRecord = 30
          monthly = unique
        }

        setMonthlyVisitorsInput(monthly)
      } catch {
        if (!cancelled) setLoadError('Could not load upload details.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uploadId])

  const derived = useMemo(() => {
    const unique = upload?.uniqueVisitors ?? 0
    const highIntent = upload?.highIntentCount ?? 0
    const start = upload?.dataStartDate ? new Date(upload.dataStartDate).getTime() : null
    const end = upload?.dataEndDate ? new Date(upload.dataEndDate).getTime() : null

    let daysInRecord = 1
    if (start != null && end != null && !Number.isNaN(start) && !Number.isNaN(end)) {
      daysInRecord = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
    } else {
      daysInRecord = 30
    }

    const monthlyVisitors = monthlyVisitorsInput

    const identifiedVisitorsMonth = Math.round(monthlyVisitors * (matchRate / 100))
    const highIntentIdentified =
      unique === 0
        ? identifiedVisitorsMonth * 0.3
        : identifiedVisitorsMonth * (highIntent / unique)
    const projectedLeads = highIntentIdentified
    const potentialMonthlyRevenue = projectedLeads * (closeRate / 100) * avgDealValue
    const annualRevenuePotential = potentialMonthlyRevenue * 12

    return {
      daysInRecord,
      identifiedVisitorsMonth,
      highIntentIdentified,
      projectedLeads,
      potentialMonthlyRevenue,
      annualRevenuePotential,
      hasDateRange: Boolean(upload?.dataStartDate && upload?.dataEndDate),
    }
  }, [upload, monthlyVisitorsInput, matchRate, closeRate, avgDealValue])

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {loadError}
      </div>
    )
  }

  if (!upload) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        Loading revenue estimate…
      </div>
    )
  }

  const showSmallSample = derived.hasDateRange && derived.daysInRecord < 14
  const dateCallout =
    derived.hasDateRange && upload.dataStartDate && upload.dataEndDate ? (
      <p className="text-sm text-gray-800">
        <span aria-hidden>📊 </span>
        Based on your actual pixel data from{' '}
        <strong>{formatBannerDate(upload.dataStartDate)}</strong> to{' '}
        <strong>{formatBannerDate(upload.dataEndDate)}</strong> ({derived.daysInRecord} days)
      </p>
    ) : (
      <p className="text-sm text-amber-900">
        Date range was not stored for this upload (older processing). Monthly visitors default to
        unique visitor count without day-based extrapolation.
      </p>
    )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 rounded-lg border border-[#1D6E95]/20 bg-[#1D6E95]/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1D6E95]">
          Based on your actual pixel data
        </p>
        <div className="mt-2">{dateCallout}</div>
      </div>

      {showSmallSample && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span aria-hidden>⚠️ </span>
          Your pixel file covers only {derived.daysInRecord} days. The monthly estimate below is
          extrapolated. A 30-day sample gives the most reliable projection.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-800">
              Monthly Visitors (from your pixel)
            </label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95]"
              value={monthlyVisitorsInput}
              onChange={(e) => setMonthlyVisitorsInput(Math.max(0, Number(e.target.value)))}
            />
            <p className="mt-1 text-xs text-gray-500">
              Extrapolated from unique visitors ÷ days in file × 30 (editable).
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">
              Identification Match Rate: {matchRate}%
            </label>
            <input
              type="range"
              min={10}
              max={80}
              step={1}
              value={matchRate}
              onChange={(e) => setMatchRate(Number(e.target.value))}
              className="mt-2 w-full accent-[#1D6E95]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Realistic range: 40%–60% (industry actual). Slider allows 10%–80%.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">Close Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95]"
              value={closeRate}
              onChange={(e) => setCloseRate(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-800">Average Deal Value ($)</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95]"
              value={avgDealValue}
              onChange={(e) => setAvgDealValue(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Projected outcomes</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Identified Visitors/Month</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Math.round(derived.identifiedVisitorsMonth).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">at {matchRate}% match rate</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">High-Intent Identified</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Math.round(derived.highIntentIdentified).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">share of high-intent from pixel</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Projected Leads/Month</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Math.round(derived.projectedLeads).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">actionable high-intent leads</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Potential Monthly Revenue</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: '#1D6E95' }}>
                {currency.format(derived.potentialMonthlyRevenue)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                at {closeRate}% close × {currency.format(avgDealValue)} deal
              </p>
            </div>
            <div className="rounded-xl border-2 border-[#1D6E95]/30 bg-[#1D6E95]/5 p-5 shadow-sm sm:col-span-2">
              <p className="text-sm font-medium text-gray-600">Annual Revenue Potential</p>
              <p className="mt-2 text-3xl font-bold sm:text-4xl" style={{ color: '#1D6E95' }}>
                {currency.format(derived.annualRevenuePotential)}
              </p>
              <p className="mt-2 text-xs text-gray-500">Monthly projection × 12</p>
            </div>
          </div>
        </div>
      </div>

      <details className="mt-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#1D6E95]">
          Why these numbers?
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            <strong>Match rate:</strong> 40–60% reflects real identification rates from Smart Pixel
            data — not the conservative 10% often cited. This is based on actual performance.
          </li>
          <li>
            <strong>High-intent filter:</strong> Only visitors who visited key pages (pricing,
            contact, demo, checkout), clicked CTAs, or showed exit intent are counted as high-intent
            leads in your scoring model.
          </li>
          <li>
            <strong>Extrapolation:</strong> Your {derived.daysInRecord}-day pixel sample was scaled
            to 30 days using: (unique visitors in file ÷ days in record) × 30.
          </li>
        </ul>
      </details>
    </div>
  )
}
