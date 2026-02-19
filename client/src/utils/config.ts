import type { Plot } from '../types'
export type { Plot }

export const API_BASE = import.meta.env.VITE_API_URL || ''

export function plotOgImageUrl(plotId: string): string {
  const base = API_BASE || window.location.origin
  return `${base}/api/og/${plotId}`
}

export const CONTACT = {
  whatsappNumber: '972500000000',
  phone: '+972-50-000-0000',
  email: 'info@landmap.co.il',
}

export function whatsappLink(message = '', number = CONTACT.whatsappNumber): string {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${number}?text=${encoded}`
}

export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function plotInquiryLink(plot: Plot): string {
  const blockNum = plot.block_number ?? plot.blockNumber
  const msg = `שלום, אני מעוניין בפרטים על גוש ${blockNum} חלקה ${plot.number} ב${plot.city}`
  return whatsappLink(msg)
}

export function plotReportIssueLink(plot: Plot): string {
  const blockNum = plot.block_number ?? plot.blockNumber
  const msg = `🚩 דיווח על בעיה בנתונים\n\nגוש ${blockNum} חלקה ${plot.number} — ${plot.city}\nקישור: ${window.location.origin}/plot/${plot.id}\n\nתיאור הבעיה:\n`
  return whatsappLink(msg)
}

export function plotTelegramLink(plot: Plot): string {
  const blockNum = plot.block_number ?? plot.blockNumber
  return `https://t.me/LandMapIsraelBot?start=plot_${plot.id}_gush${blockNum}_parcel${plot.number}`
}

export interface NativeShareResult {
  isSupported: boolean
  share: (data: ShareData) => Promise<boolean>
}

export function useNativeShare(): NativeShareResult {
  const isSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function share(data: ShareData): Promise<boolean> {
    if (!isSupported) return false
    try {
      await navigator.share(data)
      return true
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return false
      return false
    }
  }

  return { isSupported, share }
}

type ContactChannel = 'whatsapp' | 'telegram' | 'phone' | 'lead_form' | 'share'

interface ConversionEvent {
  channel: ContactChannel
  plotId: string | null
  ts: number
  url: string
  referrer: string | null
  [key: string]: unknown
}

const CONVERSION_EVENTS: ConversionEvent[] = []
const MAX_QUEUED = 50

export function trackContactConversion(
  channel: ContactChannel,
  plotId: string | null = null,
  meta: Record<string, unknown> = {}
): void {
  const event: ConversionEvent = {
    channel,
    plotId,
    ...meta,
    ts: Date.now(),
    url: window.location.pathname,
    referrer: document.referrer || null,
  }

  CONVERSION_EVENTS.push(event)

  try {
    const body = JSON.stringify(event)
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
  } catch {}

  if (CONVERSION_EVENTS.length > MAX_QUEUED) {
    CONVERSION_EVENTS.splice(0, CONVERSION_EVENTS.length - MAX_QUEUED)
  }
}

export function trackAndOpenWhatsApp(
  message: string,
  plotId: string | null = null,
  source = 'unknown'
): void {
  trackContactConversion('whatsapp', plotId, { source })
  const url = whatsappLink(message)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function trackAndOpenTelegram(plotId: string | null = null, source = 'unknown'): void {
  trackContactConversion('telegram', plotId, { source })
  const url = plotId
    ? `https://t.me/LandMapIsraelBot?start=plot_${plotId}`
    : 'https://t.me/LandMapIsraelBot'
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function govMapUrl(plot: Plot): string | null {
  const blockNum = plot.block_number ?? plot.blockNumber
  const parcel = plot.number
  if (!blockNum || !parcel) return null
  return `https://www.govmap.gov.il/?q=${encodeURIComponent(`גוש ${blockNum} חלקה ${parcel}`)}&z=10`
}

export function tabuCheckUrl(plot: Plot): string | null {
  const blockNum = plot.block_number ?? plot.blockNumber
  if (!blockNum) return null
  return `https://ecom.gov.il/counter/tabu/homepage`
}

export interface PlotShareData {
  title: string
  text: string
  url: string
}

export function buildPlotShareData(plot: Plot): PlotShareData {
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
