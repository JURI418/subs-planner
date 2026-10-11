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
  class: 'bg-iris-soft text-on-iris-container',
  cover: 'bg-warn-soft text-warn',
  this: 'bg-iris text-white',
  free: 'border border-dashed border-line text-faint',
  // 다른 후보: 아직 배정 전이므로 이번 보강 칸을 점선으로
  maybe: 'border-2 border-dashed border-ink/70 bg-surface font-bold text-ink',
}

const TONE = { ink: 'text-ink', sky: 'text-sky', bad: 'text-bad', warn: 'text-warn' } as const

function Stat({
  label,
  value,
  unit,
  meta,
  extra,
  tone,
}: {
  label: string
  value: number
  unit: string
  meta: string
  extra?: string
  tone: keyof typeof TONE
}) {
  return (
    <div className="min-w-0 border-line pt-2.5 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-3 sm:[&:not(:first-child)]:pl-4">
      <p className="text-[12px] text-subtle">{label}</p>
      <p className={`mt-0.5 flex items-baseline gap-0.5 ${TONE[tone]}`}>
        <span className="text-[1.6rem] font-bold leading-none tabular-nums">{value}</span>
        <span className="text-[13px]">{unit}</span>
      </p>
      <p className={`mt-1 truncate text-[11px] ${tone === 'bad' ? 'font-bold text-bad' : 'text-subtle'}`}>
        {meta}
        {extra && ` · ${extra}`}
      </p>
    </div>
  )
}

/** 한 교사의 그날 교시 막대 + 수업 수·연속·누적 */
function DayStrip({
  teacherId,
  slot,
  data,
  avg,
  candidate,
}: {
  teacherId: string
  slot: Slot
  data: AppData
  avg: number
  candidate?: boolean
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
              className={`flex h-9 w-full items-center justify-center rounded-md px-0.5 text-center text-[11px] leading-tight ${CELL[candidate && c.kind === 'this' ? 'maybe' : c.kind]}`}
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
              {c.kind === 'free' ? '' : c.kind === 'this' ? (candidate ? '후보' : '보강') : c.label}
            </span>
          </div>
        ))}
      </div>
      {/* 수치 3칸: 큰 숫자 + 이름표 + 한도·평균 */}
      <div className="mt-3 grid grid-cols-3 border-t border-line">
        <Stat
          label="총 수업"
          value={day.total}
          unit="시간"
          meta={heavy ? '한도 도달' : `한도 ${data.settings.maxDaily}시간`}
          extra={day.covers > 0 ? `보강 ${day.covers + 1} 포함` : undefined}
          tone={heavy ? 'bad' : 'ink'}
        />
        <Stat
          label="연속 수업"
          value={day.maxRun}
          unit="교시"
          meta={longRun ? '한도 도달' : `한도 ${data.settings.maxConsecutive}교시`}
          tone={longRun ? 'bad' : 'sky'}
        />
        <Stat
          label="누적 보강"
          value={day.totalAssignments}
          unit="회"
          meta={`학교 평균 ${avg.toFixed(1)}회`}
          tone={many ? 'warn' : 'ink'}
        />
      </div>
      {day.clash && (
        <p className="mt-2 text-[13px] font-bold text-bad">같은 교시에 수업이 있습니다</p>
      )}
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
  rank,
}: {
  rank?: number
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
    <div
      className={
        rank
          ? 'border border-dashed border-ink/25 p-4 transition-colors hover:border-solid hover:border-ink/40 hover:bg-surface'
          : `border-l-4 bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,.06)] ${role === '보강' ? 'border-ink' : 'border-plum'}`
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {rank && (
          <span className="grid size-6 place-items-center rounded-full border border-ink/40 text-[12px] font-bold text-ink-2">
            {rank}
          </span>
        )}
        {role &&
          (role === '보강' ? (
            <span className="bg-ink px-2 py-0.5 text-[12px] font-bold text-paper">보강</span>
          ) : (
            <span
              className={`px-2 py-0.5 text-[12px] font-bold ${role === '예비1' ? 'bg-plum text-white' : 'border border-plum bg-plum-soft text-plum'}`}
            >
              {role}
            </span>
          ))}
        <span className="text-[15px] font-bold">{t?.name ?? '알 수 없음'}</span>
        <span className="text-[13px] text-subtle">
          {t?.subject} · {t?.grades.map((g) => `${g}학년`).join('·') || '학년 정보 없음'}
        </span>
        {note && <span className="text-[13px] text-bad">{note}</span>}
        <span className="ml-auto flex flex-wrap gap-1">{actions}</span>
      </div>
      <DayStrip teacherId={teacherId} slot={slot} data={data} avg={avg} candidate={!!rank} />
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
    <div className="grid gap-5 rounded-none bg-wash p-4 md:p-5 xl:grid-cols-2 xl:gap-0">
      <section className="flex min-w-0 flex-col gap-3 xl:pr-5">
        <div className="flex items-baseline justify-between">
          <h3 className="flex items-center gap-2 font-bold">
            <span className="size-2.5 bg-ink" aria-hidden />
            배정된 교사
          </h3>
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
                className="rounded-none border border-dashed border-plum/40 px-4 py-3 text-sm text-subtle"
              >
                <b className="text-plum">예비{i + 1}</b> 없음 · 오른쪽 후보에서 지정할 수 있습니다.
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

      <section className="flex min-w-0 flex-col gap-3 border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
        <h3 className="flex flex-wrap items-baseline gap-x-2 font-bold">
          <span className="flex items-center gap-2 self-center">
            <span className="size-2.5 border border-dashed border-ink" aria-hidden />
            다른 후보
          </span>
          <span className="text-[13px] font-normal text-subtle">
            추천 점수 순 · 조건 때문에 빠진 교사 {rec.blocked.length}명
          </span>
        </h3>
        {others.length === 0 ? (
          <p className="rounded-none bg-surface p-4 text-sm text-subtle">
            조건을 만족하는 다른 후보가 없습니다.
          </p>
        ) : (
          others.map((r, ri) => (
            <Row
              key={r.t.id}
              rank={ri + 1}
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
                    className="m3-btn m3-btn-sm border border-plum text-plum hover:bg-plum hover:text-white"
                  >
                    예비1
                  </button>
                  <button
                    onClick={() => actions.setBackup(1, r.t.id)}
                    className="m3-btn m3-btn-sm border border-plum text-plum hover:bg-plum hover:text-white"
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
