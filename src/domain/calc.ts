import { getRules, type RuleSet, type Track } from './rules'

export type ClientKind = 'magan' | 'ceg'

/** Egy befolyt (vagy várható) bevétel, amit a számítás figyelembe vesz */
export interface RevenueItem {
  /** ISO dátum (YYYY-MM-DD): a KATA a befolyt bevétellel számol, ezért ez a fizetés napja */
  date: string
  amount: number
  clientId: string
  clientKind: ClientKind
}

export interface YearSetup {
  year: number
  track: Track
  /** Az első és utolsó hónap (1–12), amikor katás vagy az adott évben */
  fromMonth: number
  toMonth: number
  /** Hónapok, amikre nem kell tételes adót fizetni (táppénz, GYED, szünetelés stb.) */
  exemptMonths: number[]
  /** Az előző évi minimálbér, ha a szabály ebből számol és nem ismert */
  minWagePrevYear?: number
}

export interface Warning {
  level: 'info' | 'figyelem' | 'kritikus'
  text: string
}

export interface Deadline {
  date: string
  label: string
  amount: number
  kind: 'teteles' | 'eves'
}

export interface YearResult {
  rules: RuleSet
  activeMonths: number
  taxableMonths: number
  revenue: { total: number; private: number; corporate: number }
  /** Időarányos értékhatár */
  limit: number
  limitUsed: number
  excess: number
  overLimitTax: number
  monthlyTaxTotal: number
  /** Céges bevétel, ami felett kiegészítő adó jön (0, ha cégnek nem számlázhatsz) */
  supplementaryThreshold: number
  supplementaryTax: number
  totalTax: number
  /** Teljes adó / bevétel */
  effectiveRate: number
  topClient: { clientId: string; amount: number; share: number; kind: ClientKind } | null
  byMonth: { month: number; private: number; corporate: number }[]
  warnings: Warning[]
  deadlines: Deadline[]
  /** Ezzel a bevételi összetétellel a sáv nem választható (pl. céges bevétel a régi KATA-ban) */
  blocked: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

export function monthOf(isoDate: string): number {
  return Number(isoDate.slice(5, 7))
}

export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4))
}

export function activeMonthList(setup: Pick<YearSetup, 'fromMonth' | 'toMonth'>): number[] {
  const out: number[] = []
  for (let m = setup.fromMonth; m <= setup.toMonth; m++) out.push(m)
  return out
}

/** A tételes adó a tárgyhónapot követő hónap 12-éig esedékes */
export function monthlyDeadline(year: number, month: number): string {
  const y = month === 12 ? year + 1 : year
  const m = month === 12 ? 1 : month + 1
  return `${y}-${pad(m)}-12`
}

/** Éves bevallás, 40%-os különadó és 15%-os kiegészítő adó: következő év február 25. */
export function annualDeadline(year: number): string {
  return `${year + 1}-02-25`
}

