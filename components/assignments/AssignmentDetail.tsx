'use client'
import { ArrowUp, X } from 'lucide-react'
import { recommend, teacherDay, validateAssignment } from '@/lib/scheduling'
import type { AppData, Assignment, Slot } from '@/lib/types'

export type DetailActions = {
  setMain: (teacherId: string) => void
  setBackup: (index: 0 | 1, teacherId: string | null) => void
  promote: (index: 0 | 1) => void
}

const CELL: Record<string, string> = {
  class: 'bg-iris-soft text-ink-2',
  cover: 'bg-warn-soft text-warn',
  this: 'bg-ink font-bold text-white',
  free: 'border border-dashed border-line',
  // 다른 후보: 아직 배정 전이므로 이번 보강 칸을 점선으로
  maybe: 'border-[1.5px] border-dashed border-ink/80 bg-surface font-bold text-ink',
}

type Row = {
  teacherId: string
  role: '보강' | '예비1' | '예비2' | null
  rank?: number
  score?: number
  note?: string
  actions: React.ReactNode
}

/** 배정 상세: 보강·예비·다른 후보를 한 표에 한 줄씩 놓고 그날 시간표와 숫자를 같은 열로 비교 */
export function AssignmentDetail({
  a,
  slot,
  data,
  actions,
}: {
  a: Assignment
  slot: Slot
  data: AppData
  actions: DetailActions
}) {
  const avg = data.teachers.length ? data.teachers.reduce((n, t) => n + t.totalAssignments, 0) / data.teachers.length : 0
  const confirmed = a.status === '확정'
  const assigned = new Set([a.substituteTeacherId, ...a.backups].filter(Boolean) as string[])
  const rec = recommend(
    slot,
    data,
    data.assignments.filter((x) => x.slotId !== slot.id),
  )
  const others = rec.ranked.filter((r) => !assigned.has(r.t.id)).slice(0, 5)
  const problemsOf = (id: string) => validateAssignment(slot, id, data)

  const mine: Row[] = []
  if (a.substituteTeacherId) mine.push({ teacherId: a.substituteTeacherId, role: '보강', actions: null })
  ;([0, 1] as const).forEach((i) => {
    const id = a.backups[i]
    if (!id) return
    const p = problemsOf(id)
    mine.push({
      teacherId: id,
      role: i === 0 ? '예비1' : '예비2',
      note: p.length ? p.join(', ') : undefined,
      actions: (
        <>
          <button onClick={() => actions.promote(i)} className="m3-btn m3-btn-sm m3-outlined h-8 px-3">
            <ArrowUp size={14} /> 보강으로
          </button>
          <button
            onClick={() => actions.setBackup(i, null)}
            aria-label={`예비${i + 1} 해제`}
            className="grid size-8 place-items-center rounded-full text-subtle hover:bg-ink/[.08]"
          >
            <X size={15} />
          </button>
        </>
      ),
    })
  })
  const cand: Row[] = others.map((r, i) => ({
    teacherId: r.t.id,
    role: null,
    rank: i + 1,
    score: Math.round(r.score),
    actions: (
      <>
        {!confirmed && (
          <button onClick={() => actions.setMain(r.t.id)} className="m3-btn m3-btn-sm m3-filled h-8 px-3">
            보강
          </button>
        )}
        <button onClick={() => actions.setBackup(0, r.t.id)} className="m3-btn m3-btn-sm h-8 border border-plum px-3 text-plum hover:bg-plum hover:text-white">
          예비1
        </button>
        <button onClick={() => actions.setBackup(1, r.t.id)} className="m3-btn m3-btn-sm h-8 border border-plum px-3 text-plum hover:bg-plum hover:text-white">
          예비2
        </button>
      </>
    ),
  }))
  const cols = 8

  return (
    <div className="bg-wash p-3 md:p-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse bg-surface text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-bold text-subtle">
              <th className="w-16 px-3 py-2.5">역할</th>
              <th className="w-52 px-2 py-2.5">교사</th>
              <th className="px-2 py-2.5">그날 시간표 (1~{data.settings.periodCount}교시)</th>
              <th className="w-16 px-2 py-2.5 text-center">총 수업</th>
              <th className="w-14 px-2 py-2.5 text-center">연속</th>
              <th className="w-14 px-2 py-2.5 text-center">누적</th>
              <th className="w-14 px-2 py-2.5 text-center">점수</th>
              <th className="w-56 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <Section cols={cols} label="배정된 교사" right={<Legend />} />
            {mine.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-3 py-3 text-subtle">
                  보강 교사가 없습니다. 아래 후보에서 고르세요.
                </td>
              </tr>
            ) : (
              mine.map((r) => <Line key={r.teacherId} row={r} slot={slot} data={data} avg={avg} />)
            )}
            {mine.length > 0 && !a.backups[0] && !a.backups[1] && (
              <tr className="border-b border-line">
                <td colSpan={cols} className="px-3 py-2 text-[12px] text-subtle">
                  <b className="text-plum">예비1·2</b> 없음 · 아래 후보에서 지정할 수 있습니다.
                </td>
              </tr>
            )}
            <Section cols={cols} label={`다른 후보 · 추천 점수 순 · 조건 때문에 빠진 교사 ${rec.blocked.length}명`} />
            {cand.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-3 py-3 text-subtle">
                  조건을 만족하는 다른 후보가 없습니다.
                </td>
              </tr>
            ) : (
              cand.map((r) => <Line key={r.teacherId} row={r} slot={slot} data={data} avg={avg} candidate />)
            )}
          </tbody>
        </table>
      </div>
      {confirmed && (
        <p className="mt-2 text-[12px] text-subtle">
          확정된 배정입니다. 보강 교사를 바꾸려면 예비 교사를 &lsquo;보강으로&rsquo; 올리거나 확정을 취소하세요.
        </p>
      )}
    </div>
  )
}

