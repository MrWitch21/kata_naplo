import { useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarClock } from 'lucide-react'
import { activeMonthList, calculateYear, projectYearEnd } from '../domain/calc'
import { RulesUnavailableError } from '../domain/rules'
import { revenueItems, today, useStore, yearSetupOf } from '../store/store'
import { date, daysBetween, ft, percent } from '../lib/format'
import { Badge, Card, Empty, PageHeader } from '../components/ui'
import { LimitMeter } from '../components/LimitMeter'
import { MonthlyChart } from '../components/MonthlyChart'
import { Warnings } from '../components/Warnings'
import { YearPicker } from '../components/Layout'

export function Dashboard() {
  const state = useStore()
  const { year, invoices, clients } = state
  const setup = yearSetupOf(state, year)
  const items = useMemo(() => revenueItems({ invoices, clients }), [invoices, clients])
  const now = today()

  let result, projection
  try {
    result = calculateYear(setup, items)
    projection = projectYearEnd(setup, items, now)
  } catch (e) {
    if (e instanceof RulesUnavailableError) return <Empty title={e.message} />
    throw e
  }

  const unpaid = invoices.filter((i) => !i.paidDate && i.issueDate.startsWith(String(year)))
  const unpaidSum = unpaid.reduce((s, i) => s + i.amount, 0)
  const isCurrent = year === new Date().getFullYear()
  const upcoming = result.deadlines.filter((d) => d.date >= now).slice(0, 4)
  const topClientName = result.topClient ? clients.find((c) => c.id === result.topClient!.clientId)?.name : null
  const { rules } = result

  return (
    <>
      <PageHeader title="Áttekintés">
        <YearPicker />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="neutral">{rules.label}</Badge>
        {rules.status === 'javaslat' && <Badge tone="warn">Törvényjavaslat alapján</Badge>}
        <Link to="/beallitasok" className="text-muted underline-offset-2 hover:text-ink hover:underline">
          módosítás
        </Link>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{year}-ben befolyt bevétel</p>
            <p className="tnum text-[clamp(2.4rem,7vw,3.75rem)] leading-none font-bold tracking-[-0.03em]">
              {ft(result.revenue.total)}
            </p>
          </div>
          {unpaidSum > 0 && (
            <Link to="/szamlak?szuro=fuggo" className="text-sm text-muted hover:text-ink sm:text-right">
              <span className="tnum block font-semibold text-ink">+ {ft(unpaidSum)}</span>
              {unpaid.length} kifizetetlen számla
            </Link>
          )}
        </div>
        <div className="mt-6">
          <LimitMeter
            revenue={result.revenue.total}
            projected={isCurrent ? projection.revenue.total : undefined}
            limit={result.limit}
          />
        </div>
      </Card>

      {result.warnings.length > 0 && (
        <div className="mb-4">
          <Warnings items={result.warnings} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat
          label="Tételes adó az évre"
          value={ft(result.monthlyTaxTotal)}
          sub={`${ft(rules.monthlyTax)} × ${result.taxableMonths} hónap`}
        />
        <Stat
          label={isCurrent ? 'Várható teljes adó' : 'Teljes adó'}
          value={ft(isCurrent ? projection.totalTax : result.totalTax)}
          sub={`a bevétel ${percent(isCurrent ? projection.effectiveRate : result.effectiveRate)}-a`}
        />
        {rules.corporate.mode === 'kiegeszito' ? (
          <Stat
            label="Céges bevétel"
            value={ft(result.revenue.corporate)}
            sub={`kiegészítő adó ${ft(result.supplementaryThreshold)} felett`}
          />
        ) : (
          <Stat label="Céges bevétel" value={ft(result.revenue.corporate)} sub="régi KATA-ban nem megengedett" />
        )}
        <Stat
          label="Legnagyobb ügyfél"
          value={result.topClient ? percent(result.topClient.share) : '–'}
          sub={topClientName ?? 'még nincs bevétel'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <h2 className="mb-4 font-semibold">Havi bevétel</h2>
          <MonthlyChart data={result.byMonth} activeMonths={activeMonthList(setup)} />
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CalendarClock size={18} aria-hidden="true" /> Közelgő befizetések
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Ebben az évben nincs több határidő.</p>
          ) : (
            <ul>
              {upcoming.map((d) => {
                const days = daysBetween(now, d.date)
                return (
                  <li
                    key={d.date + d.label}
                    className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted">
                        {date(d.date)}, {days === 0 ? 'ma' : `${days} nap múlva`}
                      </p>
                    </div>
                    <span className="tnum text-sm font-semibold">
                      {d.kind === 'eves' && d.amount === 0 ? 'bevallás' : ft(d.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            to="/szamlazas"
            className="mt-4 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90"
          >
            Új számla előkészítése <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Card>
      </div>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="tnum mt-1 text-xl font-bold tracking-[-0.01em]">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  )
}
