'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/SM-logo2026-full-size.svg"
                alt="Smart Marketer"
                width={846}
                height={100}
                className="h-8 w-auto"
                priority
                unoptimized
              />
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/admin/tenants"
              className={`nav-link px-3 py-2 rounded-md text-sm font-medium ${
                pathname?.startsWith('/admin/tenants')
                  ? 'nav-link-active text-white'
                  : 'text-gray-600'
              }`}
              style={pathname?.startsWith('/admin/tenants') 
                ? { backgroundColor: '#1D6E95' }
                : {}
              }
            >
              Clients
            </Link>
            <Link
              href="/admin/upload"
              className={`nav-link px-3 py-2 rounded-md text-sm font-medium ${
                pathname?.startsWith('/admin/upload')
                  ? 'nav-link-active text-white'
                  : 'text-gray-600'
              }`}
              style={pathname?.startsWith('/admin/upload') 
                ? { backgroundColor: '#1D6E95' }
                : {}
              }
            >
              Upload
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

