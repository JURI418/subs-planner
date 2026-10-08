'use client'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import type { AppData } from '@/lib/types'

export function StatsPage({ data }: { data: AppData }) {
  const sorted = [...data.teachers].sort((a, b) => b.totalAssignments - a.totalAssignments)
  const max = Math.max(...sorted.map((t) => t.totalAssignments), 1)
  return (
    <>
      <PageHeader eyebrow="분석" title="보강 통계" desc="학기 누적 보강 횟수와 교사별 편차를 확인합니다." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">평균 보강</p>
          <p className="mt-3 text-3xl font-bold">
            {(sorted.reduce((a, t) => a + t.totalAssignments, 0) / Math.max(sorted.length, 1)).toFixed(1)}
            <span className="text-sm">회</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">최대 보강</p>
          <p className="mt-3 text-3xl font-bold">
            {max}
            <span className="text-sm">회</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">등록 교사</p>
          <p className="mt-3 text-3xl font-bold">
            {data.teachers.length}
            <span className="text-sm">명</span>
          </p>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="font-bold">교사별 학기 누적</h2>
        <div className="mt-6 flex flex-col gap-4">
          {sorted.slice(0, 12).map((t) => (
            <div className="grid grid-cols-[90px_1fr_35px] items-center gap-3" key={t.id}>
              <span className="text-sm font-medium">{t.name}</span>
              <div className="h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-sky-500"
                  style={{ width: `${(t.totalAssignments / max) * 100}%` }}
                />
              </div>
              <span className="text-right text-sm font-bold">{t.totalAssignments}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
