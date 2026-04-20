'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import RevenueEstimator from '@/components/RevenueEstimator'

interface Tenant {
  id: string
  name: string
  domain: string | null
}

interface UploadStatus {
  id: string
  status: string
  rowCount: number | null
  processedRows: number | null
  fileSizeBytes: number | null
  error: string | null
  processedAt: string | null
  tenantId: string
}

export default function UploadPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [completedUploadId, setCompletedUploadId] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants')
      const data = await res.json()
      setTenants(data)
      if (data.length > 0 && !selectedTenantId) {
        setSelectedTenantId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  const checkUploadStatus = async (uploadId: string): Promise<UploadStatus | null> => {
    try {
      const res = await fetch(`/api/upload/${uploadId}`)
      if (res.ok) {
        return await res.json()
      }
      return null
    } catch (error) {
      console.error('Error checking upload status:', error)
      return null
    }
  }

  const pollUploadStatus = async (uploadId: string, tenantId: string) => {
    setProcessing(true)
    setProgress('Processing…')
    setCompletedUploadId(null)

    const maxAttempts = 900
    let attempts = 0

    const poll = async () => {
      attempts++
      const status = await checkUploadStatus(uploadId)

      if (!status) {
        setProgress('Error checking upload status')
        setProcessing(false)
        return
      }

      setUploadStatus(status)

      if (status.status === 'completed') {
        setProgressPct(100)
        setProgress(`Processing complete! Processed ${status.rowCount || 0} rows.`)
        setProcessing(false)
        setCompletedUploadId(status.id)
        return
      }

      if (status.status === 'error') {
        setProgressPct(null)
        setProgress(`Error: ${status.error || 'Unknown error'}`)
        setProcessing(false)
        return
      }

      if (status.status === 'processing') {
        const n = status.processedRows ?? 0
        const fileSize = status.fileSizeBytes ?? 0
        const estimatedRows = fileSize > 0 ? Math.max(1, Math.round(fileSize / 400)) : 0
        const pct = estimatedRows > 0 && n > 0 ? Math.min(99, Math.round((n / estimatedRows) * 100)) : null
        setProgressPct(pct)
        if (pct != null) {
          setProgress(`Processing… ${pct}% (${n.toLocaleString()} rows)`)
        } else {
          setProgress(n > 0 ? `Processed ${n.toLocaleString()} rows…` : 'Processing CSV file…')
        }
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, 1000)
      } else {
        setProgress('Processing is taking longer than expected. You can check the dashboard later.')
        setProcessing(false)
      }
    }

    poll()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedTenantId) {
      return
    }

    setUploading(true)
    setUploadStatus(null)
    setProgress('')
    setProgressPct(null)
    setCompletedUploadId(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tenantId', selectedTenantId)
      formData.append('fileSize', String(file.size))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok || res.status === 202) {
        const data = await res.json()
        setFile(null)
        const fileInput = document.getElementById('file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        if (data.status === 'processing' || res.status === 202) {
          await pollUploadStatus(data.id, selectedTenantId)
          return
        }
        if (data.status === 'completed') {
          setProgress(`Processing complete! Processed ${data.rowCount ?? 0} rows.`)
          setProgressPct(100)
          setProcessing(false)
          setCompletedUploadId(data.id)
          return
        }
        if (data.status === 'error') {
          setProgress(`Error: ${data.error || 'Unknown error'}`)
          return
        }
      } else {
        const error = await res.json()
        setProgress(`Upload failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setProgress('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const showOverlay = uploading || (processing && uploadStatus?.status !== 'completed')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Upload CSV</h1>

      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="mb-4">
                <div
                  className="mx-auto h-12 w-12 animate-spin rounded-full border-4"
                  style={{
                    borderColor: 'rgba(29, 110, 149, 0.2)',
                    borderTopColor: '#1D6E95',
                  }}
                />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                {uploading ? 'Uploading...' : 'Processing CSV'}
              </h2>
              <p className="mb-2 text-sm text-gray-600">{progress || 'Please wait...'}</p>
              {progressPct != null && (
                <div className="mb-4 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%`, backgroundColor: '#1D6E95' }}
                  />
                </div>
              )}
              {uploadStatus && (
                <div className="mt-4 rounded-md bg-gray-50 p-3 text-left">
                  <div className="text-xs text-gray-500">Status: {uploadStatus.status}</div>
                  {uploadStatus.rowCount !== null && (
                    <div className="text-xs text-gray-500">Rows: {uploadStatus.rowCount}</div>
                  )}
                </div>
              )}
              {processing && !uploadStatus?.error && (
                <p className="mt-4 text-xs text-gray-500">
                  This may take a few minutes for large files...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tenant" className="block text-sm font-medium text-gray-700">
              Client *
            </label>
            <select
              id="tenant"
              required
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              disabled={uploading || processing}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95] disabled:bg-gray-100"
            >
              <option value="">Select a client</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              CSV File *
            </label>
            <input
              type="file"
              id="file"
              required
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading || processing}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:bg-[rgba(29,110,149,0.1)] file:text-[#1D6E95] hover:file:bg-[rgba(29,110,149,0.15)] disabled:opacity-50"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || processing || !file || !selectedTenantId}
            className="rounded-md px-4 py-2 text-white disabled:bg-gray-400 disabled:opacity-50 btn-primary-blue"
          >
            {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Process'}
          </button>
        </form>
      </div>

      {completedUploadId && selectedTenantId && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue estimate</h2>
          <RevenueEstimator uploadId={completedUploadId} tenantId={selectedTenantId} />
          <div className="mt-6">
            <Link
              href={`/dashboard/${selectedTenantId}`}
              className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white btn-primary-blue"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Upload Instructions</h2>
        <div className="rounded-lg border bg-gray-50 p-4">
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li>CSV should include columns: Event Timestamp, Event Type, Uuid, Ip Address, Url, etc.</li>
            <li>Processing may take a few minutes for large files (50k+ rows)</li>
            <li>When processing finishes, a revenue estimate from your pixel data appears below</li>
            <li>Use <strong>Go to Dashboard</strong> when you are ready to leave this page</li>
            <li>System will automatically geolocate IPs, compute scores, and generate AI summaries</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
