'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ChevronRight, Copy, Menu, Pause, Play, Plus, RotateCcw, Settings, Sparkles, Users, X } from 'lucide-react'
import { formatDotDate, seedData, todayISO } from '@/lib/types'
import { useAppData } from '@/hooks/useAppData'
import { DashboardPage } from '@/components/pages/DashboardPage'
import { AbsencePage } from '@/components/pages/AbsencePage'
import { AssignmentsPage } from '@/components/pages/AssignmentsPage'
import { TimetablePage } from '@/components/pages/TimetablePage'
import { TeachersPage } from '@/components/pages/TeachersPage'
import { StatsPage } from '@/components/pages/StatsPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { CalendarPage } from '@/components/pages/CalendarPage'
import { WeekPage } from '@/components/pages/WeekPage'

// 메뉴: 위쪽은 매일 쓰는 일(› 화살표 목록), 아래쪽은 관리 메뉴(아이콘 목록)
const primary = [
  ['/dashboard', '홈'],
  ['/absence', '결강 등록'],
  ['/assignments', '배정 확인'],
  ['/week', '이번 주 시간표'],
  ['/timetable', '시간표 올리기'],
  ['/calendar', '학사일정 올리기'],
] as const
const secondary = [
  ['/teachers', '교사 관리', Users],
  ['/stats', '통계', BarChart3],
  ['/settings', '설정', Settings],
] as const

