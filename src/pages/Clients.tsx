import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { revenueItems, uid, useStore } from '../store/store'
import type { Client } from '../store/schema'
import { ft } from '../lib/format'
import { Badge, Button, Card, CopyRow, Empty, Field, PageHeader, SelectField } from '../components/ui'

export function Clients() {
  const { clients, invoices, upsertClient, removeClient, year } = useStore()
  const [editing, setEditing] = useState<Client | null>(null)

  const revenueByClient = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of revenueItems({ invoices, clients })) {
      if (r.date.startsWith(String(year))) m.set(r.clientId, (m.get(r.clientId) ?? 0) + r.amount)
    }
    return m
  }, [invoices, clients, year])

  const sorted = [...clients].sort((a, b) => (revenueByClient.get(b.id) ?? 0) - (revenueByClient.get(a.id) ?? 0))

  return (
    <>
      <PageHeader title="Ügyfelek">
        <Button
          variant="primary"
          onClick={() =>
            setEditing({ id: uid(), name: '', kind: 'magan', taxNumber: '', address: '', email: '', note: '' })
          }
        >
          <Plus size={16} aria-hidden="true" /> Új ügyfél
        </Button>
      </PageHeader>

      {editing && (
        <Card className="mb-4">
          <h2 className="mb-4 font-semibold">
            {clients.some((c) => c.id === editing.id) ? 'Ügyfél szerkesztése' : 'Új ügyfél'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Név"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              autoFocus
            />
            <SelectField
              label="Típus"
              value={editing.kind}
              onChange={(e) => setEditing({ ...editing, kind: e.target.value as Client['kind'] })}
              hint="A céges bevétel másképp adózik, ezért fontos."
            >
              <option value="magan">Magánszemély</option>
              <option value="ceg">Cég / vállalkozó</option>
            </SelectField>
            <Field
              label="Cím"
              value={editing.address}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })}
            />
            <Field
              label="Adószám"
              mono
              value={editing.taxNumber}
              onChange={(e) => setEditing({ ...editing, taxNumber: e.target.value })}
            />
            <Field
              label="E-mail"
              type="email"
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
            <Field
              label="Megjegyzés"
              value={editing.note}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
            />
          </div>
          <div className="mt-5 flex gap-2">
            <Button
              variant="primary"
              disabled={!editing.name.trim()}
              onClick={() => {
                upsertClient({ ...editing, name: editing.name.trim() })
                setEditing(null)
              }}
            >
              Mentés
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Mégse
            </Button>
          </div>
        </Card>
      )}

      {sorted.length === 0 && !editing ? (
        <Empty title="Még nincs ügyfeled.">Új számla rögzítésekor is felveheted őket.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((c) => {
            const count = invoices.filter((i) => i.clientId === c.id).length
            return (
              <Card key={c.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{c.name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={c.kind === 'ceg' ? 'warn' : 'neutral'}>
                        {c.kind === 'ceg' ? 'Cég / vállalkozó' : 'Magánszemély'}
                      </Badge>
                      <span className="text-sm text-muted">
                        {year}: {ft(revenueByClient.get(c.id) ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" aria-label="Szerkesztés" onClick={() => setEditing(c)}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Törlés"
                      disabled={count > 0}
                      title={count > 0 ? 'Van hozzá rögzített számla' : 'Törlés'}
                      onClick={() => confirm(`Törlöd: ${c.name}?`) && removeClient(c.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <CopyRow label="Név" value={c.name} />
                <CopyRow label="Adószám" value={c.taxNumber} mono />
                <CopyRow label="Cím" value={c.address} />
                <CopyRow label="E-mail" value={c.email} />
                {c.note && <p className="mt-3 text-sm text-muted">{c.note}</p>}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
