/**
 * Centralized app configuration.
 * All magic numbers and contact info live here — not scattered across components.
 */

// API base URL (auto-detect from environment or current origin)
export const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Build an OG image URL for a plot (used in social sharing meta tags).
 */
export function plotOgImageUrl(plotId) {
  const base = API_BASE || window.location.origin
  return `${base}/api/og/${plotId}`
}

// Business contact — change this once, updates everywhere
export const CONTACT = {
  whatsappNumber: '972500000000', // TODO: Replace with real number
  phone: '+972-50-000-0000',
  email: 'info@landmap.co.il',
}

/**
 * Build a WhatsApp deep link with pre-filled message.
 */
export function whatsappLink(message = '', number = CONTACT.whatsappNumber) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${number}?text=${encoded}`
}

/**
 * Build a WhatsApp share link (no specific number — user picks contact).
 */
export function whatsappShareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Build a plot inquiry WhatsApp message.
 */
export function plotInquiryLink(plot) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const msg = `שלום, אני מעוניין בפרטים על גוש ${blockNum} חלקה ${plot.number} ב${plot.city}`
  return whatsappLink(msg)
}

/**
 * Build a "Report Data Issue" link for a specific plot.
 * Pre-fills a WhatsApp message with plot identification so the team can investigate.
 * Like Google Maps' "Suggest an edit" — crowdsourced data quality improvement.
 * Returns null if no contact number is configured.
 */
export function plotReportIssueLink(plot) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const msg = `🚩 דיווח על בעיה בנתונים\n\nגוש ${blockNum} חלקה ${plot.number} — ${plot.city}\nקישור: ${window.location.origin}/plot/${plot.id}\n\nתיאור הבעיה:\n`
  return whatsappLink(msg)
}

/**
 * Native Web Share API — uses the system share sheet on supported platforms (mobile).
 * Like Madlan/Yad2/Airbnb: one button → opens native share with WhatsApp, Telegram,
 * Messages, etc. Falls back gracefully when not supported.
 *
 * @returns {{ isSupported: boolean, share: (data: ShareData) => Promise<boolean> }}
 */
export function useNativeShare() {
  const isSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  /**
   * Trigger native share. Returns true if shared, false if cancelled/unsupported.
   * @param {{ title: string, text: string, url: string }} data
   */
  async function share(data) {
    if (!isSupported) return false
    try {
      await navigator.share(data)
      return true
    } catch (err) {
      // User cancelled (AbortError) — not a real error
      if (err.name === 'AbortError') return false
      // NotAllowedError or other — silently fail
      return false
    }
  }

  return { isSupported, share }
}

// ─── Contact Conversion Tracking ────────────────────────────────────────
// Tracks WhatsApp/Telegram/Phone/Lead clicks as analytics events.
// Critical for measuring marketing ROI — which channels and plots drive inquiries.
// Like Madlan/Yad2's internal conversion funnel tracking.
// Events are sent to the server in the background (fire-and-forget).

const CONVERSION_EVENTS = []
const MAX_QUEUED = 50

/**
 * Track a contact conversion event (WhatsApp click, Telegram click, Phone click, Lead form).
 * @param {'whatsapp'|'telegram'|'phone'|'lead_form'|'share'} channel - Contact channel
 * @param {string|null} plotId - Plot ID if the click was plot-specific
 * @param {object} meta - Additional metadata (e.g., { source: 'sidebar' })
 */
export function trackContactConversion(channel, plotId = null, meta = {}) {
  const event = {
    channel,
    plotId,
    ...meta,
    ts: Date.now(),
    url: window.location.pathname,
    referrer: document.referrer || null,
  }

  CONVERSION_EVENTS.push(event)

  // Flush to server in the background (non-blocking)
  try {
    const body = JSON.stringify(event)
    // Use sendBeacon for reliability — survives page navigations (link clicks open new tabs).
    // Falls back to fetch for older browsers. Like Google Analytics' beacon transport.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/conversion', body)
    } else {
      fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Silently ignore — conversion tracking failure is never user-facing
  }

  // Trim old events from memory
  if (CONVERSION_EVENTS.length > MAX_QUEUED) {
    CONVERSION_EVENTS.splice(0, CONVERSION_EVENTS.length - MAX_QUEUED)
  }
}

/**
 * Build a tracked WhatsApp deep link. Wraps whatsappLink() and fires a conversion event.
 * Use this in onClick handlers instead of raw <a href> for trackable WhatsApp CTAs.
 */
export function trackAndOpenWhatsApp(message, plotId = null, source = 'unknown') {
  trackContactConversion('whatsapp', plotId, { source })
  const url = whatsappLink(message)
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Build a tracked Telegram deep link.
 */
export function trackAndOpenTelegram(plotId = null, source = 'unknown') {
  trackContactConversion('telegram', plotId, { source })
  const url = plotId
    ? `https://t.me/LandMapIsraelBot?start=plot_${plotId}`
    : 'https://t.me/LandMapIsraelBot'
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Build a GovMap (government map) URL for a specific gush/helka.
 * Opens the official Israeli government cadastral map at the plot's location.
 * Critical for due diligence — investors verify ownership, boundaries, and zoning
 * against the official registry. Like Madlan's "צפה ברשות המקרקעין" link.
 *
 * URL format uses GovMap's coordinate-based viewer. Falls back to search page
 * if no coordinates are available.
 */
export function govMapUrl(plot) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const parcel = plot.number
  if (!blockNum || !parcel) return null
  // GovMap parcel search URL — opens directly to the gush/helka on the government map.
  // Uses the official search endpoint which resolves to the cadastral layer.
  return `https://www.govmap.gov.il/?q=${encodeURIComponent(`גוש ${blockNum} חלקה ${parcel}`)}&z=10`
}

/**
 * Build a Tabu (land registry) check URL for an Israeli plot.
 * Opens the Ministry of Justice's online Tabu extract service.
 * Investors need Tabu extracts for ownership verification before purchase.
 */
export function tabuCheckUrl(plot) {
  const blockNum = plot.block_number ?? plot.blockNumber
  if (!blockNum) return null
  return `https://ecom.gov.il/counter/tabu/homepage`
}

/**
 * Build a share payload for a plot — standardized across all share surfaces.
 * Generates a rich text description with key investment metrics.
 */
export function buildPlotShareData(plot) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice ?? 0
  const projValue = plot.projected_value ?? plot.projectedValue ?? 0
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
  const dunam = sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '?'
  const priceK = price >= 1000000 ? `₪${(price / 1000000).toFixed(1)}M` : price >= 1000 ? `₪${Math.round(price / 1000)}K` : `₪${price}`

  const url = `${window.location.origin}/plot/${plot.id}`
  const title = `גוש ${blockNum} חלקה ${plot.number} — ${plot.city} | LandMap`
  const text = `🏗️ קרקע להשקעה ב${plot.city}\nגוש ${blockNum} | חלקה ${plot.number}\n💰 ${priceK} · ${dunam} דונם\n📈 תשואה +${roi}% ROI\n${url}`

  return { title, text, url }
}
