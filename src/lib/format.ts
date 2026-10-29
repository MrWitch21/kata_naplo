const huf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('hu-HU', { style: 'percent', maximumFractionDigits: 0 })

export const ft = (n: number) => `${huf.format(n)} Ft`
export const num = (n: number) => huf.format(n)
export const percent = (n: number) => pct.format(n)

/** Rövid forint: 12,4 M Ft, 850 e Ft */
export function ftShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('hu-HU', { maximumFractionDigits: 1 })} M Ft`
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000).toLocaleString('hu-HU')} e Ft`
  return ft(n)
}

export const MONTHS = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.']
export const MONTHS_LONG = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december']

/** 2026-04-12 → 2026. ápr. 12. */
export function date(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}. ${MONTHS[m - 1]} ${d}.`
}

/** Számlázó programokba jobb a pontos formátum: 2026.04.12. */
export function dateDots(iso: string) {
  return iso.replaceAll('-', '.') + '.'
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(toIso + 'T12:00:00').getTime() - new Date(fromIso + 'T12:00:00').getTime()) / 86_400_000)
}

/** Forint bevitel: szóközt, pontot, "Ft"-ot elnyel */
export function parseAmount(s: string): number {
  const digits = s.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}
