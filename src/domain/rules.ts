/**
 * KATA szabálykészletek, évenként és "sávonként" verziózva.
 *
 * A 2027-től érvényes szabályok a 2026. október 27-én benyújtott törvényjavaslatból
 * származnak, és a kihirdetésig változhatnak. Ha a végleges törvény más lesz,
 * csak ezt a fájlt kell frissíteni (és a teszteket).
 */

/** regi = a 2022 óta élő KATA (2027–2028-ban átmeneti jelleggel); fo / mellek = új KATA 2027-től */
export type Track = 'regi' | 'fo' | 'mellek'

export type RuleStatus = 'hatalyos' | 'javaslat'

export interface Source {
  title: string
  url: string
}

export interface RuleSet {
  id: string
  year: number
  track: Track
  label: string
  status: RuleStatus
  /** Havi tételes adó forintban */
  monthlyTax: number
  /** Ha a havi adó a minimálbérből számolódik, itt a részletek */
  monthlyTaxBasis?: { minWageYear: number; minWage: number; ratio: number; estimated: boolean }
  /** Éves bevételi értékhatár 12 hónap KATA-alanyiság esetén */
  annualLimit: number
  /** Az értékhatár feletti bevétel különadója */
  overLimitRate: number
  /** Kifizetőnek (cégnek, vállalkozónak) számlázás */
  corporate:
    | { mode: 'tiltott' }
    | { mode: 'kiegeszito'; rate: number }
  /** Egy megbízóból származó bevétel aránya, ami felett megszűnik a jogosultság év végén */
  singleClientMaxShare?: number
  notes: string[]
  sources: Source[]
}

export const TRACK_LABEL: Record<Track, string> = {
  regi: 'Régi KATA',
  fo: 'Új KATA, főállás',
  mellek: 'Új KATA, mellékállás',
}

export const OVER_LIMIT_RATE = 0.4
export const SUPPLEMENTARY_RATE = 0.15

/** Bruttó minimálbér évenként. Ami hiányzik, azt a felhasználó adja meg. */
export const KNOWN_MIN_WAGE: Record<number, number> = {
  2025: 290_800,
  2026: 322_800,
}

const SRC = {
  biztosdontes: {
    title: 'Biztos Döntés: a kibővített KATA szabályai 2027-től',
    url: 'https://biztosdontes.hu/cikkek/kata-szabalyai-2027',
  },
  bank360: {
    title: 'Bank360: KATA 2027 feltételek',
    url: 'https://bank360.hu/blog/kata-2027-feltetelek',
  },
  nav: {
    title: 'NAV: kisadózó vállalkozások tételes adója',
    url: 'https://nav.gov.hu/',
  },
} satisfies Record<string, Source>

export class RulesUnavailableError extends Error {}

/** Mely sávok választhatók az adott évben */
export function tracksForYear(year: number): Track[] {
  if (year <= 2026) return ['regi']
  if (year <= 2028) return ['regi', 'fo', 'mellek']
  return ['fo', 'mellek']
}

/**
 * Szabálykészlet egy adott évre és sávra.
 * @param minWageOverride az előző évi minimálbér, ha nem ismert (2028-tól kell)
 */
export function getRules(year: number, track: Track, minWageOverride?: number): RuleSet {
  if (!tracksForYear(year).includes(track)) {
    throw new RulesUnavailableError(`${TRACK_LABEL[track]} ${year}-ben nem választható.`)
  }

  if (track === 'regi') {
    if (year <= 2026) {
      return {
        id: `regi-${year}`,
        year,
        track,
        label: `Régi KATA (${year})`,
        status: 'hatalyos',
        monthlyTax: 50_000,
        annualLimit: 18_000_000,
        overLimitRate: OVER_LIMIT_RATE,
        corporate: { mode: 'tiltott' },
        notes: [
          'Csak magánszemélynek számlázhatsz. Ha kifizetőtől (cégtől, vállalkozótól) kapsz bevételt, megszűnik a KATA-alanyiságod.',
        ],
        sources: [SRC.nav, SRC.bank360],
      }
    }
    const monthlyTax = year === 2027 ? 75_000 : 100_000
    return {
      id: `regi-${year}`,
      year,
      track,
      label: `Régi KATA, átmeneti (${year})`,
      status: 'javaslat',
      monthlyTax,
      annualLimit: 18_000_000,
      overLimitRate: OVER_LIMIT_RATE,
      corporate: { mode: 'tiltott' },
      notes: [
        'Akkor maradhatsz benne, ha 2026. december 31-én katás vagy és folyamatosan jogosult maradsz.',
        'A régi KATA 2029-ben megszűnik.',
        'Céges bevétel után 15 napon belül át lehet lépni az új KATA-ba.',
      ],
      sources: [SRC.biztosdontes, SRC.bank360],
    }
  }

  // Új KATA
  let monthlyTax: number
  let monthlyTaxBasis: RuleSet['monthlyTaxBasis']
  if (year === 2027) {
    monthlyTax = track === 'fo' ? 100_000 : 50_000
  } else {
    const minWageYear = year - 1
    const known = KNOWN_MIN_WAGE[minWageYear]
    const minWage = minWageOverride ?? known ?? KNOWN_MIN_WAGE[2026]
    const ratio = track === 'fo' ? 0.315 : 0.15
    monthlyTax = Math.round(minWage * ratio)
    monthlyTaxBasis = { minWageYear, minWage, ratio, estimated: !minWageOverride && !known }
  }

  return {
    id: `${track}-${year}`,
    year,
    track,
    label: `${TRACK_LABEL[track]} (${year})`,
    status: 'javaslat',
    monthlyTax,
    monthlyTaxBasis,
    annualLimit: 22_000_000,
    overLimitRate: OVER_LIMIT_RATE,
    corporate: { mode: 'kiegeszito', rate: SUPPLEMENTARY_RATE },
    singleClientMaxShare: 0.5,
    notes: [
      'Cégnek is számlázhatsz, de a céges bevétel 15%-ából le kell vonni az éves tételes adót. Ha marad, azt kiegészítő adóként be kell fizetni.',
      'Jelenlegi vagy két éven belüli korábbi munkáltatódnak nem számlázhatsz.',
      'Ha az éves bevétel legalább fele egy cégtől (és kapcsolt vállalkozásaitól) jön, a jogosultság az év végén megszűnik.',
      ...(track === 'mellek'
        ? ['Mellékállás: legalább heti 36 órás munkaviszony mellett. Társadalombiztosítási jogot nem szerzel vele.']
        : []),
    ],
    sources: [SRC.biztosdontes, SRC.bank360],
  }
}
