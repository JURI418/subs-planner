'use client'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageHeader } from '@/components/common/PageHeader'
import { formatKoreanDate, todayISO, weekOfSemester, type AppData } from '@/lib/types'

export function DashboardPage({ data }: { data: AppData }) {
  const router = useRouter()
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const done = data.assignments.filter((a) => a.status === '확정').length
  const today = todayISO()
  const todayAbsences = data.absences.filter((a) => a.startDate <= today && today <= a.endDate).length
  const week = weekOfSemester(today, data.settings.startDate)
  return (
    <>
      <PageHeader
        eyebrow="운영 현황"
        title="안녕하세요, 오늘의 결보강을 확인하세요"
        desc={`${formatKoreanDate(today)} · ${data.settings.semester}${week ? ` ${week}주차` : ''}`}
        action={
          <button
            onClick={() => router.push('/absence')}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            + 결강 등록
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['오늘 결강', todayAbsences, '건', 'sky'],
          ['미확정 배정', pending, '건', 'yellow'],
          ['확정 완료', done, '건', 'green'],
          ['등록 교사', data.teachers.length, '명', 'slate'],
        ].map(([l, v, u, t]) => (
          <Card key={l}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{l}</p>
              <Badge tone={t as string}>{t === 'green' ? '완료' : '실시간'}</Badge>
            </div>
            <p className="mt-5 text-3xl font-bold">
              {v}
              <span className="ml-1 text-sm font-medium text-slate-400">{u}</span>
            </p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">최근 배정</h2>
              <p className="mt-1 text-xs text-slate-500">이번 주 결보강 처리 현황</p>
            </div>
            <button
              onClick={() => router.push('/assignments')}
              className="text-sm font-semibold text-sky-600"
            >
              전체 보기
            </button>
          </div>
          <AssignmentMini data={data} />
        </Card>
        <Card>
          <h2 className="font-bold">운영 체크리스트</h2>
          <div className="mt-5 flex flex-col gap-4">
            {[
              ['시간표 등록', '교사별 주간 시간표가 준비됐습니다.', true],
              ['결강 슬롯 확인', '수업이 없는 시간은 자동으로 제외됩니다.', true],
              ['배정 확정', '제안된 배정을 확인하고 확정하세요.', pending === 0],
            ].map(([a, b, c]) => (
              <div className="flex gap-3" key={a as string}>
                <div
                  className={`mt-0.5 grid size-5 place-items-center rounded-full text-xs ${c ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {c ? '✓' : '!'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{a}</p>
                  <p className="mt-1 text-xs text-slate-500">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
function AssignmentMini({ data }: { data: AppData }) {
  return (
    <div className="mt-4 flex flex-col divide-y divide-slate-100">
      {data.assignments
        .slice(-4)
        .reverse()
        .map((a) => {
          const s = data.slots.find((x) => x.id === a.slotId)
          const absent = data.teachers.find((t) => t.id === s?.absentTeacherId)?.name
          const sub = data.teachers.find((t) => t.id === a.substituteTeacherId)?.name
          return (
            <div className="flex items-center justify-between gap-3 py-3" key={a.slotId}>
              <div>
                <p className="text-sm font-semibold">
                  {s?.date.slice(5)} · {s?.period}교시{' '}
                  <span className="font-normal text-slate-500">{absent} 결강</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {s?.grade}학년 {s?.room} · {s?.subject}
                </p>
              </div>
              <Badge tone={a.status === '확정' ? 'green' : a.status === '배정불가' ? 'red' : 'yellow'}>
                {sub || a.status}
              </Badge>
            </div>
          )
        })}
    </div>
  )
}
