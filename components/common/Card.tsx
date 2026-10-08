import type { ReactNode } from 'react'

/** Material 3 카드: 그림자·테두리 없이 바탕색 위에 흰 면으로 구분 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-surface p-6 ${className}`}>{children}</section>
}
