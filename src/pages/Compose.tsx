import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ClipboardList, Plus, TrendingUp } from 'lucide-react'
import { marginalImpact, yearOf } from '../domain/calc'
import { nextInvoiceNumber } from '../domain/invoiceNumber'
import { RulesUnavailableError } from '../domain/rules'
import { revenueItems, today, uid, useStore, yearSetupOf } from '../store/store'
import type { Client, Invoice } from '../store/schema'
import { addDays, dateDots, ft, parseAmount, percent } from '../lib/format'
import { Button, Card, CopyRow, Field, PageHeader, SelectField, copyText } from '../components/ui'
import { Warnings } from '../components/Warnings'

export function Compose() {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useStore()
  const { profile, clients, invoices, upsertInvoice, upsertClient } = state
  const editing = id ? invoices.find((i) => i.id === id) : undefined

  const [form, setForm] = useState<Invoice>(() => {
    if (editing) return editing
    const issue = today()
    return {
      id: uid(),
      number: nextInvoiceNumber(
        { pattern: profile.numberPattern, padding: profile.numberPadding },
        yearOf(issue),
        invoices.map((i) => i.number),
      ),
      clientId: clients[0]?.id ?? '',
      description: '',
      amount: 0,
      issueDate: issue,
      fulfillmentDate: issue,
      dueDate: addDays(issue, profile.paymentTermDays),
      paidDate: null,
      note: '',
    }
  })
  const [newClient, setNewClient] = useState<Client | null>(clients.length ? null : emptyClient())
  const [error, setError] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => setForm((f) => ({ ...f, [k]: v }))
  const client = newClient ?? clients.find((c) => c.id === form.clientId)
  const clientKind = client?.kind ?? 'magan'

  // Adóhatás: mintha ez a számla az esedékesség (vagy a fizetés) napján folyna be
  const impact = useMemo(() => {
    if (!form.amount) return null
    const when = form.paidDate ?? form.dueDate
    const y = yearOf(when)
    const others = revenueItems({ invoices: invoices.filter((i) => i.id !== form.id), clients })
    try {
      return marginalImpact(yearSetupOf(state, y), others, {
        date: when,
        amount: form.amount,
        clientId: client?.id ?? 'uj',
        clientKind,
      })
    } catch (e) {
      if (e instanceof RulesUnavailableError) return null
      throw e
    }
  }, [form.amount, form.paidDate, form.dueDate, form.id, invoices, clients, client?.id, clientKind, state])

  const invoiceText = [
    profile.invoiceNote,
    profile.vatExempt ? 'Alanyi adómentes (AAM)' : '',
    form.note,
  ]
    .filter(Boolean)
    .join('. ')

  const summary = [
    `Számlaszám: ${form.number}`,
    `Kelte: ${dateDots(form.issueDate)}`,
    `Teljesítés: ${dateDots(form.fulfillmentDate)}`,
    `Fizetési határidő: ${dateDots(form.dueDate)}`,
    '',
    `Vevő: ${client?.name ?? ''}`,
    client?.taxNumber ? `Adószám: ${client.taxNumber}` : '',
    client?.address ? `Cím: ${client.address}` : '',
    client?.email ? `E-mail: ${client.email}` : '',
    '',
    `Tétel: ${form.description}`,
    `Összeg: ${ft(form.amount)}`,
    profile.vatExempt ? 'ÁFA: AAM (alanyi adómentes)' : '',
    `Megjegyzés: ${invoiceText}`,
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n')

  const save = () => {
    if (!form.number.trim()) return setError('Adj meg számlaszámot.')
    if (invoices.some((i) => i.number === form.number.trim() && i.id !== form.id))
      return setError(`A ${form.number} számlaszám már létezik.`)
    if (newClient && !newClient.name.trim()) return setError('Add meg az új ügyfél nevét.')
    if (!newClient && !form.clientId) return setError('Válassz ügyfelet.')
    if (form.amount <= 0) return setError('Az összeg legyen nagyobb nullánál.')
    let clientId = form.clientId
    if (newClient) {
      upsertClient(newClient)
      clientId = newClient.id
    }
    upsertInvoice({ ...form, number: form.number.trim(), clientId })
    navigate('/szamlak')
  }

  return (
    <>
      <PageHeader title={editing ? `Számla: ${editing.number}` : 'Új számla'} />
      <p className="-mt-3 mb-6 max-w-[62ch] text-muted">
        Töltsd ki itt, másold át a számlázó programodba (Számlázz.hu, Billingo, NAV Online Számla), aztán rögzítsd,
        hogy a bevételi keret és az adó mindig naprakész legyen.
      </p>

      <div className="grid items-start gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Számlaszám" mono value={form.number} onChange={(e) => set('number', e.target.value)} hint="A következő szabad sorszámot ajánlja" />
            <Field label="Összeg (Ft)" inputMode="numeric" className="tnum" value={form.amount ? form.amount.toLocaleString('hu-HU') : ''} placeholder="0" onChange={(e) => set('amount', parseAmount(e.target.value))} />

            <div className="sm:col-span-2">
              {newClient ? (
                <div className="rounded-xl border border-line p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">Új ügyfél</p>
                    {clients.length > 0 && (
                      <Button variant="ghost" onClick={() => setNewClient(null)}>
                        Meglévő választása
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Név" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                    <SelectField label="Típus" value={newClient.kind} onChange={(e) => setNewClient({ ...newClient, kind: e.target.value as Client['kind'] })}>
                      <option value="magan">Magánszemély</option>
                      <option value="ceg">Cég / vállalkozó</option>
                    </SelectField>
                    <Field label="Cím" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
                    <Field label="Adószám" mono value={newClient.taxNumber} onChange={(e) => setNewClient({ ...newClient, taxNumber: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectField label="Ügyfél" value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.kind === 'ceg' ? 'cég' : 'magánszemély'})
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <Button onClick={() => setNewClient(emptyClient())} aria-label="Új ügyfél">
                    <Plus size={16} /> Új
                  </Button>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Field label="Tétel megnevezése" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="pl. Weboldal fejlesztése, 2. ütem" />
            </div>
            <Field
              label="Kelte"
              type="date"
              value={form.issueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, issueDate: e.target.value, dueDate: addDays(e.target.value, profile.paymentTermDays) }))
              }
            />
            <Field label="Teljesítés" type="date" value={form.fulfillmentDate} onChange={(e) => set('fulfillmentDate', e.target.value)} />
            <Field label="Fizetési határidő" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={!!form.paidDate} onChange={(e) => set('paidDate', e.target.checked ? today() : null)} className="size-4 accent-[var(--brand)]" />
                Már kifizették
              </label>
              <input
                type="date"
                disabled={!form.paidDate}
                value={form.paidDate ?? ''}
                onChange={(e) => set('paidDate', e.target.value || null)}
                aria-label="Fizetés napja"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 disabled:opacity-40"
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Megjegyzés a számlára (opcionális)" value={form.note} onChange={(e) => set('note', e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={save}>
              {editing ? 'Módosítás mentése' : 'Számla rögzítése'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Mégse
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          {impact && (
            <Card className="border-ink/20">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <TrendingUp size={18} aria-hidden="true" /> Adóhatás
              </h2>
              <p className="text-sm text-muted">Ha ez a számla {yearOf(form.paidDate ?? form.dueDate)}-ben befolyik:</p>
              <p className="mt-1 text-2xl font-bold">
                {impact.deltaTax > 0 ? `+ ${ft(impact.deltaTax)} adó` : 'Nem nő az adód'}
              </p>
              <p className="mt-1 text-sm text-muted">
                Bevételi keret: {percent(impact.before.limitUsed)} → <span className="font-medium text-ink">{percent(impact.after.limitUsed)}</span>
              </p>
              {impact.newWarnings.length > 0 && (
                <div className="mt-3">
                  <Warnings items={impact.newWarnings} />
                </div>
              )}
            </Card>
          )}

          <Card>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Másold a számlázóba</h2>
              <Button
                onClick={async () => {
                  if (await copyText(summary)) {
                    setCopiedAll(true)
                    setTimeout(() => setCopiedAll(false), 1500)
                  }
                }}
              >
                <ClipboardList size={16} aria-hidden="true" /> {copiedAll ? 'Kimásolva' : 'Mindet'}
              </Button>
            </div>
            <p className="mb-2 text-xs text-muted">Kattints egy sorra, és a vágólapra kerül.</p>
            <Group title="Számla">
              <CopyRow label="Számlaszám" value={form.number} mono />
              <CopyRow label="Kelte" value={dateDots(form.issueDate)} mono />
              <CopyRow label="Teljesítés" value={dateDots(form.fulfillmentDate)} mono />
              <CopyRow label="Határidő" value={dateDots(form.dueDate)} mono />
              <CopyRow label="Tétel" value={form.description} />
              <CopyRow label="Összeg" value={form.amount ? String(form.amount) : ''} mono />
              {profile.vatExempt && <CopyRow label="ÁFA-kulcs" value="AAM" mono />}
              <CopyRow label="Megjegyzés" value={invoiceText} />
            </Group>
            <Group title="Vevő">
              <CopyRow label="Név" value={client?.name ?? ''} />
              <CopyRow label="Adószám" value={client?.taxNumber ?? ''} mono />
              <CopyRow label="Cím" value={client?.address ?? ''} />
              <CopyRow label="E-mail" value={client?.email ?? ''} />
            </Group>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-muted hover:text-ink">Saját adataid</summary>
              <div className="mt-1">
                <CopyRow label="Név" value={profile.name} />
                <CopyRow label="Adószám" value={profile.taxNumber} mono />
                <CopyRow label="Bankszámla" value={profile.bankAccount} mono />
                <CopyRow label="IBAN" value={profile.iban} mono />
              </div>
            </details>
          </Card>
        </div>
      </div>
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-0.5 text-sm font-semibold">{title}</p>
      <div>{children}</div>
    </div>
  )
}

function emptyClient(): Client {
  return { id: uid(), name: '', kind: 'magan', taxNumber: '', address: '', email: '', note: '' }
}
