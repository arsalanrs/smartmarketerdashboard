#!/usr/bin/env node
/**
 * Dry-run: detect Pixel v3 vs v4 from CSV headers + row/event counts (no database).
 * Usage: node scripts/dry-run-pixel-csv.mjs path/to/file.csv
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseHeaderLine(firstLine) {
  const parsed = Papa.parse(firstLine, { header: false })
  const row = parsed.data[0]
  if (!row) return []
  return row.map((h) => String(h).trim())
}

function detectFormat(headers) {
  const n = headers.map((s) => s.trim().toLowerCase())
  const has = (candidates) => candidates.some((c) => n.includes(c))
  const hasEventData = has(['event_data'])
  const hasFullUrl = has(['full_url', 'full url'])
  if (hasEventData && hasFullUrl) return 'v3 (EVENT_DATA + FULL_URL → JSON-first rules)'
  if (hasEventData) return 'v3'
  if (hasFullUrl) return 'v4'
  return 'v3 (default — no FULL_URL or EVENT_DATA in header)'
}

const fileArg = process.argv[2] || path.join(__dirname, '..', 'small pixel file.csv')
const abs = path.resolve(process.cwd(), fileArg)

if (!fs.existsSync(abs)) {
  console.error('File not found:', abs)
  process.exit(1)
}

const text = fs.readFileSync(abs, 'utf8')
const firstLine = text.split(/\r?\n/).find((l) => l.length > 0) || ''
const headers = parseHeaderLine(firstLine)
const format = detectFormat(headers)

const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
const rows = parsed.data.filter((r) => Object.keys(r).length > 0)
const sample = rows[0] || {}

console.log('File:', abs)
console.log('Detected pixel export:', format)
console.log('Header count:', headers.length)
console.log('Data rows (after header):', rows.length)
console.log('Sample columns present:', {
  EVENT_DATA: sample.EVENT_DATA != null && String(sample.EVENT_DATA).length > 0,
  EVENT_TYPE: sample.EVENT_TYPE != null && String(sample.EVENT_TYPE).length > 0,
  FULL_URL: sample.FULL_URL != null && String(sample.FULL_URL).length > 0,
  HEM_SHA256: sample.HEM_SHA256 != null && String(sample.HEM_SHA256).length > 0,
})
console.log(
  '\nNote: Upload failures with "column does not exist" are database migrations (not v3 vs v4). Run prisma db push or the SQL files in prisma/ on production.'
)
