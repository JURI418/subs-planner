'use client'
import { ArrowUp, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { recommend, teacherDay, validateAssignment } from '@/lib/scheduling'
import type { AppData, Assignment, Slot } from '@/lib/types'

export type DetailActions = {
  setMain: (teacherId: string) => void
  setBackup: (index: 0 | 1, teacherId: string | null) => void
  promote: (index: 0 | 1) => void
}

const CELL: Record<string, string> = {
  class: 'bg-iris-soft text-on-iris-container',
  cover: 'bg-warn-soft text-warn',
  this: 'bg-iris text-white',
  free: 'border border-dashed border-line text-faint',
}

/** 한 교사의 그날 교시 막대 + 수업 수·연속·누적 */
function DayStrip({
  teacherId,
  slot,
  data,
  avg,
}: {
  teacherId: string
  slot: Slot
  data: AppData
  avg: number
}) {
  const day = teacherDay(teacherId, slot, data)
  const heavy = day.total >= data.settings.maxDaily
  const longRun = day.maxRun >= data.settings.maxConsecutive
  const many = day.totalAssignments > avg + 1
  return (
    <div className="min-w-0">
      <div className="flex gap-1">
        {day.cells.map((c) => (
          <div key={c.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[11px] text-subtle">{c.period}</span>
            <span
              className={`flex h-9 w-full items-center justify-center rounded-md px-0.5 text-center text-[11px] leading-tight ${CELL[c.kind]}`}
              title={
                c.kind === 'class'
                  ? `${c.period}교시 수업 ${c.label}`
                  : c.kind === 'cover'
                    ? `${c.period}교시 다른 보강`
                    : c.kind === 'this'
                      ? '이번 보강'
                      : '빈 시간'
              }
            >
              {c.kind === 'free' ? '' : c.kind === 'this' ? '보강' : c.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={heavy ? 'red' : 'slate'}>
          그날 {day.total}시간{day.covers > 0 ? ` (보강 ${day.covers + 1})` : ''}
        </Badge>
        <Badge tone={longRun ? 'red' : day.maxRun >= 3 ? 'yellow' : 'slate'}>연속 {day.maxRun}교시</Badge>
        <Badge tone={many ? 'yellow' : 'slate'}>
          누적 보강 {day.totalAssignments}회 · 평균 {avg.toFixed(1)}
        </Badge>
        {day.clash && <Badge tone="red">같은 교시 수업 있음</Badge>}
      </div>
    </div>
  )
}

function Row({
  role,
  teacherId,
  slot,
  data,
  avg,
  note,
  actions,
}: {
  role?: string
  teacherId: string
  slot: Slot
  data: AppData
  avg: number
  note?: string
  actions?: React.ReactNode
}) {
  const t = data.teachers.find((x) => x.id === teacherId)
  return (
    <div className="rounded-none bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {role && <Badge tone={role === '보강' ? 'blue' : 'slate'}>{role}</Badge>}
        <span className="text-[15px] font-bold">{t?.name ?? '알 수 없음'}</span>
        <span className="text-[13px] text-subtle">
          {t?.subject} · {t?.grades.map((g) => `${g}학년`).join('·') || '학년 정보 없음'}
        </span>
        {note && <span className="text-[13px] text-bad">{note}</span>}
        <span className="ml-auto flex flex-wrap gap-1">{actions}</span>
      </div>
      <DayStrip teacherId={teacherId} slot={slot} data={data} avg={avg} />
    </div>
  )
}

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
  const avg = data.teachers.length
    ? data.teachers.reduce((n, t) => n + t.totalAssignments, 0) / data.teachers.length
    : 0
  const confirmed = a.status === '확정'
  const assigned = new Set([a.substituteTeacherId, ...a.backups].filter(Boolean) as string[])
  const rec = recommend(
    slot,
    data,
    data.assignments.filter((x) => x.slotId !== slot.id),
  )
  const others = rec.ranked.filter((r) => !assigned.has(r.t.id)).slice(0, 5)
  const problemsOf = (id: string) => validateAssignment(slot, id, data)

  return (
    <div className="grid gap-5 rounded-none bg-wash p-4 md:p-5 xl:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-bold">배정된 교사</h3>
          <Legend />
        </div>
        {a.substituteTeacherId ? (
          <Row role="보강" teacherId={a.substituteTeacherId} slot={slot} data={data} avg={avg} />
        ) : (
          <p className="rounded-none bg-surface p-4 text-sm text-subtle">
            보강 교사가 없습니다. 오른쪽 후보에서 고르세요.
          </p>
        )}
        {([0, 1] as const).map((i) => {
          const id = a.backups[i]
          if (!id)
            return (
              <p
                key={i}
                className="rounded-none border border-dashed border-line px-4 py-3 text-sm text-subtle"
              >
                예비{i + 1} 없음 · 오른쪽 후보에서 지정할 수 있습니다.
              </p>
            )
          const p = problemsOf(id)
          return (
            <Row
              key={i}
              role={`예비${i + 1}`}
              teacherId={id}
              slot={slot}
              data={data}
              avg={avg}
              note={p.length ? p.join(', ') : undefined}
              actions={
                <>
                  <button onClick={() => actions.promote(i)} className="m3-btn m3-btn-sm m3-tonal">
                    <ArrowUp size={15} /> 보강으로
                  </button>
                  <button
                    onClick={() => actions.setBackup(i, null)}
                    aria-label={`예비${i + 1} 해제`}
                    className="grid size-8 place-items-center rounded-full text-subtle hover:bg-ink/[.08]"
                  >
                    <X size={16} />
                  </button>
                </>
              }
            />
          )
        })}
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <h3 className="font-bold">
          다른 후보{' '}
          <span className="text-[13px] font-normal text-subtle">
            추천 점수 순 · 조건 때문에 빠진 교사 {rec.blocked.length}명
          </span>
        </h3>
        {others.length === 0 ? (
          <p className="rounded-none bg-surface p-4 text-sm text-subtle">
            조건을 만족하는 다른 후보가 없습니다.
          </p>
        ) : (
          others.map((r) => (
            <Row
              key={r.t.id}
              teacherId={r.t.id}
              slot={slot}
              data={data}
              avg={avg}
              actions={
                <>
                  <span className="mr-1 self-center text-[13px] text-subtle">{Math.round(r.score)}점</span>
                  {!confirmed && (
                    <button onClick={() => actions.setMain(r.t.id)} className="m3-btn m3-btn-sm m3-filled">
                      보강
                    </button>
                  )}
                  <button
                    onClick={() => actions.setBackup(0, r.t.id)}
                    className="m3-btn m3-btn-sm m3-outlined"
                  >
                    예비1
                  </button>
                  <button
                    onClick={() => actions.setBackup(1, r.t.id)}
                    className="m3-btn m3-btn-sm m3-outlined"
                  >
                    예비2
                  </button>
                </>
              }
            />
          ))
        )}
        {confirmed && (
          <p className="text-[13px] text-subtle">
            확정된 배정입니다. 보강 교사를 바꾸려면 예비 교사를 &lsquo;보강으로&rsquo; 올리거나 확정을
            취소하세요.
          </p>
        )}
      </section>
    </div>
  )
}

function Legend() {
  return (
    <span className="flex flex-wrap gap-3 text-[12px] text-subtle">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-iris-soft" /> 수업
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-warn-soft" /> 다른 보강
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-sm bg-iris" /> 이번 보강
      </span>
    </span>
  )
}
