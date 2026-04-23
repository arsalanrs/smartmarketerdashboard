/**
 * Verifies Pixel v3 files use the same format resolution + parse path as production uploads.
 * Run: npm run verify:v3
 *
 * - Auto-detect from headers → v3 for classic EVENT_DATA exports
 * - parseRow(..., 'v3') yields URLs/events from EVENT_DATA (not dependent on FULL_URL)
 * - For a pure v3 row, v3 vs v4 parse should agree on url (no FULL_URL column to conflict)
 */
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseHeaderLine, resolvePixelFormat } from '../lib/pixel-format'
import { parseRow, type CSVRow } from '../lib/csv-processor'

const root = path.join(__dirname, '..')
const defaultCsv = path.join(root, 'small pixel file.csv')
const csvPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultCsv

if (!fs.existsSync(csvPath)) {
  console.error('CSV not found:', csvPath)
  process.exit(1)
}

const text = fs.readFileSync(csvPath, 'utf8')
const firstLine = text.split(/\r?\n/).find((l) => l.length > 0) ?? ''
const headers = parseHeaderLine(firstLine)

const detected = resolvePixelFormat('auto', headers)
const forcedV3 = resolvePixelFormat('v3', headers)

console.log('File:', csvPath)
console.log('resolvePixelFormat(auto):', detected)
console.log('resolvePixelFormat(v3):', forcedV3)

if (detected !== 'v3') {
  console.error('FAIL: expected auto-detect v3 for EVENT_DATA-style export (this sample is v3).')
  process.exit(1)
}

const parsed = Papa.parse<CSVRow>(text, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
})

let parsedOk = 0
let parsedFail = 0
let compareMismatch = 0

for (const row of parsed.data) {
  const ev = parseRow(row, 'v3')
  if (!ev) continue
  parsedOk++
  if (!ev.url || !ev.eventType) parsedFail++

  const asV4 = parseRow(row, 'v4')
  if (asV4?.url !== ev.url) compareMismatch++
}

const sample = parsed.data.find((r) => r.EVENT_DATA && r.EVENT_TYPE)
if (sample) {
  const v3 = parseRow(sample, 'v3')
  const v4 = parseRow(sample, 'v4')
  console.log('Sample row EVENT_TYPE:', sample.EVENT_TYPE)
  console.log('parseRow v3 url:', v3?.url?.slice(0, 72))
  console.log('parseRow v4 url:', v4?.url?.slice(0, 72))
  if (v3?.url !== v4?.url) {
    console.warn('WARN: v3 vs v4 URL differ on this row (expected same when FULL_URL is absent).')
  }
}

console.log('Rows successfully parsed as events (v3):', parsedOk)
console.log('Rows missing url or eventType after parse:', parsedFail)
console.log('Rows where v3 url !== v4 url:', compareMismatch)

if (parsedOk === 0) {
  console.error('FAIL: no parsable rows')
  process.exit(1)
}

if (compareMismatch > 0) {
  console.error('FAIL: v3/v4 URL mismatch on', compareMismatch, 'rows (check FULL_URL vs EVENT_DATA precedence).')
  process.exit(1)
}

console.log('OK: v3 auto-detect and parse path look correct for this file.')
console.log(
  'Note: DB create fallbacks (upload-create-compat) apply to v3 and v4 uploads the same way — they only fix missing DB columns.'
)
