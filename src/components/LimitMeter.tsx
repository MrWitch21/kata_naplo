import { ft, ftShort, percent } from '../lib/format'

interface Props {
  revenue: number
  projected?: number
  limit: number
}

/**
 * A bevételi keret "sárga csekkje": a befolyt bevétel a keret arányában,
 * szaggatott vonallal az év végi becslés.
 */
export function LimitMeter({ revenue, projected, limit }: Props) {
  const scaleMax = Math.max(limit, projected ?? 0, revenue) * 1.04 || 1
  const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`
  const over = revenue > limit
  const projOver = (projected ?? 0) > limit
  const remaining = Math.max(0, limit - revenue)

  return (
    <div>
      <div
        className="relative h-14 overflow-hidden rounded-xl border border-line bg-paper"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={revenue}
        aria-label="Bevétel a bevételi határhoz képest"
      >
        {/* befolyt */}
        <div
          className={`perforation absolute inset-y-0 left-0 transition-[width] duration-700 ${over ? 'bg-danger' : 'bg-csekk'}`}
          style={{ width: pos(revenue) }}
        />
        {/* túllépés a határ felett */}
        {over && (
          <div
            className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(0,0,0,.18)_6px_8px)]"
            style={{ left: pos(limit), width: `calc(${pos(revenue)} - ${pos(limit)})` }}
          />
        )}
        {/* becslés */}
        {projected !== undefined && projected > revenue && (
          <div
            className={`absolute inset-y-2 border-2 border-l-0 border-dashed ${projOver ? 'border-danger' : 'border-ink/35'} rounded-r-md`}
            style={{ left: pos(revenue), width: `calc(${pos(projected)} - ${pos(revenue)})` }}
          />
        )}
        {/* határ */}
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: pos(limit) }} />
      </div>

      <div className="relative mt-2 h-5 text-xs text-muted">
        <span className="absolute left-0">0</span>
        <span
          className="absolute -translate-x-full pr-1.5 font-medium whitespace-nowrap text-ink"
          style={{ left: pos(limit) }}
        >
          határ: {ftShort(limit)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Felhasználva</dt>
          <dd className="tnum font-semibold">{percent(limit ? revenue / limit : 0)}</dd>
        </div>
        <div>
          <dt className="text-muted">{over ? 'Túllépés' : 'Még belefér'}</dt>
          <dd className={`tnum font-semibold ${over ? 'text-danger' : ''}`}>
            {ft(over ? revenue - limit : remaining)}
          </dd>
        </div>
        {projected !== undefined && (
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <span
                className={`inline-block h-2.5 w-4 rounded-sm border-2 border-dashed ${projOver ? 'border-danger' : 'border-ink/40'}`}
                aria-hidden="true"
              />
              Év végére várható
            </dt>
            <dd className={`tnum font-semibold ${projOver ? 'text-danger' : ''}`}>{ft(projected)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
