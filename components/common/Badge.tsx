import type { ReactNode } from 'react'

const toneClass: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[tone] ?? toneClass.slate}`}>
      {children}
    </span>
  )
}
