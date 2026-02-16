'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 h-full flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start flex-1">
          {/* Left Side - Hero Content */}
          <div className="space-y-6 flex flex-col justify-center">
            {/* Label and Line */}
            <div>
              <div className="h-px w-20 bg-gray-400 mb-3"></div>
              <p className="text-sm text-gray-600 uppercase tracking-wider font-medium">Visitor Analytics Platform</p>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              Smart Pixel Insights
            </h1>

            {/* CTA Buttons - Circular with Plus Icon - Side by Side */}
            <div className="pt-2 flex gap-3">
              <Link
                href="/admin/tenants"
                className="inline-flex items-center gap-3 rounded-full text-white px-6 py-3 font-medium w-fit btn-primary-blue"
              >
                <span className="text-xl">+</span>
                <span>Dashboard</span>
              </Link>
              <Link
                href="/admin/upload"
                className="inline-flex items-center gap-3 rounded-full text-white px-6 py-3 font-medium w-fit btn-primary-blue"
              >
                <span className="text-xl">+</span>
                <span>Upload</span>
              </Link>
            </div>
          </div>

          {/* Right Side - Cards Stack */}
          <div className="space-y-4 overflow-y-auto max-h-full">
            {/* E-commerce Business Card - SEO Optimized */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">E-commerce Analytics Suite</h3>
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Track High-Intent Online Shoppers
              </h2>
              <p className="text-xs text-gray-600 mb-3" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Identify visitors browsing pricing pages, cart abandonment, and product views. Perfect for online retailers and e-commerce businesses looking to recover lost revenue.
              </p>
              <button className="w-full rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors mb-2">
                View Analytics
              </button>
              <div className="h-px bg-gray-200 mb-1"></div>
              <p className="text-xs text-gray-500">Ideal for: E-commerce stores, Online retailers, D2C brands</p>
            </div>

            {/* B2B SaaS Card - SEO Optimized */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">B2B Lead Generation</h3>
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(29, 110, 149, 0.1)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#1D6E95' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">Revenue Recovery</p>
              <div className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                $1,489
              </div>
              <p className="text-xs text-gray-500 mb-3">Average revenue recovered per month for SaaS companies</p>
              <div className="flex items-center gap-1 text-green-500 text-xs mb-3">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>24% VS PREV. 7 DAYS</span>
              </div>
              <div className="flex gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div key={day} className="flex-1">
                    <div 
                      className={`h-10 rounded ${idx === 3 ? '' : 'bg-gray-200'}`}
                      style={idx === 3 ? { backgroundColor: '#1D6E95' } : {}}
                    ></div>
                    <div className="text-xs text-gray-500 text-center mt-1">{day}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketing Agency Card - SEO Optimized */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Marketing Agency Tools</h3>
              <h4 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Client Visitor Intelligence Dashboard
              </h4>
              <p className="text-xs text-gray-500 mb-2">5 Mins Read</p>
              <div className="h-px bg-gray-200"></div>
              <p className="text-xs text-gray-600 mt-2">Perfect for marketing agencies managing multiple client websites. Track visitor behavior, engagement scores, and conversion signals across all client properties.</p>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="pt-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Facebook</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-900">LinkedIn</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-900">Twitter</a>
          </div>
        </div>
      </div>
    </div>
  )
}
