import type { ReactNode } from 'react'

/** 각진 면 + 가는 선. 그림자 없이 여백으로 구분 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-line bg-surface p-6 md:p-7 ${className}`}>{children}</section>
}
