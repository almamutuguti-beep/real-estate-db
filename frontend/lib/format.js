export const CURRENCY = 'KSh '

export function money(value) {
  return `${CURRENCY}${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function initialsOf(name) {
  return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'
}