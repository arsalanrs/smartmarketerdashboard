import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { Prisma, Upload } from '@prisma/client'

function bareUploadRow(
  id: string,
  tenantId: string,
  filename: string,
  fileSizeBytes?: number | null
): Upload {
  return {
    id,
    tenantId,
    filename,
    status: 'processing',
    rowCount: null,
    processedRows: null,
    fileSizeBytes: fileSizeBytes ?? null,
    createdAt: new Date(),
    processedAt: null,
    error: null,
    dataStartDate: null,
    dataEndDate: null,
    totalEvents: null,
    uniqueVisitors: null,
    highIntentCount: null,
    pixelExportFormat: null,
  }
}

/**
 * Prisma `create()` emits INSERT … RETURNING for every Prisma model column (e.g. `pixel_export_format`).
 * Production DB may omit those columns — raw SQL matches a typical `uploads` table:
 * `id text NOT NULL`, `tenant_id`, `filename`, `status`, optional `file_size_bytes`, `created_at` default.
 */
async function createUploadRawSql(
  tenantId: string,
  filename: string,
  fileSizeBytes?: number
): Promise<Upload> {
  const id = randomUUID()

  const tries: Array<{
    label: string
    fileSize: number | null
    run: () => Promise<Array<{ id: string }>>
  }> = []

  if (fileSizeBytes != null && fileSizeBytes > 0) {
    tries.push({
      label: 'id+tenant+filename+status+file_size_bytes',
      fileSize: fileSizeBytes,
      run: () =>
        prisma.$queryRaw<Array<{ id: string }>>`
          INSERT INTO uploads (id, tenant_id, filename, status, file_size_bytes)
          VALUES (${id}, ${tenantId}, ${filename}, 'processing', ${fileSizeBytes})
          RETURNING id
        `,
    })
  }

  tries.push({
    label: 'id+tenant+filename+status',
    fileSize: null,
    run: () =>
      prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO uploads (id, tenant_id, filename, status)
        VALUES (${id}, ${tenantId}, ${filename}, 'processing')
        RETURNING id
      `,
  })

  tries.push({
    label: 'tenant+filename+status (only if id has DB default)',
    fileSize: null,
    run: () =>
      prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO uploads (tenant_id, filename, status)
        VALUES (${tenantId}, ${filename}, 'processing')
        RETURNING id
      `,
  })

  let last: unknown
  for (const t of tries) {
    try {
      const rows = await t.run()
      const outId = rows[0]?.id
      if (!outId) throw new Error('RETURNING id empty')
      console.warn(
        `[upload] created upload row via raw SQL (${t.label}); add missing columns (e.g. pixel_export_format) or run prisma db push.`
      )
      return bareUploadRow(String(outId), tenantId, filename, t.fileSize ?? undefined)
    } catch (e) {
      last = e
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[upload] raw insert (${t.label}) failed:`, msg.split('\n')[0]?.slice(0, 240))
    }
  }
  throw last
}

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

  try {
    return await createUploadRawSql(tenantId, filename, size)
  } catch (rawErr) {
    console.error('[upload] raw SQL fallback exhausted; migrate DB (prisma db push or prisma/*.sql).')
    throw lastError ?? rawErr
  }
}
