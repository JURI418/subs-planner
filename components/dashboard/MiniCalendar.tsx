'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { todayISO, type AppData } from '@/lib/types'

const pad = (n: number) => String(n).padStart(2, '0')
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** 이번 달 달력: 휴업일은 빨간 숫자, 학사 행사는 보라 점, 결강은 노란 점 */
export function MiniCalendar({ data }: { data: AppData }) {
  const today = todayISO()
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const move = (n: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m - 1 + n, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
  const first = new Date(ym.y, ym.m - 1, 1)
  const daysIn = new Date(ym.y, ym.m, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => `${ym.y}-${pad(ym.m)}-${pad(i + 1)}`),
  ]
  const holidays = new Set(data.settings.holidays)
  const eventDays = new Set(data.events.filter((e) => e.kind === '행사').map((e) => e.date))
  const absenceDays = new Set(data.slots.map((s) => s.date))

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold">
          {ym.y}년 {ym.m}월
        </p>
        <div className="flex">
          <button onClick={() => move(-1)} aria-label="이전 달" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.08]">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => move(1)} aria-label="다음 달" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.08]">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-xs text-subtle">
        {WEEK.map((w, i) => (
          <span key={w} className={`py-1 ${i === 0 ? 'text-bad' : ''}`}>
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) =>
          d ? (
            <div key={d} className="flex flex-col items-center py-0.5">
              <span
                className={`grid size-8 place-items-center rounded-full text-sm tabular-nums ${
                  d === today
                    ? 'bg-iris font-semibold text-white'
                    : holidays.has(d) || i % 7 === 0
                      ? 'text-bad'
                      : i % 7 === 6
                        ? 'text-subtle'
                        : 'text-ink'
                }`}
                title={data.events.filter((e) => e.date === d && e.kind !== '방학').map((e) => e.title).join(', ') || undefined}
              >
                {Number(d.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {eventDays.has(d) && <span className="size-1.5 rounded-full bg-iris" />}
                {absenceDays.has(d) && <span className="size-1.5 rounded-full bg-warn" />}
              </span>
            </div>
          ) : (
            <span key={`b${i}`} />
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-iris" /> 학사 행사
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warn" /> 결강
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-bad">12</span> 휴업일
        </span>
      </div>
    </div>
  )
}
