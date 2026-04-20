import Papa from 'papaparse'

export type PixelExportFormat = 'v3' | 'v4'
export type PixelFormatChoice = 'auto' | PixelExportFormat

const NORM = (s: string) => s.trim().toLowerCase()

/** Parse the first CSV row (header) into trimmed cell strings; handles quoted fields. */
export function parseHeaderLine(firstLine: string): string[] {
  const parsed = Papa.parse<string[]>(firstLine, { header: false })
  const row = parsed.data[0]
  if (!row) return []
  return row.map((h) => String(h).trim())
}

/**
 * Infer export type from header names only.
 * v4 enriched exports: FULL_URL (often no EVENT_DATA). v3: EVENT_DATA JSON + classic columns.
 */
export function detectPixelFormatFromHeaders(headers: string[]): PixelExportFormat {
  const n = headers.map(NORM)
  const has = (candidates: string[]) => candidates.some((c) => n.includes(c))

  const hasEventData = has(['event_data'])
  const hasFullUrl = has(['full_url', 'full url'])

  if (hasEventData && hasFullUrl) return 'v3'
  if (hasEventData) return 'v3'
  if (hasFullUrl) return 'v4'
  return 'v3'
}

export function resolvePixelFormat(
  choice: PixelFormatChoice,
  headers: string[]
): PixelExportFormat {
  if (choice === 'auto') return detectPixelFormatFromHeaders(headers)
  return choice
}

export function parsePixelFormatField(raw: string | undefined): PixelFormatChoice {
  const v = (raw || 'auto').trim().toLowerCase()
  if (v === 'v3') return 'v3'
  if (v === 'v4') return 'v4'
  return 'auto'
}
