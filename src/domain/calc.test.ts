import { describe, expect, it } from 'vitest'
import { calculateYear, marginalImpact, monthlyDeadline, quickCalc, type RevenueItem, type YearSetup } from './calc'
import { getRules, RulesUnavailableError, tracksForYear } from './rules'

const full = (year: number, track: YearSetup['track']): YearSetup => ({
  year,
  track,
  fromMonth: 1,
  toMonth: 12,
  exemptMonths: [],
})

const item = (date: string, amount: number, kind: 'magan' | 'ceg' = 'magan', clientId: string = kind): RevenueItem => ({
  date,
  amount,
  clientKind: kind,
  clientId,
})

describe('szabálykészletek', () => {
  it('2026-ban csak a régi KATA választható', () => {
    expect(tracksForYear(2026)).toEqual(['regi'])
    expect(() => getRules(2026, 'fo')).toThrow(RulesUnavailableError)
  })

  it('a régi KATA 2029-ben megszűnik', () => {
    expect(tracksForYear(2029)).toEqual(['fo', 'mellek'])
    expect(() => getRules(2029, 'regi')).toThrow(RulesUnavailableError)
  })

  it('átmeneti tételes adó: 2027-ben 75 000, 2028-ban 100 000 Ft', () => {
    expect(getRules(2027, 'regi').monthlyTax).toBe(75_000)
    expect(getRules(2028, 'regi').monthlyTax).toBe(100_000)
    expect(getRules(2027, 'regi').annualLimit).toBe(18_000_000)
  })

  it('új KATA 2027: 100 000 / 50 000 Ft, 22 milliós határ', () => {
    expect(getRules(2027, 'fo').monthlyTax).toBe(100_000)
    expect(getRules(2027, 'mellek').monthlyTax).toBe(50_000)
    expect(getRules(2027, 'fo').annualLimit).toBe(22_000_000)
  })

  it('2028-tól a minimálbér 31,5% / 15%-a', () => {
    expect(getRules(2028, 'fo', 350_000).monthlyTax).toBe(110_250)
    expect(getRules(2028, 'mellek', 350_000).monthlyTax).toBe(52_500)
    expect(getRules(2028, 'fo').monthlyTaxBasis?.estimated).toBe(true)
  })
})

