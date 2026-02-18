import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/**
 * Breadcrumbs — visual breadcrumb trail for sub-pages.
 *
 * Why: Madlan and Yad2 both display breadcrumbs on property detail pages and
 * area pages. Breadcrumbs improve orientation (users know where they are),
 * enable quick back-navigation, and boost SEO (Google shows them in SERPs).
 *
 * Usage:
 *   <Breadcrumbs items={[
 *     { label: 'מפת קרקעות', to: '/' },
 *     { label: 'חדרה', to: '/areas/חדרה' },
 *     { label: 'גוש 10023 חלקה 5' },  // last item — no link
 *   ]} />
 *
 * Includes JSON-LD BreadcrumbList schema automatically.
 */
function Breadcrumbs({ items, className = '' }) {
  if (!items || items.length < 2) return null

  const schema = {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav
        aria-label="מיקום בדף"
        className={`flex items-center gap-1 text-xs text-slate-500 overflow-x-auto scrollbar-none ${className}`}
        dir="rtl"
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <span key={i} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <ChevronLeft className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              {isLast || !item.to ? (
                <span className={isLast ? 'text-slate-300 font-medium' : ''}>
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="hover:text-gold transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </>
  )
}

export default memo(Breadcrumbs)
