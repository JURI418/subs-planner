'use client'
import { useRouter } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { exportText, formatDotDate, todayISO, type AppData } from '@/lib/types'

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

  // 이번 주(월~일)와 이번 달 범위
  const [ty, tm, td] = today.split('-').map(Number)
  const base = new Date(ty, tm - 1, td)
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  // 주말(토·일)에는 곧 시작할 다음 주(월~금)를 보여준다
  const weekend = base.getDay() === 0 || base.getDay() === 6
  const monday = td - ((base.getDay() + 6) % 7) + (weekend ? 7 : 0)
  const weekStart = iso(new Date(ty, tm - 1, monday))
  const weekEnd = iso(new Date(ty, tm - 1, monday + 4))
  const weekSlots = data.slots.filter((s) => s.date >= weekStart && s.date <= weekEnd).length
  const monthDone = data.assignments.filter((a) => {
    const s = data.slots.find((x) => x.id === a.slotId)
    return a.status === '확정' && s?.date.startsWith(today.slice(0, 7))
  }).length


  // 오늘 이후 보강 교사가 정해진 배정을 나이스·메신저 붙여넣기 형식으로 복사
  const copyUpcoming = () => {
    const ids = new Set(data.slots.filter((s) => s.date >= today).map((s) => s.id))
    const text = exportText({ ...data, assignments: data.assignments.filter((a) => ids.has(a.slotId)) })
    if (!text) return alert('복사할 보강 내역이 없습니다.')
    navigator.clipboard?.writeText(text)
    alert(`오늘 이후 보강 ${text.split('\n').length}건을 나이스·메신저 붙여넣기 형식으로 복사했습니다.`)
  }
  const upcomingCount = data.assignments.filter((a) => {
    const s = data.slots.find((x) => x.id === a.slotId)
    return a.substituteTeacherId && s && s.date >= today
  }).length
  const actions = [
    { key: 'absence', en: 'Absence', title: '결강 등록', value: todayAbsences, unit: '건 오늘', mark: 'bg-ink', desc: `${weekend ? '다음 주' : '이번 주'} 결강 수업 ${weekSlots}개`, run: () => router.push('/absence') },
    { key: 'assignments', en: 'Assignments', title: '배정 확인', value: pending, unit: '건 미확정', mark: pending ? 'bg-warn' : 'bg-faint', desc: pending ? '확정을 기다리는 배정이 있어요' : '모든 배정을 확정했어요', run: () => router.push('/assignments') },
    { key: 'stats', en: 'Statistics', title: '보강 통계', value: monthDone, unit: '건 이번 달', mark: 'bg-ok', desc: '교사별 누적 보강 횟수 확인', run: () => router.push('/stats') },
    { key: 'copy', en: 'Copy', title: '보강 내역 복사', value: upcomingCount, unit: '건 예정', mark: 'bg-ink-2', desc: '오늘 이후 보강 · 나이스·메신저용', run: copyUpcoming },
  ]
  const checklist: [string, string, boolean, string][] = [
    ['시간표 등록', `교사 ${new Set(data.timetable.map((e) => e.teacherId)).size}명의 시간표가 있습니다.`, data.timetable.length > 0, '/timetable'],
    ['학사일정 등록', `휴업일 ${data.settings.holidays.length}일이 등록돼 있습니다.`, data.settings.holidays.length > 0, '/calendar'],
    ['배정 확정', pending ? `확정을 기다리는 배정이 ${pending}건 있습니다.` : '모든 배정을 확정했습니다.', pending === 0, '/assignments'],
  ]

  return (
    <>
      {/* 첫 화면 상단: 화면을 가로지르는 어두운 큰 배너 */}
      {/* 넓은 화면에서도 검정 배경이 양옆 끝까지 이어지도록 그림자로 확장 */}
      <section className="relative -mx-5 -mt-10 overflow-hidden bg-ink shadow-[0_0_0_100vmax_var(--color-ink)] [clip-path:inset(0_-100vmax)] px-6 pb-7 pt-6 text-paper md:-mx-10 md:px-12 md:pb-8 md:pt-7">
        <p
          aria-hidden
          className="pointer-events-none absolute -bottom-3 right-4 select-none text-[4.5rem] font-extrabold leading-none tracking-[-0.05em] text-paper/[.07] md:-bottom-5 md:text-[7.5rem]"
        >
          {today.slice(5).replace('-', '.')}
        </p>
        <div className="relative">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.25em] text-paper/60">
              Today · {englishDate(today)}
            </p>
            <h1 className="mt-2 flex flex-wrap items-baseline gap-x-4 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] md:text-[2.5rem]">
              결보강 확인
              <span className="text-[16px] font-bold tracking-normal text-paper/80">{formatDotDate(today)}</span>
            </h1>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
              {todayOff ? (
                <li className="font-bold">오늘은 휴업일입니다{todayEvents[0] ? ` · ${todayEvents[0].title}` : ''}</li>
              ) : todayEvents.length ? (
                todayEvents.slice(0, 4).map((e, i) => <li key={i}>· {e.title}</li>)
              ) : (
                <li className="text-paper/60">오늘 등록된 학사일정이 없습니다</li>
              )}
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/absence')}
              className="m3-btn h-11 border border-paper bg-paper px-6 text-ink hover:bg-transparent hover:text-paper"
            >
              <Plus size={18} /> 결강 등록
            </button>
            <button
              onClick={() => router.push('/assignments')}
              className="m3-btn h-11 border border-paper/60 px-6 text-paper hover:border-paper hover:bg-paper hover:text-ink"
            >
              배정 확인 {pending > 0 && `· ${pending}건`}
            </button>
          </div>
        </div>
      </section>

      {/* 바로가기 + 숫자: 테두리로 나눈 4칸 타일 */}
      <nav className="mt-8 grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-4" aria-label="바로가기">
        {actions.map(({ key, en, title, value, unit, mark, desc, run }, i) => (
          <button
            key={key}
            onClick={run}
            className="group flex flex-col items-stretch bg-surface p-5 text-left transition-colors hover:bg-wash md:p-6"
          >
            <span className="truncate text-[11px] font-bold uppercase tracking-[.14em] text-subtle md:tracking-[.2em]">
              {String(i + 1).padStart(2, '0')} · {en}
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[18px] font-bold md:text-[19px]">
              {title}
              <ChevronRight size={18} className="shrink-0 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-ink" />
            </span>
            <span className="mt-5 flex items-baseline gap-2">
              <span className="text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums">{value}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-subtle">
                <span className={`size-1.5 rounded-full ${mark}`} aria-hidden />
                {unit}
              </span>
            </span>
            <span className="mt-2 text-[13px] leading-5 text-subtle">{desc}</span>
          </button>
        ))}
      </nav>

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
