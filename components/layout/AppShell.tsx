'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Settings,
  Users,
  Sparkles,
  X,
} from 'lucide-react'
import { seedData } from '@/lib/types'
import { useAppData } from '@/hooks/useAppData'
import { DashboardPage } from '@/components/pages/DashboardPage'
import { AbsencePage } from '@/components/pages/AbsencePage'
import { AssignmentsPage } from '@/components/pages/AssignmentsPage'
import { TimetablePage } from '@/components/pages/TimetablePage'
import { TeachersPage } from '@/components/pages/TeachersPage'
import { StatsPage } from '@/components/pages/StatsPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { CalendarPage } from '@/components/pages/CalendarPage'

const nav = [
  ['/dashboard', '대시보드', LayoutDashboard],
  ['/absence', '결강 등록', CalendarDays],
  ['/assignments', '배정 확인', ClipboardCheck],
  ['/timetable', '시간표', BookOpen],
  ['/calendar', '학사일정', CalendarRange],
  ['/teachers', '교사 관리', Users],
  ['/stats', '통계', ClipboardList],
  ['/settings', '설정', Settings],
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
  return (
    <div className="min-h-screen bg-paper text-ink">
      {mobile && (
        <button
          aria-label="메뉴 닫기"
          onClick={() => setMobile(false)}
          className="fixed inset-0 z-10 bg-ink/20 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-[17rem] flex-col bg-paper px-3 py-5 transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0 bg-surface shadow-xl' : '-translate-x-full'}`}
      >
        <div className="flex items-start justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-iris text-white">
              <Sparkles size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-display text-[17px] font-semibold leading-tight">결보강 매니저</p>
              <p className="mt-0.5 text-xs text-subtle">{data.settings.semester}</p>
            </div>
          </div>
          <button className="text-subtle lg:hidden" aria-label="메뉴 닫기" onClick={() => setMobile(false)}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map(([href, label, Icon]) => {
            const active = path === href || (href === '/dashboard' && page === 'dashboard')
            return (
              <button
                key={href}
                onClick={() => {
                  router.push(href)
                  setMobile(false)
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 items-center gap-3 rounded-full px-4 text-left text-[15px] transition-colors ${active ? 'bg-iris-soft font-semibold text-on-iris-container' : 'text-ink-2 hover:bg-ink/[.06]'}`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.6} />
                {label}
              </button>
            )
          })}
        </nav>
        <div className="mx-3 mt-auto hidden rounded-2xl bg-surface p-4 text-[13px] leading-6 text-subtle lg:block">
          <p className="font-semibold text-ink-2">운영 원칙</p>
          <p className="mt-1">보강 횟수와 당일 부담을 함께 고려해 공정하게 추천합니다.</p>
        </div>
      </aside>
      <main className="lg:pl-[17rem]">
        <header className="sticky top-0 z-[5] flex h-16 items-center justify-between bg-paper/95 px-5 backdrop-blur lg:px-8">
          <button className="text-ink-2 lg:hidden" aria-label="메뉴 열기" onClick={() => setMobile(true)}>
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <div className="hidden text-sm text-subtle lg:block">{data.settings.semester}</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              title="샘플 데이터로 초기화"
              aria-label="샘플 데이터로 초기화"
              onClick={() => {
                if (confirm('모든 데이터를 샘플 데이터로 덮어씁니다. 되돌릴 수 없습니다. 계속할까요?')) setData(seedData())
              }}
              className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ink/[.08]"
            >
              <RotateCcw size={20} strokeWidth={1.6} />
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(data))
                alert('JSON 데이터를 클립보드에 복사했습니다.')
              }}
              className="m3-btn m3-outlined hidden sm:inline-flex"
            >
              백업
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-4 lg:px-8">{content}</div>
      </main>
    </div>
  )
}
