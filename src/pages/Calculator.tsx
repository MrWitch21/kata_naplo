import { useState } from 'react'
import { quickCalc, type QuickInput, type YearResult } from '../domain/calc'
import { getRules, KNOWN_MIN_WAGE, TRACK_LABEL, tracksForYear, type Track } from '../domain/rules'
import { ft, MONTHS_LONG, parseAmount, percent } from '../lib/format'
import { Badge, Card, Field, PageHeader, SelectField } from '../components/ui'
import { Warnings } from '../components/Warnings'

const YEARS = [2026, 2027, 2028, 2029]

export function Calculator() {
  const [input, setInput] = useState<Omit<QuickInput, 'track'>>({
    year: 2027,
    fromMonth: 1,
    toMonth: 12,
    revenue: 16_000_000,
    corporateShare: 0.4,
    topClientShare: 0.25,
  })
  const set = <K extends keyof typeof input>(k: K, v: (typeof input)[K]) => setInput((s) => ({ ...s, [k]: v }))

  const tracks = tracksForYear(input.year)
  const needsMinWage = input.year >= 2028
  const results = tracks.map((track) => ({ track, r: quickCalc({ ...input, track }) }))
  const eligible = results.filter((x) => !x.r.blocked)
  const best = eligible.length ? eligible.reduce((a, b) => (b.r.totalTax < a.r.totalTax ? b : a)) : null

  return (
    <>
      <PageHeader title="Kalkulátor" />
      <p className="-mt-3 mb-6 max-w-[64ch] text-muted">
        Mennyi adót fizetnél egy év alatt, és melyik KATA-sáv éri meg jobban? Add meg a várható bevételt, a kalkulátor
        az összes választható sávot kiszámolja egymás mellett.
      </p>

      <Card className="mb-4">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Év" value={input.year} onChange={(e) => set('year', Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Első hónap" value={input.fromMonth} onChange={(e) => set('fromMonth', Math.min(Number(e.target.value), input.toMonth))}>
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </SelectField>
              <SelectField label="Utolsó hónap" value={input.toMonth} onChange={(e) => set('toMonth', Math.max(Number(e.target.value), input.fromMonth))}>
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </SelectField>
            </div>
            <Field
              label="Várható éves bevétel (Ft)"
              inputMode="numeric"
              className="tnum"
              value={input.revenue.toLocaleString('hu-HU')}
              onChange={(e) => set('revenue', parseAmount(e.target.value))}
            />
            <Slider
              label="Ebből cégtől"
              value={input.corporateShare}
              onChange={(v) => setInput((s) => ({ ...s, corporateShare: v, topClientShare: Math.min(s.topClientShare, v) }))}
              detail={ft(Math.round(input.revenue * input.corporateShare))}
            />
            <Slider
              label="A legnagyobb céges ügyfél"
              value={input.topClientShare}
              max={input.corporateShare}
              onChange={(v) => set('topClientShare', v)}
              detail="a teljes bevételből"
            />
            {needsMinWage && (
              <Field
                label={`${input.year - 1}. évi minimálbér (Ft)`}
                inputMode="numeric"
                className="tnum"
                placeholder={(KNOWN_MIN_WAGE[input.year - 1] ?? KNOWN_MIN_WAGE[2026]).toLocaleString('hu-HU')}
                value={input.minWagePrevYear ? input.minWagePrevYear.toLocaleString('hu-HU') : ''}
                onChange={(e) => set('minWagePrevYear', parseAmount(e.target.value) || undefined)}
                hint="2028-tól a tételes adó ebből számolódik. Ha üres, a 2026-os értékkel becsül."
              />
            )}
          </div>
      </Card>

      <div className={`grid items-start gap-4 ${results.length > 2 ? 'lg:grid-cols-3' : results.length === 2 ? 'lg:grid-cols-2' : 'max-w-xl'}`}>
        {results.map(({ track, r }) => (
          <ResultCard key={track} track={track} r={r} best={results.length > 1 && best?.track === track} />
        ))}
      </div>
    </>
  )
}

function ResultCard({ track, r, best }: { track: Track; r: YearResult; best: boolean }) {
  const rows: [string, number][] = [
    [`Tételes adó (${r.taxableMonths} hó × ${ft(r.rules.monthlyTax)})`, r.monthlyTaxTotal],
    ['40% különadó a határ felett', r.overLimitTax],
  ]
  if (r.rules.corporate.mode === 'kiegeszito') rows.push(['15% kiegészítő adó', r.supplementaryTax])

  return (
    <Card className={best ? 'border-2 border-brand' : r.blocked ? 'opacity-75' : ''}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{TRACK_LABEL[track]}</h2>
        {best && <Badge tone="brand">Legolcsóbb</Badge>}
        {r.blocked && <Badge tone="danger">Nem választható</Badge>}
        {r.rules.status === 'javaslat' && <Badge tone="warn">Javaslat</Badge>}
      </div>
      <p className="text-sm text-muted">Éves adó összesen</p>
      <p className="tnum text-3xl font-bold tracking-[-0.02em]">{ft(r.totalTax)}</p>
      <p className="text-sm text-muted">a bevétel {percent(r.effectiveRate)}-a, havonta átlagosan {ft(Math.round(r.totalTax / r.activeMonths))}</p>

      <dl className="mt-5 text-sm">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between gap-3 border-t border-line py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="tnum font-medium">{ft(v)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line py-2">
          <dt className="text-muted">Időarányos bevételi határ</dt>
          <dd className="tnum font-medium">{ft(r.limit)}</dd>
        </div>
        {r.rules.monthlyTaxBasis && (
          <p className="border-t border-line pt-2 text-xs text-muted">
            {r.rules.monthlyTaxBasis.minWageYear}. évi minimálbér {ft(r.rules.monthlyTaxBasis.minWage)} × {percent(r.rules.monthlyTaxBasis.ratio).replace(' ', '')}
            {r.rules.monthlyTaxBasis.estimated && ' (becslés)'}
          </p>
        )}
      </dl>

      {r.warnings.length > 0 && (
        <div className="mt-4">
          <Warnings items={r.warnings} />
        </div>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Szabályok és források</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          {getRules(r.rules.year, track, r.rules.monthlyTaxBasis?.minWage).notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1">
          {r.rules.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  )
}

function Slider({ label, value, onChange, detail, max = 1 }: { label: string; value: number; onChange: (v: number) => void; detail: string; max?: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <label className="font-medium">{label}</label>
        <span className="text-muted">
          <span className="font-semibold text-ink">{percent(value)}</span> ({detail})
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Math.min(max, Number(e.target.value)))}
        className="w-full accent-[var(--brand)]"
        aria-label={label}
      />
    </div>
  )
}