function Section({ cols, label, right }: { cols: number; label: string; right?: React.ReactNode }) {
  return (
    <tr className="bg-wash-2/60">
      <td colSpan={cols} className="px-3 py-1.5">
        <span className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold tracking-[.08em] text-subtle">{label}</span>
          {right}
        </span>
      </td>
    </tr>
  )
}

function Line({
  row,
  slot,
  data,
  avg,
  candidate,
}: {
  row: Row
  slot: Slot
  data: AppData
  avg: number
  candidate?: boolean
}) {
  const t = data.teachers.find((x) => x.id === row.teacherId)
  const day = teacherDay(row.teacherId, slot, data)
  const heavy = day.total >= data.settings.maxDaily
  const longRun = day.maxRun >= data.settings.maxConsecutive
  const many = day.totalAssignments > avg + 1
  const note = row.note ?? (day.clash ? '같은 교시 수업 있음' : undefined)
  return (
    <tr className="border-b border-line align-middle">
      <td className="px-3 py-2">
        {row.role === '보강' && <span className="bg-ink px-2 py-0.5 text-[11px] font-bold text-paper">보강</span>}
        {row.role === '예비1' && <span className="bg-plum px-2 py-0.5 text-[11px] font-bold text-white">예비1</span>}
        {row.role === '예비2' && (
          <span className="border border-plum bg-plum-soft px-2 py-0.5 text-[11px] font-bold text-plum">예비2</span>
        )}
        {row.rank && (
          <span className="grid size-6 place-items-center rounded-full border border-ink/40 text-[11px] font-bold text-ink-2">
            {row.rank}
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <span className="text-[14px] font-bold">{t?.name ?? '알 수 없음'}</span>{' '}
        <span className="text-[11.5px] text-subtle">
          {t?.subject} · {t?.grades.map((g) => `${g}학년`).join('·') || '학년 정보 없음'}
        </span>
        {note && <span className="mt-0.5 block text-[11.5px] font-bold text-bad">{note}</span>}
      </td>
      <td className="px-2 py-2">
        <div className="flex gap-0.5">
          {day.cells.map((c) => (
            <span
              key={c.period}
              title={`${c.period}교시 ${c.kind === 'class' ? `수업 ${c.label}` : c.kind === 'cover' ? '다른 보강' : c.kind === 'this' ? '이번 보강' : '빈 시간'}`}
              className={`grid h-7 w-9 shrink-0 place-items-center rounded-[3px] text-[10.5px] leading-none ${CELL[candidate && c.kind === 'this' ? 'maybe' : c.kind]}`}
            >
              {c.kind === 'free' ? '' : c.kind === 'this' ? (candidate ? '후보' : '보강') : c.kind === 'cover' ? '보강' : c.label}
            </span>
          ))}
        </div>
      </td>
      <td className={`px-2 py-2 text-center text-[15px] font-bold tabular-nums ${heavy ? 'text-bad' : ''}`}>
        {day.total}
        <span className="text-[11px] font-normal text-subtle">/{data.settings.maxDaily}</span>
      </td>
      <td className={`px-2 py-2 text-center text-[15px] font-bold tabular-nums ${longRun ? 'text-bad' : 'text-sky'}`}>{day.maxRun}</td>
      <td className={`px-2 py-2 text-center text-[15px] font-bold tabular-nums ${many ? 'text-warn' : ''}`}>
        {day.totalAssignments}
        <span className="text-[11px] font-normal text-subtle">회</span>
      </td>
      <td className="px-2 py-2 text-center text-[15px] font-bold tabular-nums">{row.score ?? <span className="text-faint">–</span>}</td>
      <td className="px-3 py-2">
        <span className="flex justify-end gap-1">{row.actions}</span>
      </td>
    </tr>
  )
}

function Legend() {
  return (
    <span className="flex flex-wrap gap-3 text-[11px] font-normal text-subtle">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-iris-soft" /> 수업
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-warn-soft" /> 다른 보강
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-ink" /> 이번 보강
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm border border-dashed border-ink" /> 후보
      </span>
    </span>
  )
}
