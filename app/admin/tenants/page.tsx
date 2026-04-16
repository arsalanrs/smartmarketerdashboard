'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  domain: string | null
  createdAt: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', domain: '' })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants')
      if (!res.ok) {
        const error = await res.json()
        console.error('Error fetching tenants:', error)
        setTenants([])
        return
      }
      const data = await res.json()
      // Ensure data is an array
      setTenants(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}" and all their data (uploads, events, visitors)? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTenants()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setFormData({ name: '', domain: '' })
        setShowForm(false)
        fetchTenants()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create client')
      }
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Failed to create client')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md px-4 py-2 text-white btn-primary-blue"
        >
          {showForm ? 'Cancel' : 'Create Client'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Create New Client</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95]"
              />
            </div>
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                Domain (optional)
              </label>
              <input
                type="text"
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:border-[#1D6E95] focus:ring-1 focus:ring-[#1D6E95]"
              />
            </div>
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-white btn-primary-blue"
            >
              Create
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No clients yet. Create one to get started.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {tenant.domain || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/${tenant.id}`}
                        className="link-primary-blue"
                      >
                        View Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(tenant.id, tenant.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

