import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import Busboy from 'busboy'
import { prisma } from '@/lib/prisma'
import { processCSVUploadFromStream } from '@/lib/csv-processor'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    // Use busboy to parse multipart WITHOUT buffering the file into memory.
    // formData() would load the entire file into the V8 heap before we could stream it.
    const { tenantId, filename, fileSizeBytes, fileNodeStream } = await new Promise<{
      tenantId: string
      filename: string
      fileSizeBytes: number | null
      fileNodeStream: Readable
    }>((resolve, reject) => {
      const bb = Busboy({ headers: { 'content-type': contentType } })
      let tenantId = ''
      let fileSizeBytes: number | null = null
      let fileReceived = false

      bb.on('field', (name: string, val: string) => {
        if (name === 'tenantId') tenantId = val
        if (name === 'fileSize') {
          const n = parseInt(val, 10)
          if (!Number.isNaN(n) && n > 0) fileSizeBytes = n
        }
      })

      bb.on('file', (name: string, stream: Readable, info: { filename: string }) => {
        if (name === 'file') {
          fileReceived = true
          resolve({ tenantId, filename: info.filename, fileSizeBytes, fileNodeStream: stream })
        } else {
          stream.resume() // drain unknown file fields
        }
      })

      bb.on('finish', () => {
        if (!fileReceived) reject(new Error('No file field found in form data'))
      })

      bb.on('error', (err: Error) => reject(err))

      // Pipe the request body (Web ReadableStream) into busboy without buffering
      Readable.fromWeb(request.body as any).pipe(bb)
    })

    if (!tenantId) {
      fileNodeStream.resume()
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      fileNodeStream.resume()
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const upload = await prisma.upload.create({
      data: { tenantId, filename, status: 'processing', fileSizeBytes: fileSizeBytes ?? undefined },
    })

    let result: { rowCount: number; error?: string }
    try {
      // Pass the Node.js Readable directly - no buffering, true streaming
      result = await processCSVUploadFromStream(tenantId, upload.id, fileNodeStream)
      console.log(`Upload ${upload.id} processed:`, result)
    } catch (error: any) {
      console.error(`Upload ${upload.id} failed:`, error)
      await prisma.upload.update({
        where: { id: upload.id },
        data: { status: 'error', error: error?.message || 'Processing failed' },
      })
      return NextResponse.json(
        { id: upload.id, status: 'error', error: error?.message },
        { status: 200 }
      )
    }

    const status = result.error ? 'error' : 'completed'
    return NextResponse.json({
      id: upload.id,
      status,
      rowCount: result.rowCount,
      error: result.error,
      message: status === 'completed' ? 'Upload processed' : result.error,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
