export function formatCurrency(value) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPriceShort(price) {
  if (price >= 1000000) return `₪${(price / 1000000).toFixed(1)}M`
  if (price >= 1000) return `₪${Math.round(price / 1000)}K`
  return `₪${price}`
}
