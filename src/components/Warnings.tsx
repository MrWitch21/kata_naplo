import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'
import type { Warning } from '../domain/calc'

export function Warnings({ items }: { items: Warning[] }) {
  if (!items.length) return null
  return (
    <ul className="space-y-2">
      {items.map((w) => {
        const Icon = w.level === 'kritikus' ? OctagonAlert : w.level === 'figyelem' ? AlertTriangle : Info
        const style =
          w.level === 'kritikus'
            ? 'bg-danger-soft text-danger'
            : w.level === 'figyelem'
              ? 'bg-csekk-soft text-warn'
              : 'bg-brand/10 text-brand'
        return (
          <li key={w.text} className={`flex gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${style}`}>
            <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-ink">{w.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
