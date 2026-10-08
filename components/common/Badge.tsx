import type { ReactNode } from 'react'

const toneClass: Record<string, string> = {
  green: 'bg-ok-soft text-ok',
  yellow: 'bg-warn-soft text-warn',
  red: 'bg-bad-soft text-bad',
  blue: 'bg-iris-soft text-on-iris-container',
  slate: 'bg-wash-2 text-ink-2',
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${toneClass[tone] ?? toneClass.slate}`}
    >
      {children}
    </span>
  )
}
