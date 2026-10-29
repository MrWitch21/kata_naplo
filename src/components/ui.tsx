import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { Check, Copy } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand text-brand-ink hover:brightness-110',
    secondary: 'border border-line bg-surface hover:border-ink/40',
    ghost: 'text-muted hover:bg-ink/5 hover:text-ink',
    danger: 'text-danger hover:bg-danger-soft',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</section>
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[0.95rem] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20'

export function Field({
  label,
  hint,
  mono,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; mono?: boolean }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input id={id} className={`${inputCls} ${mono ? 'font-mono text-[0.9rem]' : ''} ${className}`} {...rest} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function SelectField({
  label,
  hint,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select id={id} className={inputCls} {...rest}>
        {children}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Egy adat egy kattintással vágólapra: a számlázóba másoláshoz */
export function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false)
  const empty = !value
  return (
    <button
      type="button"
      disabled={empty}
      onClick={async () => {
        if (await copyText(value)) {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        }
      }}
      className="group flex w-full items-center gap-3 border-b border-line px-1 py-2.5 text-left last:border-b-0 hover:bg-ink/[0.03] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="w-36 shrink-0 text-sm text-muted">{label}</span>
      <span
        className={`min-w-0 flex-1 truncate ${mono ? 'font-mono text-[0.88rem]' : ''} ${empty ? 'text-muted/60' : ''}`}
      >
        {empty ? 'nincs megadva' : value}
      </span>
      {!empty && (
        <span
          className={`shrink-0 ${done ? 'text-brand' : 'text-muted opacity-60 group-hover:opacity-100'}`}
          aria-hidden="true"
        >
          {done ? <Check size={16} className="copied-pop" /> : <Copy size={15} />}
        </span>
      )}
      <span className="sr-only">{done ? 'Kimásolva' : 'Másolás'}</span>
    </button>
  )
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'warn' | 'danger'
  children: ReactNode
}) {
  const styles = {
    neutral: 'bg-ink/[0.06] text-muted',
    brand: 'bg-brand/12 text-brand',
    warn: 'bg-csekk-soft text-warn',
    danger: 'bg-danger-soft text-danger',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  )
}
