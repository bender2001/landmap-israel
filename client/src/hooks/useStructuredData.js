import { useEffect } from 'react'
import { formatCurrency } from '../utils/formatters'
import { statusLabels, zoningLabels } from '../utils/constants'

const SCRIPT_ID = 'landmap-jsonld'

/**
 * Injects JSON-LD structured data into <head> for SEO.
 * Supports both single plot (RealEstateListing) and listing page (ItemList).
 * Madlan and Yad2 both use structured data heavily — this is critical for search ranking.
 */
export function useStructuredData(plot, plots) {
  useEffect(() => {
    // Remove previous
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) existing.remove()

    let jsonLd

    if (plot) {
      // Single plot view — RealEstateListing + Product schema
      const price = plot.total_price ?? plot.totalPrice ?? 0
      const size = plot.size_sqm ?? plot.sizeSqM ?? 0
      const blockNum = plot.block_number ?? plot.blockNumber
      const zoning = plot.zoning_stage ?? plot.zoningStage
      const city = plot.city || ''
      const lat = plot.coordinates?.[0]?.[0]
      const lng = plot.coordinates?.[0]?.[1]

      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: `גוש ${blockNum} חלקה ${plot.number} — ${city}`,
        description: plot.description || `קרקע להשקעה ב${city}, ${(size / 1000).toFixed(1)} דונם, ${zoningLabels[zoning] || zoning}`,
        url: `${window.location.origin}/plot/${plot.id}`,
        datePosted: plot.created_at || plot.createdAt || new Date().toISOString(),
        ...(plot.updated_at || plot.updatedAt ? { dateModified: plot.updated_at || plot.updatedAt } : {}),
        offers: {
          '@type': 'Offer',
          price: price,
          priceCurrency: 'ILS',
          availability: plot.status === 'AVAILABLE'
            ? 'https://schema.org/InStock'
            : plot.status === 'SOLD'
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/PreOrder',
          validFrom: plot.created_at || plot.createdAt,
        },
        ...(lat && lng ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
          },
          contentLocation: {
            '@type': 'Place',
            name: city,
            address: {
              '@type': 'PostalAddress',
              addressLocality: city,
              addressCountry: 'IL',
            },
          },
        } : {}),
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'שטח (מ״ר)',
            value: size,
            unitCode: 'MTK',
          },
          {
            '@type': 'PropertyValue',
            name: 'שטח (דונם)',
            value: (size / 1000).toFixed(2),
          },
          {
            '@type': 'PropertyValue',
            name: 'ייעוד קרקע',
            value: zoningLabels[zoning] || zoning || '',
          },
          {
            '@type': 'PropertyValue',
            name: 'סטטוס',
            value: statusLabels[plot.status] || plot.status,
          },
        ],
      }
    } else if (plots && plots.length > 0) {
      // Listing page — ItemList schema
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'קרקעות להשקעה בישראל — LandMap Israel',
        description: `${plots.length} חלקות קרקע להשקעה בישראל`,
        numberOfItems: plots.length,
        itemListElement: plots.slice(0, 20).map((p, i) => {
          const bn = p.block_number ?? p.blockNumber
          const price = p.total_price ?? p.totalPrice ?? 0
          return {
            '@type': 'ListItem',
            position: i + 1,
            url: `${window.location.origin}/plot/${p.id}`,
            name: `גוש ${bn} חלקה ${p.number} — ${p.city}`,
            ...(price > 0 ? {
              offers: {
                '@type': 'Offer',
                price,
                priceCurrency: 'ILS',
              },
            } : {}),
          }
        }),
      }
    }

    if (!jsonLd) return

    // Also add Organization schema (always present, like Madlan)
    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'LandMap Israel',
      url: window.location.origin,
      description: 'פלטפורמת השקעות קרקעות בישראל — מפה אינטראקטיבית, נתוני תכנון ו-AI יועץ',
      sameAs: [],
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify([jsonLd, orgSchema])
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById(SCRIPT_ID)
      if (el) el.remove()
    }
  }, [plot?.id, plots?.length])
}
