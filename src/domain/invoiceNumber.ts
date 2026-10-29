/**
 * Számlaszám-sablonok. Támogatott helyettesítők:
 *   {YYYY} év, {YY} év két jeggyel, {N} sorszám (a {N} előtti/utáni szöveg szabad)
 * A sorszám nullákkal töltődik ki a megadott hosszra.
 *
 * Példa: "KN-{YYYY}-{N}" + 3 → KN-2026-001
 */
export interface NumberFormat {
  pattern: string
  padding: number
}

export function renderNumber(fmt: NumberFormat, year: number, seq: number): string {
  return fmt.pattern
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', String(year).slice(2))
    .replaceAll('{N}', String(seq).padStart(fmt.padding, '0'))
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Kiolvassa a sorszámot egy meglévő számlaszámból, ha illik a sablonra */
export function parseSequence(fmt: NumberFormat, year: number, number: string): number | null {
  const parts = fmt.pattern.split('{N}')
  if (parts.length !== 2) return null
  const fill = (s: string) =>
    escapeRegex(s.replaceAll('{YYYY}', String(year)).replaceAll('{YY}', String(year).slice(2)))
  const re = new RegExp(`^${fill(parts[0])}(\\d+)${fill(parts[1])}$`)
  const m = number.match(re)
  return m ? Number(m[1]) : null
}

export function nextInvoiceNumber(fmt: NumberFormat, year: number, existing: string[]): string {
  let max = 0
  for (const n of existing) {
    const seq = parseSequence(fmt, year, n)
    if (seq !== null && seq > max) max = seq
  }
  return renderNumber(fmt, year, max + 1)
}
