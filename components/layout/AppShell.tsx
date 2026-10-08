'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Plus, RotateCcw, Sparkles, X } from 'lucide-react'
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

// 가운데 로고(대시보드)를 기준으로 왼쪽은 매일 쓰는 메뉴, 오른쪽은 관리 메뉴
const navLeft = [
  ['/absence', '결강 등록'],
  ['/assignments', '배정 확인'],
  ['/timetable', '시간표'],
  ['/calendar', '학사일정'],
] as const
const navRight = [
  ['/teachers', '교사 관리'],
  ['/stats', '통계'],
  ['/settings', '설정'],
] as const

export function AppShell() {
  const path = usePathname()
  const router = useRouter()
  const { data, setData, ready } = useAppData()
  const [mobile, setMobile] = useState(false)
  if (!ready) return <div className="min-h-screen bg-wash" />
  const page = path.replace('/', '') || 'dashboard'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage data={data} />
      case 'absence':
        return <AbsencePage data={data} setData={setData} />
      case 'assignments':
        return <AssignmentsPage data={data} setData={setData} />
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
  const isActive = (href: string) => path === href
  const pending = data.assignments.filter((a) => a.status === '제안').length
  const todayEvent = data.events.find((e) => e.date === today && e.kind !== '방학')
  const nextOff = data.events.find((e) => e.date > today && e.kind !== '행사' && e.kind !== '방학')
  const notices = [
    `${formatDotDate(today)} · ${data.settings.semester}`,
    data.settings.holidays.includes(today) ? `오늘은 휴업일${todayEvent ? ` · ${todayEvent.title}` : ''}` : todayEvent ? `오늘 · ${todayEvent.title}` : '오늘 등록된 학사일정 없음',
    pending ? `확정을 기다리는 배정 ${pending}건` : '모든 배정이 확정되었습니다',
    nextOff ? `다음 휴업일 ${formatDotDate(nextOff.date).slice(5)} ${nextOff.title}` : '학사일정을 올리면 휴업일이 표시됩니다',
  ]
  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <button
      onClick={() => go(href)}
      aria-current={isActive(href) ? 'page' : undefined}
      className={`rounded-[50%] border px-4 py-1.5 text-[15px] transition-colors ${isActive(href) ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* 맨 위 검정 안내 띠 */}
      <div className="overflow-hidden bg-ink py-2 text-[12px] text-paper" aria-label="오늘의 안내">
        <div className="marquee flex w-max gap-24 whitespace-nowrap">
          {[0, 1].map((k) => (
            <div key={k} className="flex gap-24" aria-hidden={k === 1}>
              {notices.map((n, i) => (
                <span key={i} className="font-bold tracking-wide">
                  {n}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto grid h-24 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-1">
            <button className="text-ink lg:hidden" aria-label="메뉴 열기" onClick={() => setMobile(true)}>
              <Menu size={22} strokeWidth={1.5} />
            </button>
            <nav className="hidden items-center gap-1 lg:flex">
              {navLeft.map(([href, label]) => (
                <NavLink key={href} href={href} label={label} />
              ))}
            </nav>
          </div>

          {/* 가운데 타원 로고 → 첫 화면 */}
          <button
            onClick={() => go('/dashboard')}
            aria-label="결보강 매니저 첫 화면"
            className="flex h-16 w-44 flex-col items-center justify-center rounded-[50%] border-[1.5px] border-ink leading-none outline outline-1 outline-offset-[3px] outline-ink"
          >
            <span className="flex items-center gap-1 text-[14px] font-extrabold tracking-[.04em]">
              <Sparkles size={13} strokeWidth={2} /> 결보강 매니저
            </span>
            <span className="serif-i mt-1 text-[13px] text-ink-2">Subs Planner</span>
          </button>

          <div className="flex items-center justify-end gap-1">
            <nav className="hidden items-center gap-1 lg:flex">
              {navRight.map(([href, label]) => (
                <NavLink key={href} href={href} label={label} />
              ))}
            </nav>
            <button
              title="샘플 데이터로 초기화"
              aria-label="샘플 데이터로 초기화"
              onClick={() => {
                if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
              }}
              className="ml-2 grid size-9 place-items-center rounded-full text-ink-2 hover:bg-ink/[.06]"
            >
              <RotateCcw size={17} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(data))
                alert('JSON 데이터를 클립보드에 복사했습니다.')
              }}
              className="hidden px-2 text-[15px] text-ink-2 hover:text-ink sm:block"
            >
              백업
            </button>
          </div>
        </div>
      </header>

      {/* 휴대폰 메뉴 */}
      {mobile && (
        <div className="fixed inset-0 z-30 flex flex-col bg-paper px-6 py-6 lg:hidden">
          <div className="flex justify-end">
            <button aria-label="메뉴 닫기" onClick={() => setMobile(false)}>
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>
          <nav className="mt-6 flex flex-col">
            {[['/dashboard', '첫 화면'] as const, ...navLeft, ...navRight].map(([href, label]) => (
              <button
                key={href}
                onClick={() => go(href)}
                className={`border-b border-line py-4 text-left text-2xl font-extrabold ${isActive(href) || (href === '/dashboard' && page === 'dashboard') ? 'text-ink' : 'text-faint'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 lg:px-8">{content}</main>

      {/* 떠 있는 결강 등록 버튼 (참고 사이트의 QnA 버튼 자리) */}
      {page !== 'absence' && (
        <button onClick={() => go('/absence')} className="m3-fab fixed bottom-6 right-6 z-10">
          <Plus size={18} strokeWidth={2} /> 결강 등록
        </button>
      )}
    </div>
  )
}
