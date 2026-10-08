import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  desc: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, desc, action }: Props) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-sky-600">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  )
}
