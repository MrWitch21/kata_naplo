import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Calculator, ClipboardCopy, FileText, LayoutDashboard, Moon, Settings, Sun, Users } from 'lucide-react'
import { useStore } from '../store/store'

const NAV = [
  { to: '/', label: 'Áttekintés', icon: LayoutDashboard, end: true },
  { to: '/szamlazas', label: 'Számlázás', icon: ClipboardCopy },
  { to: '/szamlak', label: 'Számlák', icon: FileText },
  { to: '/ugyfelek', label: 'Ügyfelek', icon: Users },
  { to: '/kalkulator', label: 'Kalkulátor', icon: Calculator },
  { to: '/beallitasok', label: 'Beállítások', icon: Settings },
]

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('katanaplo:theme', theme)
    } catch {
      /* nem baj */
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

export function YearPicker() {
  const year = useStore((s) => s.year)
  const setYear = useStore((s) => s.setYear)
  const now = new Date().getFullYear()
  const years = [now - 1, now, now + 1, now + 2]
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Év</span>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="tnum rounded-lg border border-line bg-surface px-2.5 py-1.5 font-semibold"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Layout() {
  const [theme, toggle] = useTheme()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-5 lg:pt-6">
          <a href="#/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-[-0.02em]">Katanapló</span>
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Világos mód' : 'Sötét mód'}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pt-4" aria-label="Fő menü">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="hidden px-5 pt-6 text-xs leading-relaxed text-muted lg:block">
          Az adatok csak ebben a böngészőben vannak. Mentsd őket rendszeresen a Beállításokban.
        </p>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--csekk)" />
      <path d="M0 9h32" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="2 2.5" />
      <path d="M8 15h16M8 20h10M8 25h13" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
