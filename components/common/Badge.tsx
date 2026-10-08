import type { ReactNode } from 'react'

const toneClass: Record<string, string> = {
  green: 'bg-ok-soft text-ok',
  yellow: 'bg-warn-soft text-warn',
  red: 'bg-bad-soft text-bad',
  blue: 'bg-iris-soft text-on-iris-container',
  slate: 'bg-wash text-ink-2',
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${toneClass[tone] ?? toneClass.slate}`}
    >
      {children}
    </span>
  )
}
