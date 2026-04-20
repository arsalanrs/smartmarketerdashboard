import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params

    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      select: {
        id: true,
        status: true,
        rowCount: true,
        processedRows: true,
        fileSizeBytes: true,
        error: true,
        processedAt: true,
        tenantId: true,
        dataStartDate: true,
        dataEndDate: true,
        totalEvents: true,
        uniqueVisitors: true,
        highIntentCount: true,
        pixelExportFormat: true,
      },
    })

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    return NextResponse.json(upload)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

