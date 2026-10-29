import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Check, Download, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { today, useStore } from '../store/store'
import { date, ft } from '../lib/format'
import { Badge, Button, Empty, PageHeader } from '../components/ui'
import { YearPicker } from '../components/Layout'
import type { Invoice } from '../store/schema'

type Filter = 'mind' | 'fuggo' | 'fizetve'

export function Invoices() {
  const { invoices, clients, year, markPaid, removeInvoice } = useStore()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('szuro') as Filter) ?? 'mind'
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const now = today()
  const clientName = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const rows = invoices
    .filter((i) => i.issueDate.startsWith(String(year)) || i.paidDate?.startsWith(String(year)))
    .filter((i) => (filter === 'fuggo' ? !i.paidDate : filter === 'fizetve' ? !!i.paidDate : true))
    .filter((i) => {
      if (!q) return true
      const hay = `${i.number} ${clientName.get(i.clientId)?.name ?? ''} ${i.description}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))

  const total = rows.reduce((s, i) => s + i.amount, 0)

  const exportCsv = () => {
    const head = [
      'Számlaszám',
      'Ügyfél',
      'Típus',
      'Adószám',
      'Tétel',
      'Összeg',
      'Kelte',
      'Teljesítés',
      'Határidő',
      'Fizetve',
    ]
    const lines = rows.map((i) => {
      const c = clientName.get(i.clientId)
      return [
        i.number,
        c?.name ?? '',
        c?.kind === 'ceg' ? 'cég' : 'magánszemély',
        c?.taxNumber ?? '',
        i.description,
        i.amount,
        i.issueDate,
        i.fulfillmentDate,
        i.dueDate,
        i.paidDate ?? '',
      ]
    })
    const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `szamlak-${year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <PageHeader title="Számlák">
        <YearPicker />
        <Button onClick={exportCsv} disabled={!rows.length}>
          <Download size={16} aria-hidden="true" /> CSV
        </Button>
        <Link
          to="/szamlazas"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-brand-ink hover:brightness-110"
        >
          <Plus size={16} aria-hidden="true" /> Új számla
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          className="flex rounded-lg border border-line bg-surface p-0.5 text-sm"
          role="group"
          aria-label="Szűrés állapot szerint"
        >
          {(
            [
              ['mind', 'Mind'],
              ['fuggo', 'Kifizetetlen'],
              ['fizetve', 'Fizetve'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setParams(k === 'mind' ? {} : { szuro: k })}
              className={`rounded-md px-3 py-1.5 font-medium ${filter === k ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Keresés számlaszámra, ügyfélre, tételre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:max-w-sm"
        />
      </div>

      {rows.length === 0 ? (
        <Empty title={invoices.length ? 'Nincs a szűrésnek megfelelő számla.' : 'Még nincs rögzített számla.'}>
          {!invoices.length && (
            <Link to="/szamlazas" className="text-brand underline">
              Rögzítsd az elsőt.
            </Link>
          )}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Számlaszám</th>
                <th className="px-4 py-3 font-medium">Ügyfél</th>
                <th className="px-4 py-3 font-medium">Kelte</th>
                <th className="px-4 py-3 text-right font-medium">Összeg</th>
                <th className="px-4 py-3 font-medium">Állapot</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const c = clientName.get(i.clientId)
                return (
                  <tr key={i.id} className="border-b border-line last:border-b-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3 font-mono text-[0.85rem]">{i.number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c?.name ?? 'Törölt ügyfél'}</p>
                      <p className="max-w-[28ch] truncate text-xs text-muted">{i.description}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{date(i.issueDate)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold whitespace-nowrap">{ft(i.amount)}</td>
                    <td className="px-4 py-3">
                      <Status inv={i} now={now} kind={c?.kind} />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-0.5">
                        {i.paidDate ? (
                          <IconBtn label="Visszaállítás kifizetetlenre" onClick={() => markPaid(i.id, null)}>
                            <Undo2 size={16} />
                          </IconBtn>
                        ) : (
                          <IconBtn label="Kifizetve ma" onClick={() => markPaid(i.id, now)}>
                            <Check size={16} />
                          </IconBtn>
                        )}
                        <IconBtn label="Szerkesztés" onClick={() => navigate(`/szamlazas/${i.id}`)}>
                          <Pencil size={16} />
                        </IconBtn>
                        <IconBtn
                          label="Törlés"
                          danger
                          onClick={() => {
                            if (confirm(`Törlöd a(z) ${i.number} számlát a nyilvántartásból?`)) removeInvoice(i.id)
                          }}
                        >
                          <Trash2 size={16} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td className="px-4 py-3 text-muted" colSpan={3}>
                  {rows.length} számla
                </td>
                <td className="tnum px-4 py-3 text-right font-bold">{ft(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  )
}

function Status({ inv, now, kind }: { inv: Invoice; now: string; kind?: 'magan' | 'ceg' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {inv.paidDate ? (
        <Badge tone="brand">Fizetve {date(inv.paidDate).replace(/^\d{4}\. /, '')}</Badge>
      ) : inv.dueDate < now ? (
        <Badge tone="danger">Lejárt</Badge>
      ) : (
        <Badge tone="warn">Függő</Badge>
      )}
      {kind === 'ceg' && <Badge>céges</Badge>}
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  children,
  danger,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid size-8 place-items-center rounded-md ${danger ? 'text-muted hover:bg-danger-soft hover:text-danger' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}
    >
      {children}
    </button>
  )
}
