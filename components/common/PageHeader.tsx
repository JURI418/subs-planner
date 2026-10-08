import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  desc: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, desc, action }: Props) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="mb-2 text-[13px] font-medium text-iris">{eyebrow}</p>
        <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink">{title}</h1>
        <p className="mt-2 text-[15px] text-subtle">{desc}</p>
      </div>
      {action}
    </div>
  )
}
