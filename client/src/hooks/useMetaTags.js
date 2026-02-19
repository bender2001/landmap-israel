import { useEffect } from 'react'

/**
 * Dynamically update meta tags for SEO and social sharing.
 * Sets Open Graph + Twitter Card meta for rich link previews.
 */
export function useMetaTags({ title, description, url, image }) {
  useEffect(() => {
    if (!title) return

    // ── Dynamic document.title ──────────────────────────────────────────
    // Previously this hook only set OG/Twitter meta tags — the browser tab title
    // stayed as the static "LandMap Israel — מפת קרקעות להשקעה" from index.html.
    // Madlan shows "12 נכסים בחדרה | מדלן" — dynamic titles help users with multiple
    // tabs and improve SEO (Google uses document.title as the primary SERP heading).
    const prevTitle = document.title
    document.title = title

    // Helper to upsert a meta tag
    const setMeta = (property, content) => {
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

    // Set description
    const descEl = document.querySelector('meta[name="description"]')
    if (descEl && description) descEl.setAttribute('content', description)

    // Open Graph
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', url || window.location.href)
    setMeta('og:type', 'website')
    setMeta('og:site_name', 'LandMap Israel')
    if (image) setMeta('og:image', image)

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    if (image) setMeta('twitter:image', image)

    // Canonical URL — critical for SEO deduplication (like Madlan/Yad2)
    const canonicalUrl = url || window.location.href.split('?')[0]
    let canonicalEl = document.querySelector('link[rel="canonical"]')
    if (!canonicalEl) {
      canonicalEl = document.createElement('link')
      canonicalEl.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalEl)
    }
    canonicalEl.setAttribute('href', canonicalUrl)

    // Cleanup: restore previous title and remove canonical on unmount to prevent stale tags
    return () => {
      document.title = prevTitle
      const el = document.querySelector('link[rel="canonical"]')
      if (el) el.remove()
    }
  }, [title, description, url, image])
}
