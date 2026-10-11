'use client'
import { useRouter } from 'next/navigation'
import { BookOpen, CalendarPlus, CalendarRange, ClipboardCheck, Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { formatDotDate, todayISO, type AppData } from '@/lib/types'

const KIND_TONE: Record<string, string> = { 공휴일: 'red', 휴업일: 'yellow', 방학: 'blue', 행사: 'slate' }

export function DashboardPage({ data }: { data: AppData }) {
  const router = useRouter()
  const today = todayISO()
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const todayAbsences = data.absences.filter((a) => a.startDate <= today && today <= a.endDate).length
  const todayEvents = data.events.filter((e) => e.date === today && e.kind !== '방학')
  const todayOff = data.settings.holidays.includes(today)
  const upcoming = data.events.filter((e) => e.date > today && e.kind !== '방학').slice(0, 6)
  const todaySlots = data.slots
    .filter((s) => s.date === today)
    .sort((a, b) => a.period - b.period)
    .map((s) => ({ s, a: data.assignments.find((x) => x.slotId === s.id) }))

  const nextOff = data.events.find((e) => e.date > today && (e.kind === '공휴일' || e.kind === '휴업일'))
  // 오른쪽 2×2 카드: 그림 자리(파스텔 면 + 아이콘), 제목, 설명, 초록 숫자
  const cards = [
    { href: '/absence', title: '결강 등록', desc: '교사·날짜로 보강 수업 찾기', stat: `오늘 결강 ${todayAbsences}건`, icon: CalendarPlus, bg: 'bg-wash-2' },
    { href: '/assignments', title: '배정 확인', desc: '추천 근거 보고 확정하기', stat: `확정 대기 ${pending}건`, icon: ClipboardCheck, bg: 'bg-iris-container' },
    { href: '/timetable', title: '시간표', desc: '교사별 시간표 PDF 올리기', stat: `교사 ${new Set(data.timetable.map((e) => e.teacherId)).size}명`, icon: BookOpen, bg: 'bg-peach' },
    { href: '/calendar', title: '학사일정', desc: '휴업일·방학 자동 반영', stat: `휴업일 ${data.settings.holidays.length}일`, icon: CalendarRange, bg: 'bg-wash' },
  ]
  const checklist: [string, string, boolean, string][] = [
    ['시간표 등록', `교사 ${new Set(data.timetable.map((e) => e.teacherId)).size}명의 시간표가 있습니다.`, data.timetable.length > 0, '/timetable'],
    ['학사일정 등록', `휴업일 ${data.settings.holidays.length}일이 등록돼 있습니다.`, data.settings.holidays.length > 0, '/calendar'],
    ['배정 확정', pending ? `확정을 기다리는 배정이 ${pending}건 있습니다.` : '모든 배정을 확정했습니다.', pending === 0, '/assignments'],
  ]

  return (
    <>
      {/* 첫 화면: 왼쪽 회색 패널(세이지 블록 제목) + 오른쪽 2×2 카드 */}
      <div className="flex items-center justify-between pb-4 text-[11px] font-bold uppercase tracking-[.25em] text-subtle">
        <span>Subs Planner</span>
        <span>{data.settings.semester}</span>
      </div>
      <section className="grid overflow-hidden border border-line bg-surface lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
        <div className="flex min-w-0 flex-col bg-wash pb-8">
          <div className="mt-10 bg-iris-container px-8 py-8 md:mt-14">
            <h1 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
              결보강
              <br />
              확인
            </h1>
            <p className="mt-3 text-[16px] font-bold text-on-iris-container">{formatDotDate(today)}</p>
          </div>
          <div className="px-8 pt-8">
            <p className="text-[17px] font-extrabold leading-snug">
              {todayOff
                ? '오늘은 휴업일입니다'
                : todaySlots.length
                  ? `오늘 결강 수업 ${todaySlots.length}개, 확정 대기 ${pending}건`
                  : pending
                    ? `확정을 기다리는 배정 ${pending}건`
                    : '오늘 처리할 결보강이 없습니다'}
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-[13px] leading-6 text-ink-2">
              {todayEvents.length ? (
                todayEvents.slice(0, 3).map((e, i) => <li key={i}>· {e.title}</li>)
              ) : (
                <li>오늘 등록된 학사일정이 없습니다.</li>
              )}
              {nextOff && (
                <li>
                  · 다음 휴업일 {formatDotDate(nextOff.date).slice(5)} {nextOff.title}
                </li>
              )}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => router.push('/absence')} className="m3-btn h-10 bg-lime px-6 text-ink hover:bg-iris hover:text-white">
                <Plus size={17} /> 결강 등록
              </button>
              <button onClick={() => router.push('/assignments')} className="m3-btn m3-text h-10">
                배정 확인
              </button>
            </div>
          </div>
          <p className="mt-auto px-8 pt-10 text-[11px] tracking-[.15em] text-faint">subs-planner.vercel.app</p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-8 p-6 md:gap-x-8 md:p-10">
          {cards.map(({ href, title, desc, stat, icon: Icon, bg }) => (
            <button key={href} onClick={() => router.push(href)} className="group min-w-0 text-center">
              <span className={`grid aspect-[4/3] place-items-center transition-transform duration-300 group-hover:scale-[1.02] ${bg}`}>
                <Icon size={44} strokeWidth={1.3} className="text-ink/70" />
              </span>
              <span className="mt-3 block text-[15px] font-extrabold">{title}</span>
              <span className="mt-1 block truncate text-[12px] text-subtle">{desc}</span>
              <span className="mt-1.5 block text-[14px] font-extrabold text-iris">{stat}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
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

