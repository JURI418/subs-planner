'use client'
import { useState } from 'react'
import { Card } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { isVirtual, type AppData } from '@/lib/types'

/** 보강 통계: 보강을 많이 맡은 교사 + 결강이 많은 교사 */
export function StatsPage({ data }: { data: AppData }) {
  const teachers = data.teachers.filter((t) => !isVirtual(t))
  const [showAll, setShowAll] = useState(false)

  // 보강 누적
  const cover = [...teachers].sort((a, b) => b.totalAssignments - a.totalAssignments)
  const coverMax = Math.max(...cover.map((t) => t.totalAssignments), 1)
  const coverAvg = cover.reduce((a, t) => a + t.totalAssignments, 0) / Math.max(cover.length, 1)

  // 결강: 교사별 결강 수업 수(슬롯), 결강 일수, 가장 많은 사유
  const absence = teachers
    .map((t) => {
      const slots = data.slots.filter((s) => s.absentTeacherId === t.id)
      const days = new Set(slots.map((s) => s.date)).size
      const reasons = new Map<string, number>()
      data.absences
        .filter((a) => a.teacherId === t.id)
        .forEach((a) => {
          const k = a.reason.split(' · ')[0] || '기타'
          reasons.set(k, (reasons.get(k) ?? 0) + 1)
        })
      const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      return { t, classes: slots.length, days, count: data.absences.filter((a) => a.teacherId === t.id).length, topReason }
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.classes - a.classes || b.days - a.days)
  const absMax = Math.max(...absence.map((x) => x.classes), 1)
  const totalAbsClasses = data.slots.length

  const limit = showAll ? Infinity : 12

  return (
    <>
      <PageHeader eyebrow="Statistics" title="보강 통계" desc="학기 동안 보강을 맡은 횟수와 결강이 많은 교사를 함께 확인합니다." />
      <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        {[
          ['평균 보강', coverAvg.toFixed(1), '회'],
          ['최대 보강', String(cover[0]?.totalAssignments ?? 0), '회'],
          ['결강 수업', String(totalAbsClasses), '개'],
          ['결강한 교사', String(absence.length), '명'],
        ].map(([label, value, unit]) => (
          <div key={label} className="bg-surface p-5 md:p-6">
            <p className="text-[13px] text-subtle">{label}</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-[2.5rem] font-bold leading-none tabular-nums">{value}</span>
              <span className="text-[13px] text-subtle">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-extrabold">보강을 많이 맡은 교사</h2>
          <p className="mt-1 text-[13px] text-subtle">확정된 보강 기준 · 학기 누적</p>
          <div className="mt-6 flex flex-col gap-3.5">
            {cover.slice(0, limit).map((t) => (
              <div className="grid grid-cols-[88px_1fr_36px] items-center gap-3" key={t.id}>
                <span className="truncate text-sm font-medium">{t.name}</span>
                <div className="h-2.5 rounded-full bg-wash-2">
                  <div className="h-2.5 rounded-full bg-ink" style={{ width: `${(t.totalAssignments / coverMax) * 100}%` }} />
                </div>
                <span className="text-right text-sm font-bold tabular-nums">{t.totalAssignments}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold">결강이 많은 교사</h2>
          <p className="mt-1 text-[13px] text-subtle">등록된 결강 기준 · 결강 수업 수가 많은 순</p>
          {absence.length === 0 ? (
            <p className="mt-6 text-sm text-subtle">등록된 결강이 없습니다.</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-[88px_1fr_36px_88px] gap-3 text-[11px] font-bold uppercase tracking-[.12em] text-subtle">
                <span>교사</span>
                <span>결강 수업</span>
                <span className="text-right">수업</span>
                <span className="text-right">일수 · 주된 사유</span>
              </div>
              <div className="mt-2 flex flex-col gap-3.5">
                {absence.slice(0, limit).map((x) => (
                  <div className="grid grid-cols-[88px_1fr_36px_88px] items-center gap-3" key={x.t.id}>
                    <span className="truncate text-sm font-medium">{x.t.name}</span>
                    <div className="h-2.5 rounded-full bg-wash-2">
                      <div className="h-2.5 rounded-full bg-bad/80" style={{ width: `${(x.classes / absMax) * 100}%` }} />
                    </div>
                    <span className="text-right text-sm font-bold tabular-nums">{x.classes}</span>
                    <span className="truncate text-right text-[12px] text-subtle">
                      {x.days}일{x.topReason ? ` · ${x.topReason}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
      {(cover.length > 12 || absence.length > 12) && (
        <div className="mt-4 text-center">
          <button onClick={() => setShowAll((v) => !v)} className="m3-btn m3-outlined">
            {showAll ? '12명까지만 보기' : '전체 보기'}
          </button>
        </div>
      )}
    </>
  )
}
