const _currencyFmt = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})

const _compactFmt = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
  return _currencyFmt.format(value)
}

export function formatCurrencyCompact(value: number): string {
  return _compactFmt.format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPriceShort(price: number): string {
  if (price >= 1000000) return `₪${(price / 1000000).toFixed(1)}M`
  if (price >= 1000) return `₪${Math.round(price / 1000)}K`
  return `₪${price}`
}

export function formatDunam(sqm: number | null | undefined): string {
  if (!sqm) return '0'
  const dunam = sqm / 1000
  return dunam % 1 === 0 ? dunam.toString() : dunam.toFixed(1)
}

export function formatRelativeTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'היום'
  if (diffDays === 1) return 'אתמול'
  if (diffDays <= 7) return `לפני ${diffDays} ימים`
  if (diffDays <= 14) return 'לפני שבוע'
  if (diffDays <= 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
  if (diffDays <= 60) return 'לפני חודש'
  return `לפני ${Math.floor(diffDays / 30)} חודשים`
}

export function getFreshnessColor(dateStr: string | null | undefined): string {
  if (!dateStr) return '#64748B'
  const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return '#4ADE80'
  if (diffDays <= 7) return '#34D399'
  if (diffDays <= 30) return '#94A3B8'
  return '#64748B'
}

export function formatMonthlyPayment(monthly: number | null | undefined): string {
  if (!monthly) return ''
  return `₪${monthly.toLocaleString('he-IL')}/חודש`
}

export function formatDistanceKm(km: number): string | null {
  if (!isFinite(km) || km < 0) return null
  if (km < 0.1) return 'כאן'
  if (km < 1) return `${Math.round(km * 1000)} מ׳`
  if (km < 10) return `${km.toFixed(1)} ק״מ`
  return `${Math.round(km)} ק״מ`
}
