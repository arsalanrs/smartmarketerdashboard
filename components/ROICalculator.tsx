'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeRoiForecast,
  DEFAULT_GROSS_MARGIN_PCT,
  monthlyVisitorsFromWindow,
  type ScenarioKey,
} from '@/lib/roi-forecast'
import {
  ROI_DEFAULTS,
  roiStorageKey,
  type RoiCalculatorStoredState,
} from '@/lib/roi-storage'

interface ROICalculatorProps {
  tenantId: string
  /** Dashboard window e.g. L7, L30 */
  reportWindow: string
  metrics: { totalVisitors: number }
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function parseMargin(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function ArrowBullet() {
  return (
    <span className="mr-2 inline-block text-sky-200/90" aria-hidden>
      ↘
    </span>
  )
}

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  conservative: 'Conservative',
  expected: 'Expected',
  upside: 'Upside',
}

export default function ROICalculator({ tenantId, reportWindow, metrics }: ROICalculatorProps) {
  const [expanded, setExpanded] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState<RoiCalculatorStoredState>(() => {
    const approxMonthly = monthlyVisitorsFromWindow(metrics.totalVisitors, reportWindow)
    return {
      ...ROI_DEFAULTS,
      monthlyVisitors:
        approxMonthly > 0 ? approxMonthly : ROI_DEFAULTS.monthlyVisitors,
    }
  })

  /* eslint-disable react-hooks/set-state-in-effect -- one-shot localStorage hydration after mount */
  useEffect(() => {
    const key = roiStorageKey(tenantId)
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<RoiCalculatorStoredState>
        setForm({ ...ROI_DEFAULTS, ...parsed })
      } catch {
        /* keep server-aligned defaults */
      }
    }
    setHydrated(true)
  }, [tenantId])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(roiStorageKey(tenantId), JSON.stringify(form))
  }, [form, hydrated, tenantId])

  const update = useCallback(
    <K extends keyof RoiCalculatorStoredState>(key: K, value: RoiCalculatorStoredState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
    },
    []
  )

  const forecast = useMemo(() => {
    const grossMarginPct = parseMargin(form.grossMarginPct)
    return computeRoiForecast({
      monthlyVisitors: Math.max(0, form.monthlyVisitors),
      averageSaleValue: Math.max(0, form.averageSaleValue),
      customerLtv: Math.max(0, form.customerLtv),
      closeRatePct: Math.max(0, form.closeRatePct),
      salesCycleDays: Math.max(0, form.salesCycleDays),
      grossMarginPct,
      visitorIdentificationRatePct: Math.max(0, form.visitorIdentificationRatePct),
      baseRecoveredOpportunityRatePct: Math.max(0, form.baseRecoveredOpportunityRatePct),
      followUpSpeed: form.followUpSpeed,
      leadHandler: form.leadHandler,
      oneTimeInvestment: Math.max(0, form.oneTimeInvestment),
    })
  }, [form])

  const exp = forecast.expected
  const paybackLabel =
    forecast.paybackDays != null ? `${forecast.paybackDays} days` : '—'

  const assumptionLines: string[] = []
  assumptionLines.push(
    `Custom visitor identification rate applied: ${form.visitorIdentificationRatePct.toFixed(1)}%.`
  )
  assumptionLines.push(
    `Custom recovered opportunity rate applied: ${form.baseRecoveredOpportunityRatePct.toFixed(1)}%.`
  )
  if (forecast.executionMultiplier !== 1) {
    assumptionLines.push(
      `Sales execution adjustment applied; effective recovered opportunity rate: ${forecast.effectiveRecoveredOppRatePct.toFixed(1)}%.`
    )
  }

  const topMetrics = [
    {
      value: forecast.identifiedVisitors.toLocaleString(),
      title: 'Estimated identified visitors / month',
      desc: 'Visitors already coming to your site who may be identifiable and reachable.',
    },
    {
      value: exp.recoverableOpportunities.toLocaleString(),
      title: 'Estimated recoverable opportunities / month',
      desc: 'Potential revenue opportunities that may already exist inside your current traffic.',
    },
    {
      value: exp.newCustomers.toLocaleString(),
      title: 'Estimated new customers / month',
      desc: 'A realistic estimate of the extra customers this could help generate.',
    },
    {
      value: paybackLabel,
      title: 'Estimated payback period',
      desc: 'Time to recover your one-time investment (advanced) based on projected gross profit.',
    },
    {
      value: currency.format(exp.monthlyRevenue),
      title: 'Estimated monthly revenue impact',
      desc: 'The projected monthly revenue upside from recovering missed opportunities.',
    },
    {
      value: currency.format(exp.lifetimeRevenue),
      title: 'Estimated lifetime revenue impact',
      desc: 'The projected long-term revenue value based on your average customer lifetime value.',
    },
    {
      value: currency.format(exp.grossProfit),
      title: 'Estimated gross profit impact',
      desc: 'The projected profit impact after applying your margin assumptions.',
    },
    {
      value: String(form.salesCycleDays),
      title: 'Average sales cycle used',
      desc: 'A timing benchmark to help you interpret when results may realistically materialize.',
    },
  ]

  const inputClass =
    'mt-1 w-full rounded-lg border border-white/40 bg-white/15 px-3 py-2.5 text-white placeholder-white/40 shadow-inner outline-none ring-0 focus:border-white/70 focus:bg-white/20'

  const labelClass = 'text-sm font-semibold text-white'
  const helpClass = 'mt-1 text-xs text-white/70'

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between border-b border-gray-100 bg-white px-5 py-4 text-left transition hover:bg-gray-50"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Website Revenue Recovery Forecast
          </h2>
          <p className="text-xs text-gray-500">
            Model revenue, pipeline, and long-term value from recoverable traffic — inputs save per
            tenant.
          </p>
        </div>
        <span
          className={`ml-2 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div
          className="p-5 sm:p-6"
          style={{
            background: 'linear-gradient(165deg, #0f3d52 0%, #1d6e95 45%, #2a8ab8 100%)',
          }}
        >
          <header className="mb-8 max-w-3xl">
            <h3 className="text-2xl font-bold text-white">Website Revenue Recovery Forecast</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              See how much revenue, pipeline, and long-term customer value may already be sitting
              inside your existing website traffic — and what it could mean for your business if you
              recover it.
            </p>
          </header>

          <section className="mb-10">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/90">
              Business inputs
            </h4>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Average monthly website visitors</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.monthlyVisitors}
                  onChange={(e) => update('monthlyVisitors', Math.max(0, Number(e.target.value)))}
                />
                <p className={helpClass}>Use your average monthly traffic from the last 3–6 months.</p>
              </div>
              <div>
                <label className={labelClass}>Average sale value</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.averageSaleValue}
                  onChange={(e) => update('averageSaleValue', Math.max(0, Number(e.target.value)))}
                />
                <p className={helpClass}>Your average initial sale, project, or contract value.</p>
              </div>
              <div>
                <label className={labelClass}>Customer lifetime value (LTV)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.customerLtv}
                  onChange={(e) => update('customerLtv', Math.max(0, Number(e.target.value)))}
                />
                <p className={helpClass}>
                  Total average value of a customer over the full relationship.
                </p>
              </div>
              <div>
                <label className={labelClass}>Approximate close rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputClass}
                  value={form.closeRatePct}
                  onChange={(e) => update('closeRatePct', Math.max(0, Number(e.target.value)))}
                />
                <p className={helpClass}>
                  Of qualified opportunities, what percent typically become customers?
                </p>
              </div>
              <div>
                <label className={labelClass}>Average sales cycle (days)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.salesCycleDays}
                  onChange={(e) => update('salesCycleDays', Math.max(0, Number(e.target.value)))}
                />
                <p className={helpClass}>About how many days does it usually take to close a deal?</p>
              </div>
              <div>
                <label className={labelClass}>Gross margin (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder={`Default ${DEFAULT_GROSS_MARGIN_PCT}%`}
                  value={form.grossMarginPct}
                  onChange={(e) => update('grossMarginPct', e.target.value)}
                />
                <p className={helpClass}>Leave blank to use a standard assumption.</p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/90">
              Sales execution
            </h4>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>How fast do you usually follow up with new leads?</label>
                <select
                  className={`${inputClass} cursor-pointer`}
                  value={form.followUpSpeed}
                  onChange={(e) =>
                    update('followUpSpeed', e.target.value as RoiCalculatorStoredState['followUpSpeed'])
                  }
                >
                  <option value="within_15" className="text-gray-900">
                    Within 15 minutes
                  </option>
                  <option value="within_hour" className="text-gray-900">
                    Within 1 hour
                  </option>
                  <option value="same_day" className="text-gray-900">
                    Same day
                  </option>
                  <option value="one_two_days" className="text-gray-900">
                    1–2 days
                  </option>
                  <option value="three_plus" className="text-gray-900">
                    3+ days
                  </option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Who usually handles inbound leads?</label>
                <select
                  className={`${inputClass} cursor-pointer`}
                  value={form.leadHandler}
                  onChange={(e) =>
                    update('leadHandler', e.target.value as RoiCalculatorStoredState['leadHandler'])
                  }
                >
                  <option value="dedicated_sales" className="text-gray-900">
                    Dedicated sales team
                  </option>
                  <option value="founder" className="text-gray-900">
                    Founder / executive
                  </option>
                  <option value="marketing_hybrid" className="text-gray-900">
                    Marketing / sales hybrid
                  </option>
                  <option value="outsourced" className="text-gray-900">
                    Outsourced / VA
                  </option>
                  <option value="no_owner" className="text-gray-900">
                    No consistent owner
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
              <input
                type="checkbox"
                className="size-4 rounded border-white/50 bg-white/20 text-[#FF8C02] focus:ring-[#FF8C02]"
                checked={form.showAdvanced}
                onChange={(e) => update('showAdvanced', e.target.checked)}
              />
              Show advanced assumptions
            </label>

            {form.showAdvanced && (
              <div className="mt-6 rounded-xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
                <h5 className="mb-4 text-sm font-bold text-white">Advanced assumptions</h5>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Visitor identification rate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className={inputClass}
                      value={form.visitorIdentificationRatePct}
                      onChange={(e) =>
                        update('visitorIdentificationRatePct', Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Base recovered opportunity rate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className={inputClass}
                      value={form.baseRecoveredOpportunityRatePct}
                      onChange={(e) =>
                        update('baseRecoveredOpportunityRatePct', Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>One-time investment ($)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={form.oneTimeInvestment}
                      onChange={(e) =>
                        update('oneTimeInvestment', Math.max(0, Number(e.target.value)))
                      }
                    />
                    <p className={helpClass}>Used to estimate payback vs. monthly gross profit.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Results */}
          <div className="rounded-2xl border border-white/20 bg-black/15 p-6 backdrop-blur-md sm:p-8">
            <header className="mb-8 max-w-3xl">
              <h3 className="text-2xl font-bold text-white">Your Revenue Recovery Forecast</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Based on your traffic, deal value, and sales process, this forecast shows what
                recovering more of your existing website traffic could potentially add in
                opportunities, customers, revenue, and profit.
              </p>
            </header>

            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topMetrics.map((m) => (
                <div
                  key={m.title}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg"
                >
                  <p className="text-2xl font-bold tabular-nums text-white">{m.value}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{m.title}</p>
                  <p className="mt-1 text-xs leading-snug text-white/70">{m.desc}</p>
                </div>
              ))}
            </div>

            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/90">
              Scenario comparison
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(Object.keys(SCENARIO_LABELS) as ScenarioKey[]).map((key) => {
                const s = forecast.scenarios[key]
                const rows = [
                  ['Identified visitors', forecast.identifiedVisitors.toLocaleString()],
                  ['Recoverable opportunities', s.recoverableOpportunities.toLocaleString()],
                  ['New customers', s.newCustomers.toLocaleString()],
                  ['Monthly revenue', currency.format(s.monthlyRevenue)],
                  ['Lifetime revenue', currency.format(s.lifetimeRevenue)],
                  ['Gross profit', currency.format(s.grossProfit)],
                ]
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
                  >
                    <p className="mb-4 text-center text-base font-bold text-white">
                      {SCENARIO_LABELS[key]}
                    </p>
                    <ul className="space-y-3 text-sm text-white/90">
                      {rows.map(([lab, val]) => (
                        <li key={lab} className="flex flex-col border-b border-white/10 pb-2 last:border-0">
                          <span className="flex items-start">
                            <ArrowBullet />
                            <span className="text-white/70">{lab}</span>
                          </span>
                          <span className="pl-6 font-semibold text-white">{val}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
                Conservative = lower-range planning case
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
                Expected = realistic revenue forecast
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
                Upside = stronger execution and follow-up case
              </span>
            </div>

            <div className="mt-10 rounded-xl border border-white/20 bg-white/10 p-5">
              <h5 className="mb-3 text-sm font-bold text-white">Forecast assumptions used</h5>
              <ul className="space-y-2 text-sm text-white/85">
                {assumptionLines.map((line) => (
                  <li key={line} className="flex items-start">
                    <ArrowBullet />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 text-xs text-white/60">
              These are estimates based on your inputs and the assumptions above — not a guarantee of
              results.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
