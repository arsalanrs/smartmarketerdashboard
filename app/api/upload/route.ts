import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processCSVUploadFromStream } from '@/lib/csv-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const tenantId = formData.get('tenantId') as string
    const file = formData.get('file') as File

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create upload record
    const upload = await prisma.upload.create({
      data: {
        tenantId,
        filename: file.name,
        status: 'processing',
      },
    })

    // Stream file - never load full content into memory (avoids OOM on large CSVs)
    const stream = file.stream()

    let result: { rowCount: number; error?: string }
    try {
      result = await processCSVUploadFromStream(tenantId, upload.id, stream)
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

