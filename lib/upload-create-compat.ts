import { prisma } from '@/lib/prisma'
import type { Prisma, Upload } from '@prisma/client'

/**
 * Create an upload row even when production DB is behind Prisma schema
 * (missing pixel_export_format, file_size_bytes, etc.).
 * Used for every upload after CSV header peek — **Pixel v3 and v4** share this path; format only
 * affects `processCSVUploadFromStream` parsing, not which columns exist in `uploads`.
 */
export async function createUploadRecordResilient(input: {
  tenantId: string
  filename: string
  fileSizeBytes: number | null | undefined
  pixelExportFormat: string
}): Promise<Upload> {
  const { tenantId, filename, pixelExportFormat } = input
  const size =
    input.fileSizeBytes != null && input.fileSizeBytes > 0 ? input.fileSizeBytes : undefined

  type Attempt = Pick<Prisma.UploadUncheckedCreateInput, 'tenantId' | 'filename' | 'status'> & {
    fileSizeBytes?: number
    pixelExportFormat?: string
  }

  const minimal: Attempt = { tenantId, filename, status: 'processing' }
  const attempts: Attempt[] = []

  if (size != null) {
    attempts.push({ ...minimal, fileSizeBytes: size, pixelExportFormat })
    attempts.push({ ...minimal, fileSizeBytes: size })
  } else {
    attempts.push({ ...minimal, pixelExportFormat })
  }
  attempts.push(minimal)

  const seen = new Set<string>()
  const unique = attempts.filter((a) => {
    const key = JSON.stringify(a)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let lastError: unknown
  for (let i = 0; i < unique.length; i++) {
    const d = unique[i]
    try {
      const data: Prisma.UploadUncheckedCreateInput = {
        tenantId: d.tenantId,
        filename: d.filename,
        status: d.status,
      }
      if (d.fileSizeBytes != null) data.fileSizeBytes = d.fileSizeBytes
      if (d.pixelExportFormat != null) data.pixelExportFormat = d.pixelExportFormat

      return await prisma.upload.create({ data })
    } catch (e) {
      lastError = e
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(
        `[upload] create attempt ${i + 1}/${unique.length} failed:`,
        msg.split('\n')[0]?.slice(0, 220)
      )
    }
  }

  throw lastError
}
