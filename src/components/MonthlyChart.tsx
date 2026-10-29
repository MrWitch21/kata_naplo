import { useState } from 'react'
import { ft, ftShort, MONTHS, MONTHS_LONG } from '../lib/format'

interface Props {
  data: { month: number; private: number; corporate: number }[]
  /** Az adott évi havi tételes adó, vízszintes referenciavonalnak */
  activeMonths: number[]
}

const W = 720
const H = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 48 }

function niceMax(v: number) {
  if (v <= 0) return 100_000
  const pow = 10 ** Math.floor(Math.log10(v))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)!
  return step * pow
}

/** Havi befolyt bevétel, magánszemély / céges bontásban (halmozott oszlop) */
export function MonthlyChart({ data, activeMonths }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.private + d.corporate)))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / 12
  const barW = Math.min(30, slot * 0.58)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const hasCorporate = data.some((d) => d.corporate > 0)
  const hovered = hover !== null ? data[hover] : null

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-series-private" aria-hidden="true" /> Magánszemély
        </span>
        {hasCorporate && (
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm bg-series-corporate" aria-hidden="true" /> Cég / vállalkozó
          </span>
        )}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Havi befolyt bevétel">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--line)"
                strokeDasharray={t === 0 ? undefined : '2 4'}
              />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="tnum">
                {t === 0 ? '0' : ftShort(t).replace(' Ft', '')}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + slot * i + (slot - barW) / 2
            const active = activeMonths.includes(d.month)
            const pTop = y(d.private)
            const cTop = y(d.private + d.corporate)
            const gap = d.private > 0 && d.corporate > 0 ? 2 : 0
            return (
              <g key={d.month} opacity={hover === null || hover === i ? 1 : 0.45}>
                {d.private > 0 && (
                  <path
                    d={roundedTop(x, pTop, barW, y(0) - pTop, d.corporate > 0 ? 0 : 4)}
                    fill="var(--series-private)"
                  />
                )}
                {d.corporate > 0 && (
                  <path d={roundedTop(x, cTop, barW, pTop - cTop - gap, 4)} fill="var(--series-corporate)" />
                )}
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill={active ? 'var(--muted)' : 'var(--line)'}
                >
                  {MONTHS[i].replace('.', '')}
                </text>
                {/* nagyobb találati terület, mint maga az oszlop */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${MONTHS_LONG[i]}: ${ft(d.private + d.corporate)}`}
                />
              </g>
            )
          })}
        </svg>

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%` }}
          >
            <p className="font-semibold capitalize">{MONTHS_LONG[hover]}</p>
            <p className="tnum mt-1 flex justify-between">
              <span className="text-muted">Magán</span> {ft(hovered.private)}
            </p>
            {hasCorporate && (
              <p className="tnum flex justify-between">
                <span className="text-muted">Céges</span> {ft(hovered.corporate)}
              </p>
            )}
            <p className="tnum mt-1 flex justify-between border-t border-line pt-1 font-medium">
              <span>Összesen</span> {ft(hovered.private + hovered.corporate)}
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Táblázatként</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Hónap</th>
              <th className="py-1 text-right font-medium">Magán</th>
              <th className="py-1 text-right font-medium">Céges</th>
              <th className="py-1 text-right font-medium">Összesen</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.month} className="border-t border-line">
                <td className="py-1 capitalize">{MONTHS_LONG[i]}</td>
                <td className="py-1 text-right">{ft(d.private)}</td>
                <td className="py-1 text-right">{ft(d.corporate)}</td>
                <td className="py-1 text-right font-medium">{ft(d.private + d.corporate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}
