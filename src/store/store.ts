import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { tracksForYear } from '../domain/rules'
import type { RevenueItem, YearSetup } from '../domain/calc'
import {
  dataSchema,
  profileSchema,
  type AppData,
  type Client,
  type Invoice,
  type Profile,
  type YearConfig,
} from './schema'
import { demoData } from './demo'

interface State extends AppData {
  /** Az éppen nézett év */
  year: number
  onboarded: boolean
  setYear: (y: number) => void
  updateProfile: (p: Partial<Profile>) => void
  upsertClient: (c: Client) => void
  removeClient: (id: string) => void
  upsertInvoice: (i: Invoice) => void
  removeInvoice: (id: string) => void
  markPaid: (id: string, date: string | null) => void
  setYearConfig: (year: number, cfg: YearConfig) => void
  importData: (raw: unknown) => void
  loadDemo: () => void
  startEmpty: () => void
  reset: () => void
}

export const today = () => new Date().toISOString().slice(0, 10)
export const uid = () => crypto.randomUUID()

const emptyData = (): AppData => ({
  version: 1,
  profile: profileSchema.parse({}),
  clients: [],
  invoices: [],
  years: {},
})

export function defaultYearConfig(year: number): YearConfig {
  const tracks = tracksForYear(year)
  return { track: tracks.includes('regi') ? 'regi' : 'fo', fromMonth: 1, toMonth: 12, exemptMonths: [] }
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...emptyData(),
      year: new Date().getFullYear(),
      onboarded: false,
      setYear: (year) => set({ year }),
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      upsertClient: (c) =>
        set((s) => ({
          clients: s.clients.some((x) => x.id === c.id)
            ? s.clients.map((x) => (x.id === c.id ? c : x))
            : [...s.clients, c],
        })),
      removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      upsertInvoice: (i) =>
        set((s) => ({
          invoices: s.invoices.some((x) => x.id === i.id)
            ? s.invoices.map((x) => (x.id === i.id ? i : x))
            : [...s.invoices, i],
        })),
      removeInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),
      markPaid: (id, date) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, paidDate: date } : i)) })),
      setYearConfig: (year, cfg) => set((s) => ({ years: { ...s.years, [year]: cfg } })),
      importData: (raw) => set({ ...dataSchema.parse(raw), onboarded: true }),
      loadDemo: () => set({ ...demoData(), onboarded: true, year: new Date().getFullYear() }),
      startEmpty: () => set({ ...emptyData(), onboarded: true }),
      reset: () => set({ ...emptyData(), onboarded: false }),
    }),
    {
      name: 'katanaplo:v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

/** Egy év beállításai a store-ból, alapértelmezéssel */
export function yearSetupOf(s: Pick<State, 'years'>, year: number): YearSetup {
  const cfg = s.years[year] ?? defaultYearConfig(year)
  // Ha egy korábban mentett sáv az adott évben már nem választható, essünk vissza
  const track = tracksForYear(year).includes(cfg.track) ? cfg.track : defaultYearConfig(year).track
  return { year, ...cfg, track }
}

/** Kifizetett számlák bevételtételként (a fizetés napjával) */
export function revenueItems(s: Pick<State, 'invoices' | 'clients'>): RevenueItem[] {
  const kind = new Map(s.clients.map((c) => [c.id, c.kind]))
  return s.invoices
    .filter((i) => i.paidDate)
    .map((i) => ({
      date: i.paidDate!,
      amount: i.amount,
      clientId: i.clientId,
      clientKind: kind.get(i.clientId) ?? 'magan',
    }))
}

export function exportData(s: AppData): AppData {
  return { version: 1, profile: s.profile, clients: s.clients, invoices: s.invoices, years: s.years }
}
