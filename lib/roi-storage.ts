import { computeRoiForecast, type FollowUpSpeed, type LeadHandler } from './roi-forecast'

/** Persisted shape for `roi_inputs_${tenantId}` — shared with AISummary POST bridge */
export interface RoiCalculatorStoredState {
  monthlyVisitors: number
  averageSaleValue: number
  customerLtv: number
  closeRatePct: number
  salesCycleDays: number
  grossMarginPct: string
  followUpSpeed: FollowUpSpeed
  leadHandler: LeadHandler
  showAdvanced: boolean
  visitorIdentificationRatePct: number
  baseRecoveredOpportunityRatePct: number
  oneTimeInvestment: number
}

export function roiStorageKey(tenantId: string) {
  return `roi_inputs_${tenantId}`
}

function parseGrossMargin(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Build optional POST body payload for AI summary (browser only). */
export function getRoiContextForApi(tenantId: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(roiStorageKey(tenantId))
  if (!raw) return null
  try {
    const form = { ...ROI_DEFAULTS, ...JSON.parse(raw) } as RoiCalculatorStoredState
    const forecast = computeRoiForecast({
      monthlyVisitors: Math.max(0, form.monthlyVisitors),
      averageSaleValue: Math.max(0, form.averageSaleValue),
      customerLtv: Math.max(0, form.customerLtv),
      closeRatePct: Math.max(0, form.closeRatePct),
      salesCycleDays: Math.max(0, form.salesCycleDays),
      grossMarginPct: parseGrossMargin(form.grossMarginPct),
      visitorIdentificationRatePct: Math.max(0, form.visitorIdentificationRatePct),
      baseRecoveredOpportunityRatePct: Math.max(0, form.baseRecoveredOpportunityRatePct),
      followUpSpeed: form.followUpSpeed,
      leadHandler: form.leadHandler,
      oneTimeInvestment: Math.max(0, form.oneTimeInvestment),
    })
    return {
      calculatorInputs: form,
      forecastExpected: {
        identifiedVisitorsPerMonth: forecast.identifiedVisitors,
        recoverableOpportunitiesPerMonth: forecast.expected.recoverableOpportunities,
        newCustomersPerMonth: forecast.expected.newCustomers,
        monthlyRevenueImpact: forecast.expected.monthlyRevenue,
        lifetimeRevenueImpact: forecast.expected.lifetimeRevenue,
        grossProfitImpact: forecast.expected.grossProfit,
        paybackDays: forecast.paybackDays,
        grossMarginUsedPct: forecast.grossMarginUsed,
        salesCycleDays: forecast.salesCycleDays,
        effectiveRecoveredOppRatePct: forecast.effectiveRecoveredOppRatePct,
      },
    }
  } catch {
    return null
  }
}

export const ROI_DEFAULTS: RoiCalculatorStoredState = {
  monthlyVisitors: 25_000,
  averageSaleValue: 12_000,
  customerLtv: 30_000,
  closeRatePct: 20,
  salesCycleDays: 45,
  grossMarginPct: '70',
  followUpSpeed: 'within_15',
  leadHandler: 'dedicated_sales',
  showAdvanced: true,
  visitorIdentificationRatePct: 10,
  baseRecoveredOpportunityRatePct: 5,
  oneTimeInvestment: 21_000,
}
