'use client'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, CalendarCheck2, CalendarPlus, CalendarRange, ClipboardCheck, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { formatDotDate, todayISO, type AppData } from '@/lib/types'

const KIND_TONE: Record<string, string> = { 공휴일: 'red', 휴업일: 'yellow', 방학: 'blue', 행사: 'slate' }
const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function dayDiff(a: string, b: string) {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return Math.round((t(b) - t(a)) / 86400000)
}

type TileProps = {
  icon: LucideIcon
  title: string
  sub: string
  color: string
  onClick: () => void
  className?: string
  big?: boolean
}

/** 첫 화면 타일: 가운데 큰 아이콘, 왼쪽 아래 제목 */
function Tile({ icon: Icon, title, sub, color, onClick, className = '', big }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-2xl p-5 text-left text-ink ring-1 ring-white/60 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgb(74_58_140/.18)] md:p-6 ${color} ${className}`}
    >
      <span className="absolute inset-0 grid place-items-center pb-10">
        <Icon size={big ? 64 : 48} strokeWidth={1.4} className="text-ink/75 transition-transform group-hover:scale-105" />
      </span>
      <span className="relative">
        <span className={`block font-extrabold ${big ? 'text-[22px]' : 'text-[18px]'}`}>{title}</span>
        <span className="mt-1 block text-[13px] text-ink-2">{sub}</span>
      </span>
    </button>
  )
}

export function DashboardPage({ data }: { data: AppData }) {
  const router = useRouter()
  const today = todayISO()
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const todaySlots = data.slots
    .filter((s) => s.date === today)
    .sort((a, b) => a.period - b.period)
    .map((s) => ({ s, a: data.assignments.find((x) => x.slotId === s.id) }))
  const todayEvents = data.events.filter((e) => e.date === today && e.kind !== '방학')
  const todayOff = data.settings.holidays.includes(today)
  const upcoming = data.events.filter((e) => e.date > today && e.kind !== '방학').slice(0, 6)
  const offs = data.events.filter((e) => e.date > today && (e.kind === '공휴일' || e.kind === '휴업일')).slice(0, 3)
  const teacherCount = new Set(data.timetable.map((e) => e.teacherId)).size
  const [y, m, d] = today.split('-').map(Number)
  const weekday = WEEK[new Date(y, m - 1, d).getDay()]
  const name = (id?: string | null) => data.teachers.find((t) => t.id === id)?.name

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[.2em] text-iris">{data.settings.semester}</p>
          <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.02em]">결보강 확인</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            {formatDotDate(today)}
            {todayOff ? ' · 오늘은 휴업일입니다' : todayEvents[0] ? ` · ${todayEvents.map((e) => e.title).join(', ')}` : ''}
          </p>
        </div>
        <button onClick={() => router.push('/absence')} className="m3-btn m3-filled h-11">
          <Plus size={18} /> 결강 등록
        </button>
      </div>

      {/* 타일 격자: 큰 타일 2개 + 작은 타일 4개 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Tile
          big
          icon={CalendarCheck2}
          title="오늘의 결보강"
          sub={todaySlots.length ? `결강 수업 ${todaySlots.length}개 · 미확정 ${todaySlots.filter((x) => x.a?.status === '제안').length}건` : '오늘 결강 수업이 없습니다'}
          color="bg-tile-1"
          onClick={() => router.push('/assignments')}
          className="col-span-2 h-56 md:h-72"
        />
        <Tile
          icon={CalendarPlus}
          title="결강 등록"
          sub="교사·날짜로 보강 찾기"
          color="bg-tile-5"
          onClick={() => router.push('/absence')}
          className="h-44 md:h-72"
        />
        <Tile
          icon={ClipboardCheck}
          title="배정 확인"
          sub={pending ? `확정 대기 ${pending}건` : '모두 확정됨'}
          color="bg-tile-3"
          onClick={() => router.push('/assignments')}
          className="h-44 md:h-72"
        />
        <Tile
          big
          icon={BookOpen}
          title="시간표"
          sub={teacherCount ? `교사 ${teacherCount}명 · 수업 ${data.timetable.length}개` : 'PDF로 시간표를 올리세요'}
          color="bg-tile-4"
          onClick={() => router.push('/timetable')}
          className="col-span-2 h-44 md:h-48"
        />
        <Tile
          icon={CalendarRange}
          title="학사일정"
          sub={data.settings.holidays.length ? `휴업일 ${data.settings.holidays.length}일 등록` : 'PDF로 학사일정을 올리세요'}
          color="bg-tile-2"
          onClick={() => router.push('/calendar')}
          className="h-44 md:h-48"
        />
        <Tile
          icon={Users}
          title="교사 관리"
          sub={`교사 ${data.teachers.length}명`}
          color="bg-tile-6"
          onClick={() => router.push('/teachers')}
          className="h-44 md:h-48"
        />
      </div>

      {/* 아래 줄: 정보 상자 2개 + 학사일정 공지 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
        <section className="flex min-w-0 gap-5 rounded-2xl border border-line bg-surface p-5">
          <div className="w-16 shrink-0 self-start overflow-hidden rounded-lg border border-line text-center" aria-hidden>
            <div className="bg-bad py-0.5 text-[10px] font-bold tracking-wider text-white">{weekday}</div>
            <div className="py-1.5 text-[28px] font-extrabold leading-none">{d}</div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold">오늘의 보강</h2>
            {todaySlots.length === 0 ? (
              <p className="mt-1 text-[13px] text-subtle">오늘 결강 수업이 없습니다.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                {todaySlots.slice(0, 4).map(({ s, a }) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="w-9 shrink-0 font-bold">{s.period}교시</span>
                    <span className="min-w-0 flex-1 truncate text-ink-2">
                      {s.room} {s.subject}
                    </span>
                    <span className="shrink-0 font-bold">{name(a?.substituteTeacherId) ?? '—'}</span>
                  </li>
                ))}
                {todaySlots.length > 4 && <li className="text-subtle">외 {todaySlots.length - 4}건</li>}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-w-0 gap-5 rounded-2xl border border-line bg-surface p-5">
          <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-iris-soft text-iris-deep" aria-hidden>
            <CalendarRange size={28} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold">다가오는 휴업일</h2>
            {offs.length === 0 ? (
              <p className="mt-1 text-[13px] text-subtle">학사일정 PDF를 올리면 휴업일이 표시됩니다.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                {offs.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 font-bold">{formatDotDate(e.date).slice(5)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-2">{e.title}</span>
                    <span className="shrink-0 font-bold text-iris-deep">D-{dayDiff(today, e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[16px] font-extrabold">
              학사일정 <span className="ml-1 text-[11px] font-bold tracking-[.2em] text-iris">NOTICE</span>
            </h2>
            <button onClick={() => router.push('/calendar')} className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-ink-2 hover:border-iris hover:text-iris-deep">
              더보기 +
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="pt-3 text-[13px] text-subtle">학사일정 PDF를 올리면 다가오는 행사가 여기에 나옵니다.</p>
          ) : (
            <ul className="pt-2">
              {upcoming.map((e, i) => (
                <li key={i} className="flex items-center gap-3 py-1.5 text-[13px]">
                  <span className="text-iris">•</span>
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  {e.kind !== '행사' && <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>}
                  <span className="w-12 shrink-0 text-right text-subtle tabular-nums">{formatDotDate(e.date).slice(5, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
