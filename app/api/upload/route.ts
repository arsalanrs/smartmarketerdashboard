import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import Busboy from 'busboy'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { processCSVUploadFromStream } from '@/lib/csv-processor'
import { peekCsvHeaderCells } from '@/lib/csv-header-peek'
import { parsePixelFormatField, resolvePixelFormat } from '@/lib/pixel-format'
import { createUploadRecordResilient } from '@/lib/upload-create-compat'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    // Stream the file to a temp file so we can return 202 immediately and process in background.
    // That way the client can poll and show "Processing… X%".
    const { tenantId, filename, fileSizeBytes, tempPath, pixelFormatRaw } = await new Promise<{
      tenantId: string
      filename: string
      fileSizeBytes: number | null
      tempPath: string
      pixelFormatRaw: string | undefined
    }>((resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': contentType } })
      let tenantId = ''
      let fileSizeBytes: number | null = null
      let pixelFormatRaw: string | undefined
      let fileReceived = false

      bb.on('field', (name: string, val: string) => {
        if (name === 'tenantId') tenantId = val
        if (name === 'fileSize') {
          const n = parseInt(val, 10)
          if (!Number.isNaN(n) && n > 0) fileSizeBytes = n
        }
        if (name === 'pixelFormat') pixelFormatRaw = val
      })

      bb.on('file', (name: string, stream: Readable, info: { filename: string }) => {
        if (name !== 'file') {
          stream.resume()
          return
        }
        fileReceived = true
        const tempPath = path.join(os.tmpdir(), `upload-${randomUUID()}.csv`)
        const writeStream = fs.createWriteStream(tempPath)
        stream.pipe(writeStream)
        writeStream.on('finish', () => {
          writeStream.close(() =>
            resolve({ tenantId, filename: info.filename, fileSizeBytes, tempPath, pixelFormatRaw })
          )
        })
        writeStream.on('error', (err) => {
          fs.unlink(tempPath, () => {})
          reject(err)
        })
      })

      bb.on('finish', () => {
        if (!fileReceived) reject(new Error('No file field found in form data'))
      })

      bb.on('error', (err: Error) => reject(err))

      Readable.fromWeb(request.body as any).pipe(bb)
    })

    if (!tenantId) {
      fs.unlink(tempPath, () => {})
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      fs.unlink(tempPath, () => {})
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    let headerCells: string[] = []
    try {
      headerCells = await peekCsvHeaderCells(tempPath)
    } catch (peekErr) {
      console.warn('CSV header peek failed:', peekErr)
    }
    const pixelFormatChoice = parsePixelFormatField(pixelFormatRaw)
    const effectivePixelFormat = resolvePixelFormat(pixelFormatChoice, headerCells)

    const upload = await createUploadRecordResilient({
      tenantId,
      filename,
      fileSizeBytes,
      pixelExportFormat: effectivePixelFormat,
    })

    // Process in background so we can return 202 and let the client poll for progress
    const processFromTemp = () => {
      const readStream = fs.createReadStream(tempPath)
      processCSVUploadFromStream(tenantId, upload.id, readStream, { pixelFormat: effectivePixelFormat })
        .then((result) => {
          console.log(`Upload ${upload.id} processed:`, result)
        })
        .catch((error: any) => {
          console.error(`Upload ${upload.id} failed:`, error)
          prisma.upload
            .update({
              where: { id: upload.id },
              data: { status: 'error', error: error?.message || 'Processing failed' },
            })
            .catch(() => {})
        })
        .finally(() => {
          fs.unlink(tempPath, () => {})
        })
    }

    processFromTemp()

    return NextResponse.json(
      { id: upload.id, status: 'processing', message: 'Upload accepted; processing in background.' },
      { status: 202 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
