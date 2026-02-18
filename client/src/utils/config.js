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
