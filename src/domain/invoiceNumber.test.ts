import { describe, expect, it } from 'vitest'
import { nextInvoiceNumber, parseSequence, renderNumber } from './invoiceNumber'

const fmt = { pattern: 'KN-{YYYY}-{N}', padding: 3 }

describe('számlaszám', () => {
  it('sablonból renderel', () => {
    expect(renderNumber(fmt, 2026, 7)).toBe('KN-2026-007')
    expect(renderNumber({ pattern: '{YY}/{N}', padding: 4 }, 2027, 12)).toBe('27/0012')
  })

  it('kiolvassa a sorszámot', () => {
    expect(parseSequence(fmt, 2026, 'KN-2026-042')).toBe(42)
    expect(parseSequence(fmt, 2026, 'KN-2025-042')).toBeNull()
    expect(parseSequence(fmt, 2026, 'valami')).toBeNull()
  })

  it('a legnagyobb sorszám után folytatja, évenként újrakezdve', () => {
    expect(nextInvoiceNumber(fmt, 2026, ['KN-2026-001', 'KN-2026-009', 'KN-2025-120'])).toBe('KN-2026-010')
    expect(nextInvoiceNumber(fmt, 2027, ['KN-2026-009'])).toBe('KN-2027-001')
  })

  it('a regex-karaktereket a sablonban szövegként kezeli', () => {
    const f = { pattern: 'A.{YYYY}.(N){N}', padding: 2 }
    expect(nextInvoiceNumber(f, 2026, ['A.2026.(N)05'])).toBe('A.2026.(N)06')
  })
})
