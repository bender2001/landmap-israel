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
