/** Pure forecast math for Website Revenue Recovery Forecast */

export const DEFAULT_GROSS_MARGIN_PCT = 70
export const DEFAULT_ONE_TIME_INVESTMENT = 21_000

export const SCENARIO_OPP_MULTIPLIERS = {
  conservative: 0.85,
  expected: 1,
  upside: 1.2,
} as const

export type ScenarioKey = keyof typeof SCENARIO_OPP_MULTIPLIERS

export type FollowUpSpeed =
  | 'within_15'
  | 'within_hour'
  | 'same_day'
  | 'one_two_days'
  | 'three_plus'

export type LeadHandler =
  | 'dedicated_sales'
  | 'founder'
  | 'marketing_hybrid'
  | 'outsourced'
  | 'no_owner'

/**
 * Multipliers on base recovered-opportunity rate (execution quality).
 * Default UI choices (within 15 min + dedicated team) = 1.0 so base % matches planning benchmarks.
 */
const FOLLOW_UP_MULT: Record<FollowUpSpeed, number> = {
  within_15: 1,
  within_hour: 0.99,
  same_day: 0.97,
  one_two_days: 0.94,
  three_plus: 0.9,
}

const LEAD_HANDLER_MULT: Record<LeadHandler, number> = {
  dedicated_sales: 1,
  founder: 0.98,
  marketing_hybrid: 0.96,
  outsourced: 0.94,
  no_owner: 0.88,
}

export interface RoiForecastInputs {
  monthlyVisitors: number
  averageSaleValue: number
  customerLtv: number
  closeRatePct: number
  salesCycleDays: number
  /** null or empty string in UI → default gross margin */
  grossMarginPct: number | null
  visitorIdentificationRatePct: number
  baseRecoveredOpportunityRatePct: number
  followUpSpeed: FollowUpSpeed
  leadHandler: LeadHandler
  oneTimeInvestment: number
}

export interface ScenarioSnapshot {
  recoverableOpportunities: number
  newCustomers: number
  monthlyRevenue: number
  lifetimeRevenue: number
  grossProfit: number
}

export interface RoiForecastResult {
  identifiedVisitors: number
  executionMultiplier: number
  effectiveRecoveredOppRatePct: number
  grossMarginUsed: number
  salesCycleDays: number
  paybackDays: number | null
  expected: ScenarioSnapshot
  scenarios: Record<ScenarioKey, ScenarioSnapshot>
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function executionQualityMultiplier(
  followUp: FollowUpSpeed,
  handler: LeadHandler
): number {
  return FOLLOW_UP_MULT[followUp] * LEAD_HANDLER_MULT[handler]
}

export function computeRoiForecast(inputs: RoiForecastInputs): RoiForecastResult {
  const margin =
    inputs.grossMarginPct != null && !Number.isNaN(inputs.grossMarginPct)
      ? clamp(inputs.grossMarginPct, 0, 100)
      : DEFAULT_GROSS_MARGIN_PCT

  const idRate = clamp(inputs.visitorIdentificationRatePct, 0, 100) / 100
  const baseOpp = clamp(inputs.baseRecoveredOpportunityRatePct, 0, 100) / 100
  const close = clamp(inputs.closeRatePct, 0, 100) / 100
  const execMult = executionQualityMultiplier(inputs.followUpSpeed, inputs.leadHandler)
  const effectiveOppRate = baseOpp * execMult
  const effectiveRecoveredOppRatePct = effectiveOppRate * 100

  const identified = Math.round(inputs.monthlyVisitors * idRate)

  const buildScenario = (oppMult: number): ScenarioSnapshot => {
    const opps = Math.round(identified * effectiveOppRate * oppMult)
    const customers = Math.round(opps * close)
    const monthlyRevenue = customers * inputs.averageSaleValue
    const lifetimeRevenue = customers * inputs.customerLtv
    const grossProfit = monthlyRevenue * (margin / 100)
    return {
      recoverableOpportunities: opps,
      newCustomers: customers,
      monthlyRevenue,
      lifetimeRevenue,
      grossProfit,
    }
  }

  const scenarios = {
    conservative: buildScenario(SCENARIO_OPP_MULTIPLIERS.conservative),
    expected: buildScenario(SCENARIO_OPP_MULTIPLIERS.expected),
    upside: buildScenario(SCENARIO_OPP_MULTIPLIERS.upside),
  }

  const dailyGrossProfit = scenarios.expected.grossProfit / 30
  let paybackDays: number | null = null
  if (dailyGrossProfit > 0 && inputs.oneTimeInvestment > 0) {
    paybackDays = Math.max(1, Math.ceil(inputs.oneTimeInvestment / dailyGrossProfit))
  }

  return {
    identifiedVisitors: identified,
    executionMultiplier: execMult,
    effectiveRecoveredOppRatePct,
    grossMarginUsed: margin,
    salesCycleDays: inputs.salesCycleDays,
    paybackDays,
    expected: scenarios.expected,
    scenarios,
  }
}

/** Scale dashboard window visitor count to an approximate monthly figure */
export function monthlyVisitorsFromWindow(
  totalVisitorsInWindow: number,
  window: string
): number {
  const m = window.match(/^L(\d+)$/i)
  const days = m ? parseInt(m[1], 10) || 30 : 30
  if (days <= 0) return totalVisitorsInWindow
  return Math.round((totalVisitorsInWindow / days) * 30)
}