describe('éves számítás', () => {
  it('2026: 20 M Ft bevételnél 2 M Ft túllépés, 800 000 Ft különadó', () => {
    const r = calculateYear(full(2026, 'regi'), [item('2026-03-10', 12_000_000), item('2026-09-10', 8_000_000)])
    expect(r.limit).toBe(18_000_000)
    expect(r.excess).toBe(2_000_000)
    expect(r.overLimitTax).toBe(800_000)
    expect(r.monthlyTaxTotal).toBe(600_000)
    expect(r.totalTax).toBe(1_400_000)
  })

  it('a bevételi határ időarányos', () => {
    const r = calculateYear({ ...full(2026, 'regi'), fromMonth: 7 }, [])
    expect(r.limit).toBe(9_000_000)
    expect(r.monthlyTaxTotal).toBe(300_000)
  })

  it('a mentes hónapokra nincs tételes adó, de a határ nem csökken', () => {
    const r = calculateYear({ ...full(2026, 'regi'), exemptMonths: [1, 2] }, [])
    expect(r.taxableMonths).toBe(10)
    expect(r.monthlyTaxTotal).toBe(500_000)
    expect(r.limit).toBe(18_000_000)
  })

  it('a KATA-időszakon kívüli bevételt nem számolja', () => {
    const r = calculateYear({ ...full(2026, 'regi'), fromMonth: 6 }, [
      item('2026-02-01', 1_000_000),
      item('2025-12-01', 1_000_000),
    ])
    expect(r.revenue.total).toBe(0)
  })

  it('Bank360 példa: főállás, 10 M Ft céges bevétel → 300 000 Ft kiegészítő adó', () => {
    const r = calculateYear(full(2027, 'fo'), [
      item('2027-02-01', 4_000_000, 'ceg', 'a'),
      item('2027-05-01', 3_000_000, 'ceg', 'b'),
      item('2027-08-01', 3_000_000, 'ceg', 'c'),
      item('2027-09-01', 6_000_000, 'magan', 'd'),
    ])
    expect(r.monthlyTaxTotal).toBe(1_200_000)
    expect(r.supplementaryThreshold).toBe(8_000_000)
    expect(r.supplementaryTax).toBe(300_000)
  })

  it('mellékállásban a küszöb 4 M Ft céges bevétel', () => {
    const at = calculateYear(full(2027, 'mellek'), [
      item('2027-04-01', 4_000_000, 'ceg', 'a'),
      item('2027-05-01', 6_000_000, 'magan'),
    ])
    expect(at.supplementaryThreshold).toBe(4_000_000)
    expect(at.supplementaryTax).toBe(0)
    const over = calculateYear(full(2027, 'mellek'), [
      item('2027-04-01', 5_000_000, 'ceg', 'a'),
      item('2027-05-01', 6_000_000, 'magan'),
    ])
    expect(over.supplementaryTax).toBe(150_000)
  })

  it('régi KATA-ban a céges bevétel kritikus figyelmeztetés', () => {
    const r = calculateYear(full(2026, 'regi'), [item('2026-04-01', 100_000, 'ceg')])
    expect(r.warnings.some((w) => w.level === 'kritikus')).toBe(true)
    expect(r.blocked).toBe(true)
    expect(r.supplementaryTax).toBe(0)
  })

  it('50% feletti egy-megbízós arány figyelmeztet', () => {
    const r = calculateYear(full(2027, 'fo'), [
      item('2027-01-10', 6_000_000, 'ceg', 'x'),
      item('2027-02-10', 4_000_000, 'magan', 'y'),
    ])
    expect(r.topClient?.share).toBeCloseTo(0.6)
    expect(r.warnings.some((w) => w.text.includes('egy cégtől'))).toBe(true)
  })
})

describe('határidők', () => {
  it('a tételes adó a következő hónap 12-éig esedékes', () => {
    expect(monthlyDeadline(2026, 3)).toBe('2026-04-12')
    expect(monthlyDeadline(2026, 12)).toBe('2027-01-12')
  })

  it('az éves tétel február 25-én esedékes', () => {
    const r = calculateYear(full(2026, 'regi'), [])
    expect(r.deadlines.at(-1)?.date).toBe('2027-02-25')
    expect(r.deadlines).toHaveLength(13)
  })
})

describe('adóhatás', () => {
  it('a küszöb feletti céges számla adóhatása 15%', () => {
    const base = [item('2027-02-01', 8_000_000, 'ceg', 'a'), item('2027-02-01', 9_000_000, 'magan')]
    const imp = marginalImpact(full(2027, 'fo'), base, item('2027-03-01', 1_000_000, 'ceg', 'b'))
    expect(imp.deltaTax).toBe(150_000)
  })

  it('a határ feletti magánszemélyes számla adóhatása 40%', () => {
    const base = [item('2027-02-01', 22_000_000, 'magan')]
    const imp = marginalImpact(full(2027, 'fo'), base, item('2027-03-01', 500_000))
    expect(imp.deltaTax).toBe(200_000)
  })
})

describe('gyors kalkulátor', () => {
  it('bontja a bevételt magán / céges / legnagyobb ügyfél részre', () => {
    const r = quickCalc({
      year: 2027,
      track: 'fo',
      fromMonth: 1,
      toMonth: 12,
      revenue: 20_000_000,
      corporateShare: 0.8,
      topClientShare: 0.55,
    })
    expect(r.revenue.corporate).toBe(16_000_000)
    expect(r.topClient).toMatchObject({ clientId: 'ceg-top', kind: 'ceg' })
    expect(r.topClient?.share).toBeCloseTo(0.55)
    expect(r.supplementaryTax).toBe(1_200_000)
    expect(r.warnings.some((w) => w.text.includes('egy cégtől'))).toBe(true)
  })
})
