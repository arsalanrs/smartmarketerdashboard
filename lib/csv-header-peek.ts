import fs from 'fs'
import readline from 'readline'
import { parseHeaderLine } from './pixel-format'

/** Read only the first line of a CSV file (for header-based format detection). */
export async function peekCsvHeaderCells(filePath: string): Promise<string[]> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  try {
    let settled = false
    const firstLine = await new Promise<string>((resolve, reject) => {
      const finish = (v: string) => {
        if (settled) return
        settled = true
        resolve(v)
      }
      rl.once('line', (line) => finish(line))
      rl.once('error', reject)
      stream.once('error', reject)
      rl.once('close', () => finish(''))
    })
    return firstLine ? parseHeaderLine(firstLine) : []
  } finally {
    rl.close()
    stream.destroy()
  }
}
