import { useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { renderNumber } from '../domain/invoiceNumber'
import { TRACK_LABEL, tracksForYear, type Track } from '../domain/rules'
import { exportData, useStore, yearSetupOf } from '../store/store'
import { MONTHS, MONTHS_LONG, parseAmount } from '../lib/format'
import { Button, Card, CopyRow, Field, PageHeader, SelectField } from '../components/ui'
import { YearPicker } from '../components/Layout'

export function Settings() {
  const state = useStore()
  const { profile, updateProfile, year, setYearConfig, importData, reset } = state
  const setup = yearSetupOf(state, year)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const saveYear = (patch: Partial<typeof setup>) => {
    const next = { ...setup, ...patch }
    setYearConfig(year, {
      track: next.track,
      fromMonth: next.fromMonth,
      toMonth: next.toMonth,
      exemptMonths: next.exemptMonths,
      minWagePrevYear: next.minWagePrevYear,
    })
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(state), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `katanaplo-mentes-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = async (file: File) => {
    try {
      importData(JSON.parse(await file.text()))
      setMsg('Visszatöltve.')
    } catch {
      setMsg('Ez a fájl nem Katanapló-mentés, vagy sérült. Semmi nem változott.')
    }
  }

  return (
    <>
      <PageHeader title="Beállítások" />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">Saját számlázási adatok</h2>
          <p className="mb-4 text-sm text-muted">Ezek kerülnek a másolópanelre számlázáskor.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Név (e.v.)" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
            <Field label="Cím" value={profile.address} onChange={(e) => updateProfile({ address: e.target.value })} />
            <Field label="Adószám" mono value={profile.taxNumber} onChange={(e) => updateProfile({ taxNumber: e.target.value })} placeholder="12345678-1-08" />
            <Field label="Nyilvántartási szám" mono value={profile.registrationNumber} onChange={(e) => updateProfile({ registrationNumber: e.target.value })} />
            <Field label="Bankszámlaszám" mono value={profile.bankAccount} onChange={(e) => updateProfile({ bankAccount: e.target.value })} />
            <Field label="IBAN" mono value={profile.iban} onChange={(e) => updateProfile({ iban: e.target.value })} />
            <Field label="E-mail" type="email" value={profile.email} onChange={(e) => updateProfile({ email: e.target.value })} />
            <Field label="Telefon" value={profile.phone} onChange={(e) => updateProfile({ phone: e.target.value })} />
            <div className="sm:col-span-2">
              <Field
                label="Kötelező szöveg a számlán"
                value={profile.invoiceNote}
                onChange={(e) => updateProfile({ invoiceNote: e.target.value })}
                hint="A kisadózó státuszt a számlán fel kell tüntetni. A pontos szöveget egyeztesd a könyvelőddel."
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" checked={profile.vatExempt} onChange={(e) => updateProfile({ vatExempt: e.target.checked })} className="size-4 accent-[var(--brand)]" />
              Alanyi adómentes vagyok (ÁFA: AAM)
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Adózás évenként</h2>
              <YearPicker />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SelectField label="KATA-sáv" value={setup.track} onChange={(e) => saveYear({ track: e.target.value as Track })}>
                  {tracksForYear(year).map((t) => (
                    <option key={t} value={t}>{TRACK_LABEL[t]}</option>
                  ))}
                </SelectField>
              </div>
              <SelectField label="Katás ettől" value={setup.fromMonth} onChange={(e) => saveYear({ fromMonth: Math.min(Number(e.target.value), setup.toMonth) })}>
                {MONTHS_LONG.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </SelectField>
              <SelectField label="Eddig" value={setup.toMonth} onChange={(e) => saveYear({ toMonth: Math.max(Number(e.target.value), setup.fromMonth) })}>
                {MONTHS_LONG.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </SelectField>
              {year >= 2028 && (
                <div className="sm:col-span-2">
                  <Field
                    label={`${year - 1}. évi minimálbér (Ft)`}
                    inputMode="numeric"
                    value={setup.minWagePrevYear?.toLocaleString('hu-HU') ?? ''}
                    onChange={(e) => saveYear({ minWagePrevYear: parseAmount(e.target.value) || undefined })}
                    hint="2028-tól ebből számolódik a tételes adó."
                  />
                </div>
              )}
            </div>
            <fieldset className="mt-4">
              <legend className="mb-1 text-sm font-medium">Mentes hónapok</legend>
              <p className="mb-2 text-xs text-muted">Táppénz, CSED, GYED, ápolási díj vagy szünetelés: ezekre a hónapokra nincs tételes adó.</p>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map((m, i) => {
                  const month = i + 1
                  const on = setup.exemptMonths.includes(month)
                  const inRange = month >= setup.fromMonth && month <= setup.toMonth
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={!inRange}
                      aria-pressed={on}
                      onClick={() =>
                        saveYear({ exemptMonths: on ? setup.exemptMonths.filter((x) => x !== month) : [...setup.exemptMonths, month].sort((a, b) => a - b) })
                      }
                      className={`rounded-md border px-2.5 py-1 text-sm disabled:opacity-30 ${on ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink/40'}`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Számlaszámok</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem_7rem]">
              <Field label="Sablon" mono value={profile.numberPattern} onChange={(e) => updateProfile({ numberPattern: e.target.value })} hint="{YYYY} év, {YY} rövid év, {N} sorszám" />
              <Field label="Sorszám hossza" type="number" min={1} max={8} value={profile.numberPadding} onChange={(e) => updateProfile({ numberPadding: Number(e.target.value) || 1 })} />
              <Field label="Fizetési idő (nap)" type="number" min={0} max={120} value={profile.paymentTermDays} onChange={(e) => updateProfile({ paymentTermDays: Number(e.target.value) || 0 })} />
            </div>
            <div className="mt-3">
              <CopyRow label="Így néz ki" value={renderNumber({ pattern: profile.numberPattern, padding: profile.numberPadding }, year, 1)} mono />
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">Mentés és visszatöltés</h2>
            <p className="mb-4 text-sm text-muted">
              Minden adat csak ebben a böngészőben van, szerverre semmi nem megy. Ha törlöd a böngészési adatokat, elveszik, ezért ments rendszeresen.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={download}>
                <Download size={16} aria-hidden="true" /> Mentés letöltése
              </Button>
              <Button onClick={() => fileRef.current?.click()}>
                <Upload size={16} aria-hidden="true" /> Visszatöltés fájlból
              </Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Minden számla, ügyfél és beállítás törlődik ebből a böngészőből. Folytatod?')) reset()
                }}
              >
                <RotateCcw size={16} aria-hidden="true" /> Minden adat törlése
              </Button>
            </div>
            {msg && <p className="mt-3 text-sm">{msg}</p>}
          </Card>
        </div>
      </div>
    </>
  )
}
