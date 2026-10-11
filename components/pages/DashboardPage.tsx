'use client'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { formatDotDate, todayISO, type AppData } from '@/lib/types'

const KIND_TONE: Record<string, string> = { 공휴일: 'red', 휴업일: 'yellow', 방학: 'blue', 행사: 'slate' }

export function DashboardPage({ data }: { data: AppData }) {
  const router = useRouter()
  const today = todayISO()
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const done = data.assignments.filter((a) => a.status === '확정').length
  const todayAbsences = data.absences.filter((a) => a.startDate <= today && today <= a.endDate).length
  const todayEvents = data.events.filter((e) => e.date === today && e.kind !== '방학')
  const todayOff = data.settings.holidays.includes(today)
  const upcoming = data.events.filter((e) => e.date > today && e.kind !== '방학').slice(0, 6)
  const todaySlots = data.slots
    .filter((s) => s.date === today)
    .sort((a, b) => a.period - b.period)
    .map((s) => ({ s, a: data.assignments.find((x) => x.slotId === s.id) }))

  const stats = [
    { label: '오늘 결강', value: todayAbsences, unit: '건', mark: 'bg-ink' },
    { label: '미확정 배정', value: pending, unit: '건', mark: pending ? 'bg-warn' : 'bg-faint' },
    { label: '확정 완료', value: done, unit: '건', mark: 'bg-ok' },
    { label: '등록 교사', value: data.teachers.length, unit: '명', mark: 'bg-faint' },
  ]
  const actions = [
    { href: '/absence', en: 'Absence', title: '결강 등록', desc: '교사와 날짜를 고르면 보강 수업을 찾아요' },
    { href: '/assignments', en: 'Assignments', title: '배정 확인', desc: `확정을 기다리는 배정 ${pending}건` },
    { href: '/timetable', en: 'Timetable', title: '시간표 올리기', desc: '교사별 시간표 PDF·표 붙여넣기' },
    { href: '/calendar', en: 'Calendar', title: '학사일정 올리기', desc: '휴업일·방학을 자동으로 반영' },
  ]
  const checklist: [string, string, boolean, string][] = [
    ['시간표 등록', `교사 ${new Set(data.timetable.map((e) => e.teacherId)).size}명의 시간표가 있습니다.`, data.timetable.length > 0, '/timetable'],
    ['학사일정 등록', `휴업일 ${data.settings.holidays.length}일이 등록돼 있습니다.`, data.settings.holidays.length > 0, '/calendar'],
    ['배정 확정', pending ? `확정을 기다리는 배정이 ${pending}건 있습니다.` : '모든 배정을 확정했습니다.', pending === 0, '/assignments'],
  ]

  return (
    <>
      {/* 첫 화면 상단: 화면을 가로지르는 어두운 큰 배너 */}
      <section className="relative -mx-5 -mt-10 overflow-hidden bg-ink px-6 pb-12 pt-14 text-paper md:-mx-10 md:px-12 md:pb-16 md:pt-20">
        <p
          aria-hidden
          className="pointer-events-none absolute -bottom-6 right-4 select-none text-[9rem] font-extrabold leading-none tracking-[-0.05em] text-paper/[.07] md:-bottom-10 md:text-[15rem]"
        >
          {today.slice(5).replace('-', '.')}
        </p>
        <div className="relative max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[.25em] text-paper/60">Today · {englishDate(today)}</p>
          <h1 className="mt-4 text-[2.75rem] font-extrabold leading-tight tracking-[-0.03em] md:text-[3.5rem]">결보강 확인</h1>
          <p className="mt-2 text-[18px] text-paper/80">{formatDotDate(today)}</p>
          <ul className="mt-6 flex flex-col gap-1.5 text-[15px]">
            {todayOff ? (
              <li className="font-bold">오늘은 휴업일입니다{todayEvents[0] ? ` · ${todayEvents[0].title}` : ''}</li>
            ) : todayEvents.length ? (
              todayEvents.slice(0, 4).map((e, i) => <li key={i}>· {e.title}</li>)
            ) : (
              <li className="text-paper/60">오늘 등록된 학사일정이 없습니다</li>
            )}
          </ul>
          <div className="mt-9 flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/absence')}
              className="m3-btn h-12 border border-paper bg-paper px-7 text-ink hover:bg-transparent hover:text-paper"
            >
              <Plus size={18} /> 결강 등록
            </button>
            <button
              onClick={() => router.push('/assignments')}
              className="m3-btn h-12 border border-paper/60 px-7 text-paper hover:border-paper hover:bg-paper hover:text-ink"
            >
              배정 확인 {pending > 0 && `· ${pending}건`}
            </button>
          </div>
        </div>
      </section>

      {/* 바로가기: 번호가 붙은 목차 형식 */}
      <nav className="grid grid-cols-2 border-b border-line xl:grid-cols-4" aria-label="바로가기">
        {actions.map(({ href, en, title, desc }, i) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`group flex flex-col items-start gap-1 py-7 pr-6 text-left ${i % 2 ? 'pl-6' : ''} ${i === 2 ? 'xl:pl-6' : ''} ${i > 0 ? 'xl:border-l xl:border-line' : ''} ${i % 2 ? 'border-l border-line' : ''}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[.2em] text-subtle">
              {String(i + 1).padStart(2, '0')} · {en}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[19px] font-extrabold">
              {title}
              <ChevronRight size={17} className="transition-transform group-hover:translate-x-1" />
            </span>
            <span className="text-[13px] leading-5 text-subtle">{desc}</span>
          </button>
        ))}
      </nav>

      {/* 요약 수치: 큰 이탤릭 숫자 */}
      <div className="grid grid-cols-2 border-b border-line xl:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`py-8 pr-6 ${i % 2 ? 'border-l border-line pl-6' : ''} ${i === 2 ? 'xl:border-l xl:border-line xl:pl-6' : ''} ${i >= 2 ? 'border-t border-line xl:border-t-0' : ''}`}
          >
            <p className="flex items-center gap-2 text-[13px] text-subtle">
              <span className={`size-1.5 rounded-full ${s.mark}`} aria-hidden />
              {s.label}
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-[3.25rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{s.value}</span>
              <span className="text-sm text-subtle">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-8">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.2em] text-subtle">Today&rsquo;s cover</p>
                <h2 className="mt-1 text-xl font-extrabold">오늘의 보강</h2>
                <p className="mt-1 text-[13px] text-subtle">{formatDotDate(today)} 결강 수업과 보강 교사</p>
              </div>
              <button onClick={() => router.push('/assignments')} className="m3-btn m3-btn-sm m3-text">
                전체 보기
              </button>
            </div>
            {todaySlots.length === 0 ? (
              <p className="py-6 text-sm text-subtle">오늘 결강 수업이 없습니다.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {todaySlots.map(({ s, a }) => {
                  const absent = data.teachers.find((t) => t.id === s.absentTeacherId)?.name
                  const sub = data.teachers.find((t) => t.id === a?.substituteTeacherId)?.name
                  return (
                    <li key={s.id} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 py-3.5">
                      <span className="font-mono text-sm">{s.period}교시</span>
                      <span className="min-w-0">
                        <span className="block text-[15px]">
                          {s.grade}학년 {s.room} · {s.subject}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-subtle">{absent} 선생님 결강</span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="text-[15px] font-medium">{sub ?? '—'}</span>
                        {a && (
                          <Badge tone={a.status === '확정' ? 'green' : a.status === '배정불가' ? 'red' : 'yellow'}>{a.status}</Badge>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card>
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-subtle">Checklist</p>
            <h2 className="mt-1 text-xl font-extrabold">운영 체크리스트</h2>
            <ol className="mt-2 flex flex-col">
              {checklist.map(([title, desc, ok, href], i) => (
                <li key={title} className="border-b border-line last:border-b-0">
                  <button onClick={() => router.push(href)} className="flex w-full items-start gap-4 py-4 text-left">
                    <span className="w-5 pt-0.5 font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{title}</span>
                      <span className="mt-1 block text-[13px] text-subtle">{desc}</span>
                    </span>
                    <Badge tone={ok ? 'green' : 'yellow'}>{ok ? '완료' : '확인 필요'}</Badge>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <Card>
            <MiniCalendar data={data} />
          </Card>
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.2em] text-subtle">Upcoming</p>
                <h2 className="mt-1 text-xl font-extrabold">다가오는 학사일정</h2>
              </div>
              <button onClick={() => router.push('/calendar')} className="m3-btn m3-btn-sm m3-text">
                전체 일정
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className="py-6 text-sm text-subtle">학사일정 PDF를 올리면 다가오는 행사와 휴업일이 여기에 나옵니다.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {upcoming.map((e, i) => (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <span className="w-24 shrink-0 font-mono text-[13px] text-ink">{formatDotDate(e.date).slice(5)}</span>
                    <span className="min-w-0 flex-1 text-sm">{e.title}</span>
                    {e.kind !== '행사' && <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

/** 'Thursday, October 8' — 큰 날짜 아래 영문 캡션 */
function englishDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