export function calculateYear(setup: YearSetup, items: RevenueItem[]): YearResult {
  const rules = getRules(setup.year, setup.track, setup.minWagePrevYear)
  const months = activeMonthList(setup)
  const exempt = new Set(setup.exemptMonths.filter((m) => months.includes(m)))
  const taxableMonths = months.length - exempt.size

  const inYear = items.filter((i) => yearOf(i.date) === setup.year && months.includes(monthOf(i.date)))

  const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, private: 0, corporate: 0 }))
  const perClient = new Map<string, { amount: number; kind: ClientKind }>()
  let priv = 0
  let corp = 0
  for (const it of inYear) {
    const slot = byMonth[monthOf(it.date) - 1]
    if (it.clientKind === 'ceg') {
      corp += it.amount
      slot.corporate += it.amount
    } else {
      priv += it.amount
      slot.private += it.amount
    }
    const prev = perClient.get(it.clientId)
    perClient.set(it.clientId, { amount: (prev?.amount ?? 0) + it.amount, kind: it.clientKind })
  }
  const total = priv + corp

  const limit = Math.round((rules.annualLimit * months.length) / 12)
  const excess = Math.max(0, total - limit)
  const overLimitTax = Math.round(excess * rules.overLimitRate)
  const monthlyTaxTotal = rules.monthlyTax * taxableMonths

  let supplementaryTax = 0
  let supplementaryThreshold = 0
  if (rules.corporate.mode === 'kiegeszito') {
    supplementaryTax = Math.max(0, Math.round(corp * rules.corporate.rate) - monthlyTaxTotal)
    supplementaryThreshold = Math.round(monthlyTaxTotal / rules.corporate.rate)
  }

  let topClient: YearResult['topClient'] = null
  for (const [clientId, v] of perClient) {
    if (!topClient || v.amount > topClient.amount) {
      topClient = { clientId, amount: v.amount, share: total ? v.amount / total : 0, kind: v.kind }
    }
  }

  const totalTax = monthlyTaxTotal + overLimitTax + supplementaryTax

  const warnings: Warning[] = []
  if (rules.corporate.mode === 'tiltott' && corp > 0) {
    warnings.push({
      level: 'kritikus',
      text: 'A régi KATA-ban cégtől kapott bevétel megszünteti a jogosultságot. Nézd meg a céges tételeket, vagy válts sávot.',
    })
  }
  if (
    rules.singleClientMaxShare &&
    topClient &&
    topClient.kind === 'ceg' &&
    topClient.share >= rules.singleClientMaxShare
  ) {
    warnings.push({
      level: 'kritikus',
      text: `A bevételed ${Math.round(topClient.share * 100)}%-a egy cégtől jön. 50% felett az év végén megszűnik a KATA-jogosultság.`,
    })
  }
  if (excess > 0) {
    warnings.push({
      level: 'figyelem',
      text: 'Túllépted az időarányos bevételi határt. A felette lévő részre 40% különadó jár.',
    })
  } else if (limit > 0 && total / limit >= 0.85) {
    warnings.push({ level: 'figyelem', text: 'Már a bevételi határ 85%-a felett jársz.' })
  }
  if (supplementaryTax > 0) {
    warnings.push({
      level: 'info',
      text: 'A céges bevételed átlépte a küszöböt, ezért kiegészítő adót is fizetsz.',
    })
  }

  const deadlines: Deadline[] = months
    .filter((m) => !exempt.has(m))
    .map((m) => ({
      date: monthlyDeadline(setup.year, m),
      label: `Tételes adó, ${setup.year}. ${pad(m)}. hó`,
      amount: rules.monthlyTax,
      kind: 'teteles' as const,
    }))
  deadlines.push({
    date: annualDeadline(setup.year),
    label: overLimitTax + supplementaryTax > 0 ? 'Éves bevallás + különadó / kiegészítő adó' : 'Éves bevallás (KATA)',
    amount: overLimitTax + supplementaryTax,
    kind: 'eves',
  })

  return {
    rules,
    activeMonths: months.length,
    taxableMonths,
    revenue: { total, private: priv, corporate: corp },
    limit,
    limitUsed: limit ? total / limit : 0,
    excess,
    overLimitTax,
    monthlyTaxTotal,
    supplementaryThreshold,
    supplementaryTax,
    totalTax,
    effectiveRate: total ? totalTax / total : 0,
    topClient,
    byMonth,
    warnings,
    deadlines,
    blocked: rules.corporate.mode === 'tiltott' && corp > 0,
  }
}

/** Lineáris év végi becslés az eddig eltelt aktív hónapok alapján */
export function projectYearEnd(setup: YearSetup, items: RevenueItem[], today: string): YearResult {
  const current = calculateYear(setup, items)
  if (yearOf(today) !== setup.year) return current
  const months = activeMonthList(setup)
  const elapsed = months.filter((m) => m <= monthOf(today)).length
  if (elapsed === 0 || elapsed >= months.length) return current
  const factor = months.length / elapsed
  const scaled: RevenueItem[] = items
    .filter((i) => yearOf(i.date) === setup.year)
    .map((i) => ({ ...i, amount: Math.round(i.amount * factor) }))
  return calculateYear(setup, scaled)
}

/**
 * Mennyivel nő az éves adó, ha ezt a tételt is hozzáadod?
 * A számlázás előtti "adóhatás" előnézethez.
 */
export function marginalImpact(setup: YearSetup, items: RevenueItem[], extra: RevenueItem) {
  const before = calculateYear(setup, items)
  const after = calculateYear(setup, [...items, extra])
  return {
    before,
    after,
    deltaTax: after.totalTax - before.totalTax,
    newWarnings: after.warnings.filter((w) => !before.warnings.some((b) => b.text === w.text)),
  }
}

/** Gyors kalkulátor: összesített bevételből, ügyfélbontás nélkül */
export interface QuickInput {
  year: number
  track: Track
  fromMonth: number
  toMonth: number
  revenue: number
  corporateShare: number
  /** A legnagyobb céges ügyfél aránya a teljes bevételből */
  topClientShare: number
  minWagePrevYear?: number
}

export function quickCalc(q: QuickInput): YearResult {
  const corporate = Math.round(q.revenue * q.corporateShare)
  const top = Math.min(corporate, Math.round(q.revenue * q.topClientShare))
  const items: RevenueItem[] = []
  const date = `${q.year}-${pad(q.toMonth)}-01`
  if (q.revenue - corporate > 0)
    items.push({ date, amount: q.revenue - corporate, clientId: 'magan', clientKind: 'magan' })
  if (top > 0) items.push({ date, amount: top, clientId: 'ceg-top', clientKind: 'ceg' })
  if (corporate - top > 0) items.push({ date, amount: corporate - top, clientId: 'ceg-tobbi', clientKind: 'ceg' })
  return calculateYear(
    {
      year: q.year,
      track: q.track,
      fromMonth: q.fromMonth,
      toMonth: q.toMonth,
      exemptMonths: [],
      minWagePrevYear: q.minWagePrevYear,
    },
    items,
  )
}
