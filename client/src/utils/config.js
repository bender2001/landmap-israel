/**
 * Centralized app configuration.
 * All magic numbers and contact info live here — not scattered across components.
 */

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
