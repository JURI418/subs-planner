import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  desc: string
  action?: ReactNode
}

/** 영문 이탤릭 세리프 머리말 + 한글 제목. 아래는 가는 선으로 마감 */
export function PageHeader({ eyebrow, title, desc, action }: Props) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
      <div className="min-w-0">
        <p className="serif-i text-[26px] leading-none text-subtle">{eyebrow}</p>
        <h1 className="mt-3 text-[2rem] font-extrabold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-3 text-[15px] text-subtle">{desc}</p>
      </div>
      {action}
    </div>
  )
}
