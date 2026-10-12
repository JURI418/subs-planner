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
  // 요일별 결강 수업 수 (배너 막대그래프)
  const weekBars = ['월', '화', '수', '목', '금'].map((label, i) => {
    const date = iso(new Date(ty, tm - 1, monday + i))
    return { label, date, count: data.slots.filter((s) => s.date === date).length }
  })
  const barMax = Math.max(4, ...weekBars.map((b) => b.count))
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
    { key: 'absence', hot: false, en: 'Absence', title: '결강 등록', value: todayAbsences, unit: '건 오늘', mark: 'bg-ink', desc: `${weekend ? '다음 주' : '이번 주'} 결강 수업 ${weekSlots}개`, run: () => router.push('/absence') },
    { key: 'assignments', hot: pending > 0, en: 'Assignments', title: '배정 확인', value: pending, unit: '건 미확정', mark: pending ? 'bg-warn' : 'bg-faint', desc: pending ? '확정을 기다리는 배정이 있어요' : '모든 배정을 확정했어요', run: () => router.push('/assignments') },
    { key: 'stats', hot: false, en: 'Statistics', title: '보강 통계', value: monthDone, unit: '건 이번 달', mark: 'bg-ok', desc: '교사별 누적 보강 횟수 확인', run: () => router.push('/stats') },
    { key: 'copy', hot: false, en: 'Copy', title: '보강 내역 복사', value: upcomingCount, unit: '건 예정', mark: 'bg-ink-2', desc: '오늘 이후 보강 · 나이스·메신저용', run: copyUpcoming },
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
        <div className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.25em] text-point">
              Today · {englishDate(today)}
            </p>
            <h1 className="mt-2 flex flex-wrap items-baseline gap-x-4 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] md:text-[2.5rem]">
              결보강 확인
              <span className="text-[16px] font-bold tracking-normal text-paper/80">{formatDotDate(today)}</span>
            </h1>
            {todaySlots.length > 0 && !todayOff ? (
              <>
                {todayEvents.length > 0 && (
                  <p className="mt-1.5 truncate text-[13px] text-paper/70">
                    {todayEvents.slice(0, 3).map((e) => `· ${e.title}`).join('  ')}
                  </p>
                )}
                {/* 오늘의 보강: 교시 · 반 · 결강 → 보강 */}
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="오늘의 보강">
                  {todaySlots.slice(0, 4).map(({ s, a }) => {
                    const absent = data.teachers.find((t) => t.id === s.absentTeacherId)?.name
                    const sub = data.teachers.find((t) => t.id === a?.substituteTeacherId)?.name
                    return (
                      <li key={s.id} className="flex items-center gap-2 rounded-md border border-paper/25 px-3 py-1.5 text-[13px]">
                        <b className="text-point">{s.period}교시</b>
                        <span>{s.room}{s.group ?? ''} {s.subject}</span>
                        <span className="text-paper/60">·</span>
                        <span className="text-paper/80">{absent} →</span>
                        <span className={sub ? 'font-bold' : 'font-bold text-point'}>
                          {sub ?? '미정'}
                          {a?.status === '제안' && <span className="ml-1 text-[11px] font-normal text-paper/50">제안</span>}
                        </span>
                      </li>
                    )
                  })}
                  {todaySlots.length > 4 && (
                    <li className="flex items-center px-1 text-[13px] text-paper/70">외 {todaySlots.length - 4}건</li>
                  )}
                </ul>
              </>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                {todayOff ? (
                  <li className="font-bold">오늘은 휴업일입니다{todayEvents[0] ? ` · ${todayEvents[0].title}` : ''}</li>
                ) : todayEvents.length ? (
                  todayEvents.slice(0, 4).map((e, i) => <li key={i}>· {e.title}</li>)
                ) : (
                  <li className="text-paper/60">오늘 등록된 학사일정 · 보강이 없습니다</li>
                )}
              </ul>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => router.push('/absence')}
              className="m3-btn h-11 border border-point bg-point px-6 text-on-point hover:bg-transparent hover:text-point"
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

          {/* 이번 주 요일별 결강 수업 막대그래프: 오늘만 포인트 색 */}
          <div className="shrink-0" aria-label="요일별 결강 수업 수">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-paper/55">
              {weekend ? 'Next week' : 'This week'} · 결강 수업 {weekSlots}
            </p>
            <div className="flex h-28 items-end gap-3 md:gap-4">
              {weekBars.map((b) => {
                const isToday = b.date === today
                const off = data.settings.holidays.includes(b.date)
                return (
                  <div key={b.date} className="flex h-full w-7 flex-col items-center justify-end gap-1.5 md:w-8" title={`${b.label} ${b.count}개`}>
                    <span className={`text-[13px] font-bold tabular-nums ${isToday ? 'text-point' : 'text-paper/85'}`}>
                      {off ? '휴' : b.count}
                    </span>
                    <span
                      className={`w-full rounded-[3px] transition-[height] duration-500 ${isToday ? 'bg-point' : off ? 'bg-paper/[.06]' : 'bg-paper/20'}`}
                      style={{ height: `${Math.max(4, (b.count / barMax) * 72)}px` }}
                    />
                    <span className={`text-[12px] ${isToday ? 'font-bold text-point' : 'text-paper/60'}`}>{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 바로가기 + 숫자: 테두리로 나눈 4칸 타일 */}
      <nav className="mt-8 grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-4" aria-label="바로가기">
        {actions.map(({ key, en, title, value, unit, mark, desc, run, hot }, i) => (
          <button
            key={key}
            onClick={run}
            className={`group flex flex-col items-stretch p-5 text-left transition-colors md:p-6 ${hot ? 'bg-point text-on-point hover:brightness-95' : 'bg-surface hover:bg-wash'}`}
          >
            <span className={`truncate text-[11px] font-bold uppercase tracking-[.14em] md:tracking-[.2em] ${hot ? 'text-on-point/70' : 'text-subtle'}`}>
              {String(i + 1).padStart(2, '0')} · {en}
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[18px] font-bold md:text-[19px]">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {title}
                {hot && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-point">확인 필요</span>
                )}
              </span>
              <ChevronRight size={18} className={`shrink-0 transition-transform group-hover:translate-x-1 ${hot ? 'text-on-point' : 'text-subtle group-hover:text-ink'}`} />
            </span>
            <span className="mt-5 flex items-baseline gap-2">
              <span className="text-[2.75rem] font-bold leading-none tracking-[-0.03em] tabular-nums">{value}</span>
              <span className={`flex items-center gap-1.5 text-[13px] ${hot ? 'text-on-point/70' : 'text-subtle'}`}>
                <span className={`size-1.5 rounded-full ${hot ? 'bg-on-point' : mark}`} aria-hidden />
                {unit}
              </span>
            </span>
            <span className={`mt-2 text-[13px] leading-5 ${hot ? 'text-on-point/80' : 'text-subtle'}`}>{desc}</span>
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
