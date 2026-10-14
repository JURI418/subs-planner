'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { days, formatDotDate, isVirtual, todayISO, type AppData } from '@/lib/types'
import { isAbsentAt } from '@/lib/scheduling'

const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`

/** 기준 날짜가 속한 주의 월~금 날짜. 주말이면 다음 주 */
function weekDates(anchor: string, offset: number) {
  const [y, m, d] = anchor.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const weekend = base.getDay() === 0 || base.getDay() === 6
  const monday = d - ((base.getDay() + 6) % 7) + (weekend ? 7 : 0) + offset * 7
  return Array.from({ length: 5 }, (_, i) => iso(new Date(y, m - 1, monday + i)))
}

type Cell =
  | { kind: 'class'; room: string; subject: string; absent: boolean; cover?: string | null; status?: string }
  | { kind: 'cover'; room: string; subject: string; forName: string; status: string }

/** 이번 주 교사 시간표: 자기 수업 + 그 주의 결강·보강을 한눈에 */
export function WeekPage({ data }: { data: AppData }) {
  const today = todayISO()
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const withTimetable = useMemo(
    () => data.teachers.filter((t) => !isVirtual(t) && data.timetable.some((e) => e.teacherId === t.id)),
    [data.teachers, data.timetable],
  )
  const [teacherId, setTeacherId] = useState(withTimetable[0]?.id ?? '')
  const dates = weekDates(today, offset)
  const periods = Array.from({ length: data.settings.periodCount }, (_, i) => i + 1)
  const teacher = data.teachers.find((t) => t.id === teacherId)
  const name = (id?: string | null) => data.teachers.find((t) => t.id === id)?.name
  const filtered = withTimetable.filter((t) => !q.trim() || t.name.includes(q.trim()) || t.subject.includes(q.trim()))

  // 칸 계산: [요일 index][교시] → 내용
  const grid = dates.map((date, di) =>
    periods.map((p): Cell | null => {
      const own = data.timetable.find((e) => e.teacherId === teacherId && e.dayOfWeek === days[di] && e.period === p)
      if (own) {
        const absent = isAbsentAt(teacherId, date, p, data.absences)
        const slot = data.slots.find((s) => s.absentTeacherId === teacherId && s.date === date && s.period === p)
        const a = slot && data.assignments.find((x) => x.slotId === slot.id)
        return {
          kind: 'class',
          room: `${own.room}${own.group ?? ''}`,
          subject: own.subject,
          absent: absent || !!slot,
          cover: a ? name(a.substituteTeacherId) ?? null : undefined,
          status: a?.status,
        }
      }
      const coverSlot = data.slots.find(
        (s) =>
          s.date === date &&
          s.period === p &&
          data.assignments.some((a) => a.slotId === s.id && a.substituteTeacherId === teacherId),
      )
      if (coverSlot) {
        const a = data.assignments.find((x) => x.slotId === coverSlot.id)!
        return {
          kind: 'cover',
          room: `${coverSlot.room}${coverSlot.group ?? ''}`,
          subject: coverSlot.subject,
          forName: name(coverSlot.absentTeacherId) ?? '',
          status: a.status,
        }
      }
      return null
    }),
  )
  const flat = grid.flat().filter(Boolean) as Cell[]
  const classCount = flat.filter((c) => c.kind === 'class').length
  const coverCount = flat.filter((c) => c.kind === 'cover').length
  const absentCount = flat.filter((c) => c.kind === 'class' && c.absent).length
  const holidayOf = (date: string) =>
    data.settings.holidays.includes(date)
      ? (data.events.find((e) => e.date === date && e.kind !== '행사')?.title ?? '휴업일')
      : null

  return (
    <>
      <PageHeader
        eyebrow="This week"
        title="이번 주 시간표"
        desc="교사별로 한 주의 수업과 결강·보강을 함께 봅니다. 주말에는 다음 주를 먼저 보여줍니다."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            id="week-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·교과 검색"
            className="m3-field m3-field-sm w-44 pl-9"
          />
        </div>
        <select
          id="week-teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="m3-field m3-field-sm min-w-44"
          aria-label="교사 선택"
        >
          {filtered.length === 0 && <option value="">검색 결과 없음</option>}
          {filtered.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.subject}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="이전 주" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.06]">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-52 text-center text-[15px] font-bold tabular-nums">
            {formatDotDate(dates[0]).slice(5)} ~ {formatDotDate(dates[4]).slice(5)}
          </span>
          <button onClick={() => setOffset((o) => o + 1)} aria-label="다음 주" className="grid size-9 place-items-center rounded-full hover:bg-ink/[.06]">
            <ChevronRight size={18} />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="m3-btn m3-btn-sm m3-outlined ml-1">
              이번 주
            </button>
          )}
        </div>
      </div>

      {!teacher ? (
        <Card>
          <p className="text-sm text-subtle">등록된 시간표가 없습니다. 왼쪽 메뉴의 &lsquo;시간표 올리기&rsquo;에서 먼저 시간표를 올리세요.</p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-xl font-extrabold">{teacher.name}</h2>
            <span className="text-[14px] text-subtle">
              {teacher.subject} · {teacher.grades.map((g) => `${g}학년`).join('·')}
            </span>
            <span className="ml-auto flex flex-wrap gap-1.5">
              <Badge>수업 {classCount}</Badge>
              <Badge tone="yellow">보강 {coverCount}</Badge>
              {absentCount > 0 && <Badge tone="red">결강 {absentCount}</Badge>}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-14 p-2 text-left text-xs font-normal text-subtle">교시</th>
                  {dates.map((date, i) => {
                    const off = holidayOf(date)
                    return (
                      <th
                        key={date}
                        className={`p-2 text-left font-bold ${date === today ? 'text-ink' : 'text-ink-2'}`}
                      >
                        <span className={date === today ? 'border-b-2 border-ink pb-0.5' : ''}>
                          {days[i]} {formatDotDate(date).slice(5, 10)}
                        </span>
                        {off && <span className="mt-1 block truncate text-xs font-normal text-bad">{off}</span>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pi) => (
                  <tr key={p} className="border-t border-line">
                    <td className="p-2 align-top text-[13px] font-bold text-subtle">{p}</td>
                    {dates.map((date, di) => {
                      const c = grid[di][pi]
                      const off = holidayOf(date)
                      return (
                        <td key={date} className={`h-16 p-1 align-top ${off ? 'bg-wash' : ''}`}>
                          {c?.kind === 'class' && (
                            <div
                              className={`h-full rounded-md px-2 py-1.5 text-xs leading-5 ${c.absent ? 'bg-bad-soft text-bad' : off ? 'text-faint' : 'bg-wash-2 text-ink'}`}
                            >
                              <b className={c.absent ? 'line-through' : ''}>{c.room}</b> {c.subject}
                              {c.absent && (
                                <span className="block truncate font-bold">
                                  결강 → {c.cover ? `${c.cover}${c.status === '확정' ? '' : ` (${c.status})`}` : '보강 미정'}
                                </span>
                              )}
                            </div>
                          )}
                          {c?.kind === 'cover' && (
                            <div className="h-full rounded-md bg-warn-soft px-2 py-1.5 text-xs leading-5 text-warn">
                              <b>보강 {c.room}</b> {c.subject}
                              <span className="block truncate">
                                {c.forName} 대신{c.status !== '확정' ? ` · ${c.status}` : ''}
                              </span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-wash-2" /> 수업
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-warn-soft" /> 보강 (다른 선생님 대신)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-bad-soft" /> 결강
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-wash" /> 휴업일
            </span>
          </div>
        </Card>
      )}
    </>
  )
}
