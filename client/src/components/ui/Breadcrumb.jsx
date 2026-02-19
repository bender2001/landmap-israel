import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'

/**
 * Breadcrumb — semantic breadcrumb navigation with JSON-LD structured data.
 * 
 * Madlan and Yad2 both use breadcrumbs extensively — they're a key SEO signal
 * (Google shows them in SERP) and help users navigate back through the hierarchy.
 * LandMap was missing this entirely.
 * 
 * Features:
 * - JSON-LD BreadcrumbList schema for Google rich results
 * - RTL-aware separators (ChevronLeft for RTL flow)
 * - Responsive: truncates long labels on mobile
 * - Accessible: uses nav[aria-label] + ol[role=list] pattern
 * - Last item is current page (not linked, aria-current="page")
 * 
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'מפה', to: '/' },
 *     { label: 'חדרה', to: '/areas/חדרה' },
 *     { label: 'גוש 10043 חלקה 15' },  // current page (no `to`)
 *   ]} />
 */
function Breadcrumb({ items, className = '' }) {
  if (!items || items.length < 2) return null

  // JSON-LD BreadcrumbList — Google uses this to show breadcrumbs in SERP.
  // https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.to ? { item: `${window.location.origin}${item.to}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`breadcrumb-nav ${className}`}
        dir="rtl"
      >
        <ol
          role="list"
          className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 overflow-x-auto scrollbar-hide py-1"
        >
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            const isFirst = i === 0

            return (
              <li
                key={item.to || item.label}
                className="flex items-center gap-1 flex-shrink-0"
              >
                {/* Separator between items */}
                {i > 0 && (
                  <ChevronLeft
                    className="w-3 h-3 text-slate-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                )}

                {isLast ? (
                  // Current page — not linked, visually distinct
                  <span
                    aria-current="page"
                    className="text-gold font-medium truncate max-w-[200px] sm:max-w-none"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                ) : (
                  // Linked ancestor
                  <Link
                    to={item.to}
                    className="flex items-center gap-1 text-slate-400 hover:text-gold transition-colors truncate max-w-[120px] sm:max-w-none"
                    title={item.label}
                  >
                    {isFirst && (
                      <Home className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

export default memo(Breadcrumb)
