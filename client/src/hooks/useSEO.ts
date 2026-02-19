// ─── useSEO.ts ─── Consolidated SEO hooks
// Merges: useMetaTags, useStructuredData, useThemeColor

import { useEffect, useRef } from 'react'
import { statusLabels, zoningLabels } from '../utils/constants'

// ═══ useMetaTags ═══

type MetaTags = {
  title: string
  description?: string
  url?: string
  image?: string
}

export function useMetaTags({ title, description, url, image }: MetaTags): void {
  useEffect(() => {
    if (!title) return

    const prevTitle = document.title
    document.title = title

    const setMeta = (property: string, content?: string) => {
      if (!content) return
      let el = document.querySelector(`meta[property="${property}"]`)
        || document.querySelector(`meta[name="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (property.startsWith('og:')) {
          el.setAttribute('property', property)
        } else {
          el.setAttribute('name', property)
        }
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const descEl = document.querySelector('meta[name="description"]')
    if (descEl && description) descEl.setAttribute('content', description)

    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', url || window.location.href)
    setMeta('og:type', 'website')
    setMeta('og:site_name', 'LandMap Israel')
    if (image) setMeta('og:image', image)

    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    if (image) setMeta('twitter:image', image)

    const canonicalUrl = url || window.location.href.split('?')[0]
    let canonicalEl = document.querySelector('link[rel="canonical"]')
    if (!canonicalEl) {
      canonicalEl = document.createElement('link')
      canonicalEl.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalEl)
    }
    canonicalEl.setAttribute('href', canonicalUrl)

    return () => {
      document.title = prevTitle
      const el = document.querySelector('link[rel="canonical"]')
      if (el) el.remove()
    }
  }, [title, description, url, image])
}

// ═══ useStructuredData ═══

const SCRIPT_ID = 'landmap-jsonld'

type PlotData = {
  id: string
  number?: string | number
  city?: string
  description?: string
  status?: string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  block_number?: string | number
  blockNumber?: string | number
  zoning_stage?: string
  zoningStage?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  coordinates?: number[][][]
} & Record<string, unknown>

export function useStructuredData(plot?: PlotData | null, plots?: PlotData[] | null): void {
  useEffect(() => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) existing.remove()

    let jsonLd: Record<string, unknown> | null = null
    const zoningLabelMap = zoningLabels as Record<string, string>
    const statusLabelMap = statusLabels as Record<string, string>

    if (plot) {
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
        description: plot.description || `קרקע להשקעה ב${city}, ${(size / 1000).toFixed(1)} דונם, ${zoningLabelMap[zoning || ''] || zoning || ''}`,
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
          { '@type': 'PropertyValue', name: 'שטח (מ״ר)', value: size, unitCode: 'MTK' },
          { '@type': 'PropertyValue', name: 'שטח (דונם)', value: (size / 1000).toFixed(2) },
          { '@type': 'PropertyValue', name: 'ייעוד קרקע', value: zoningLabelMap[zoning || ''] || zoning || '' },
          { '@type': 'PropertyValue', name: 'סטטוס', value: statusLabelMap[plot.status || ''] || plot.status },
        ],
      }
    } else if (plots && plots.length > 0) {
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
            ...(price > 0 ? { offers: { '@type': 'Offer', price, priceCurrency: 'ILS' } } : {}),
          }
        }),
      }
    }

    if (!jsonLd) return

    const orgSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'LandMap Israel',
      url: window.location.origin,
      description: 'פלטפורמת השקעות קרקעות בישראל — מפה אינטראקטיבית, נתוני תכנון ו-AI יועץ',
      sameAs: [],
    }

    const websiteSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'LandMap Israel',
      alternateName: ['לנדמאפ', 'LandMap', 'מפת קרקעות'],
      url: window.location.origin,
      description: 'מפת קרקעות להשקעה בישראל — חדרה, נתניה, קיסריה. מחירים, תשואות, ייעודי קרקע.',
      inLanguage: ['he', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${window.location.origin}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    }

    const faqSchema = !plot ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'מהי קרקע להשקעה?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'קרקע להשקעה היא חלקת אדמה הנרכשת במטרה להרוויח מעליית ערכה לאורך זמן, בדרך כלל בעקבות שינוי ייעוד מחקלאי למגורים או מסחרי. משקיעים רוכשים קרקע במחיר נמוך ומוכרים לאחר שינוי הייעוד ברווח משמעותי.'
          }
        },
        {
          '@type': 'Question',
          name: 'כמה עולה קרקע להשקעה בישראל?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'מחירי קרקע להשקעה באזור חדרה, נתניה וקיסריה נעים בין ₪200,000 ל-₪2,000,000 תלוי בגודל, מיקום ושלב התכנון. מחיר ממוצע לדונם: ₪150,000-₪400,000.'
          }
        },
        {
          '@type': 'Question',
          name: 'מה התשואה הצפויה מהשקעה בקרקע?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'תשואות השקעה בקרקע בישראל נעות בין 50% ל-300% על ההשקעה, תלוי בשלב התכנוני, מיקום וזמן ההמתנה. טווח ההשקעה הממוצע הוא 3-7 שנים.'
          }
        },
        {
          '@type': 'Question',
          name: 'מהם הסיכונים בהשקעה בקרקע?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'הסיכונים כוללים: עיכובים בתהליכי תכנון, שינויים בייעוד הקרקע, חוסר נזילות (קשה למכור מהר), היטלי השבחה גבוהים, ושינויים רגולטוריים. חשוב לבצע בדיקת נאותות מקיפה לפני רכישה.'
          }
        },
      ]
    } : null

    const schemas: Record<string, unknown>[] = [jsonLd, orgSchema, websiteSchema]
    if (faqSchema) schemas.push(faqSchema as Record<string, unknown>)

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(schemas)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById(SCRIPT_ID)
      if (el) el.remove()
    }
  }, [plot?.id, plots?.length])
}

// ═══ useThemeColor ═══

const DEFAULT_THEME_COLOR = '#FFFFFF'

export function useThemeColor(color?: string): void {
  const prevColorRef = useRef<string | null>(null)

  useEffect(() => {
    const targetColor = color || DEFAULT_THEME_COLOR

    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }

    if (prevColorRef.current === null) {
      prevColorRef.current = meta.getAttribute('content') || DEFAULT_THEME_COLOR
    }

    meta.setAttribute('content', targetColor)

    return () => {
      const existing = document.querySelector('meta[name="theme-color"]')
      if (existing && prevColorRef.current) {
        existing.setAttribute('content', prevColorRef.current)
      }
      prevColorRef.current = null
    }
  }, [color])
}

export const themeColors = {
  default: '#FFFFFF',
  focused: '#F9FAFB',
  detail: '#FFFFFF',
  admin: '#F9FAFB',
  calculator: '#FFFFFF',
  error: '#FEF2F2',
} as const
