/**
 * Verifies Smart Pixel CSV rows parse with parseRow (no DB).
 * Run: npm run verify:v3
 */
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { parseRow, type CSVRow } from '../lib/csv-processor'

function parseHeaderLine(firstLine: string): string[] {
  const parsed = Papa.parse<string[]>(firstLine, { header: false })
  const row = parsed.data[0]
  if (!row) return []
  return row.map((h) => String(h).trim())
}

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
const hasEventData = headers.map((h) => h.trim().toLowerCase()).includes('event_data')

console.log('File:', csvPath)
console.log('Header has EVENT_DATA:', hasEventData)

const parsed = Papa.parse<CSVRow>(text, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
})

let parsedOk = 0
let parsedFail = 0

for (const row of parsed.data) {
  const ev = parseRow(row)
  if (!ev) continue
  parsedOk++
  if (!ev.url || !ev.eventType) parsedFail++
}

const sample = parsed.data.find((r) => r.EVENT_DATA && r.EVENT_TYPE)
if (sample) {
  const ev = parseRow(sample)
  console.log('Sample EVENT_TYPE:', sample.EVENT_TYPE)
  console.log('parseRow url:', ev?.url?.slice(0, 72))
}

console.log('Rows successfully parsed:', parsedOk)
console.log('Rows missing url or eventType after parse:', parsedFail)

if (parsedOk === 0) {
  console.error('FAIL: no parsable rows')
  process.exit(1)
}

console.log('OK: parseRow works for this file.')
