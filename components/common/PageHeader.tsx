import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  desc: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, desc, action }: Props) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="mb-3 text-[11px] font-semibold tracking-[.2em] text-iris">{eyebrow}</p>
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
        <p className="mt-2 text-sm text-subtle">{desc}</p>
      </div>
      {action}
    </div>
  )
}
