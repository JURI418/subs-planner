import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  desc: string
  action?: ReactNode
}

/** 대문자 영문 머리말 + 굵은 한글 제목 */
export function PageHeader({ eyebrow, title, desc, action }: Props) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 border-b border-ink pb-6 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-[.14em] text-subtle">{eyebrow}</p>
        <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
        <p className="mt-3 text-[15px] leading-7 text-ink-2">{desc}</p>
      </div>
      {action}
    </div>
  )
}