export function AppShell() {
  const path = usePathname()
  const router = useRouter()
  const { data, setData, ready } = useAppData()
  const [mobile, setMobile] = useState(false)
  const [noticeIdx, setNoticeIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setNoticeIdx((i) => i + 1), 4500)
    return () => clearInterval(t)
  }, [paused])
  if (!ready) return <div className="min-h-screen bg-paper" />
  const page = path.replace('/', '') || 'dashboard'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage data={data} />
      case 'absence':
        return <AbsencePage data={data} setData={setData} />
      case 'assignments':
        return <AssignmentsPage data={data} setData={setData} />
      case 'week':
        return <WeekPage data={data} />
      case 'timetable':
        return <TimetablePage data={data} setData={setData} />
      case 'calendar':
        return <CalendarPage data={data} setData={setData} />
      case 'teachers':
        return <TeachersPage data={data} setData={setData} />
      case 'stats':
        return <StatsPage data={data} />
      case 'settings':
        return <SettingsPage data={data} setData={setData} />
      default:
        return null
    }
  })()

  const today = todayISO()
  const go = (href: string) => {
    router.push(href)
    setMobile(false)
  }
  const isActive = (href: string) => path === href || (href === '/dashboard' && page === 'dashboard')
  const home = page === 'dashboard'
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const todayEvent = data.events.find((e) => e.date === today && e.kind !== '방학')
  const nextOff = data.events.find((e) => e.date > today && e.kind !== '행사' && e.kind !== '방학')
  const notices = [
    data.settings.holidays.includes(today)
      ? `오늘은 휴업일입니다${todayEvent ? ` · ${todayEvent.title}` : ''}`
      : `${formatDotDate(today)}${todayEvent ? ` · ${todayEvent.title}` : ''}`,
    pending ? `확정을 기다리는 배정 ${pending}건이 있습니다` : '모든 배정이 확정되었습니다',
    nextOff ? `다음 휴업일 ${formatDotDate(nextOff.date)} ${nextOff.title}` : '학사일정을 올리면 휴업일이 자동으로 반영됩니다',
  ]
  const notice = notices[noticeIdx % notices.length]

  const Logo = () => (
    <button onClick={() => go('/dashboard')} className="flex items-center gap-2.5 text-left" aria-label="첫 화면">
      <span className="grid size-9 place-items-center bg-ink text-paper">
        <Sparkles size={17} strokeWidth={1.75} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold">결보강 매니저</span>
        <span className="block text-[10px] font-bold tracking-[.22em] text-subtle">SUBS PLANNER</span>
      </span>
    </button>
  )

  const MenuBody = () => (
    <>
      <nav className="mt-10 flex flex-col" aria-label="주 메뉴">
        {primary.map(([href, label]) => (
          <button
            key={href}
            onClick={() => go(href)}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`group flex items-center justify-between py-3 text-left text-[16px] transition-colors ${isActive(href) ? 'font-extrabold text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            {label}
            {isActive(href) ? (
              <span className="mr-1.5 size-[9px] rounded-full bg-point ring-1 ring-ink/70" aria-hidden />
            ) : (
              <ChevronRight size={18} strokeWidth={1.5} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" />
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col">
        {secondary.map(([href, label, Icon]) => (
          <button
            key={href}
            onClick={() => go(href)}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`flex items-center gap-3 py-2.5 text-left text-[14px] ${isActive(href) ? 'font-extrabold text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            <Icon size={17} strokeWidth={1.5} />
            {label}
          </button>
        ))}
        <div className="my-4 border-t border-line" />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(data))
            alert('JSON 데이터를 클립보드에 복사했습니다.')
          }}
          className="flex items-center gap-3 py-2 text-left text-[13px] text-subtle hover:text-ink"
        >
          <Copy size={15} strokeWidth={1.5} /> 백업 복사
        </button>
        <button
          onClick={() => {
            if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
          }}
          className="flex items-center gap-3 py-2 text-left text-[13px] text-subtle hover:text-ink"
        >
          <RotateCcw size={15} strokeWidth={1.5} /> 샘플 데이터로 초기화
        </button>
        <p className="mt-3 text-[12px] text-faint">{data.settings.semester}</p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* 왼쪽 메뉴 (넓은 화면) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[300px] flex-col border-r border-line bg-surface px-7 py-7 lg:flex">
        <Logo />
        <MenuBody />
      </aside>

      {/* 휴대폰 메뉴: ✕ MENU */}
      {mobile && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex w-[300px] max-w-[85%] flex-col bg-surface px-6 py-6">
            <button onClick={() => setMobile(false)} className="flex items-center gap-2 text-[14px] font-bold">
              <X size={20} strokeWidth={1.5} /> MENU
            </button>
            <MenuBody />
          </div>
          <button aria-label="메뉴 닫기" onClick={() => setMobile(false)} className="flex-1 bg-ink/40" />
        </div>
      )}

      <div className="lg:pl-[300px]">
        {/* 안내 띠: 위아래 가는 줄 사이에 //Subs Planner · 안내 · 학기. 홈에서만 검정 바탕 */}
        <div className={`px-4 py-1.5 md:px-6 ${home ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
          <div className={`grid h-9 grid-cols-[auto_1fr_auto] items-center gap-4 border-y ${home ? 'border-paper/30' : 'border-ink/25'} text-[12px] tracking-[.06em]`}>
            <span className={`font-extrabold tracking-[.18em] ${home ? 'text-point' : ''}`}>//Subs Planner</span>
            <p key={noticeIdx} className={`truncate text-center font-bold ${home ? 'text-paper/90' : 'text-ink-2'}`} aria-live="polite">
              {notice}
            </p>
            <span className={`flex items-center gap-2 ${home ? 'text-paper/70' : 'text-subtle'}`}>
              <span className="hidden tracking-[.12em] sm:inline">{data.settings.semester}</span>
              <button
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? '안내 넘기기 다시 시작' : '안내 넘기기 멈춤'}
                className={`grid size-7 place-items-center ${home ? 'text-paper/80 hover:text-paper' : 'text-subtle hover:text-ink'}`}
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
            </span>
          </div>
        </div>

        {/* 휴대폰 상단 */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMobile(true)} className="flex items-center gap-2 text-[14px] font-bold" aria-label="메뉴 열기">
            <Menu size={20} strokeWidth={1.5} /> MENU
          </button>
          <Logo />
          <span className="w-16" />
        </header>

        <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 md:px-10">{content}</main>
      </div>

      {/* 오른쪽 아래 둥근 검정 버튼: 결강 등록 */}
      {page !== 'absence' && (
        <button
          onClick={() => go('/absence')}
          aria-label="결강 등록"
          title="결강 등록"
          className="fixed bottom-6 right-6 z-10 grid size-14 place-items-center rounded-full bg-point text-on-point shadow-[0_6px_20px_rgb(0_0_0/.25)] transition-transform hover:scale-105"
        >
          <Plus size={24} strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}
