'use client'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { formatDotDate, todayISO, type AppData } from '@/lib/types'

export function DashboardPage({ data }: { data: AppData }) {
  const router = useRouter()
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const done = data.assignments.filter((a) => a.status === '확정').length
  const today = todayISO()
  const todayAbsences = data.absences.filter((a) => a.startDate <= today && today <= a.endDate).length
  const stats: { label: string; value: number; unit: string; mark: string }[] = [
    { label: '오늘 결강', value: todayAbsences, unit: '건', mark: 'bg-iris' },
    { label: '미확정 배정', value: pending, unit: '건', mark: pending ? 'bg-warn' : 'bg-faint' },
    { label: '확정 완료', value: done, unit: '건', mark: 'bg-ok' },
    { label: '등록 교사', value: data.teachers.length, unit: '명', mark: 'bg-faint' },
  ]
  return (
    <>
      <PageHeader
        eyebrow="운영 현황"
        title="결보강 확인"
        desc={formatDotDate(today)}
        action={
          <button onClick={() => router.push('/absence')} className="m3-fab">
            <Plus size={22} strokeWidth={2} />
            결강 등록
          </button>
        }
      />

      {/* 요약: 하나의 띠를 네 칸으로 나눈 장부 형식 */}
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-surface xl:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`px-6 py-5 ${i % 2 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line xl:border-t-0' : ''} ${i === 2 ? 'xl:border-l' : ''}`}
          >
            <p className="flex items-center gap-2 text-xs tracking-wide text-subtle">
              <span className={`size-2 rounded-full ${s.mark}`} aria-hidden />
              {s.label}
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums text-ink">
              {s.value}
              <span className="ml-1.5 font-sans text-sm font-normal text-subtle">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-start justify-between pb-2">
            <div>
              <h2 className="font-display text-lg font-semibold">최근 배정</h2>
              <p className="mt-1 text-xs text-subtle">가장 최근에 처리한 결보강 4건</p>
            </div>
            <button
              onClick={() => router.push('/assignments')}
              className="m3-btn m3-btn-sm m3-text"
            >
              전체 보기
            </button>
          </div>
          <AssignmentMini data={data} />
        </Card>
        <Card>
          <h2 className="pb-2 font-display text-lg font-semibold">운영 체크리스트</h2>
          <ol className="mt-2 flex flex-col">
            {[
              ['시간표 등록', '교사별 주간 시간표가 준비됐습니다.', data.timetable.length > 0],
              ['결강 슬롯 확인', '수업이 없는 시간은 자동으로 제외됩니다.', true],
              ['배정 확정', '제안된 배정을 확인하고 확정하세요.', pending === 0],
            ].map(([a, b, c], i) => (
              <li className="flex items-start gap-4 border-b border-line py-4 last:border-b-0" key={a as string}>
                <span className="w-5 pt-0.5 font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a}</p>
                  <p className="mt-1 text-xs text-subtle">{b}</p>
                </div>
                <Badge tone={c ? 'green' : 'yellow'}>{c ? '완료' : '확인 필요'}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}

function AssignmentMini({ data }: { data: AppData }) {
  const recent = data.assignments.slice(-4).reverse()
  if (!recent.length) return <p className="py-8 text-sm text-subtle">아직 처리한 결보강이 없습니다.</p>
  return (
    <ul className="flex flex-col divide-y divide-line">
      {recent.map((a) => {
        const s = data.slots.find((x) => x.id === a.slotId)
        const absent = data.teachers.find((t) => t.id === s?.absentTeacherId)?.name
        const sub = data.teachers.find((t) => t.id === a.substituteTeacherId)?.name
        return (
          <li className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-4" key={a.slotId}>
            <span className="font-mono text-sm text-ink">
              {s?.date.slice(5).replace('-', '.')}
              <span className="block text-xs text-subtle">{s?.period}교시</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm">
                {absent} <span className="text-subtle">결강</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-subtle">
                {s?.grade}학년 {s?.room} · {s?.subject}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium">{sub ?? '—'}</span>
              <Badge tone={a.status === '확정' ? 'green' : a.status === '배정불가' ? 'red' : 'yellow'}>{a.status}</Badge>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
