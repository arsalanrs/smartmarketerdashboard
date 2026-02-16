import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processCSVUpload } from '@/lib/csv-processor'

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

    // Read file content
    const csvContent = await file.text()

    // Process in background (for MVP, we'll do it synchronously)
    // In production, this should be moved to a queue/worker
    processCSVUpload(tenantId, upload.id, csvContent)
      .then((result) => {
        console.log(`Upload ${upload.id} processed:`, result)
      })
      .catch((error) => {
        console.error(`Upload ${upload.id} failed:`, error)
      })

    return NextResponse.json({
      id: upload.id,
      status: upload.status,
      message: 'Upload started processing',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

